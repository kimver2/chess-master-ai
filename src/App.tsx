import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { Chess } from 'chess.js';
import { App as CapApp } from '@capacitor/app';
import { ChessBoard, BoardArrow, SquareBadge, PremoveData } from './components/ChessBoard';
import { PlayerBar } from './components/PlayerBar';
import { EvalBar } from './components/EvalBar';
import { FeatureTourGuide } from './components/FeatureTourGuide';
import { SettingsModal } from './components/SettingsModal';
import { GameOverModal, LastGameReward } from './components/GameOverModal';
import { getOpeningFromMoves, ChessOpening } from './data/openings';
import { stockfishService } from './engine/stockfishService';
import {
  DifficultyLevel,
  TimeLimit,
  PlayerSide,
  GameResult,
  GameOverReason,
  GameReviewData,
  PieceColor,
  PieceTheme,
  BoardTheme,
  PlayedMoveRecord,
  ArchivedGame,
} from './types/chess';
import { soundManager } from './utils/audio';
import {
  RotateCcw,
  Flag,
  Play,
  Settings,
  TrendingUp,
  Trophy,
  Swords,
  Sparkles,
  Loader2,
  Lightbulb,
  BookOpen,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Users,
  FileText,
  Zap,
} from 'lucide-react';
import { AvatarIcon } from './components/AvatarIcon';
import { UserProfile, getTier } from './types/profile';
import {
  loadUserProfile,
  recordGameResult as recordProfileGameResult,
  saveActiveGame,
  loadActiveGame,
  clearActiveGame,
  loadGameArchive,
  saveGameToArchive,
  deleteArchivedGame,
  buildStandardPgn,
  loadConfirmMoveEnabled,
  saveConfirmMoveEnabled,
  getCachedReviewForMoves,
  saveCachedReviewForMoves,
  parseImportedPgnOrFen,
  AI_NAMES,
} from './services/storageService';
import { submitOnlineScore, syncUserProfileToOnlineRankings } from './services/firebaseService';
import {
  subscribeToGame,
  requestMultiplayerRematch,
  declineMultiplayerRematch,
} from './services/multiplayerService';

// Code-split secondary views & modals for faster initial load
const MultiplayerView = React.lazy(() =>
  import('./components/MultiplayerView').then((m) => ({ default: m.MultiplayerView }))
);
const PuzzleView = React.lazy(() =>
  import('./components/PuzzleView').then((m) => ({ default: m.PuzzleView }))
);
const EndgameView = React.lazy(() =>
  import('./components/EndgameView').then((m) => ({ default: m.EndgameView }))
);
const ReviewModal = React.lazy(() =>
  import('./components/ReviewModal').then((m) => ({ default: m.ReviewModal }))
);
const OpeningGuideModal = React.lazy(() =>
  import('./components/OpeningGuideModal').then((m) => ({ default: m.OpeningGuideModal }))
);
const ProfileModal = React.lazy(() =>
  import('./components/ProfileModal').then((m) => ({ default: m.ProfileModal }))
);
const RankingModal = React.lazy(() =>
  import('./components/RankingModal').then((m) => ({ default: m.RankingModal }))
);
const GameArchiveModal = React.lazy(() =>
  import('./components/GameArchiveModal').then((m) => ({ default: m.GameArchiveModal }))
);

const getPositionKey = (fen: string) => fen.split(' ').slice(0, 4).join(' ');

// 3-fold repetition detection helper based on position history
const checkThreefoldFromHistory = (moves: PlayedMoveRecord[]): boolean => {
  if (moves.length < 8) return false;
  const posCounts = new Map<string, number>();
  posCounts.set('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -', 1);
  for (const m of moves) {
    const key = m.fenAfter.split(' ').slice(0, 4).join(' ');
    const count = (posCounts.get(key) || 0) + 1;
    if (count >= 3) return true;
    posCounts.set(key, count);
  }
  return false;
};

