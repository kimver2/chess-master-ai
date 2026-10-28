import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Chess } from 'chess.js';
import {
  Users,
  Zap,
  Copy,
  Check,
  Smartphone,
  Loader2,
  Flag,
  ArrowLeft,
  Swords,
  AlertCircle,
  RotateCcw,
  Handshake,
  TrendingUp,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { ChessBoard } from './ChessBoard';
import { AvatarIcon } from './AvatarIcon';
import { UserProfile } from '../types/profile';
import {
  PieceColor,
  PieceTheme,
  BoardTheme,
  GameOverReason,
  TimeLimit,
  PlayedMoveRecord,
} from '../types/chess';
import {
  MultiplayerGameData,
  MultiplayerPlayer,
  MultiplayerMove,
} from '../types/multiplayer';
import {
  createFriendRoom,
  joinFriendRoom,
  startQuickMatch,
  subscribeToGame,
  makeMultiplayerMove,
  resignMultiplayerGame,
  claimMultiplayerTimeout,
  offerMultiplayerDraw,
  respondMultiplayerDraw,
  requestMultiplayerRematch,
  declineMultiplayerRematch,
  markPlayerLeftPostGame,
  getInitialClockMs,
} from '../services/multiplayerService';
import {
  recordPvpGameResult,
  saveGameToArchive,
  buildStandardPgn,
} from '../services/storageService';
import { getOpeningFromMoves } from '../data/openings';
import { soundManager } from '../utils/audio';

interface MultiplayerViewProps {
  currentUser: UserProfile;
  pieceTheme: PieceTheme;
  boardTheme: BoardTheme;
  onBackToPlay?: () => void;
  onProfileUpdated?: (updated: UserProfile) => void;
  onArchiveSaved?: () => void;
  onAnalyzeMoves?: (moves: PlayedMoveRecord[], myColor: PieceColor) => void;
  externalJoinGameId?: string | null;
  onConsumeExternalJoin?: () => void;
  onWatchRematchGame?: (
    info: { gameId: string; myColor: PieceColor; opponentName: string } | null
  ) => void;
  onActivePvpBoardChange?: (gameId: string | null) => void;
}

function reconstructMoveRecords(mpMoves: MultiplayerMove[]): PlayedMoveRecord[] {
  const records: PlayedMoveRecord[] = [];
  const temp = new Chess();
  for (let i = 0; i < mpMoves.length; i++) {
    const m = mpMoves[i];
    const fenBefore = temp.fen();
    const color = temp.turn();
    try {
      const res = temp.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
      if (!res) break;
      const fenAfter = temp.fen();
      records.push({
        ply: i,
        moveNumber: Math.floor(i / 2) + 1,
        color,
        san: res.san,
        from: m.from,
        to: m.to,
        promotion: res.promotion,
        captured: res.captured,
        fenBefore,
        fenAfter,
      });
    } catch {
      break;
    }
  }
  return records;
}

function formatClock(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '∞';
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const MultiplayerView: React.FC<MultiplayerViewProps> = ({
  currentUser,
  pieceTheme,
  boardTheme,
  onBackToPlay,
  onProfileUpdated,
  onArchiveSaved,
  onAnalyzeMoves,
  externalJoinGameId,
  onConsumeExternalJoin,
  onWatchRematchGame,
  onActivePvpBoardChange,
}) => {
  // Navigation & Sub-views: 'lobby' | 'creating_room' | 'joining_room' | 'matching' | 'in_game'
  const [viewState, setViewState] = useState<
    'lobby' | 'creating_room' | 'joining_room' | 'matching' | 'in_game'
  >('lobby');

  // Selected Time Control in Lobby
  const [selectedTimeLimit, setSelectedTimeLimit] = useState<TimeLimit>('10m');

  // Online Game State
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [gameData, setGameData] = useState<MultiplayerGameData | null>(null);
  const [createdRoomCode, setCreatedRoomCode] = useState<string>('');
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [liveClockTick, setLiveClockTick] = useState<number>(Date.now());
  const [onlineRatingDelta, setOnlineRatingDelta] = useState<number | null>(null);

  // Confirm Dialogs ('resign' | 'local_draw' | null)
  const [confirmModal, setConfirmModal] = useState<'resign' | 'local_draw' | null>(null);

  // Local Pass & Play State
  const [isLocalMode, setIsLocalMode] = useState<boolean>(false);
  const [rotateOppositePieces, setRotateOppositePieces] = useState<boolean>(true);
  const [localChess, setLocalChess] = useState<Chess>(() => new Chess());
  const [localMoves, setLocalMoves] = useState<PlayedMoveRecord[]>([]);
  const [localLastMove, setLocalLastMove] = useState<{ from: string; to: string } | null>(null);
  const [localGameOver, setLocalGameOver] = useState<boolean>(false);
  const [localWinner, setLocalWinner] = useState<PieceColor | 'draw' | null>(null);
  const [localReason, setLocalReason] = useState<GameOverReason>(null);
  const [localWhiteMs, setLocalWhiteMs] = useState<number | null>(null);
  const [localBlackMs, setLocalBlackMs] = useState<number | null>(null);
  const localStartTimeRef = useRef<number>(Date.now());

  const cleanupMatchmakingRef = useRef<(() => void) | null>(null);
  const unsubscribeGameRef = useRef<(() => void) | null>(null);
  const recordedGameIdsRef = useRef<Set<string>>(new Set());
  const timeoutClaimedRef = useRef<string | null>(null);

  // Convert UserProfile to MultiplayerPlayer format
  const playerInfo: MultiplayerPlayer = useMemo(
    () => ({
      id: currentUser.id,
      nickname: currentUser.nickname,
      avatar: currentUser.avatar,
      avatarColor: currentUser.avatarColor,
      rating: currentUser.rating,
    }),
    [currentUser]
  );

  // Clean up listeners on unmount
  useEffect(() => {
    return () => {
      if (cleanupMatchmakingRef.current) cleanupMatchmakingRef.current();
      if (unsubscribeGameRef.current) unsubscribeGameRef.current();
      if (onActivePvpBoardChange) onActivePvpBoardChange(null);
    };
  }, []);

  // Report whether user is currently viewing an active/post-game online PVP board
  useEffect(() => {
    if (!onActivePvpBoardChange) return;
    if (!isLocalMode && viewState === 'in_game' && activeGameId) {
      onActivePvpBoardChange(activeGameId);
    } else {
      onActivePvpBoardChange(null);
    }
  }, [isLocalMode, viewState, activeGameId, onActivePvpBoardChange]);

  // Accept external rematch transition triggered from global notification banner
  useEffect(() => {
    if (!externalJoinGameId) return;
    if (cleanupMatchmakingRef.current) cleanupMatchmakingRef.current();
    if (unsubscribeGameRef.current) unsubscribeGameRef.current();
    setIsLocalMode(false);
    setOnlineRatingDelta(null);
    timeoutClaimedRef.current = null;
    setActiveGameId(externalJoinGameId);
    setViewState('in_game');
    soundManager.gameStart();
    if (onConsumeExternalJoin) onConsumeExternalJoin();
  }, [externalJoinGameId, onConsumeExternalJoin]);

  // Determine player's color in the online game
  const myOnlineColor: PieceColor | null = useMemo(() => {
    if (!gameData) return null;
    if (gameData.whitePlayer?.id === currentUser.id) return 'w';
    if (gameData.blackPlayer?.id === currentUser.id) return 'b';
    return 'w';
  }, [gameData, currentUser.id]);

  // Subscribe to active online game
  useEffect(() => {
    if (!activeGameId || isLocalMode) return;

    const unsub = subscribeToGame(
      activeGameId,
      (updatedGame) => {
        // If rematch game was created, seamlessly transition both players!
        if (updatedGame.nextGameId && updatedGame.nextGameId !== activeGameId) {
          setOnlineRatingDelta(null);
          timeoutClaimedRef.current = null;
          if (onWatchRematchGame) onWatchRematchGame(null);
          setActiveGameId(updatedGame.nextGameId);
          soundManager.gameStart();
          return;
        }

        setGameData((prev) => {
          // Play sound if move count increased
          if (prev && updatedGame.moves.length > prev.moves.length) {
            soundManager.move();
          }
          return updatedGame;
        });

        if (updatedGame.status === 'playing') {
          setViewState((prevView) => {
            if (prevView !== 'in_game') {
              soundManager.gameStart();
              return 'in_game';
            }
            return prevView;
          });
        }
      },
      (err) => {
        setErrorMessage('게임 동기화 오류: ' + err.message);
      }
    );

    unsubscribeGameRef.current = unsub;
    return () => {
      unsub();
    };
  }, [activeGameId, isLocalMode]);

  // Record Online PVP result (Elo + Archive) once when game completes
  useEffect(() => {
    if (
      isLocalMode ||
      !gameData ||
      gameData.status !== 'completed' ||
      !myOnlineColor ||
      recordedGameIdsRef.current.has(gameData.id)
    ) {
      return;
    }

    recordedGameIdsRef.current.add(gameData.id);

    const outcome: 'win' | 'loss' | 'draw' =
      gameData.winner === 'draw' || !gameData.winner
        ? 'draw'
        : gameData.winner === myOnlineColor
        ? 'win'
        : 'loss';

    if (outcome === 'win') soundManager.victory();
    else if (outcome === 'draw') soundManager.draw();
    else soundManager.defeat();

    const opp = myOnlineColor === 'w' ? gameData.blackPlayer : gameData.whitePlayer;
    const oppRating = opp?.rating || 1000;
    const { profile: updatedProf, ratingDelta } = recordPvpGameResult(outcome, oppRating);
    setOnlineRatingDelta(ratingDelta);
    if (onProfileUpdated) onProfileUpdated(updatedProf);

    // Save to Archive
    const moveRecords = reconstructMoveRecords(gameData.moves || []);
    const pgnResult =
      gameData.winner === 'w' ? '1-0' : gameData.winner === 'b' ? '0-1' : '1/2-1/2';
    const pgn = buildStandardPgn(moveRecords, {
      event: 'Chess Master AI 1:1 Online PVP',
      white: gameData.whitePlayer?.nickname || 'White',
      black: gameData.blackPlayer?.nickname || 'Black',
      result: pgnResult,
    });
    const opening = getOpeningFromMoves(moveRecords.map((m) => m.san));
    const durationSec = Math.max(
      5,
      Math.round(
        (new Date(gameData.updatedAt).getTime() - new Date(gameData.createdAt).getTime()) / 1000
      ) || moveRecords.length * 5
    );

    saveGameToArchive({
      date: new Date().toISOString(),
      mode: 'pvp_online',
      opponentName: opp?.nickname || '온라인 상대',
      playerColor: myOnlineColor,
      result: outcome,
      reason: gameData.endReason,
      moveCount: moveRecords.length,
      durationSec,
      pgn,
      finalFen: gameData.fen,
      openingName: opening?.nameKo,
      moves: moveRecords,
    });
    if (onArchiveSaved) onArchiveSaved();
    if (onWatchRematchGame) {
      onWatchRematchGame({
        gameId: gameData.id,
        myColor: myOnlineColor,
        opponentName: opp?.nickname || '온라인 상대',
      });
    }
  }, [gameData, isLocalMode, myOnlineColor]);

  // Online Live Clock Ticker & Timeout Detector
  useEffect(() => {
    if (
      isLocalMode ||
      viewState !== 'in_game' ||
      !gameData ||
      gameData.status !== 'playing' ||
      !gameData.timeLimit ||
      gameData.timeLimit === 'unlimited'
    ) {
      return;
    }

    const timer = setInterval(() => {
      setLiveClockTick(Date.now());
    }, 250);

    return () => clearInterval(timer);
  }, [isLocalMode, viewState, gameData?.status, gameData?.timeLimit]);

  // Compute live online clocks
  const { displayOnlineWhiteMs, displayOnlineBlackMs } = useMemo(() => {
    if (!gameData || !gameData.timeLimit || gameData.timeLimit === 'unlimited') {
      return { displayOnlineWhiteMs: null, displayOnlineBlackMs: null };
    }
    const baseW = gameData.whiteTimeMs ?? getInitialClockMs(gameData.timeLimit);
    const baseB = gameData.blackTimeMs ?? getInitialClockMs(gameData.timeLimit);
    if (gameData.status !== 'playing' || !gameData.turnStartedAt) {
      return { displayOnlineWhiteMs: baseW, displayOnlineBlackMs: baseB };
    }
    const elapsed = Math.max(0, liveClockTick - new Date(gameData.turnStartedAt).getTime());
    if (gameData.currentTurn === 'w') {
      return {
        displayOnlineWhiteMs: baseW !== null ? Math.max(0, baseW - elapsed) : null,
        displayOnlineBlackMs: baseB,
      };
    } else {
      return {
        displayOnlineWhiteMs: baseW,
        displayOnlineBlackMs: baseB !== null ? Math.max(0, baseB - elapsed) : null,
      };
    }
  }, [gameData, liveClockTick]);

  // Trigger online timeout claim when active clock hits 0
  useEffect(() => {
    if (
      isLocalMode ||
      !activeGameId ||
      !gameData ||
      gameData.status !== 'playing' ||
      !gameData.timeLimit ||
      gameData.timeLimit === 'unlimited'
    ) {
      return;
    }

    const activeMs =
      gameData.currentTurn === 'w' ? displayOnlineWhiteMs : displayOnlineBlackMs;
    if (activeMs !== null && activeMs <= 0 && timeoutClaimedRef.current !== activeGameId) {
      timeoutClaimedRef.current = activeGameId;
      claimMultiplayerTimeout(activeGameId, gameData.currentTurn).catch(console.error);
    }
  }, [
    isLocalMode,
    activeGameId,
    gameData,
    displayOnlineWhiteMs,
    displayOnlineBlackMs,
  ]);

  // Local Pass & Play Clock Countdown
  useEffect(() => {
    if (!isLocalMode || viewState !== 'in_game' || localGameOver || selectedTimeLimit === 'unlimited') {
      return;
    }

    const interval = setInterval(() => {
      const turn = localChess.turn();
      if (turn === 'w') {
        setLocalWhiteMs((prev) => {
          if (prev === null) return null;
          if (prev <= 1000) {
            finishLocalGame('b', 'timeout', localMoves, localChess.fen());
            return 0;
          }
          return prev - 1000;
        });
      } else {
        setLocalBlackMs((prev) => {
          if (prev === null) return null;
          if (prev <= 1000) {
            finishLocalGame('w', 'timeout', localMoves, localChess.fen());
            return 0;
          }
          return prev - 1000;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isLocalMode, viewState, localGameOver, selectedTimeLimit, localChess, localMoves]);

  // Active chess instance for online game
  const onlineChess = useMemo(() => {
    const c = new Chess();
    if (gameData?.fen) {
      try {
        c.load(gameData.fen);
      } catch (e) {
        console.error('Failed to load FEN:', e);
      }
    }
    return c;
  }, [gameData?.fen]);

  // 1. Create Friend Room
  const handleCreateFriendRoom = async (side: 'white' | 'black' | 'random' = 'random') => {
    setErrorMessage(null);
    setOnlineRatingDelta(null);
    if (onWatchRematchGame) onWatchRematchGame(null);
    setViewState('creating_room');
    try {
      const { gameId, roomCode } = await createFriendRoom(playerInfo, side, selectedTimeLimit);
      setActiveGameId(gameId);
      setCreatedRoomCode(roomCode);
    } catch (err: any) {
      setErrorMessage(err.message || '방 생성 실패');
      setViewState('lobby');
    }
  };

  // 2. Join Friend Room
  const handleJoinFriendRoom = async () => {
    if (!joinCodeInput.trim() || joinCodeInput.trim().length < 6) {
      setErrorMessage('6자리 방 코드를 올바르게 입력해주세요.');
      return;
    }
    setErrorMessage(null);
    setOnlineRatingDelta(null);
    if (onWatchRematchGame) onWatchRematchGame(null);
    try {
      const res = await joinFriendRoom(joinCodeInput.trim(), playerInfo);
      if (res.success && res.gameId) {
        setActiveGameId(res.gameId);
        setViewState('in_game');
        soundManager.gameStart();
      } else {
        setErrorMessage(res.error || '방 참가 실패');
      }
    } catch (err: any) {
      setErrorMessage(err.message || '방 참가 중 오류');
    }
  };

  // 3. Start Quick Match
  const handleStartQuickMatch = () => {
    setErrorMessage(null);
    setOnlineRatingDelta(null);
    if (onWatchRematchGame) onWatchRematchGame(null);
    setViewState('matching');

    const cancelFn = startQuickMatch(
      playerInfo,
      (gameId) => {
        setActiveGameId(gameId);
        setViewState('in_game');
        soundManager.gameStart();
      },
      (err) => {
        setErrorMessage(err);
        setViewState('lobby');
      },
      selectedTimeLimit
    );

    cleanupMatchmakingRef.current = cancelFn;
  };

  const handleCancelMatching = () => {
    if (cleanupMatchmakingRef.current) {
      cleanupMatchmakingRef.current();
      cleanupMatchmakingRef.current = null;
    }
    setViewState('lobby');
  };

  // 4. Start Pass & Play (Local 2-Player on same device)
  const handleStartPassAndPlay = () => {
    if (onWatchRematchGame) onWatchRematchGame(null);
    const initialMs = getInitialClockMs(selectedTimeLimit);
    setIsLocalMode(true);
    setLocalChess(new Chess());
    setLocalMoves([]);
    setLocalLastMove(null);
    setLocalGameOver(false);
    setLocalWinner(null);
    setLocalReason(null);
    setLocalWhiteMs(initialMs);
    setLocalBlackMs(initialMs);
    localStartTimeRef.current = Date.now();
    setViewState('in_game');
    soundManager.gameStart();
  };

  const finishLocalGame = (
    winnerColor: PieceColor | 'draw',
    reason: GameOverReason,
    moves: PlayedMoveRecord[],
    finalFen: string
  ) => {
    setLocalGameOver(true);
    setLocalWinner(winnerColor);
    setLocalReason(reason);
    if (winnerColor === 'draw') soundManager.draw();
    else soundManager.victory();

    if (moves.length > 0) {
      const pgnRes =
        winnerColor === 'w' ? '1-0' : winnerColor === 'b' ? '0-1' : '1/2-1/2';
      const pgn = buildStandardPgn(moves, {
        event: 'Chess Master AI Local Pass & Play',
        white: '백 (Player 1)',
        black: '흑 (Player 2)',
        result: pgnRes,
      });
      const opening = getOpeningFromMoves(moves.map((m) => m.san));
      const durationSec = Math.max(
        5,
        Math.round((Date.now() - localStartTimeRef.current) / 1000)
      );

      saveGameToArchive({
        date: new Date().toISOString(),
        mode: 'pvp_local',
        opponentName: '오프라인 2인 대국',
        playerColor: 'w',
        result: winnerColor === 'w' ? 'win' : winnerColor === 'b' ? 'loss' : 'draw',
        reason,
        moveCount: moves.length,
        durationSec,
        pgn,
        finalFen,
        openingName: opening?.nameKo,
        moves,
      });
      if (onArchiveSaved) onArchiveSaved();
    }
  };

  // Copy Room Code
  const handleCopyRoomCode = () => {
    if (!createdRoomCode) return;
    navigator.clipboard?.writeText(createdRoomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Handle Online Move
  const handleOnlineMove = async (from: string, to: string, promotion?: string) => {
    if (!activeGameId || !gameData) return false;
    if (gameData.status !== 'playing') return false;
    if (gameData.currentTurn !== myOnlineColor) return false;

    try {
      const tempChess = new Chess(gameData.fen);
      const moveRes = tempChess.move({ from, to, promotion: promotion || 'q' });
      if (!moveRes) return false;

      if (moveRes.captured) soundManager.capture();
      else soundManager.move();

      const newFen = tempChess.fen();
      const nextTurn: PieceColor = tempChess.turn();
      const isOver = tempChess.isGameOver();
      let winner: PieceColor | 'draw' | null = null;
      let endReason: GameOverReason = null;

      if (isOver) {
        if (tempChess.isCheckmate()) {
          winner = myOnlineColor;
          endReason = 'checkmate';
        } else {
          winner = 'draw';
          endReason = tempChess.isStalemate() ? 'stalemate' : 'insufficient_material';
        }
      }

      const moveObj: MultiplayerMove = {
        from,
        to,
        san: moveRes.san,
        ...(moveRes.promotion ? { promotion: moveRes.promotion } : {}),
        ply: gameData.moves.length + 1,
        timestamp: new Date().toISOString(),
      };

      const clocksPayload =
        gameData.timeLimit && gameData.timeLimit !== 'unlimited'
          ? {
              whiteTimeMs: displayOnlineWhiteMs,
              blackTimeMs: displayOnlineBlackMs,
            }
          : undefined;

      await makeMultiplayerMove(
        activeGameId,
        moveObj,
        newFen,
        nextTurn,
        isOver,
        winner,
        endReason,
        clocksPayload
      );

      return true;
    } catch (e) {
      console.error('Online move error:', e);
      return false;
    }
  };

  // Handle Local (Pass & Play) Move
  const handleLocalMove = (from: string, to: string, promotion?: string) => {
    if (localGameOver) return false;
    try {
      const fenBefore = localChess.fen();
      const moverColor = localChess.turn();
      const copy = new Chess(fenBefore);
      const res = copy.move({ from, to, promotion: promotion || 'q' });
      if (!res) return false;

      if (res.captured) soundManager.capture();
      else soundManager.move();

      const fenAfter = copy.fen();
      const moveRec: PlayedMoveRecord = {
        ply: localMoves.length,
        moveNumber: Math.floor(localMoves.length / 2) + 1,
        color: moverColor,
        san: res.san,
        from,
        to,
        promotion: res.promotion,
        captured: res.captured,
        fenBefore,
        fenAfter,
      };
      const updatedMoves = [...localMoves, moveRec];

      setLocalChess(copy);
      setLocalMoves(updatedMoves);
      setLocalLastMove({ from, to });

      if (copy.isCheck()) soundManager.check();

      if (copy.isGameOver()) {
        if (copy.isCheckmate()) {
          finishLocalGame(copy.turn() === 'w' ? 'b' : 'w', 'checkmate', updatedMoves, fenAfter);
        } else {
          finishLocalGame(
            'draw',
            copy.isStalemate() ? 'stalemate' : 'insufficient_material',
            updatedMoves,
            fenAfter
          );
        }
      }
      return true;
    } catch {
      return false;
    }
  };

  // Execute confirmed resignation
  const executeConfirmedResign = async () => {
    setConfirmModal(null);
    if (isLocalMode) {
      finishLocalGame(
        localChess.turn() === 'w' ? 'b' : 'w',
        'resignation',
        localMoves,
        localChess.fen()
      );
      return;
    }
    if (!activeGameId || !myOnlineColor) return;
    await resignMultiplayerGame(activeGameId, myOnlineColor);
  };

  // Offer / Respond Draw
  const handleDrawButton = async () => {
    if (isLocalMode) {
      setConfirmModal('local_draw');
      return;
    }
    if (!activeGameId || !myOnlineColor || !gameData || gameData.status !== 'playing') return;
    await offerMultiplayerDraw(activeGameId, myOnlineColor);
  };

  const handleRespondDraw = async (accept: boolean) => {
    if (!activeGameId) return;
    await respondMultiplayerDraw(activeGameId, accept);
  };

  // Request Rematch
  const handleRematch = async () => {
    if (isLocalMode) {
      handleStartPassAndPlay();
      return;
    }
    if (!activeGameId || !myOnlineColor) return;
    const newId = await requestMultiplayerRematch(activeGameId, myOnlineColor);
    if (newId) {
      setOnlineRatingDelta(null);
      timeoutClaimedRef.current = null;
      if (onWatchRematchGame) onWatchRematchGame(null);
      setActiveGameId(newId);
      soundManager.gameStart();
    }
  };

  // Decline Incoming Rematch Offer
  const handleDeclineRematch = async () => {
    if (isLocalMode || !activeGameId || !myOnlineColor) return;
    await declineMultiplayerRematch(activeGameId, myOnlineColor);
  };

  // Trigger Post-Game Review
  const handleReviewCurrentPvpGame = () => {
    if (!onAnalyzeMoves) return;
    if (isLocalMode) {
      if (localMoves.length > 0) onAnalyzeMoves(localMoves, 'w');
    } else if (gameData && gameData.moves.length > 0) {
      const records = reconstructMoveRecords(gameData.moves);
      onAnalyzeMoves(records, myOnlineColor || 'w');
    }
  };

  // Universal Board Move Handler
  const handleBoardMove = (from: string, to: string, promotion?: string): boolean => {
    if (isLocalMode) {
      return handleLocalMove(from, to, promotion);
    } else {
      handleOnlineMove(from, to, promotion);
      return true;
    }
  };

  // Exit Game back to Lobby
  const handleExitGame = () => {
    if (!isLocalMode && activeGameId && myOnlineColor && gameData?.status === 'completed') {
      markPlayerLeftPostGame(activeGameId, myOnlineColor).catch(console.warn);
      if (onWatchRematchGame) {
        const opp = myOnlineColor === 'w' ? gameData.blackPlayer : gameData.whitePlayer;
        onWatchRematchGame({
          gameId: activeGameId,
          myColor: myOnlineColor,
          opponentName: opp?.nickname || '온라인 상대',
        });
      }
    }
    if (cleanupMatchmakingRef.current) cleanupMatchmakingRef.current();
    if (unsubscribeGameRef.current) unsubscribeGameRef.current();
    setActiveGameId(null);
    setGameData(null);
    setIsLocalMode(false);
    setOnlineRatingDelta(null);
    setConfirmModal(null);
    setViewState('lobby');
  };

  // Opponent Player Info (for online game)
  const opponentPlayer: MultiplayerPlayer | null = useMemo(() => {
    if (!gameData) return null;
    return myOnlineColor === 'w' ? gameData.blackPlayer : gameData.whitePlayer;
  }, [gameData, myOnlineColor]);

  // ==========================================
  // VIEW: LOBBY & MODE SELECTION
  // ==========================================
  if (
    viewState === 'lobby' ||
    viewState === 'creating_room' ||
    viewState === 'joining_room' ||
    viewState === 'matching'
  ) {
    return (
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 max-w-md mx-auto w-full">
        {/* Header Banner */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-zinc-900 border border-amber-500/30 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-2xl shadow-inner">
              👥
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-1.5">
                <span>1:1 실시간 대전</span>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  PVP
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                타이머 · 무승부 제안 · 재대결 · Elo 연동 지원
              </p>
            </div>
          </div>

          {onBackToPlay && (
            <button
              onClick={onBackToPlay}
              className="px-2.5 py-1.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-750 flex items-center gap-1 transition-all shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>AI 대국</span>
            </button>
          )}
        </div>

        {/* Time Control Selector */}
        {viewState === 'lobby' && (
          <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 pl-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              제한 시간
            </span>
            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: '5m', label: '5분 속기' },
                  { id: '10m', label: '10분 표준' },
                  { id: 'unlimited', label: '무제한' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTimeLimit(t.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    selectedTimeLimit === t.id
                      ? 'bg-amber-500 text-zinc-950 shadow-xs'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs font-bold text-rose-300 hover:text-white"
            >
              닫기
            </button>
          </div>
        )}

        {/* SUB-VIEW: MATCHING IN PROGRESS */}
        {viewState === 'matching' && (
          <div className="p-6 rounded-2xl bg-zinc-900 border border-amber-500/40 text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <Loader2 className="w-16 h-16 text-amber-400 animate-spin" />
              <Swords className="w-6 h-6 text-amber-300 absolute" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">상대 플레이어를 찾는 중...</h3>
              <p className="text-xs text-zinc-400 mt-1">
                제한 시간 ({selectedTimeLimit === '5m' ? '5분' : selectedTimeLimit === '10m' ? '10분' : '무제한'}) 기준으로 자동 매칭됩니다.
              </p>
            </div>
            <button
              onClick={handleCancelMatching}
              className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all active:scale-95"
            >
              매칭 취소
            </button>
          </div>
        )}

        {/* SUB-VIEW: CREATING FRIEND ROOM (WAITING FOR OPPONENT) */}
        {viewState === 'creating_room' && (
          <div className="p-6 rounded-2xl bg-zinc-900 border border-amber-500/50 text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-2xl">
              🗝️
            </div>
            <div>
              <span className="text-xs text-zinc-400 font-semibold block">방 참여 비밀코드</span>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span
                  data-testid="created-room-code"
                  className="font-mono text-3xl font-black tracking-widest text-amber-300 bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-800 shadow-inner"
                >
                  {createdRoomCode || '생성 중...'}
                </span>
                <button
                  type="button"
                  onClick={handleCopyRoomCode}
                  className="p-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition-all active:scale-90"
                  title="코드 복사"
                >
                  {copiedCode ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-zinc-400 mt-2">
                친구에게 위 6자리 코드를 알려주세요. 입장 즉시 대국이 시작됩니다!
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-amber-400 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>친구의 입장을 기다리는 중...</span>
            </div>

            <button
              onClick={handleExitGame}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-400 text-xs font-semibold"
            >
              방 닫기
            </button>
          </div>
        )}

        {/* SUB-VIEW: JOINING FRIEND ROOM */}
        {viewState === 'joining_room' && (
          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-750 text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-white">친구 방 코드 입력</h3>
            <p className="text-xs text-zinc-400">
              친구가 공유해준 6자리 방 번호를 입력하세요.
            </p>

            <input
              type="text"
              data-testid="join-room-input"
              maxLength={6}
              placeholder="예: 749215"
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.replace(/[^0-9]/g, ''))}
              className="w-48 mx-auto text-center font-mono text-2xl font-black tracking-widest p-2.5 rounded-xl bg-zinc-950 border border-amber-500/60 text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              autoFocus
            />

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setViewState('lobby')}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
              >
                취소
              </button>
              <button
                type="button"
                data-testid="join-room-submit"
                onClick={handleJoinFriendRoom}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black shadow-md shadow-amber-950/40"
              >
                입장하기
              </button>
            </div>
          </div>
        )}

        {/* DEFAULT LOBBY MODE CARDS */}
        {viewState === 'lobby' && (
          <div className="space-y-3">
            {/* Card 1: Quick Match */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-zinc-850 to-zinc-900 border border-zinc-800 hover:border-amber-500/50 transition-all shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl shrink-0">
                    <Zap className="w-5 h-5 fill-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>빠른 온라인 매칭</span>
                      <span className="text-[10px] text-amber-400 font-mono">추천</span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      지금 접속해 있는 다른 플레이어와 1:1 레이팅 대전
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleStartQuickMatch}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-zinc-950 text-xs font-black shadow-md shadow-amber-950/40 shrink-0 transition-transform active:scale-95"
                >
                  매칭 시작
                </button>
              </div>
            </div>

            {/* Card 2: Friend Match */}
            <div className="p-4 rounded-2xl bg-zinc-850/80 border border-zinc-800 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-xl shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">친구와 1:1 대전</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    방 코드를 생성해 카카오톡이나 메시지로 초대하세요
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  data-testid="create-friend-room-btn"
                  onClick={() => handleCreateFriendRoom('random')}
                  className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-bold border border-zinc-700 flex items-center justify-center gap-1.5 transition-all active:scale-98"
                >
                  <span>방 만들기 (코드 생성)</span>
                </button>
                <button
                  type="button"
                  data-testid="open-join-room-btn"
                  onClick={() => setViewState('joining_room')}
                  className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-amber-300 text-xs font-bold border border-zinc-700 flex items-center justify-center gap-1.5 transition-all active:scale-98"
                >
                  <span>코드 입력하고 참여</span>
                </button>
              </div>
            </div>

            {/* Card 3: Pass & Play (Local 2-Player) */}
            <div className="p-4 rounded-2xl bg-zinc-850/80 border border-zinc-800">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">오프라인 2인 대전 (Pass & Play)</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      스마트폰 1대를 두고 마주 앉아 대국 (상대 기물 회전 지원)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  data-testid="start-pass-and-play-btn"
                  onClick={handleStartPassAndPlay}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-emerald-600 hover:text-white text-emerald-300 text-xs font-bold border border-emerald-500/40 shrink-0 transition-all active:scale-95"
                >
                  로컬 대전
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW: IN-GAME MULTIPLAYER BOARD
  // ==========================================
  const currentChess = isLocalMode ? localChess : onlineChess;
  const isMyTurn = isLocalMode
    ? true
    : (myOnlineColor === 'w' && gameData?.currentTurn === 'w') ||
      (myOnlineColor === 'b' && gameData?.currentTurn === 'b');
  const isGameOver = isLocalMode ? localGameOver : gameData?.status === 'completed';
  const winner = isLocalMode ? localWinner : gameData?.winner;
  const activeEndReason = isLocalMode ? localReason : gameData?.endReason;

  const orientation: 'white' | 'black' = isLocalMode
    ? 'white'
    : myOnlineColor === 'b'
    ? 'black'
    : 'white';

  const lastMove = isLocalMode ? localLastMove : gameData?.lastMove;
  const activeTimeLimit = isLocalMode ? selectedTimeLimit : gameData?.timeLimit || 'unlimited';

  // Top & Bottom Clocks
  const topColor: PieceColor = orientation === 'white' ? 'b' : 'w';
  const bottomColor: PieceColor = orientation === 'white' ? 'w' : 'b';

  const topClockMs = isLocalMode
    ? topColor === 'w'
      ? localWhiteMs
      : localBlackMs
    : topColor === 'w'
    ? displayOnlineWhiteMs
    : displayOnlineBlackMs;

  const bottomClockMs = isLocalMode
    ? bottomColor === 'w'
      ? localWhiteMs
      : localBlackMs
    : bottomColor === 'w'
    ? displayOnlineWhiteMs
    : displayOnlineBlackMs;

  const incomingDrawOffer =
    !isLocalMode &&
    !isGameOver &&
    gameData?.drawOfferBy &&
    gameData.drawOfferBy !== myOnlineColor;

  const myPendingDrawOffer =
    !isLocalMode &&
    !isGameOver &&
    gameData?.drawOfferBy &&
    gameData.drawOfferBy === myOnlineColor;

  const opponentOnlineColor: PieceColor | null = myOnlineColor
    ? myOnlineColor === 'w'
      ? 'b'
      : 'w'
    : null;

  const incomingRematchOffer =
    !isLocalMode &&
    isGameOver &&
    gameData?.rematchOfferBy &&
    gameData.rematchOfferBy !== myOnlineColor;

  const myPendingRematchOffer =
    !isLocalMode &&
    isGameOver &&
    gameData?.rematchOfferBy &&
    gameData.rematchOfferBy === myOnlineColor;

  const opponentLeftPostGame =
    !isLocalMode &&
    isGameOver &&
    !!opponentOnlineColor &&
    Boolean(gameData?.leftRoomBy?.includes(opponentOnlineColor));

  const opponentDeclinedRematch =
    !isLocalMode &&
    isGameOver &&
    !!opponentOnlineColor &&
    gameData?.rematchDeclinedBy === opponentOnlineColor;

  const totalMoveCount = isLocalMode ? localMoves.length : gameData?.moves.length || 0;

  return (
    <div className="flex-1 flex flex-col p-2.5 sm:p-3 space-y-2 max-w-md mx-auto w-full select-none overflow-y-auto">
      {/* Top Bar: Opponent Player Info (or Black in Local) */}
      <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <AvatarIcon
            avatar={isLocalMode ? 'king' : opponentPlayer?.avatar || 'knight'}
            color={isLocalMode ? 'rose' : opponentPlayer?.avatarColor || 'blue'}
            size="sm"
          />
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">
              {isLocalMode ? '흑 (Player 2)' : opponentPlayer?.nickname || '상대 플레이어'}
            </div>
            <div className="text-[10px] text-zinc-400 font-mono">
              {isLocalMode ? '마주보기 참가자' : `${opponentPlayer?.rating || 1000} Elo`}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Pass & Play Top Piece Flip Toggle */}
          {isLocalMode && (
            <button
              type="button"
              data-testid="toggle-rotate-pieces-btn"
              onClick={() => setRotateOppositePieces(!rotateOppositePieces)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1 transition-all ${
                rotateOppositePieces
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400'
              }`}
              title="마주 앉은 상대를 위해 흑 기물을 180도 회전합니다"
            >
              <RefreshCw className="w-3 h-3" />
              <span>기물회전 {rotateOppositePieces ? 'ON' : 'OFF'}</span>
            </button>
          )}

          {/* Top Player Clock */}
          {activeTimeLimit !== 'unlimited' && (
            <div
              className={`px-2.5 py-1 rounded-lg font-mono text-xs font-black border ${
                currentChess.turn() === topColor && !isGameOver
                  ? 'bg-amber-500 text-zinc-950 border-amber-400'
                  : 'bg-zinc-950 text-zinc-300 border-zinc-800'
              }`}
            >
              {formatClock(topClockMs)}
            </div>
          )}
        </div>
      </div>

      {/* Incoming Draw Offer Banner */}
      {incomingDrawOffer && (
        <div
          data-testid="incoming-draw-banner"
          className="px-3 py-2 rounded-xl bg-amber-950/85 border border-amber-500/60 flex items-center justify-between gap-2 text-xs text-amber-100 shrink-0 animate-fadeIn"
        >
          <span className="font-bold flex items-center gap-1.5">
            <Handshake className="w-4 h-4 text-amber-400 shrink-0" />
            상대가 무승부를 제안했습니다!
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              data-testid="accept-draw-btn"
              onClick={() => handleRespondDraw(true)}
              className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-[11px]"
            >
              수락
            </button>
            <button
              type="button"
              data-testid="decline-draw-btn"
              onClick={() => handleRespondDraw(false)}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-[11px]"
            >
              거절
            </button>
          </div>
        </div>
      )}

      {/* Chessboard View */}
      <div className="relative flex items-center justify-center w-full shrink-0 my-0.5">
        <div className="relative w-full max-w-[min(100%,min(42vh,370px))] flex items-center justify-center">
          <ChessBoard
            className="w-full max-w-[min(100%,min(42vh,370px))]"
            chess={currentChess}
            orientation={orientation}
            onMove={handleBoardMove}
            interactive={isMyTurn && !isGameOver}
            lastMove={lastMove}
            pieceTheme={pieceTheme}
            boardTheme={boardTheme}
            rotateTopPieces={isLocalMode && rotateOppositePieces}
          />

          {/* Game Over Floating Summary Card */}
          {isGameOver && (
            <div className="absolute inset-x-3 bottom-3 z-30 p-3 rounded-2xl bg-zinc-950/95 border border-amber-500/60 shadow-2xl backdrop-blur-md space-y-2 text-center">
              <div className="text-xs font-extrabold text-amber-300 flex items-center justify-center gap-1.5">
                <span>{winner === 'draw' ? '🤝' : '🏆'}</span>
                <span>
                  {winner === 'draw'
                    ? '무승부로 대국 종료'
                    : isLocalMode
                    ? `${winner === 'w' ? '백 (Player 1)' : '흑 (Player 2)'} 승리!`
                    : winner === myOnlineColor
                    ? '승리하셨습니다! 🎉'
                    : '아쉽게 패배하였습니다'}
                </span>
                {onlineRatingDelta !== null && !isLocalMode && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] ${
                      onlineRatingDelta >= 0
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {onlineRatingDelta >= 0 ? `+${onlineRatingDelta}` : onlineRatingDelta} Elo
                  </span>
                )}
              </div>

              <div className="text-[10px] text-zinc-400">
                {activeEndReason === 'checkmate'
                  ? '체크메이트'
                  : activeEndReason === 'timeout'
                  ? '시간 초과'
                  : activeEndReason === 'resignation'
                  ? '기권'
                  : activeEndReason === 'draw_agreement'
                  ? '상호 합의 무승부'
                  : '무승부'}
                {incomingRematchOffer && ' · ⚡ 상대가 재대결을 요청했습니다!'}
              </div>

              {!incomingRematchOffer && opponentDeclinedRematch && (
                <div
                  data-testid="pvp-rematch-declined-msg"
                  className="text-[11px] font-bold text-rose-300 bg-rose-950/60 border border-rose-500/40 rounded-lg py-1 px-2"
                >
                  상대방이 재대결 요청을 거절했습니다.
                </div>
              )}

              {!incomingRematchOffer && !opponentDeclinedRematch && opponentLeftPostGame && (
                <div
                  data-testid="pvp-opponent-left-msg"
                  className="text-[10px] font-semibold text-amber-200/90 bg-amber-950/50 border border-amber-500/30 rounded-lg py-1 px-2"
                >
                  💡 상대방이 로비로 이동했습니다 (재대결 신청 시 상대에게 실시간 알림이 전송됩니다)
                </div>
              )}

              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    data-testid="pvp-rematch-btn"
                    disabled={!!myPendingRematchOffer}
                    onClick={handleRematch}
                    className="flex-1 py-2 px-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-zinc-950 text-[11px] font-black flex items-center justify-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {myPendingRematchOffer
                        ? '수락 대기 중...'
                        : incomingRematchOffer
                        ? '재대결 수락!'
                        : '재대결 신청'}
                    </span>
                  </button>
                  {incomingRematchOffer && (
                    <button
                      type="button"
                      data-testid="pvp-rematch-decline-btn"
                      onClick={handleDeclineRematch}
                      className="py-2 px-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-bold border border-zinc-700 shrink-0"
                    >
                      거절
                    </button>
                  )}
                </div>

                {onAnalyzeMoves && totalMoveCount > 0 ? (
                  <button
                    type="button"
                    data-testid="pvp-review-btn"
                    onClick={handleReviewCurrentPvpGame}
                    className="py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center gap-1"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>정밀 복기</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleExitGame}
                    className="py-2 px-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-bold"
                  >
                    로비로 이동
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Bar: Current Player Info (or White in Local) */}
      <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <AvatarIcon
            avatar={isLocalMode ? 'king' : playerInfo.avatar}
            color={isLocalMode ? 'amber' : playerInfo.avatarColor}
            size="sm"
          />
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">
              {isLocalMode ? '백 (Player 1)' : `${playerInfo.nickname} (나)`}
            </div>
            <div className="text-[10px] text-zinc-400 font-mono">
              {isLocalMode
                ? `${currentChess.turn() === 'w' ? '백 차례' : '흑 차례'}`
                : `${playerInfo.rating} Elo`}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isGameOver && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                isMyTurn
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}
            >
              {isLocalMode
                ? currentChess.turn() === 'w'
                  ? '백 착수'
                  : '흑 착수'
                : isMyTurn
                ? '내 차례'
                : '상대 차례'}
            </span>
          )}

          {activeTimeLimit !== 'unlimited' && (
            <div
              className={`px-2.5 py-1 rounded-lg font-mono text-xs font-black border ${
                currentChess.turn() === bottomColor && !isGameOver
                  ? 'bg-amber-500 text-zinc-950 border-amber-400'
                  : 'bg-zinc-950 text-zinc-300 border-zinc-800'
              }`}
            >
              {formatClock(bottomClockMs)}
            </div>
          )}
        </div>
      </div>

      {/* Action Controls */}
      <div className="grid grid-cols-3 gap-1.5 pt-0.5 shrink-0">
        <button
          type="button"
          data-testid="pvp-draw-offer-btn"
          onClick={handleDrawButton}
          disabled={isGameOver || !!myPendingDrawOffer}
          className="py-2 px-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-amber-300 text-xs font-bold flex items-center justify-center gap-1 border border-zinc-800 transition-all active:scale-98"
        >
          <Handshake className="w-3.5 h-3.5 text-amber-400" />
          <span>{myPendingDrawOffer ? '제안 중' : '무승부 제안'}</span>
        </button>

        <button
          type="button"
          data-testid="pvp-resign-btn"
          onClick={() => setConfirmModal('resign')}
          disabled={isGameOver}
          className="py-2 px-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-rose-300 text-xs font-bold flex items-center justify-center gap-1 border border-zinc-800 transition-all active:scale-98"
        >
          <Flag className="w-3.5 h-3.5 text-rose-400" />
          <span>기권</span>
        </button>

        <button
          type="button"
          onClick={handleExitGame}
          className="py-2 px-2 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-xs font-bold border border-zinc-750 flex items-center justify-center gap-1 transition-all active:scale-98"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>로비</span>
        </button>
      </div>

      {/* Confirmation Dialog for Resign or Local Draw */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl max-w-xs w-full text-center space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              {confirmModal === 'resign' ? '정말 기권하시겠습니까?' : '합의 무승부로 종료할까요?'}
            </h3>
            <p className="text-xs text-zinc-400">
              {confirmModal === 'resign'
                ? '기권 시 현재 대국이 즉시 패배로 처리됩니다.'
                : '양측 플레이어 합의로 대국을 무승부 처리합니다.'}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold"
              >
                취소
              </button>
              <button
                type="button"
                data-testid="confirm-pvp-action-btn"
                onClick={() => {
                  if (confirmModal === 'resign') {
                    executeConfirmedResign();
                  } else {
                    setConfirmModal(null);
                    finishLocalGame('draw', 'draw_agreement', localMoves, localChess.fen());
                  }
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold ${
                  confirmModal === 'resign'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                }`}
              >
                {confirmModal === 'resign' ? '기권하기' : '무승부 확정'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
