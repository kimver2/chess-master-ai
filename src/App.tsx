import React, { useState, useEffect, useMemo } from 'react';
import { Chess } from 'chess.js';
import { App as CapApp } from '@capacitor/app';
import { ChessBoard, BoardArrow, SquareBadge } from './components/ChessBoard';
import { PlayerBar } from './components/PlayerBar';
import { ReviewModal } from './components/ReviewModal';
import { EndgameView } from './components/EndgameView';
import { PuzzleView } from './components/PuzzleView';
import { EvalBar } from './components/EvalBar';
import { OpeningGuideModal } from './components/OpeningGuideModal';
import { FeatureTourGuide } from './components/FeatureTourGuide';
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
  Volume2,
  VolumeX,
  Smartphone,
  Palette,
  Eye,
  Lightbulb,
  BookOpen,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  HelpCircle,
  X,
  Users,
} from 'lucide-react';
import { MultiplayerView } from './components/MultiplayerView';
import { ProfileModal } from './components/ProfileModal';
import { RankingModal } from './components/RankingModal';
import { AvatarIcon } from './components/AvatarIcon';
import { UserProfile, getTier } from './types/profile';
import { loadUserProfile, recordGameResult as recordProfileGameResult } from './services/storageService';
import { submitOnlineScore } from './services/firebaseService';