export const App: React.FC = () => {
  // Navigation: 'play' | 'pvp' | 'puzzle' | 'endgame'
  const [activeTab, setActiveTab] = useState<'play' | 'pvp' | 'puzzle' | 'endgame'>('play');

  // Player Stats
  const [stats, setStats] = useState(() => ({
    gamesPlayed: Number(localStorage.getItem('chess_games_played') || 0),
    wins: Number(localStorage.getItem('chess_wins') || 0),
    losses: Number(localStorage.getItem('chess_losses') || 0),
  }));

  // Game Settings
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(3);
  const [timeLimit, setTimeLimit] = useState<TimeLimit>('10m');
  const [chosenSide, setChosenSide] = useState<PlayerSide>('white');
  const [playerColor, setPlayerColor] = useState<PieceColor>('w');
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  // Theme & Sound Settings
  const [pieceTheme, setPieceTheme] = useState<PieceTheme>(() => {
    return (localStorage.getItem('chess_piece_theme') as PieceTheme) || 'metal';
  });
  const [boardTheme, setBoardTheme] = useState<BoardTheme>(() => {
    return (localStorage.getItem('chess_board_theme') as BoardTheme) || 'marble';
  });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => soundManager.isSoundEnabled());
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(() => soundManager.isHapticsEnabled());
  const [confirmMoveEnabled, setConfirmMoveEnabled] = useState<boolean>(() =>
    loadConfirmMoveEnabled()
  );

  const handlePieceThemeChange = (t: PieceTheme) => {
    setPieceTheme(t);
    try {
      localStorage.setItem('chess_piece_theme', t);
    } catch {}
  };

  const handleBoardThemeChange = (b: BoardTheme) => {
    setBoardTheme(b);
    try {
      localStorage.setItem('chess_board_theme', b);
    } catch {}
  };

  const handleToggleSound = (enabled: boolean) => {
    soundManager.setSoundEnabled(enabled);
    setSoundEnabled(enabled);
  };

  const handleToggleHaptics = (enabled: boolean) => {
    soundManager.setHapticsEnabled(enabled);
    setHapticsEnabled(enabled);
  };

  const handleToggleConfirmMove = useCallback((enabled: boolean) => {
    setConfirmMoveEnabled(enabled);
    saveConfirmMoveEnabled(enabled);
  }, []);

  // Chess Game State
  const [chess, setChess] = useState<Chess>(() => new Chess());
  const [playedMoves, setPlayedMoves] = useState<PlayedMoveRecord[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [premove, setPremove] = useState<PremoveData | null>(null);
  const gameSessionRef = React.useRef<number>(1);

  // In-Game Move History Viewing (Live Stepper)
  // null = live board; -1 = starting board; 0..(playedMoves.length - 1) = board after ply i
  const [viewPlyIndex, setViewPlyIndex] = useState<number | null>(null);

  const isViewingHistory = viewPlyIndex !== null && viewPlyIndex < playedMoves.length - 1;

  // Resolved Chess instance for current view
  const displayChess = React.useMemo(() => {
    if (viewPlyIndex === null || viewPlyIndex === playedMoves.length - 1) {
      return chess;
    }
    if (viewPlyIndex === -1) {
      try {
        return playedMoves[0]?.fenBefore ? new Chess(playedMoves[0].fenBefore) : new Chess();
      } catch {
        return new Chess();
      }
    }
    if (playedMoves[viewPlyIndex]) {
      try {
        return new Chess(playedMoves[viewPlyIndex].fenAfter);
      } catch {
        return chess;
      }
    }
    return chess;
  }, [chess, viewPlyIndex, playedMoves]);

  // Resolved Last Move highlight for current view
  const displayLastMove = React.useMemo(() => {
    if (viewPlyIndex === null || viewPlyIndex === playedMoves.length - 1) {
      return lastMove;
    }
    if (viewPlyIndex === -1) {
      return null;
    }
    if (playedMoves[viewPlyIndex]) {
      return {
        from: playedMoves[viewPlyIndex].from,
        to: playedMoves[viewPlyIndex].to,
      };
    }
    return null;
  }, [lastMove, viewPlyIndex, playedMoves]);

  const handleNavFirst = () => {
    if (playedMoves.length === 0) return;
    setViewPlyIndex(-1);
  };

  const handleNavPrev = () => {
    if (playedMoves.length === 0) return;
    if (viewPlyIndex === null) {
      setViewPlyIndex(Math.max(-1, playedMoves.length - 2));
    } else {
      setViewPlyIndex(Math.max(-1, viewPlyIndex - 1));
    }
  };

  const handleNavNext = () => {
    if (playedMoves.length === 0 || viewPlyIndex === null) return;
    if (viewPlyIndex + 1 >= playedMoves.length - 1) {
      setViewPlyIndex(null); // return to live
    } else {
      setViewPlyIndex(viewPlyIndex + 1);
    }
  };

  const handleNavLive = () => {
    setViewPlyIndex(null);
  };

  // Clock timers (milliseconds)
  const initialTimeMs = timeLimit === '5m' ? 300000 : timeLimit === '10m' ? 600000 : null;
  const [whiteTimeMs, setWhiteTimeMs] = useState<number | null>(initialTimeMs);
  const [blackTimeMs, setBlackTimeMs] = useState<number | null>(initialTimeMs);

  // Game Start & End State
  const [isGameStarted, setIsGameStarted] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [showGameOverModal, setShowGameOverModal] = useState<boolean>(false);
  const [gameResult, setGameResult] = useState<GameResult>('ongoing');
  const [gameOverReason, setGameOverReason] = useState<GameOverReason>(null);

  // Review State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisProgress, setAnalysisProgress] = useState<{ current: number; total: number } | null>(null);
  const [reviewData, setReviewData] = useState<GameReviewData | null>(null);
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);

  // Real-time Stockfish Hint State
  const [activeHint, setActiveHint] = useState<{
    from: string;
    to: string;
    san: string;
    score: number;
  } | null>(null);
  const [isHintLoading, setIsHintLoading] = useState<boolean>(false);

  // Real-time Evaluation Bar
  const [showEvalBar, setShowEvalBar] = useState<boolean>(() => {
    return localStorage.getItem('chess_show_eval_bar') !== 'false';
  });
  const [evalScore, setEvalScore] = useState<number | null>(0);
  const [isEvalLoading, setIsEvalLoading] = useState<boolean>(false);

  // Real-time Opening Detection
  const [lastDetectedOpening, setLastDetectedOpening] = useState<ChessOpening | null>(null);

  const activeMovesForOpening = (
    isViewingHistory && viewPlyIndex !== null && viewPlyIndex >= 0
      ? playedMoves.slice(0, viewPlyIndex + 1)
      : playedMoves
  ).map((m) => m.san);

  const detectedOpening = getOpeningFromMoves(activeMovesForOpening);
  const currentOpening = detectedOpening || lastDetectedOpening;

  useEffect(() => {
    if (detectedOpening) {
      setLastDetectedOpening(detectedOpening);
    }
  }, [detectedOpening]);

  // Interactive Opening Guide & Modal States
  const [showOpeningModal, setShowOpeningModal] = useState<boolean>(false);
  const [guidedOpening, setGuidedOpening] = useState<ChessOpening | null>(null);
  const [guidedStep, setGuidedStep] = useState<number>(0);
  const [guidedCompletionMessage, setGuidedCompletionMessage] = useState<string | null>(null);

  // Interactive Onboarding Feature Tour Guide State
  const [showTourGuide, setShowTourGuide] = useState<boolean>(false);

  // User Profile, Rankings & Archive State
  const [userProfile, setUserProfile] = useState<UserProfile>(() => loadUserProfile());
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showRankingModal, setShowRankingModal] = useState<boolean>(false);
  const [showArchiveModal, setShowArchiveModal] = useState<boolean>(false);
  const [gameArchives, setGameArchives] = useState<ArchivedGame[]>(() => loadGameArchive());
  const [reviewPlayerColor, setReviewPlayerColor] = useState<PieceColor>('w');
  const [resumedBannerMessage, setResumedBannerMessage] = useState<string | null>(null);
  const [watchedRematchInfo, setWatchedRematchInfo] = useState<{
    gameId: string;
    myColor: PieceColor;
    opponentName: string;
  } | null>(null);
  const [activePvpBoardGameId, setActivePvpBoardGameId] = useState<string | null>(null);
  const [incomingGlobalRematch, setIncomingGlobalRematch] = useState<boolean>(false);
  const [externalJoinGameId, setExternalJoinGameId] = useState<string | null>(null);
  const handleConsumeExternalJoin = React.useCallback(() => setExternalJoinGameId(null), []);
  const [pendingConfirmAction, setPendingConfirmAction] = useState<{
    type: 'resign' | 'new_game';
    nextSettings?: { diff: DifficultyLevel; time: TimeLimit; side: PlayerSide };
  } | null>(null);
  const [lastGameReward, setLastGameReward] = useState<LastGameReward | null>(null);
  const gameStartTimeRef = React.useRef<number>(Date.now());

  // Global background watcher for 1:1 Rematch when player moved to Lobby or another tab
  const isAwayFromWatchedBoard =
    !!watchedRematchInfo &&
    (activeTab !== 'pvp' || activePvpBoardGameId !== watchedRematchInfo.gameId);

  useEffect(() => {
    if (!watchedRematchInfo || !isAwayFromWatchedBoard) {
      setIncomingGlobalRematch(false);
      return;
    }

    const unsub = subscribeToGame(watchedRematchInfo.gameId, (updated) => {
      // If rematch game was created (e.g. opponent accepted our earlier rematch request while we were in lobby), auto-join!
      if (updated.nextGameId && updated.nextGameId !== watchedRematchInfo.gameId) {
        setIncomingGlobalRematch(false);
        setWatchedRematchInfo(null);
        setExternalJoinGameId(updated.nextGameId);
        setActiveTab('pvp');
        return;
      }

      if (updated.rematchOfferBy && updated.rematchOfferBy !== watchedRematchInfo.myColor) {
        setIncomingGlobalRematch((prev) => {
          if (!prev) soundManager.check();
          return true;
        });
      } else {
        setIncomingGlobalRematch(false);
      }
    });

    return () => unsub();
  }, [watchedRematchInfo, isAwayFromWatchedBoard]);

  const handleAcceptGlobalRematch = async () => {
    if (!watchedRematchInfo) return;
    const { gameId, myColor } = watchedRematchInfo;
    setIncomingGlobalRematch(false);
    setWatchedRematchInfo(null);
    const newId = await requestMultiplayerRematch(gameId, myColor);
    if (newId) {
      setExternalJoinGameId(newId);
      setActiveTab('pvp');
    }
  };

  const handleDeclineGlobalRematch = async () => {
    if (!watchedRematchInfo) return;
    const { gameId, myColor } = watchedRematchInfo;
    setIncomingGlobalRematch(false);
    await declineMultiplayerRematch(gameId, myColor);
  };

  // Auto-launch tour guide for first-time visitors
  useEffect(() => {
    try {
      const tourCompleted = localStorage.getItem('chess_feature_tour_completed');
      if (!tourCompleted) {
        const timer = setTimeout(() => {
          setShowTourGuide(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  // App Exit Confirmation State (on Android Back Button)
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);

  // Init Stockfish engine, sync online profile nickname, & auto-resume ongoing game on launch
  useEffect(() => {
    stockfishService.init().catch(console.error);
    syncUserProfileToOnlineRankings(userProfile).catch(console.warn);

    const saved = loadActiveGame();
    if (saved && saved.playedMoves.length > 0) {
      let restoredChess = new Chess();
      try {
        if (saved.playedMoves[0]?.fenBefore) {
          restoredChess = new Chess(saved.playedMoves[0].fenBefore);
        }
        for (const m of saved.playedMoves) {
          restoredChess.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
        }
      } catch {
        try {
          restoredChess.load(saved.fen);
        } catch {}
      }

      if (!restoredChess.isGameOver()) {
        const session = ++gameSessionRef.current;
        setIsGameStarted(true);
        setDifficulty(saved.difficulty);
        setTimeLimit(saved.timeLimit);
        setChosenSide(saved.chosenSide);
        setPlayerColor(saved.playerColor);
        setChess(restoredChess);
        setPlayedMoves(saved.playedMoves);
        setLastMove(saved.lastMove);
        setWhiteTimeMs(saved.whiteTimeMs);
        setBlackTimeMs(saved.blackTimeMs);
        gameStartTimeRef.current = saved.startedAt || Date.now();
        setResumedBannerMessage(
          `🔄 진행 중이던 이전 대국(${saved.playedMoves.length}수)을 자동으로 복구했습니다.`
        );
        const toastTimer = setTimeout(() => setResumedBannerMessage(null), 5000);

        if (restoredChess.turn() !== saved.playerColor) {
          setTimeout(() => {
            if (gameSessionRef.current === session) {
              triggerAiMove(
                restoredChess,
                saved.difficulty,
                saved.playedMoves,
                saved.playerColor,
                session
              );
            }
          }, 600);
        }
        return () => clearTimeout(toastTimer);
      } else {
        clearActiveGame();
      }
    }
  }, []);

  // Auto-save active ongoing game to localStorage
  useEffect(() => {
    if (isGameOver) {
      clearActiveGame();
      return;
    }
    if (playedMoves.length === 0) return;

    saveActiveGame({
      fen: chess.fen(),
      playedMoves,
      difficulty,
      timeLimit,
      chosenSide,
      playerColor,
      whiteTimeMs,
      blackTimeMs,
      lastMove,
      startedAt: gameStartTimeRef.current,
      savedAt: Date.now(),
    });
  }, [
    chess,
    playedMoves,
    difficulty,
    timeLimit,
    chosenSide,
    playerColor,
    whiteTimeMs,
    blackTimeMs,
    lastMove,
    isGameOver,
  ]);

  // Hardware Back Button Handler for Android
  useEffect(() => {
    let listenerHandle: any = null;
    const setupBackHandler = async () => {
      try {
        listenerHandle = await CapApp.addListener('backButton', () => {
          if (pendingConfirmAction) {
            setPendingConfirmAction(null);
            return;
          }
          if (showTourGuide) {
            setShowTourGuide(false);
            return;
          }
          if (showArchiveModal) {
            setShowArchiveModal(false);
            return;
          }
          if (showOpeningModal) {
            setShowOpeningModal(false);
            return;
          }
          if (showExitConfirm) {
            setShowExitConfirm(false);
            return;
          }
          if (showGameOverModal) {
            setShowGameOverModal(false);
            return;
          }
          if (showReviewModal) {
            setShowReviewModal(false);
            return;
          }
          if (showSettingsModal) {
            setShowSettingsModal(false);
            return;
          }
          if (activeTab !== 'play') {
            setActiveTab('play');
            return;
          }
          if (isViewingHistory) {
            setViewPlyIndex(null);
            return;
          }
          setShowExitConfirm(true);
        });
      } catch (err) {
        // Fallback for non-Capacitor web environments
      }
    };
    setupBackHandler();

    return () => {
      if (listenerHandle && typeof listenerHandle.remove === 'function') {
        listenerHandle.remove();
      }
    };
  }, [
    pendingConfirmAction,
    showTourGuide,
    showArchiveModal,
    showOpeningModal,
    showExitConfirm,
    showGameOverModal,
    showReviewModal,
    showSettingsModal,
    activeTab,
    isViewingHistory,
  ]);

  // Keyboard navigation (ArrowLeft: previous move, ArrowRight: next move)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        activeTab !== 'play' ||
        showTourGuide ||
        showOpeningModal ||
        showSettingsModal ||
        showReviewModal ||
        showGameOverModal ||
        showExitConfirm
      ) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        handleNavPrev();
      } else if (e.key === 'ArrowRight') {
        handleNavNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeTab,
    showSettingsModal,
    showReviewModal,
    showGameOverModal,
    showExitConfirm,
    playedMoves,
    viewPlyIndex,
  ]);

  const recordGameResult = (
    result: 'win' | 'loss' | 'draw',
    finalMoves: PlayedMoveRecord[] = playedMoves,
    reason: GameOverReason = gameOverReason,
    finalFen: string = chess.fen()
  ) => {
    clearActiveGame();
    const elapsedSec = Math.max(5, Math.round((Date.now() - gameStartTimeRef.current) / 1000));
    const moveCount = finalMoves.length;

    // Update profile in localStorage and get Elo delta & achievements
    const outcome = recordProfileGameResult(result, difficulty, moveCount, elapsedSec);
    setUserProfile(outcome.profile);
    setLastGameReward({
      ratingDelta: outcome.ratingDelta,
      isFirstConquest: outcome.isFirstConquest,
      isBestMoves: outcome.isBestMoves,
      isBestTime: outcome.isBestTime,
    });

    // Save completed AI game to local archive if at least 1 move was played
    if (finalMoves.length > 0) {
      const winnerSide: '1-0' | '0-1' | '1/2-1/2' =
        result === 'draw'
          ? '1/2-1/2'
          : (result === 'win' && playerColor === 'w') ||
            (result === 'loss' && playerColor === 'b')
          ? '1-0'
          : '0-1';

      const aiDisplayName = AI_NAMES[difficulty] || `Stockfish AI (Lv.${difficulty})`;
      const pgn = buildStandardPgn(finalMoves, {
        event: `Chess Master AI vs ${aiDisplayName}`,
        white: playerColor === 'w' ? outcome.profile.nickname : aiDisplayName,
        black: playerColor === 'b' ? outcome.profile.nickname : aiDisplayName,
        result: winnerSide,
      });
      const detectedOp = getOpeningFromMoves(finalMoves.map((m) => m.san));

      saveGameToArchive({
        date: new Date().toISOString(),
        mode: 'ai',
        opponentName: aiDisplayName,
        aiLevel: difficulty,
        playerColor,
        result,
        reason,
        moveCount,
        durationSec: elapsedSec,
        pgn,
        finalFen,
        openingName: detectedOp?.nameKo || lastDetectedOpening?.nameKo,
        moves: finalMoves,
      });
      setGameArchives(loadGameArchive());
    }

    // If victory, submit to Firebase online ranking if configured
    if (result === 'win' && moveCount > 0) {
      submitOnlineScore({
        userId: outcome.profile.id,
        nickname: outcome.profile.nickname,
        avatar: outcome.profile.avatar,
        avatarColor: outcome.profile.avatarColor,
        rating: outcome.profile.rating,
        aiLevel: difficulty,
        moves: moveCount,
        timeSec: elapsedSec,
        date: new Date().toISOString().substring(0, 10),
      }).catch((err) => console.warn('Online score submission failed/skipped:', err));
    }

    setStats((prev) => {
      const newGames = prev.gamesPlayed + 1;
      const newWins = result === 'win' ? prev.wins + 1 : prev.wins;
      const newLosses = result === 'loss' ? prev.losses + 1 : prev.losses;

      try {
        localStorage.setItem('chess_games_played', String(newGames));
        if (result === 'win') localStorage.setItem('chess_wins', String(newWins));
        if (result === 'loss') localStorage.setItem('chess_losses', String(newLosses));
      } catch {
        // ignore quota errors
      }

      return {
        gamesPlayed: newGames,
        wins: newWins,
        losses: newLosses,
      };
    });
  };

  // Keep clocks and orientation preview synced with settings before the first game starts
  useEffect(() => {
    if (!isGameStarted && playedMoves.length === 0 && !isGameOver) {
      const ms = timeLimit === '5m' ? 300000 : timeLimit === '10m' ? 600000 : null;
      setWhiteTimeMs(ms);
      setBlackTimeMs(ms);
      if (chosenSide === 'white') setPlayerColor('w');
      else if (chosenSide === 'black') setPlayerColor('b');
    }
  }, [isGameStarted, timeLimit, chosenSide, playedMoves.length, isGameOver]);

  // Clock countdown interval (only ticks after '게임 시작' is pressed)
  useEffect(() => {
    if (
      !isGameStarted ||
      showTourGuide ||
      activeTab !== 'play' ||
      isGameOver ||
      timeLimit === 'unlimited'
    ) {
      return;
    }

    const interval = setInterval(() => {
      const turn = chess.turn();
      if (turn === 'w') {
        setWhiteTimeMs((prev) => {
          if (prev === null) return null;
          if (prev <= 1000) {
            handleTimeout('w');
            return 0;
          }
          if (playerColor === 'w' && prev <= 31000 && (prev === 30000 || prev <= 10000)) {
            soundManager.lowTime();
          }
          return prev - 1000;
        });
      } else {
        setBlackTimeMs((prev) => {
          if (prev === null) return null;
          if (prev <= 1000) {
            handleTimeout('b');
            return 0;
          }
          if (playerColor === 'b' && prev <= 31000 && (prev === 30000 || prev <= 10000)) {
            soundManager.lowTime();
          }
          return prev - 1000;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isGameStarted, showTourGuide, activeTab, chess, isGameOver, timeLimit, playerColor]);

  const handleTimeout = (loserColor: PieceColor) => {
    gameSessionRef.current += 1;
    setPremove(null);
    setIsAiThinking(false);
    setIsGameOver(true);
    setGameOverReason('timeout');
    const outcome = loserColor === playerColor ? 'loss' : 'win';
    setGameResult(outcome);
    recordGameResult(outcome, playedMoves, 'timeout', chess.fen());
    if (outcome === 'win') {
      soundManager.victory();
    } else {
      soundManager.defeat();
    }
    setTimeout(() => {
      setShowGameOverModal(true);
    }, 1200);
  };

  // Real-time evaluation updater for current displayed board (live or historical)
  // Automatically updates when displayChess or showEvalBar changes, with cancellation
  useEffect(() => {
    if (!showEvalBar) return;
    let cancelled = false;
    const currentFen = displayChess.fen();
    setIsEvalLoading(true);
    stockfishService
      .evaluatePosition(currentFen, 8)
      .then((res) => {
        if (!cancelled) {
          setEvalScore(res.score);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setIsEvalLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [displayChess, showEvalBar]);

  const handleToggleEvalBar = (enabled: boolean) => {
    setShowEvalBar(enabled);
    try {
      localStorage.setItem('chess_show_eval_bar', String(enabled));
    } catch {}
  };

  const handleRequestHint = async () => {
    if (isViewingHistory) {
      setViewPlyIndex(null);
    }
    if (!isGameStarted || isGameOver || isAiThinking || isHintLoading || chess.turn() !== playerColor) return;
    const session = gameSessionRef.current;
    setIsHintLoading(true);
    try {
      const hint = await stockfishService.getHint(chess.fen(), 10);
      if (hint && gameSessionRef.current === session) {
        setActiveHint(hint);
        soundManager.move();
      }
    } catch (e) {
      console.error('Hint error:', e);
    } finally {
      if (gameSessionRef.current === session) {
        setIsHintLoading(false);
      }
    }
  };

  // Start / Reset Game
  const startNewGame = (
    newDifficulty = difficulty,
    newTime = timeLimit,
    newSide = chosenSide
  ) => {
    clearActiveGame();
    setIsGameStarted(true);
    setResumedBannerMessage(null);
    setPendingConfirmAction(null);
    setPremove(null);
    const session = ++gameSessionRef.current;
    const newChess = new Chess();
    setChess(newChess);
    setViewPlyIndex(null);
    setPlayedMoves([]);
    setLastMove(null);
    setIsAiThinking(false);
    setIsGameOver(false);
    setShowGameOverModal(false);
    setGameResult('ongoing');
    setGameOverReason(null);
    setLastGameReward(null);
    gameStartTimeRef.current = Date.now();
    setReviewData(null);
    setActiveHint(null);
    setLastDetectedOpening(null);
    setEvalScore(0);
    setGuidedOpening(null);
    setGuidedStep(0);
    setGuidedCompletionMessage(null);

    // Determine actual color
    let actualColor: PieceColor = 'w';
    if (newSide === 'black') actualColor = 'b';
    else if (newSide === 'random') actualColor = Math.random() < 0.5 ? 'w' : 'b';
    setPlayerColor(actualColor);

    // Reset clocks
    const ms = newTime === '5m' ? 300000 : newTime === '10m' ? 600000 : null;
    setWhiteTimeMs(ms);
    setBlackTimeMs(ms);

    setShowSettingsModal(false);

    // If AI is White, AI moves first!
    if (actualColor === 'b') {
      setTimeout(() => {
        if (gameSessionRef.current === session) {
          triggerAiMove(newChess, newDifficulty, [], actualColor, session);
        }
      }, 500);
    }
  };

  // Request New Game with confirmation if an active game has moves
  const requestNewGame = (
    newDifficulty = difficulty,
    newTime = timeLimit,
    newSide = chosenSide
  ) => {
    if (!isGameOver && playedMoves.length > 0) {
      setPendingConfirmAction({
        type: 'new_game',
        nextSettings: { diff: newDifficulty, time: newTime, side: newSide },
      });
      return;
    }
    startNewGame(newDifficulty, newTime, newSide);
  };

  // Start Guided Opening Game
  const handleStartGuidedOpening = (opening: ChessOpening) => {
    clearActiveGame();
    setIsGameStarted(true);
    setResumedBannerMessage(null);
    setPremove(null);
    const session = ++gameSessionRef.current;
    const side: PieceColor = opening.recommendedSide || 'w';
    const newChess = new Chess();
    setChess(newChess);
    setViewPlyIndex(null);
    setPlayedMoves([]);
    setLastMove(null);
    setIsAiThinking(false);
    setIsGameOver(false);
    setShowGameOverModal(false);
    setGameResult('ongoing');
    setGameOverReason(null);
    setLastGameReward(null);
    gameStartTimeRef.current = Date.now();
    setReviewData(null);
    setActiveHint(null);
    setLastDetectedOpening(opening);
    setEvalScore(0);
    setPlayerColor(side);
    setChosenSide(side === 'w' ? 'white' : 'black');
    setGuidedOpening(opening);
    setGuidedStep(0);
    setGuidedCompletionMessage(null);
    setShowOpeningModal(false);

    // Reset clocks
    const ms = timeLimit === '5m' ? 300000 : timeLimit === '10m' ? 600000 : null;
    setWhiteTimeMs(ms);
    setBlackTimeMs(ms);

    // If player is Black, AI (White) plays first move
    if (side === 'b') {
      const firstMoveSan = opening.moves[0];
      setTimeout(() => {
        if (gameSessionRef.current === session) {
          executeAiGuidedMove(newChess, firstMoveSan, opening, 0, [], side, session);
        }
      }, 500);
    }
  };

  const handleCancelGuidedOpening = () => {
    setGuidedOpening(null);
    setGuidedCompletionMessage('오프닝 가이드를 종료하고 자유 실전 대국으로 전환했습니다.');
    setTimeout(() => setGuidedCompletionMessage(null), 3000);
  };

  // Execute AI's move according to Guided Opening book
  const executeAiGuidedMove = (
    currentChess: Chess,
    targetSan: string,
    opening: ChessOpening,
    stepIdx: number,
    currentHistory: PlayedMoveRecord[],
    humanColor: PieceColor = playerColor,
    session: number = gameSessionRef.current
  ) => {
    if (gameSessionRef.current !== session) return;
    setIsAiThinking(true);
    const movingColor: PieceColor = currentChess.turn();
    const fenBefore = currentChess.fen();

    try {
      const move = currentChess.move(targetSan);
      if (move) {
        if (move.captured) {
          soundManager.capture();
        } else {
          soundManager.move();
        }

        const fenAfter = currentChess.fen();
        const ply = currentHistory.length;
        const moveRecord: PlayedMoveRecord = {
          ply,
          moveNumber: Math.floor(ply / 2) + 1,
          color: movingColor,
          san: move.san,
          from: move.from,
          to: move.to,
          promotion: move.promotion,
          captured: move.captured,
          fenBefore,
          fenAfter,
        };

        const updatedMoves = [...currentHistory, moveRecord];
        setPlayedMoves(updatedMoves);
        setLastMove({ from: move.from, to: move.to });
        const nextChess = new Chess();
        try {
          nextChess.loadPgn(currentChess.pgn());
        } catch {
          nextChess.load(fenAfter);
        }
        setChess(nextChess);

        if (nextChess.isCheck()) {
          soundManager.check();
        }

        const nextStep = stepIdx + 1;
        setGuidedStep(nextStep);

        if (nextStep >= opening.moves.length) {
          setGuidedOpening(null);
          setGuidedCompletionMessage(
            `🎉 '${opening.nameKo}' 오프닝 가이드 수순을 모두 완료했습니다! 이제부터 자유롭게 실전 대국을 이어가세요.`
          );
          setTimeout(() => setGuidedCompletionMessage(null), 6000);
        }

        checkGameOver(nextChess, humanColor, updatedMoves);
      }
    } catch (err) {
      console.error('Guided AI move error:', err);
    } finally {
      if (gameSessionRef.current === session) {
        setIsAiThinking(false);
      }
    }
  };

  // Player Move Handler (referentially stable via useCallback so ChessBoard React.memo avoids 1s clock re-renders)
  const handlePlayerMoveImplRef = React.useRef<
    (from: string, to: string, promotion?: string) => boolean
  >(() => false);

  handlePlayerMoveImplRef.current = (from: string, to: string, promotion = 'q'): boolean => {
    if (isViewingHistory) {
      setViewPlyIndex(null);
      return false;
    }
    if (!isGameStarted || isGameOver || isAiThinking || chess.turn() !== playerColor) return false;

    const session = gameSessionRef.current;
    const fenBefore = chess.fen();
    try {
      const move = chess.move({ from, to, promotion });
      if (!move) return false;

      const hintFollowed = !!(
        activeHint &&
        activeHint.from.toLowerCase() === from.toLowerCase() &&
        activeHint.to.toLowerCase() === to.toLowerCase()
      );
      const hintBestSan = activeHint ? activeHint.san : undefined;
      setActiveHint(null);

      if (move.captured) {
        soundManager.capture();
      } else {
        soundManager.move();
      }

      const fenAfter = chess.fen();
      const ply = playedMoves.length;
      const moveRecord: PlayedMoveRecord = {
        ply,
        moveNumber: Math.floor(ply / 2) + 1,
        color: playerColor,
        san: move.san,
        from,
        to,
        promotion: move.promotion,
        captured: move.captured,
        fenBefore,
        fenAfter,
        hintFollowed,
        hintBestSan,
      };

      const updatedMoves = [...playedMoves, moveRecord];
      setPlayedMoves(updatedMoves);
      setLastMove({ from, to });
      const nextChess = new Chess();
      try {
        nextChess.loadPgn(chess.pgn());
      } catch {
        nextChess.load(fenAfter);
      }
      setChess(nextChess);

      if (nextChess.isCheck()) {
        soundManager.check();
      }

      if (checkGameOver(nextChess, playerColor, updatedMoves)) return true;

      // Handle Guided Opening progression
      if (guidedOpening) {
        const expectedSan = guidedOpening.moves[guidedStep];
        const isGuidedMatch = move.san === expectedSan;
        const nextStep = guidedStep + 1;

        if (isGuidedMatch) {
          if (nextStep >= guidedOpening.moves.length) {
            // Player just completed the final guided move!
            setGuidedOpening(null);
            setGuidedCompletionMessage(
              `🎉 '${guidedOpening.nameKo}' 오프닝 수순 완료! 이제부터 스톡피쉬 AI와의 실전이 계속됩니다.`
            );
            setTimeout(() => setGuidedCompletionMessage(null), 6000);
            triggerAiMove(nextChess, difficulty, updatedMoves, playerColor, session);
          } else {
            // Next move in book is AI's response
            setGuidedStep(nextStep);
            const aiSan = guidedOpening.moves[nextStep];
            setTimeout(() => {
              executeAiGuidedMove(
                nextChess,
                aiSan,
                guidedOpening,
                nextStep,
                updatedMoves,
                playerColor,
                session
              );
            }, 500);
          }
        } else {
          // Player played a different move: gracefully exit guided mode
          setGuidedOpening(null);
          setGuidedCompletionMessage(
            `💡 가이드 수순과 다른 수를 두어 자유 실전 대국으로 전환되었습니다.`
          );
          setTimeout(() => setGuidedCompletionMessage(null), 4000);
          triggerAiMove(nextChess, difficulty, updatedMoves, playerColor, session);
        }
      } else {
        // Normal AI Turn
        triggerAiMove(nextChess, difficulty, updatedMoves, playerColor, session);
      }
      return true;
    } catch {
      return false;
    }
  };

  const handlePlayerMove = useCallback((from: string, to: string, promotion?: string) => {
    return handlePlayerMoveImplRef.current(from, to, promotion);
  }, []);

  // Auto-execute queued Premove when AI finishes thinking and turn returns to playerColor
  useEffect(() => {
    if (!premove) return;
    if (!isGameStarted || isGameOver || isViewingHistory) {
      setPremove(null);
      return;
    }
    if (isAiThinking || chess.turn() !== playerColor) return;

    const queued = premove;
    setPremove(null);
    try {
      const test = new Chess(chess.fen());
      const legal = test.move({
        from: queued.from,
        to: queued.to,
        promotion: queued.promotion || 'q',
      });
      if (legal) {
        handlePlayerMove(queued.from, queued.to, queued.promotion || 'q');
      }
    } catch {
      // Illegal premove in new position -> silently canceled
    }
  }, [
    premove,
    isGameStarted,
    isGameOver,
    isViewingHistory,
    isAiThinking,
    chess,
    playerColor,
    handlePlayerMove,
  ]);

  // AI Move Handler
  const triggerAiMove = async (
    currentChess: Chess,
    aiLevel: DifficultyLevel,
    currentHistory = playedMoves,
    humanColor: PieceColor = playerColor,
    session: number = gameSessionRef.current
  ) => {
    if (gameSessionRef.current !== session) return;
    setIsAiThinking(true);
    const movingAiColor: PieceColor = currentChess.turn();
    const fenBefore = currentChess.fen();
    const thinkStartTime = Date.now();

    try {
      const best = await stockfishService.getBestMove(fenBefore, aiLevel);
      if (gameSessionRef.current !== session) return;

      // AI가 너무 즉시 두지 않고 2초간 자연스럽게 수를 생각하도록 딜레이 적용
      const elapsed = Date.now() - thinkStartTime;
      const targetDelayMs = 2000; // 2초
      if (elapsed < targetDelayMs) {
        await new Promise((resolve) => setTimeout(resolve, targetDelayMs - elapsed));
      }
      if (gameSessionRef.current !== session) return;

      if (best) {
        const move = currentChess.move({
          from: best.from,
          to: best.to,
          promotion: best.promotion || 'q',
        });

        if (move) {
          if (move.captured) {
            soundManager.capture();
          } else {
            soundManager.move();
          }

          const fenAfter = currentChess.fen();
          const ply = currentHistory.length;
          const moveRecord: PlayedMoveRecord = {
            ply,
            moveNumber: Math.floor(ply / 2) + 1,
            color: movingAiColor,
            san: move.san,
            from: best.from,
            to: best.to,
            promotion: move.promotion,
            captured: move.captured,
            fenBefore,
            fenAfter,
          };

          const updatedMoves = [...currentHistory, moveRecord];
          setPlayedMoves(updatedMoves);
          setLastMove({ from: best.from, to: best.to });
          const nextChess = new Chess();
          try {
            nextChess.loadPgn(currentChess.pgn());
          } catch {
            nextChess.load(fenAfter);
          }
          setChess(nextChess);

          if (nextChess.isCheck()) {
            soundManager.check();
          }

          checkGameOver(nextChess, humanColor, updatedMoves);
        }
      }
    } catch (err) {
      console.error('AI move error:', err);
    } finally {
      if (gameSessionRef.current === session) {
        setIsAiThinking(false);
      }
    }
  };

  const isThreefoldRepetitionInHistory = (history: PlayedMoveRecord[], currentFen: string): boolean => {
    const targetKey = getPositionKey(currentFen);
    let count = 0;
    const initialKey = getPositionKey(history[0]?.fenBefore || new Chess().fen());
    if (initialKey === targetKey) count++;
    for (const m of history) {
      if (getPositionKey(m.fenAfter) === targetKey) {
        count++;
        if (count >= 3) return true;
      }
    }
    return false;
  };

  const checkGameOver = (
    game: Chess,
    humanColor: PieceColor,
    history: PlayedMoveRecord[] = playedMoves
  ): boolean => {
    if (game.isCheckmate()) {
      setIsGameOver(true);
      setPremove(null);
      setActiveHint(null);
      setGameOverReason('checkmate');
      const outcome = game.turn() === humanColor ? 'loss' : 'win';
      setGameResult(outcome);
      recordGameResult(outcome, history, 'checkmate', game.fen());
      setEvalScore(game.turn() === 'w' ? -10000 : 10000);
      if (outcome === 'win') {
        soundManager.victory();
      } else {
        soundManager.defeat();
      }
      // Delay alert so player can clearly see the checkmate on the board first!
      setTimeout(() => {
        setShowGameOverModal(true);
      }, 1500);
      return true;
    }

    const isRepetition = game.isThreefoldRepetition() || isThreefoldRepetitionInHistory(history, game.fen());
    if (game.isDraw() || game.isStalemate() || isRepetition || game.isInsufficientMaterial()) {
      const drawReason: GameOverReason = game.isStalemate()
        ? 'stalemate'
        : isRepetition
        ? 'threefold_repetition'
        : 'insufficient_material';
      setIsGameOver(true);
      setPremove(null);
      setActiveHint(null);
      setGameOverReason(drawReason);
      setGameResult('draw');
      recordGameResult('draw', history, drawReason, game.fen());
      setEvalScore(0);
      soundManager.draw();
      setTimeout(() => {
        setShowGameOverModal(true);
      }, 1500);
      return true;
    }
    return false;
  };

  // Undo Move (Restores moves accurately from history, including custom FEN imports)
  const handleUndo = () => {
    setViewPlyIndex(null);
    setPremove(null);
    const minMoves = playedMoves[0]?.fenBefore && playedMoves[0].color === playerColor ? 2 : playerColor === 'w' ? 2 : 3;
    if (isGameOver || isAiThinking || playedMoves.length < minMoves) return;
    gameSessionRef.current += 1;
    soundManager.move();
    setActiveHint(null);

    const baseStartFen = playedMoves[0]?.fenBefore;
    const newHistory = playedMoves.slice(0, -2);
    setPlayedMoves(newHistory);

    const restoredChess = baseStartFen ? new Chess(baseStartFen) : new Chess();
    for (const m of newHistory) {
      restoredChess.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
    }
    setChess(restoredChess);
    const prevMove = newHistory[newHistory.length - 1];
    setLastMove(prevMove ? { from: prevMove.from, to: prevMove.to } : null);

    if (guidedOpening) {
      setGuidedStep(newHistory.length);
    }
  };

  // Request Resign with confirmation modal
  const requestResign = () => {
    if (!isGameStarted || isGameOver) return;
    setPendingConfirmAction({ type: 'resign' });
  };

  // Execute Confirmed Resign
  const handleResign = () => {
    if (isGameOver) return;
    setPendingConfirmAction(null);
    setPremove(null);
    gameSessionRef.current += 1;
    setIsAiThinking(false);
    setIsGameOver(true);
    setActiveHint(null);
    setGameOverReason('resignation');
    setGameResult('loss');
    recordGameResult('loss', playedMoves, 'resignation', chess.fen());
    soundManager.defeat();
    setTimeout(() => {
      setShowGameOverModal(true);
    }, 600);
  };

  // Run Game Review for any move list (with 0ms local cache lookup & persistence)
  const runMovesReview = async (
    movesToAnalyze: PlayedMoveRecord[],
    targetPlayerColor: PieceColor = playerColor,
    archivedGame?: ArchivedGame
  ) => {
    if (movesToAnalyze.length === 0) return;
    setShowArchiveModal(false);
    setShowGameOverModal(false);
    setReviewPlayerColor(targetPlayerColor);

    const cached = getCachedReviewForMoves(movesToAnalyze, archivedGame);
    if (cached) {
      setReviewData(cached);
      setShowReviewModal(true);
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress({ current: 0, total: movesToAnalyze.length });

    try {
      const result = await stockfishService.analyzeGame(movesToAnalyze, (curr, total) => {
        setAnalysisProgress({ current: curr, total });
      });
      const updatedArchives = saveCachedReviewForMoves(
        movesToAnalyze,
        result,
        archivedGame?.id
      );
      setGameArchives(updatedArchives);
      setReviewData(result);
      setShowReviewModal(true);
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(null);
    }
  };

  const runGameReview = async () => {
    await runMovesReview(playedMoves, playerColor);
  };

  // External PGN / FEN Import -> AI Coach Review
  const handleImportAndReview = (rawText: string, perspective: 'w' | 'b'): string | null => {
    const parsed = parseImportedPgnOrFen(rawText);
    if (!parsed.ok) return parsed.error;
    if (parsed.isCustomFenOnly || parsed.moves.length === 0) {
      return '단일 FEN 국면은 수순이 없으므로 [이 국면 AI와 대국] 버튼을 이용해 주세요.';
    }

    const oppName =
      perspective === 'w'
        ? parsed.blackName || '외부 기보 (흑)'
        : parsed.whiteName || '외부 기보 (백)';
    const detectedOp = getOpeningFromMoves(parsed.moves.map((m) => m.san));

    const savedArc = saveGameToArchive({
      date: new Date().toISOString(),
      mode: 'ai',
      opponentName: `외부 기보 · ${oppName}`,
      playerColor: perspective,
      result: 'draw',
      reason: null,
      moveCount: parsed.moves.length,
      durationSec: Math.max(10, parsed.moves.length * 5),
      pgn: parsed.pgn,
      finalFen: parsed.finalFen,
      openingName: detectedOp?.nameKo,
      moves: parsed.moves,
    });
    setGameArchives(loadGameArchive());
    runMovesReview(parsed.moves, perspective, savedArc);
    return null;
  };

  // External PGN / FEN Import -> Load onto Board & Play vs Stockfish AI
  const handleImportToBoard = (rawText: string): string | null => {
    const parsed = parseImportedPgnOrFen(rawText);
    if (!parsed.ok) return parsed.error;

    let loadedChess = new Chess(parsed.startFen);
    try {
      for (const m of parsed.moves) {
        loadedChess.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
      }
    } catch {
      loadedChess = new Chess(parsed.finalFen);
    }

    if (loadedChess.isGameOver()) {
      return '이미 체크메이트 또는 무승부로 종료된 국면입니다. [AI 코치 복기 분석]을 이용해 주세요.';
    }

    clearActiveGame();
    setActiveTab('play');
    const session = ++gameSessionRef.current;
    const humanSide: PieceColor = loadedChess.turn();
    setIsGameStarted(true);
    setIsGameOver(false);
    setShowGameOverModal(false);
    setGameResult('ongoing');
    setGameOverReason(null);
    setLastGameReward(null);
    setPremove(null);
    setActiveHint(null);
    setGuidedOpening(null);
    setGuidedStep(0);
    setViewPlyIndex(null);
    setPlayerColor(humanSide);
    setChosenSide(humanSide === 'w' ? 'white' : 'black');
    setChess(loadedChess);
    setPlayedMoves(parsed.moves);
    const lastMv = parsed.moves[parsed.moves.length - 1];
    setLastMove(lastMv ? { from: lastMv.from, to: lastMv.to } : null);

    const ms = timeLimit === '5m' ? 300000 : timeLimit === '10m' ? 600000 : null;
    setWhiteTimeMs(ms);
    setBlackTimeMs(ms);
    gameStartTimeRef.current = Date.now();

    setResumedBannerMessage(
      parsed.isCustomFenOnly
        ? `📥 외부 FEN 국면을 불러왔습니다 (${humanSide === 'w' ? '백' : '흑'} 차례 · AI와 대국 시작!)`
        : `📥 외부 기보(${parsed.moves.length}수)를 불러왔습니다 (${humanSide === 'w' ? '백' : '흑'} 진영으로 이어 두기!)`
    );
    setTimeout(() => {
      if (gameSessionRef.current === session) {
        setResumedBannerMessage(null);
      }
    }, 5500);
    soundManager.gameStart();
    return null;
  };

  // Material & captured pieces calculation (accurately tracks captures and promotions)
  const calculatePiecesAndMaterial = (
    targetChess: Chess = displayChess,
    activeMoves: PlayedMoveRecord[] = (
      isViewingHistory && viewPlyIndex !== null && viewPlyIndex >= 0
        ? playedMoves.slice(0, viewPlyIndex + 1)
        : (viewPlyIndex === -1 ? [] : playedMoves)
    )
  ) => {
    const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    const board = targetChess.board();

    let whiteScore = 0;
    let blackScore = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type !== 'k') {
          if (p.color === 'w') whiteScore += values[p.type] || 0;
          else blackScore += values[p.type] || 0;
        }
      }
    }

    const whiteCaptured: Record<'p' | 'n' | 'b' | 'r' | 'q', number> = {
      p: 0,
      n: 0,
      b: 0,
      r: 0,
      q: 0,
    };
    const blackCaptured: Record<'p' | 'n' | 'b' | 'r' | 'q', number> = {
      p: 0,
      n: 0,
      b: 0,
      r: 0,
      q: 0,
    };

    for (const m of activeMoves) {
      if (m.captured && (m.captured === 'p' || m.captured === 'n' || m.captured === 'b' || m.captured === 'r' || m.captured === 'q')) {
        if (m.color === 'w') {
          whiteCaptured[m.captured] += 1;
        } else {
          blackCaptured[m.captured] += 1;
        }
      }
    }

    return {
      whiteCaptured,
      blackCaptured,
      whiteDiff: Math.max(0, whiteScore - blackScore),
      blackDiff: Math.max(0, blackScore - whiteScore),
    };
  };

  const matData = calculatePiecesAndMaterial(displayChess);
  const aiColor: PieceColor = playerColor === 'w' ? 'b' : 'w';

  // Real-time Hint visual props for board (only show on live board)
  // Current guided move info if guidedOpening is active
  const currentGuidedMoveInfo = useMemo(() => {
    if (!guidedOpening || isViewingHistory || chess.turn() !== playerColor) return null;
    const targetSan = guidedOpening.moves[guidedStep];
    if (!targetSan) return null;
    const legalMoves = chess.moves({ verbose: true });
    const matched = legalMoves.find((m) => m.san === targetSan);
    if (!matched) return null;
    return {
      san: targetSan,
      from: matched.from,
      to: matched.to,
      explanation: guidedOpening.moveExplanationsKo?.[guidedStep],
    };
  }, [guidedOpening, guidedStep, chess, playerColor, isViewingHistory]);

  // Combined Visual cues for Board: hints take priority, else guided opening cues
  const activeArrows: BoardArrow[] = useMemo(() => {
    if (isViewingHistory) return [];
    if (activeHint) {
      return [{ from: activeHint.from, to: activeHint.to, color: '#10b981', opacity: 0.95 }];
    }
    if (currentGuidedMoveInfo) {
      return [{ from: currentGuidedMoveInfo.from, to: currentGuidedMoveInfo.to, color: '#f59e0b', opacity: 0.95 }];
    }
    return [];
  }, [isViewingHistory, activeHint, currentGuidedMoveInfo]);

  const activeHighlights: Record<string, string> = useMemo(() => {
    if (isViewingHistory) return {};
    if (activeHint) {
      return {
        [activeHint.from]: 'bg-emerald-500/35 ring-2 ring-emerald-400/70',
        [activeHint.to]: 'bg-emerald-500/50 ring-2 ring-emerald-400',
      };
    }
    if (currentGuidedMoveInfo) {
      return {
        [currentGuidedMoveInfo.from]: 'bg-amber-500/35 ring-2 ring-amber-400/70',
        [currentGuidedMoveInfo.to]: 'bg-amber-500/50 ring-2 ring-amber-400',
      };
    }
    return {};
  }, [isViewingHistory, activeHint, currentGuidedMoveInfo]);

  const activeBadges: Record<string, SquareBadge> = useMemo(() => {
    if (isViewingHistory) return {};
    if (activeHint) {
      return {
        [activeHint.to]: {
          text: '💡 최적',
          className: 'bg-emerald-600 text-white font-black',
        },
      };
    }
    if (currentGuidedMoveInfo) {
      return {
        [currentGuidedMoveInfo.to]: {
          text: `📖 ${currentGuidedMoveInfo.san}`,
          className: 'bg-amber-500 text-zinc-950 font-black shadow-md',
        },
      };
    }
    return {};
  }, [isViewingHistory, activeHint, currentGuidedMoveInfo]);

  return (
    <div className="flex flex-col h-full w-full max-w-md mx-auto bg-zinc-950 text-zinc-100 select-none overflow-hidden">
      {/* Top Navigation Bar with Status Bar Safe Inset */}
      <header
        className="flex items-center justify-between px-4 pb-2.5 border-b border-zinc-800/80 bg-zinc-900/90 backdrop-blur-md shrink-0"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        }}
      >
        {/* Left: User Profile Quick Bar (Clickable) */}
        <button
          type="button"
          data-tour="profile-badge"
          onClick={() => setShowProfileModal(true)}
          className="flex items-center gap-2 text-left hover:opacity-90 active:scale-98 transition-all group"
          title="내 프로필 & 전적 확인"
        >
          <AvatarIcon avatar={userProfile.avatar} color={userProfile.avatarColor} size="sm" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors truncate max-w-[90px] xs:max-w-[130px]">
                {userProfile.nickname}
              </span>
              <span className="text-[10px]">{getTier(userProfile.rating).icon}</span>
            </div>
            <div className="text-[10px] font-mono font-bold text-amber-400/90 leading-tight">
              {userProfile.rating} <span className="text-[9px] text-zinc-500 font-normal">Elo</span>
            </div>
          </div>
        </button>

        {/* Top Actions: Rankings, Archive, Opening Guide, Settings */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-tour="ranking-button"
            onClick={() => setShowRankingModal(true)}
            className="p-1.5 sm:p-2 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-amber-300 transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
            title="명예의 전당 & AI 랭킹 순위표"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="hidden xs:inline">랭킹</span>
          </button>
          <button
            type="button"
            data-testid="open-archive-btn"
            onClick={() => {
              setGameArchives(loadGameArchive());
              setShowArchiveModal(true);
            }}
            className="p-1.5 sm:p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-emerald-300 transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
            title="내 기보 보관함 & PGN 공유"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">기보</span>
          </button>
          <button
            type="button"
            onClick={() => setShowOpeningModal(true)}
            className="p-1.5 sm:p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
            title="오프닝 가이드 및 백과사전"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span className="hidden xs:inline">오프닝</span>
          </button>
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="p-1.5 sm:p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
            title="게임 설정"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Global Real-time 1:1 Rematch Invite Banner (when in Lobby or another tab) */}
      {incomingGlobalRematch && watchedRematchInfo && isAwayFromWatchedBoard && (
        <div
          data-testid="global-rematch-invite-banner"
          className="mx-2.5 mt-2 px-3 py-2 rounded-xl bg-amber-950/90 border border-amber-500/70 shadow-lg flex items-center justify-between gap-2 text-xs text-amber-100 shrink-0 animate-in fade-in"
        >
          <div className="flex items-center gap-1.5 min-w-0 font-bold">
            <span className="shrink-0">⚡</span>
            <span className="truncate">
              <strong className="text-amber-300">{watchedRematchInfo.opponentName}</strong>님이 재대결을 신청했습니다!
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              data-testid="accept-global-rematch-btn"
              onClick={handleAcceptGlobalRematch}
              className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-[11px]"
            >
              수락
            </button>
            <button
              type="button"
              data-testid="decline-global-rematch-btn"
              onClick={handleDeclineGlobalRematch}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-[11px]"
            >
              거절
            </button>
          </div>
        </div>
      )}

      {/* Main Tab Content */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {activeTab === 'play' ? (
          <div className="p-2 sm:p-3 pb-6 flex flex-col space-y-1.5 sm:space-y-2.5 min-h-full">
            {/* Opponent (AI) Bar */}
            <div data-tour="opponent-bar" className="w-full shrink-0">
              <PlayerBar
                name={`Stockfish AI (Lv.${difficulty})`}
                isAi={true}
                color={aiColor}
                timeRemainingMs={aiColor === 'w' ? whiteTimeMs : blackTimeMs}
                timeLimit={timeLimit}
                isActive={isGameStarted && chess.turn() === aiColor && !isGameOver}
                capturedPieces={aiColor === 'w' ? matData.whiteCaptured : matData.blackCaptured}
                materialDiff={aiColor === 'w' ? matData.whiteDiff : matData.blackDiff}
                pieceTheme={pieceTheme}
              />
            </div>

            {/* Real-time Opening Name Banner (Clickable) */}
            <div data-tour="opening-banner" className="w-full shrink-0">
              <button
                type="button"
                onClick={() => setShowOpeningModal(true)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800/80 hover:border-amber-500/50 text-xs shadow-xs transition-all cursor-pointer group text-left"
                title="오프닝 가이드 & 백과사전 열기"
              >
              <div className="flex items-center gap-1.5 min-w-0">
                <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-amber-200 truncate text-[11px] group-hover:text-amber-300">
                  {currentOpening ? currentOpening.nameKo : playedMoves.length === 0 ? '표준 시작 오프닝' : '미들게임 전술 국면'}
                </span>
                {currentOpening && (
                  <span className="text-[10px] text-zinc-400 truncate hidden xs:inline">
                    · {currentOpening.nameEn}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-1">
                {currentOpening ? (
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-[10px] font-mono font-bold text-amber-300">
                    {currentOpening.eco}
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {playedMoves.length === 0 ? 'ECO -' : '전술 국면'}
                  </span>
                )}
                <span className="text-[10px] text-amber-400/90 group-hover:text-amber-300 flex items-center gap-0.5 font-bold">
                  가이드 📖
                </span>
              </div>
            </button>
            </div>

            {/* Active Guided Opening Banner */}
            {guidedOpening && currentGuidedMoveInfo && (
              <div className="flex flex-col gap-1 px-3 py-1.5 rounded-xl bg-amber-950/80 border border-amber-500/60 text-amber-100 text-xs shadow-lg shrink-0 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
                    <span className="font-extrabold text-amber-300 text-[11px] truncate">
                      [오프닝 가이드] {guidedOpening.nameKo}
                    </span>
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] shrink-0 font-bold border border-amber-500/40">
                      {guidedStep + 1} / {guidedOpening.moves.length}수
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelGuidedOpening}
                    className="text-amber-400 hover:text-white px-2 py-0.5 rounded bg-zinc-900/90 hover:bg-zinc-800 text-[10px] font-bold transition-colors shrink-0 border border-amber-500/30"
                    title="가이드 종료"
                  >
                    가이드 종료 ✕
                  </button>
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] text-zinc-300">추천 수:</span>
                    <span className="font-black text-amber-300 font-mono text-xs bg-amber-500/25 px-1.5 py-0.5 rounded border border-amber-500/40">
                      {currentGuidedMoveInfo.san}
                    </span>
                    <span className="text-[10px] text-amber-200/80">
                      ({currentGuidedMoveInfo.from.toUpperCase()} → {currentGuidedMoveInfo.to.toUpperCase()})
                    </span>
                  </div>
                  {currentGuidedMoveInfo.explanation && (
                    <span className="text-[10px] text-zinc-300 truncate hidden xs:inline border-l border-amber-500/30 pl-2">
                      {currentGuidedMoveInfo.explanation}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Auto-Resumed Game Toast Banner */}
            {resumedBannerMessage && (
              <div
                data-testid="resumed-game-banner"
                className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-sky-950/90 border border-sky-500/50 text-sky-200 text-xs shadow-md shrink-0 animate-fadeIn"
              >
                <span className="text-[11px] font-semibold truncate">{resumedBannerMessage}</span>
                <button
                  type="button"
                  onClick={() => setResumedBannerMessage(null)}
                  className="text-sky-400 hover:text-white p-1 rounded-md"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Guided Completion Toast */}
            {guidedCompletionMessage && (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 text-xs shadow-md shrink-0 animate-fadeIn">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Trophy className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-[11px] text-emerald-200 font-medium truncate">
                    {guidedCompletionMessage}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setGuidedCompletionMessage(null)}
                  className="text-emerald-400 hover:text-white p-1 rounded-md"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Active Stockfish Hint Banner */}
            {activeHint && (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs shadow-md shrink-0 animate-fadeIn">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Lightbulb className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
                  <span className="font-extrabold text-white text-[11px] shrink-0">추천 최적수:</span>
                  <span className="font-black text-emerald-300 font-mono text-xs">{activeHint.san}</span>
                  <span className="text-[10px] text-emerald-300/80 truncate">
                    ({activeHint.from.toUpperCase()} → {activeHint.to.toUpperCase()})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveHint(null)}
                  className="text-emerald-400 hover:text-white p-1 rounded-md transition-colors"
                  title="힌트 닫기"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Chess Board View with Eval Bar (크기 고정 및 축소 방지) */}
            <div data-tour="chessboard" className="relative flex items-stretch justify-center gap-1.5 sm:gap-2 w-full shrink-0 my-0.5 sm:my-1.5">
              {showEvalBar && (
                <div className="self-stretch flex items-stretch py-0.5 shrink-0">
                  <EvalBar
                    score={evalScore}
                    orientation={playerColor === 'b' ? 'black' : 'white'}
                    isLoading={isEvalLoading}
                  />
                </div>
              )}

              <div className="relative w-full max-w-[min(100%,min(42vh,370px))] flex items-center justify-center shrink-0">
                <ChessBoard
                  className="w-full max-w-[min(100%,min(42vh,370px))]"
                  chess={displayChess}
                  orientation={playerColor === 'b' ? 'black' : 'white'}
                  onMove={handlePlayerMove}
                  interactive={
                    isGameStarted &&
                    !isGameOver &&
                    !isAiThinking &&
                    chess.turn() === playerColor &&
                    !isViewingHistory
                  }
                  allowPremove={
                    isGameStarted &&
                    !isGameOver &&
                    !isViewingHistory &&
                    (isAiThinking || chess.turn() !== playerColor)
                  }
                  playerColor={playerColor}
                  premove={premove}
                  onPremoveChange={setPremove}
                  confirmMoveEnabled={confirmMoveEnabled}
                  lastMove={displayLastMove}
                  highlightSquares={activeHighlights}
                  squareBadges={activeBadges}
                  arrows={activeArrows}
                  pieceTheme={pieceTheme}
                  boardTheme={boardTheme}
                />

                {/* Pre-Game Waiting Prompt Pill */}
                {!isGameStarted && !isGameOver && (
                  <button
                    type="button"
                    data-testid="board-start-prompt"
                    onClick={() => startNewGame()}
                    className="absolute top-2 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 rounded-full bg-zinc-900/95 hover:bg-zinc-800 border border-amber-500/60 text-amber-300 font-extrabold text-xs flex items-center gap-1.5 shadow-xl backdrop-blur-md transition-all active:scale-95 whitespace-nowrap cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>대국 대기 · 게임 시작을 눌러주세요</span>
                  </button>
                )}

                {/* History Viewing Floating Badge */}
                {isViewingHistory && (
                  <button
                    type="button"
                    onClick={handleNavLive}
                    className="absolute top-2 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 font-black text-xs flex items-center gap-1.5 shadow-2xl backdrop-blur-md transition-all animate-pulse whitespace-nowrap"
                  >
                    <ChevronsRight className="w-4 h-4" />
                    <span>
                      {viewPlyIndex === -1
                        ? '대국 시작 국면'
                        : `${Math.floor(viewPlyIndex / 2) + 1}${viewPlyIndex % 2 === 0 ? '.' : '...'} ${playedMoves[viewPlyIndex].san}`}
                      {' 탐색 중 · '}
                      <span className="underline font-black">실시간 복귀</span>
                    </span>
                  </button>
                )}

                {/* Click overlay to return to live board when viewing history */}
                {isViewingHistory && (
                  <div
                    onClick={handleNavLive}
                    className="absolute inset-0 z-20 cursor-pointer"
                    title="체스판을 누르면 실시간 대국으로 즉시 복귀합니다"
                  />
                )}

                {/* AI Thinking Overlay Badge */}
                {!isViewingHistory && isAiThinking && (
                  <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-zinc-900/90 border border-amber-500/40 text-amber-300 text-[11px] font-bold flex items-center gap-1.5 shadow-lg animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    AI 수읽기 중...
                  </div>
                )}
                {isViewingHistory && isAiThinking && (
                  <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full bg-zinc-900/95 border border-amber-500/40 text-amber-300 text-[10px] font-bold flex items-center gap-1 shadow-lg animate-pulse z-30">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    AI 착수 완료 대기 중
                  </div>
                )}

                {/* Checkmate / Game Over Floating Badge over Board */}
                {!isViewingHistory && isGameOver && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full bg-zinc-900/95 border border-amber-500/60 text-amber-300 font-extrabold text-xs flex items-center gap-1.5 shadow-2xl backdrop-blur-md animate-bounce whitespace-nowrap">
                    <span>♟</span>
                    <span>
                      {gameOverReason === 'checkmate'
                        ? gameResult === 'win'
                          ? '체크메이트! 플레이어 승리 🎉'
                          : '체크메이트! AI 승리 🤖'
                        : gameOverReason === 'timeout'
                        ? '시간 초과로 경기 종료 ⏱️'
                        : gameOverReason === 'resignation'
                        ? '기권으로 경기 종료 🏳️'
                        : '무승부로 경기 종료 🤝'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Move History Stepper & Quick Eval Bar Strip */}
            <div data-tour="eval-stepper" className="flex items-center justify-between gap-1.5 py-1 px-2 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs shadow-xs shrink-0">
              {/* Quick Eval Bar Toggle Button */}
              <button
                type="button"
                onClick={() => handleToggleEvalBar(!showEvalBar)}
                className={`h-8 px-2.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-all active:scale-95 shrink-0 ${
                  showEvalBar
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-xs'
                    : 'bg-zinc-800/80 border-zinc-700/70 text-zinc-400 hover:text-zinc-200'
                }`}
                title={showEvalBar ? '형세 평가 바 끄기' : '형세 평가 바 켜기'}
              >
                <BarChart2 className={`w-3.5 h-3.5 ${showEvalBar ? 'text-amber-400' : 'text-zinc-500'}`} />
                <span className="text-[11px]">형세 바</span>
                <span
                  className={`text-[9px] px-1 py-0.2 rounded font-black tracking-tight ${
                    showEvalBar ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-700 text-zinc-400'
                  }`}
                >
                  {showEvalBar ? 'ON' : 'OFF'}
                </span>
              </button>

              {/* Move Stepper Controls */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleNavFirst}
                  disabled={playedMoves.length === 0 || viewPlyIndex === -1}
                  className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-20 disabled:pointer-events-none text-zinc-300 flex items-center justify-center transition-colors shrink-0"
                  title="첫 수 국면으로 (|◀)"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleNavPrev}
                  disabled={playedMoves.length === 0 || viewPlyIndex === -1}
                  className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-20 disabled:pointer-events-none text-zinc-300 flex items-center justify-center transition-colors shrink-0"
                  title="이전 수 뒤로가기 (◀)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Fixed-width Move status or Jump to Live */}
                {isViewingHistory ? (
                  <button
                    type="button"
                    onClick={handleNavLive}
                    className="w-[120px] h-8 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 font-black text-xs flex items-center justify-between px-2 shadow-md shadow-amber-950/40 transition-all shrink-0"
                    title="클릭하여 실시간 대국으로 돌아가기"
                  >
                    <span className="truncate text-[11px] font-black tracking-tight">
                      {viewPlyIndex === -1
                        ? '시작 국면'
                        : `${Math.floor(viewPlyIndex / 2) + 1}${viewPlyIndex % 2 === 0 ? '.' : '..'} ${playedMoves[viewPlyIndex].san}`}
                    </span>
                    <span className="text-[9px] bg-zinc-950 text-amber-300 px-1 py-0.5 rounded font-black shrink-0 tracking-tight">
                      실시간
                    </span>
                  </button>
                ) : (
                  <div className="w-[120px] h-8 rounded-lg bg-zinc-800/70 border border-zinc-700/60 text-zinc-300 text-xs font-semibold flex items-center justify-center px-2 shrink-0">
                    {playedMoves.length === 0 ? (
                      <span className="text-zinc-500 text-[11px] font-medium">
                        {!isGameStarted ? '대국 대기' : '대국 시작'}
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        <span className="font-bold font-mono text-[11px] truncate max-w-[58px]">
                          {playedMoves[playedMoves.length - 1].san}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono shrink-0">
                          ({playedMoves.length}수)
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleNavNext}
                  disabled={playedMoves.length === 0 || !isViewingHistory}
                  className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-20 disabled:pointer-events-none text-zinc-300 flex items-center justify-center transition-colors shrink-0"
                  title="다음 수 앞으로가기 (▶)"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleNavLive}
                  disabled={!isViewingHistory}
                  className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-20 disabled:pointer-events-none text-zinc-300 flex items-center justify-center transition-colors shrink-0"
                  title="실시간 최신 국면으로 (▶|)"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Player Bar */}
            <div data-tour="player-bar" className="w-full shrink-0">
              <PlayerBar
                name="나 (플레이어)"
                isAi={false}
                color={playerColor}
                timeRemainingMs={playerColor === 'w' ? whiteTimeMs : blackTimeMs}
                timeLimit={timeLimit}
                isActive={isGameStarted && chess.turn() === playerColor && !isGameOver}
                capturedPieces={playerColor === 'w' ? matData.whiteCaptured : matData.blackCaptured}
                materialDiff={playerColor === 'w' ? matData.whiteDiff : matData.blackDiff}
                pieceTheme={pieceTheme}
              />
            </div>

            {/* Pre-Game 1-Tap Quick Setup Bar (visible before pressing 게임 시작) */}
            {!isGameStarted && !isGameOver && (
              <div
                data-testid="pregame-quick-setup"
                className="flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-xl bg-zinc-900/95 border border-emerald-500/35 text-[11px] shrink-0"
              >
                {/* 1. AI Difficulty Stepper */}
                <div className="flex items-center gap-0.5 bg-zinc-950/90 border border-zinc-800 rounded-lg p-0.5 shrink-0">
                  <button
                    type="button"
                    data-testid="quick-diff-prev"
                    disabled={difficulty <= 1}
                    onClick={() => setDifficulty((d) => Math.max(1, d - 1) as DifficultyLevel)}
                    className="w-5 h-6 rounded hover:bg-zinc-800 disabled:opacity-30 text-zinc-300 flex items-center justify-center"
                    title="AI 난이도 낮추기"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span
                    data-testid="quick-diff-label"
                    className="px-1.5 font-mono font-black text-amber-300 text-[11px]"
                  >
                    Lv.{difficulty}
                  </span>
                  <button
                    type="button"
                    data-testid="quick-diff-next"
                    disabled={difficulty >= 10}
                    onClick={() => setDifficulty((d) => Math.min(10, d + 1) as DifficultyLevel)}
                    className="w-5 h-6 rounded hover:bg-zinc-800 disabled:opacity-30 text-zinc-300 flex items-center justify-center"
                    title="AI 난이도 높이기"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 2. Time Control Quick Chips */}
                <div className="flex items-center gap-0.5 bg-zinc-950/90 border border-zinc-800 rounded-lg p-0.5 shrink-0">
                  {(
                    [
                      { id: '5m', label: '5분' },
                      { id: '10m', label: '10분' },
                      { id: 'unlimited', label: '무제한' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      data-testid={`quick-time-${t.id}`}
                      onClick={() => setTimeLimit(t.id)}
                      className={`px-2 py-1 rounded-md font-bold text-[10px] transition-colors ${
                        timeLimit === t.id
                          ? 'bg-amber-500 text-zinc-950'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* 3. Side Quick Chips */}
                <div className="flex items-center gap-0.5 bg-zinc-950/90 border border-zinc-800 rounded-lg p-0.5 shrink-0">
                  {(
                    [
                      { id: 'white', label: '백' },
                      { id: 'black', label: '흑' },
                      { id: 'random', label: '랜덤' },
                    ] as const
                  ).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      data-testid={`quick-side-${s.id}`}
                      onClick={() => setChosenSide(s.id)}
                      className={`px-2 py-1 rounded-md font-bold text-[10px] transition-colors ${
                        chosenSide === s.id
                          ? 'bg-emerald-500 text-zinc-950'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Bar (In-Game vs Post-Game Board Viewing) */}
            <div data-tour="action-controls" className="w-full shrink-0">
              {isGameOver && !showGameOverModal ? (
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setShowGameOverModal(true)}
                    className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-98 text-zinc-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/40 transition-all"
                  >
                    <Trophy className="w-4 h-4" /> 대국 결과 보기
                  </button>
                  <button
                    type="button"
                    onClick={() => startNewGame()}
                    className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-bold border border-zinc-800 flex items-center justify-center gap-1.5 active:scale-98 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-zinc-200" /> 새 대국 시작
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={handleRequestHint}
                    disabled={
                      !isGameStarted ||
                      isGameOver ||
                      isAiThinking ||
                      isHintLoading ||
                      chess.turn() !== playerColor
                    }
                    className={`py-1.5 sm:py-2 px-1 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 border transition-all ${
                      activeHint
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-sm shadow-emerald-950/30'
                        : 'bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-amber-300 border-zinc-800'
                    }`}
                    title="스톡피쉬 최적 착수 힌트 받기"
                  >
                    {isHintLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    ) : (
                      <Lightbulb className={`w-3.5 h-3.5 ${activeHint ? 'text-emerald-400' : 'text-amber-400'}`} />
                    )}
                    <span>힌트</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={
                      !isGameStarted ||
                      isGameOver ||
                      isAiThinking ||
                      playedMoves.length <
                        (playedMoves[0]?.fenBefore && playedMoves[0].color === playerColor
                          ? 2
                          : playerColor === 'w'
                          ? 2
                          : 3)
                    }
                    className="py-1.5 sm:py-2 px-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-zinc-300 text-[11px] font-semibold flex items-center justify-center gap-1 border border-zinc-800"
                    title="한 수 물리기"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                    <span>무르기</span>
                  </button>

                  <button
                    type="button"
                    data-testid="ai-resign-btn"
                    onClick={requestResign}
                    disabled={!isGameStarted || isGameOver}
                    className="py-1.5 sm:py-2 px-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-zinc-300 text-[11px] font-semibold flex items-center justify-center gap-1 border border-zinc-800"
                    title="기권하기"
                  >
                    <Flag className="w-3.5 h-3.5 text-rose-400" />
                    <span>기권</span>
                  </button>

                  <button
                    type="button"
                    data-testid="ai-new-game-btn"
                    onClick={() => (!isGameStarted ? startNewGame() : requestNewGame())}
                    className={`py-1.5 sm:py-2 px-1 rounded-xl text-[11px] font-black flex items-center justify-center gap-1 transition-all active:scale-98 ${
                      !isGameStarted
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 ring-2 ring-emerald-300/70 shadow-md shadow-emerald-500/25'
                        : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-sm'
                    }`}
                    title={!isGameStarted ? '게임 시작' : '새 게임 시작'}
                  >
                    <Play className="w-3.5 h-3.5 fill-zinc-950" />
                    <span>{!isGameStarted ? '게임 시작' : '새 게임'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Single Unified Review Button when moves exist */}
            {playedMoves.length > 0 && (
              <button
                data-testid="main-review-btn"
                onClick={runGameReview}
                disabled={isAnalyzing}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-99 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 shrink-0"
              >
                {getCachedReviewForMoves(playedMoves) ? (
                  <>
                    <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                    <span>즉시 복기 열기 (분석 캐시 완료)</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    <span>
                      {isGameOver
                        ? '대국 정밀 복기하기 (형세·실수 분석)'
                        : '현재까지의 대국 복기하기'}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-zinc-400">
                <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                <span className="text-xs font-semibold">모드 불러오는 중...</span>
              </div>
            }
          >
            {activeTab === 'pvp' ? (
              <div className="flex-1 flex flex-col overflow-y-auto">
                <MultiplayerView
                  currentUser={userProfile}
                  pieceTheme={pieceTheme}
                  boardTheme={boardTheme}
                  confirmMoveEnabled={confirmMoveEnabled}
                  onToggleConfirmMove={handleToggleConfirmMove}
                  onBackToPlay={() => setActiveTab('play')}
                  onProfileUpdated={setUserProfile}
                  onArchiveSaved={() => setGameArchives(loadGameArchive())}
                  onAnalyzeMoves={(moves, myColor) => runMovesReview(moves, myColor)}
                  externalJoinGameId={externalJoinGameId}
                  onConsumeExternalJoin={handleConsumeExternalJoin}
                  onWatchRematchGame={setWatchedRematchInfo}
                  onActivePvpBoardChange={setActivePvpBoardGameId}
                />
              </div>
            ) : activeTab === 'puzzle' ? (
              <div className="flex-1 overflow-y-auto">
                <PuzzleView pieceTheme={pieceTheme} boardTheme={boardTheme} />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <EndgameView pieceTheme={pieceTheme} boardTheme={boardTheme} />
              </div>
            )}
          </Suspense>
        )}
      </main>

      {/* Bottom Tab Bar */}
      <footer
        data-tour="bottom-tabs"
        className="grid grid-cols-4 border-t border-zinc-800/80 bg-zinc-900/95 pt-1.5 px-1.5 sm:px-2 backdrop-blur-md shrink-0"
        style={{
          paddingBottom: 'clamp(6px, env(safe-area-inset-bottom, 6px), 16px)',
        }}
      >
        <button
          onClick={() => setActiveTab('play')}
          className={`flex flex-col items-center py-1 transition-colors ${
            activeTab === 'play' ? 'text-amber-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Swords className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
          <span className="text-[10px] sm:text-[11px]">체스 대국</span>
        </button>

        <button
          onClick={() => setActiveTab('pvp')}
          className={`flex flex-col items-center py-1 transition-colors ${
            activeTab === 'pvp' ? 'text-amber-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Users className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
          <span className="text-[10px] sm:text-[11px]">1:1 대전</span>
        </button>

        <button
          onClick={() => setActiveTab('puzzle')}
          className={`flex flex-col items-center py-1 transition-colors ${
            activeTab === 'puzzle' ? 'text-amber-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
          <span className="text-[10px] sm:text-[11px]">전술 퍼즐</span>
        </button>

        <button
          onClick={() => setActiveTab('endgame')}
          className={`flex flex-col items-center py-1 transition-colors ${
            activeTab === 'endgame' ? 'text-amber-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Trophy className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
          <span className="text-[10px] sm:text-[11px]">엔드게임</span>
        </button>
      </footer>

      {/* Extracted Game Over Modal */}
      <GameOverModal
        isOpen={showGameOverModal}
        gameResult={gameResult}
        gameOverReason={gameOverReason}
        lastGameReward={lastGameReward}
        userProfile={userProfile}
        difficulty={difficulty}
        playedMovesCount={playedMoves.length}
        isAnalyzing={isAnalyzing}
        onRunReview={runGameReview}
        onCloseToBoard={() => setShowGameOverModal(false)}
        onStartNewGame={() => startNewGame()}
        onOpenRanking={() => {
          setShowGameOverModal(false);
          setShowRankingModal(true);
        }}
      />

      {/* Extracted Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        isGameStarted={isGameStarted}
        pieceTheme={pieceTheme}
        onPieceThemeChange={handlePieceThemeChange}
        boardTheme={boardTheme}
        onBoardThemeChange={handleBoardThemeChange}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        hapticsEnabled={hapticsEnabled}
        onToggleHaptics={handleToggleHaptics}
        showEvalBar={showEvalBar}
        onToggleEvalBar={handleToggleEvalBar}
        confirmMoveEnabled={confirmMoveEnabled}
        onToggleConfirmMove={handleToggleConfirmMove}
        timeLimit={timeLimit}
        onTimeLimitChange={setTimeLimit}
        chosenSide={chosenSide}
        onChosenSideChange={setChosenSide}
        difficulty={difficulty}
        onDifficultyChange={setDifficulty}
        onReplayTourGuide={() => {
          setShowSettingsModal(false);
          setTimeout(() => setShowTourGuide(true), 200);
        }}
        onApplyAndStartGame={() => {
          setShowSettingsModal(false);
          requestNewGame(difficulty, timeLimit, chosenSide);
        }}
      />

      {/* Analysis Loading Overlay */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl max-w-xs w-full text-center space-y-3 shadow-2xl">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
            <h4 className="text-sm font-bold text-zinc-100">대국 수읽기 정밀 분석 중...</h4>
            {analysisProgress && (
              <p className="text-xs text-zinc-400 font-mono">
                {analysisProgress.current} / {analysisProgress.total} 수 분석 완료
              </p>
            )}
            <p className="text-[11px] text-zinc-500">
              Stockfish 엔진이 각 수의 평가치 및 놓친 체크 기회를 탐색하고 있습니다.
            </p>
          </div>
        </div>
      )}

      {/* Lazy-loaded Modals (chunks fetched only when opened) */}
      <Suspense fallback={null}>
        {showReviewModal && reviewData && (
          <ReviewModal
            reviewData={reviewData}
            playerColor={reviewPlayerColor}
            pieceTheme={pieceTheme}
            boardTheme={boardTheme}
            onClose={() => setShowReviewModal(false)}
          />
        )}

        {showOpeningModal && (
          <OpeningGuideModal
            isOpen={showOpeningModal}
            onClose={() => setShowOpeningModal(false)}
            onStartGuidedOpening={handleStartGuidedOpening}
            currentOpening={currentOpening}
          />
        )}

        {showProfileModal && (
          <ProfileModal
            isOpen={showProfileModal}
            onClose={() => setShowProfileModal(false)}
            profile={userProfile}
            onUpdateProfile={setUserProfile}
            onSelectLevelToPlay={(lvl) => {
              setDifficulty(lvl as DifficultyLevel);
              requestNewGame(lvl as DifficultyLevel);
            }}
            onOpenRanking={() => setShowRankingModal(true)}
            onOpenArchive={() => {
              setGameArchives(loadGameArchive());
              setShowArchiveModal(true);
            }}
          />
        )}

        {showArchiveModal && (
          <GameArchiveModal
            isOpen={showArchiveModal}
            onClose={() => setShowArchiveModal(false)}
            archives={gameArchives}
            onAnalyzeGame={(archived) =>
              runMovesReview(archived.moves, archived.playerColor, archived)
            }
            onDeleteGame={(id) => setGameArchives(deleteArchivedGame(id))}
            onImportAndReview={handleImportAndReview}
            onImportToBoard={handleImportToBoard}
          />
        )}

        {showRankingModal && (
          <RankingModal
            isOpen={showRankingModal}
            onClose={() => setShowRankingModal(false)}
            currentUser={userProfile}
          />
        )}
      </Suspense>

      {/* Resign / New Game Safety Confirmation Modal */}
      {pendingConfirmAction && (
        <div
          data-testid="confirm-action-modal"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl max-w-xs w-full text-center space-y-4 shadow-2xl">
            <div
              className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center text-2xl border ${
                pendingConfirmAction.type === 'resign'
                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              }`}
            >
              {pendingConfirmAction.type === 'resign' ? '🏳️' : '♟️'}
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100">
                {pendingConfirmAction.type === 'resign'
                  ? '정말 기권하시겠습니까?'
                  : '진행 중인 대국이 있습니다'}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {pendingConfirmAction.type === 'resign'
                  ? '기권 시 현재 대국이 패배로 기록되며 Elo 레이팅이 차감됩니다.'
                  : '현재 진행 중인 대국을 종료하고 새로운 게임을 시작하시겠습니까?'}
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                data-testid="cancel-action-btn"
                onClick={() => setPendingConfirmAction(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all"
              >
                계속 대국하기
              </button>
              <button
                type="button"
                data-testid="confirm-action-btn"
                onClick={() => {
                  if (pendingConfirmAction.type === 'resign') {
                    handleResign();
                  } else {
                    const next = pendingConfirmAction.nextSettings;
                    startNewGame(
                      next?.diff ?? difficulty,
                      next?.time ?? timeLimit,
                      next?.side ?? chosenSide
                    );
                  }
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  pendingConfirmAction.type === 'resign'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950/40'
                    : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-950/30'
                }`}
              >
                {pendingConfirmAction.type === 'resign' ? '기권하기' : '새 게임 시작'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* App Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl max-w-xs w-full text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center text-2xl border border-amber-500/30">
              ♟
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100">체스 마스터를 종료하시겠습니까?</h3>
              <p className="text-xs text-zinc-400 mt-1">대국 기록과 설정은 안전하게 보존됩니다.</p>
            </div>
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-300 text-xs font-bold transition-all"
              >
                계속하기
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    CapApp.exitApp();
                  } catch {
                    setShowExitConfirm(false);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-rose-950/40"
              >
                앱 종료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Feature Tour Guide */}
      <FeatureTourGuide
        isOpen={showTourGuide}
        onClose={() => setShowTourGuide(false)}
      />
    </div>
  );
};