interface PlayedMoveRecord {
  ply: number;
  moveNumber: number;
  color: PieceColor;
  san: string;
  from: string;
  to: string;
  promotion?: string;
  captured?: string;
  fenBefore: string;
  fenAfter: string;
  hintFollowed?: boolean;
  hintBestSan?: string;
}

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

  // Chess Game State
  const [chess, setChess] = useState<Chess>(() => new Chess());
  const [playedMoves, setPlayedMoves] = useState<PlayedMoveRecord[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
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
      return new Chess();
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

  // Game End State
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

  // User Profile & Rankings State
  const [userProfile, setUserProfile] = useState<UserProfile>(() => loadUserProfile());
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showRankingModal, setShowRankingModal] = useState<boolean>(false);
  const [lastGameReward, setLastGameReward] = useState<{
    ratingDelta: number;
    isFirstConquest: boolean;
    isBestMoves: boolean;
    isBestTime: boolean;
  } | null>(null);
  const gameStartTimeRef = React.useRef<number>(Date.now());

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

  // Init Stockfish engine on launch
  useEffect(() => {
    stockfishService.init().catch(console.error);
  }, []);

  // Hardware Back Button Handler for Android
  useEffect(() => {
    let listenerHandle: any = null;
    const setupBackHandler = async () => {
      try {
        listenerHandle = await CapApp.addListener('backButton', () => {
          if (showTourGuide) {
            setShowTourGuide(false);
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
    showTourGuide,
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

  const recordGameResult = (result: 'win' | 'loss' | 'draw') => {
    const elapsedSec = Math.max(5, Math.round((Date.now() - gameStartTimeRef.current) / 1000));
    const moveCount = playedMoves.length;

    // Update profile in localStorage and get Elo delta & achievements
    const outcome = recordProfileGameResult(result, difficulty, moveCount, elapsedSec);
    setUserProfile(outcome.profile);
    setLastGameReward({
      ratingDelta: outcome.ratingDelta,
      isFirstConquest: outcome.isFirstConquest,
      isBestMoves: outcome.isBestMoves,
      isBestTime: outcome.isBestTime,
    });

    // If victory, submit to Firebase online ranking if configured
    if (result === 'win') {
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

  // Clock countdown interval
  useEffect(() => {
    if (activeTab !== 'play' || isGameOver || timeLimit === 'unlimited') return;

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
  }, [activeTab, chess, isGameOver, timeLimit, playerColor]);

  const handleTimeout = (loserColor: PieceColor) => {
    gameSessionRef.current += 1;
    setIsAiThinking(false);
    setIsGameOver(true);
    setGameOverReason('timeout');
    const outcome = loserColor === playerColor ? 'loss' : 'win';
    setGameResult(outcome);
    recordGameResult(outcome);
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
    if (isGameOver || isAiThinking || isHintLoading || chess.turn() !== playerColor) return;
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

  // Start Guided Opening Game
  const handleStartGuidedOpening = (opening: ChessOpening) => {
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

  // Player Move Handler
  const handlePlayerMove = (from: string, to: string, promotion = 'q') => {
    if (isViewingHistory) {
      setViewPlyIndex(null);
      return;
    }
    if (isGameOver || isAiThinking || chess.turn() !== playerColor) return;

    const session = gameSessionRef.current;
    const fenBefore = chess.fen();
    try {
      const move = chess.move({ from, to, promotion });
      if (!move) return;

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

      if (checkGameOver(nextChess, playerColor, updatedMoves)) return;

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
              executeAiGuidedMove(nextChess, aiSan, guidedOpening, nextStep, updatedMoves, playerColor, session);
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
    } catch {
      // invalid move
    }
  };

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
    const initialKey = getPositionKey(new Chess().fen());
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
      setActiveHint(null);
      setGameOverReason('checkmate');
      const outcome = game.turn() === humanColor ? 'loss' : 'win';
      setGameResult(outcome);
      recordGameResult(outcome);
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
      setIsGameOver(true);
      setActiveHint(null);
      setGameOverReason(
        game.isStalemate()
          ? 'stalemate'
          : isRepetition
          ? 'threefold_repetition'
          : 'insufficient_material'
      );
      setGameResult('draw');
      recordGameResult('draw');
      setEvalScore(0);
      soundManager.draw();
      setTimeout(() => {
        setShowGameOverModal(true);
      }, 1500);
      return true;
    }
    return false;
  };

  // Undo Move (Restores moves accurately from history)
  const handleUndo = () => {
    setViewPlyIndex(null);
    const minMoves = playerColor === 'w' ? 2 : 3;
    if (isGameOver || isAiThinking || playedMoves.length < minMoves) return;
    gameSessionRef.current += 1;
    soundManager.move();
    setActiveHint(null);

    const newHistory = playedMoves.slice(0, -2);
    setPlayedMoves(newHistory);

    const restoredChess = new Chess();
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

  // Resign
  const handleResign = () => {
    if (isGameOver) return;
    gameSessionRef.current += 1;
    setIsAiThinking(false);
    setIsGameOver(true);
    setActiveHint(null);
    setGameOverReason('resignation');
    setGameResult('loss');
    recordGameResult('loss');
    soundManager.defeat();
    setTimeout(() => {
      setShowGameOverModal(true);
    }, 600);
  };

  // Run Game Review
  const runGameReview = async () => {
    if (playedMoves.length === 0) return;
    setIsAnalyzing(true);
    setAnalysisProgress({ current: 0, total: playedMoves.length });

    try {
      const result = await stockfishService.analyzeGame(playedMoves, (curr, total) => {
        setAnalysisProgress({ current: curr, total });
      });
      setReviewData(result);
      setShowReviewModal(true);
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(null);
    }
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

        {/* Top Actions: Rankings, Opening Guide, Settings */}
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
                isActive={chess.turn() === aiColor && !isGameOver}
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
                  interactive={!isGameOver && !isAiThinking && chess.turn() === playerColor && !isViewingHistory}
                  lastMove={displayLastMove}
                  highlightSquares={activeHighlights}
                  squareBadges={activeBadges}
                  arrows={activeArrows}
                  pieceTheme={pieceTheme}
                  boardTheme={boardTheme}
                />

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
                      <span className="text-zinc-500 text-[11px] font-medium">대국 시작</span>
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
                isActive={chess.turn() === playerColor && !isGameOver}
                capturedPieces={playerColor === 'w' ? matData.whiteCaptured : matData.blackCaptured}
                materialDiff={playerColor === 'w' ? matData.whiteDiff : matData.blackDiff}
                pieceTheme={pieceTheme}
              />
            </div>

            {/* Action Bar (In-Game vs Post-Game Board Viewing) */}
            <div data-tour="action-controls" className="w-full shrink-0">
              {isGameOver && !showGameOverModal ? (
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setShowGameOverModal(true)}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-98 text-zinc-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/40 transition-all"
                  >
                    <Trophy className="w-4 h-4" /> 결과 팝업 열기
                  </button>
                  <button
                    type="button"
                    onClick={runGameReview}
                    disabled={isAnalyzing}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all"
                  >
                    <TrendingUp className="w-4 h-4" /> 복기하기
                  </button>
                  <button
                    type="button"
                    onClick={() => startNewGame()}
                    className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-800 active:scale-98 transition-all"
                  >
                    새 대국
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={handleRequestHint}
                    disabled={isGameOver || isAiThinking || isHintLoading || chess.turn() !== playerColor}
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
                    disabled={isGameOver || isAiThinking || playedMoves.length < (playerColor === 'w' ? 2 : 3)}
                    className="py-1.5 sm:py-2 px-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-zinc-300 text-[11px] font-semibold flex items-center justify-center gap-1 border border-zinc-800"
                    title="한 수 물리기"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                    <span>무르기</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResign}
                    disabled={isGameOver}
                    className="py-1.5 sm:py-2 px-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-zinc-300 text-[11px] font-semibold flex items-center justify-center gap-1 border border-zinc-800"
                    title="기권하기"
                  >
                    <Flag className="w-3.5 h-3.5 text-rose-400" />
                    <span>기권</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => startNewGame()}
                    className="py-1.5 sm:py-2 px-1 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-98 text-zinc-950 text-[11px] font-black flex items-center justify-center gap-1 shadow-sm"
                    title="새 게임 시작"
                  >
                    <Play className="w-3.5 h-3.5 fill-zinc-950" />
                    <span>새 게임</span>
                  </button>
                </div>
              )}
            </div>

            {/* Review Button when moves exist */}
            {playedMoves.length > 0 && (
              <button
                onClick={runGameReview}
                disabled={isAnalyzing}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-99 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 shrink-0"
              >
                <TrendingUp className="w-4 h-4" />
                {isGameOver ? '대국 복기 및 좋은 수/실수 분석하기' : '현재까지의 대국 복기하기'}
              </button>
            )}
          </div>
        ) : activeTab === 'pvp' ? (
          <div className="flex-1 flex flex-col overflow-y-auto">
            <MultiplayerView
              currentUser={userProfile}
              pieceTheme={pieceTheme}
              boardTheme={boardTheme}
              onBackToPlay={() => setActiveTab('play')}
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

      {/* Game Over Dialog */}
      {showGameOverModal && (
        <div className="fixed inset-0 z-40 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="text-3xl">
              {gameResult === 'win' ? '🏆' : gameResult === 'loss' ? '💀' : '🤝'}
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-zinc-100">
                {gameResult === 'win'
                  ? '플레이어 승리! 🎉'
                  : gameResult === 'loss'
                  ? 'AI 승리'
                  : '무승부 (Draw)'}
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                {gameOverReason === 'checkmate'
                  ? '체크메이트로 경기가 종료되었습니다.'
                  : gameOverReason === 'timeout'
                  ? '시간 초과로 승패가 결정되었습니다.'
                  : gameOverReason === 'resignation'
                  ? '기권으로 종료되었습니다.'
                  : '스테일메이트 또는 기물 부족 무승부입니다.'}
              </p>
            </div>

            {/* Player Rating & Achievement Card */}
            {lastGameReward && (
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <AvatarIcon avatar={userProfile.avatar} color={userProfile.avatarColor} size="sm" />
                    <div>
                      <span className="font-bold text-white text-xs block">{userProfile.nickname}</span>
                      <span className="text-[10px] text-zinc-400">{getTier(userProfile.rating).name}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 font-mono font-bold text-xs">
                      <span className="text-zinc-200">{userProfile.rating} Elo</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                          lastGameReward.ratingDelta >= 0
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {lastGameReward.ratingDelta >= 0
                          ? `+${lastGameReward.ratingDelta}`
                          : lastGameReward.ratingDelta}
                      </span>
                    </div>
                  </div>
                </div>

                {lastGameReward.isFirstConquest && (
                  <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5">
                    <span>🏆</span>
                    <span>AI Lv.{difficulty} 최초 격파! 명예 훈장 획득!</span>
                  </div>
                )}

                {lastGameReward.isBestMoves && !lastGameReward.isFirstConquest && (
                  <div className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1">
                    <span>⚡</span>
                    <span>새로운 최소 수 승리 기록 ({playedMoves.length}수)!</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowGameOverModal(false);
                    setShowRankingModal(true);
                  }}
                  className="w-full py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-amber-400 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>명예의 전당 순위표 확인</span>
                </button>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={runGameReview}
                disabled={isAnalyzing}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all"
              >
                <TrendingUp className="w-4 h-4" /> 대국 정밀 복기하기
              </button>
              <button
                type="button"
                onClick={() => setShowGameOverModal(false)}
                className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-98 text-zinc-200 font-semibold text-xs border border-zinc-700 flex items-center justify-center gap-1.5 transition-all"
              >
                <Eye className="w-4 h-4 text-amber-400" /> 체스판 둘러보기
              </button>
              <button
                type="button"
                onClick={() => startNewGame()}
                className="w-full py-2.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 font-medium text-xs border border-zinc-700/60 transition-all"
              >
                새 대국 시작하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl max-w-sm w-full space-y-4 max-h-[88vh] overflow-y-auto shadow-2xl">
            <h3 className="text-base font-bold text-zinc-100 border-b border-zinc-800 pb-2 flex items-center justify-between">
              <span>게임 환경 설정</span>
              <span className="text-[11px] text-zinc-500 font-normal">오프라인 완벽 지원</span>
            </h3>

            {/* Piece Theme Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-amber-400" />
                체스 기물 그래픽 (3D 리얼)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: '3d_staunton', label: '3D 프리미엄 우드', desc: '고급 원목 & 입체 섀도' },
                  { id: '3d_wood', label: '3D 골든 래커', desc: '광택 목조 조각상' },
                  { id: 'metal', label: '3D 메탈릭 스틸', desc: '세련된 크롬 금속' },
                  { id: 'classic', label: '클래식 벡터', desc: '단정한 2D 플랫' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handlePieceThemeChange(t.id as PieceTheme)}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                      pieceTheme === t.id
                        ? 'bg-amber-500/15 border-amber-400 text-amber-300 ring-1 ring-amber-400/50'
                        : 'bg-zinc-800/80 border-zinc-700/80 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-zinc-950/70 flex items-center justify-center p-0.5 shrink-0 border border-zinc-700/50">
                      {t.id !== 'classic' ? (
                        <img src={`/pieces/${t.id}/wn.png`} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-xs font-bold text-amber-200">♞</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold truncate">{t.label}</div>
                      <div className="text-[9px] text-zinc-400 truncate">{t.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Board Theme Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">체스판 테마</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'walnut', label: '월넛 원목' },
                  { id: 'tournament', label: '토너먼트' },
                  { id: 'marble', label: '대리석' },
                  { id: 'dark_wood', label: '다크 흑단' },
                  { id: 'classic', label: '클래식 플랫' },
                ].map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleBoardThemeChange(b.id as BoardTheme)}
                    className={`py-2 px-1 rounded-lg text-[11px] font-bold border transition-all text-center truncate ${
                      boardTheme === b.id
                        ? 'bg-amber-500 border-amber-400 text-zinc-950 shadow-sm'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-750'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Audio & Haptic Feedback */}
            <div className="space-y-1.5 pt-1 border-t border-zinc-800/80">
              <label className="text-xs font-semibold text-zinc-300">사운드 & 진동 피드백</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleSound(!soundEnabled)}
                  className={`py-2 px-2.5 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                    soundEnabled
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                  }`}
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  효과음 {soundEnabled ? '켜짐' : '꺼짐'}
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleHaptics(!hapticsEnabled)}
                  className={`py-2 px-2.5 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                    hapticsEnabled
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  진동 {hapticsEnabled ? '켜짐' : '꺼짐'}
                </button>
              </div>
            </div>

            {/* Real-time Evaluation Bar Setting */}
            <div className="space-y-1.5 pt-1 border-t border-zinc-800/80">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
                  실시간 형세 평가 바 (Eval Bar)
                </label>
                <button
                  type="button"
                  onClick={() => handleToggleEvalBar(!showEvalBar)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                    showEvalBar
                      ? 'bg-amber-500 border-amber-400 text-zinc-950 shadow-sm'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                  }`}
                >
                  {showEvalBar ? '켜짐' : '꺼짐'}
                </button>
              </div>
              <p className="text-[10px] text-zinc-400 leading-tight">
                체스판 좌측에 스톡피쉬 엔진의 유불리 점수(+- 폰 우세)를 세로 막대로 실시간 표시합니다.
              </p>
            </div>

            {/* Time Control */}
            <div className="space-y-1.5 pt-1 border-t border-zinc-800/80">
              <label className="text-xs font-semibold text-zinc-300">대국 제한 시간</label>
              <div className="grid grid-cols-3 gap-2">
                {(['5m', '10m', 'unlimited'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTimeLimit(t)}
                    className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                      timeLimit === t
                        ? 'bg-amber-500 border-amber-400 text-zinc-950 shadow-sm'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                    }`}
                  >
                    {t === '5m' ? '5분' : t === '10m' ? '10분' : '무제한'}
                  </button>
                ))}
              </div>
            </div>

            {/* Side Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">진영 선택</label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'white', label: '백 (White)' },
                    { id: 'black', label: '흑 (Black)' },
                    { id: 'random', label: '랜덤' },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setChosenSide(s.id)}
                    className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                      chosenSide === s.id
                        ? 'bg-amber-500 border-amber-400 text-zinc-950 shadow-sm'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                <span>AI 난이도</span>
                <span className="text-amber-400 font-bold">
                  Lv.{difficulty}{' '}
                  {difficulty <= 3
                    ? '(초급)'
                    : difficulty <= 6
                    ? '(중급)'
                    : difficulty <= 8
                    ? '(고급)'
                    : '(마스터)'}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={difficulty}
                onChange={(e) => setDifficulty(parseInt(e.target.value, 10) as DifficultyLevel)}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>1 (쉬움)</span>
                <span>5 (보통)</span>
                <span>10 (최상)</span>
              </div>
            </div>

            {/* Tour Guide Replay */}
            <div className="pt-1 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={() => {
                  setShowSettingsModal(false);
                  setTimeout(() => setShowTourGuide(true), 200);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-amber-300 text-xs font-bold flex items-center justify-center gap-2 border border-zinc-700/80 transition-all active:scale-98 cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <span>앱 기능 가이드 (튜토리얼) 다시 보기</span>
              </button>
            </div>

            {/* Legal & Open Source Info */}
            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400 px-1">
              <a
                href="/privacy.html"
                target="_blank"
                rel="noreferrer"
                className="hover:text-amber-300 underline underline-offset-2 flex items-center gap-1 transition-colors"
                title="개인정보처리방침 열기"
              >
                <span>개인정보처리방침</span>
                <span className="text-[10px]">↗</span>
              </a>
              <span className="text-zinc-500 font-mono text-[10px]">Stockfish GPL v3</span>
            </div>

            {/* Start Button */}
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={() => startNewGame(difficulty, timeLimit, chosenSide)}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 text-zinc-950 text-xs font-bold shadow-md shadow-amber-950/30"
              >
                설정 적용 후 새 게임
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Loading Overlay */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
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

      {/* Review Modal */}
      {showReviewModal && reviewData && (
        <ReviewModal
          reviewData={reviewData}
          playerColor={playerColor}
          pieceTheme={pieceTheme}
          boardTheme={boardTheme}
          onClose={() => setShowReviewModal(false)}
        />
      )}

      {/* Opening Guide Modal */}
      <OpeningGuideModal
        isOpen={showOpeningModal}
        onClose={() => setShowOpeningModal(false)}
        onStartGuidedOpening={handleStartGuidedOpening}
        currentOpening={currentOpening}
      />

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

      {/* User Profile Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        profile={userProfile}
        onUpdateProfile={setUserProfile}
        onSelectLevelToPlay={(lvl) => {
          setDifficulty(lvl as DifficultyLevel);
          startNewGame(lvl as DifficultyLevel);
        }}
        onOpenRanking={() => setShowRankingModal(true)}
      />

      {/* Rankings / Leaderboard Modal */}
      <RankingModal
        isOpen={showRankingModal}
        onClose={() => setShowRankingModal(false)}
        currentUser={userProfile}
      />
    </div>
  );
};
