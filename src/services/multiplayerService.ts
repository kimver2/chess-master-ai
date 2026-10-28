import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
import { getDb } from './firebaseService';
import {
  MultiplayerGameData,
  MultiplayerPlayer,
  MultiplayerMove,
} from '../types/multiplayer';
import { PieceColor, GameOverReason, TimeLimit } from '../types/chess';

const GAMES_COLLECTION = 'multiplayer_games';
const QUEUE_COLLECTION = 'matchmaking_queue';

export function generateRoomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function getInitialClockMs(timeLimit: TimeLimit = '10m'): number | null {
  if (timeLimit === '5m') return 300000;
  if (timeLimit === '10m') return 600000;
  return null;
}

/**
 * Create a friend match room with a 6-digit room code
 */
export async function createFriendRoom(
  hostPlayer: MultiplayerPlayer,
  sidePreference: 'white' | 'black' | 'random' = 'random',
  timeLimit: TimeLimit = '10m'
): Promise<{ gameId: string; roomCode: string }> {
  const db = getDb();
  if (!db) throw new Error('Firebase Firestore not initialized');

  const roomCode = generateRoomCode();
  const gameRef = doc(collection(db, GAMES_COLLECTION));

  let hostSide: PieceColor = 'w';
  if (sidePreference === 'black') hostSide = 'b';
  else if (sidePreference === 'random') hostSide = Math.random() < 0.5 ? 'w' : 'b';

  const initialMs = getInitialClockMs(timeLimit);
  const nowIso = new Date().toISOString();

  const initialGame: MultiplayerGameData = {
    id: gameRef.id,
    roomCode,
    mode: 'friend',
    status: 'waiting',
    whitePlayer: hostSide === 'w' ? hostPlayer : null,
    blackPlayer: hostSide === 'b' ? hostPlayer : null,
    currentTurn: 'w',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    moves: [],
    lastMove: null,
    winner: null,
    endReason: null,
    timeLimit,
    whiteTimeMs: initialMs,
    blackTimeMs: initialMs,
    turnStartedAt: nowIso,
    drawOfferBy: null,
    rematchOfferBy: null,
    nextGameId: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await setDoc(gameRef, initialGame);

  return { gameId: gameRef.id, roomCode };
}

/**
 * Join an existing room via 6-digit room code
 */
export async function joinFriendRoom(
  roomCode: string,
  guestPlayer: MultiplayerPlayer
): Promise<{ success: boolean; gameId?: string; error?: string }> {
  const db = getDb();
  if (!db) return { success: false, error: 'Firebase DB가 연결되지 않았습니다' };

  try {
    const q = query(
      collection(db, GAMES_COLLECTION),
      where('roomCode', '==', roomCode.trim()),
      where('status', '==', 'waiting'),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return { success: false, error: '해당 방 번호를 찾을 수 없거나 이미 시작된 게임입니다.' };
    }

    const gameDoc = snapshot.docs[0];
    const gameData = gameDoc.data() as MultiplayerGameData;

    // Check if guest is trying to join their own room
    if (
      (gameData.whitePlayer && gameData.whitePlayer.id === guestPlayer.id) ||
      (gameData.blackPlayer && gameData.blackPlayer.id === guestPlayer.id)
    ) {
      return { success: true, gameId: gameDoc.id };
    }

    const nowIso = new Date().toISOString();
    const updatePayload: Partial<MultiplayerGameData> = {
      status: 'playing',
      turnStartedAt: nowIso,
      updatedAt: nowIso,
    };

    if (!gameData.whitePlayer) {
      updatePayload.whitePlayer = guestPlayer;
    } else {
      updatePayload.blackPlayer = guestPlayer;
    }

    await updateDoc(doc(db, GAMES_COLLECTION, gameDoc.id), updatePayload);

    return { success: true, gameId: gameDoc.id };
  } catch (err: any) {
    console.error('Error joining friend room:', err);
    return { success: false, error: err.message || '방 참가 실패' };
  }
}

/**
 * Start Quick Matchmaking: searches queue or waits in queue
 */
export function startQuickMatch(
  player: MultiplayerPlayer,
  onMatched: (gameId: string) => void,
  onError: (err: string) => void,
  timeLimit: TimeLimit = '10m'
): () => void {
  const db = getDb();
  if (!db) {
    onError('Firebase DB가 연결되지 않았습니다.');
    return () => {};
  }

  let isCancelled = false;
  const queueDocId = player.id;
  let unsubscribeGameListener: (() => void) | null = null;

  const runMatchmaking = async () => {
    try {
      // 1. Look for another waiting player in queue (excluding self)
      const queueRef = collection(db, QUEUE_COLLECTION);
      const snapshot = await getDocs(query(queueRef, limit(10)));

      let opponent: MultiplayerPlayer | null = null;
      let opponentDocId: string | null = null;
      let matchedTimeLimit: TimeLimit = timeLimit;

      snapshot.forEach((d) => {
        if (!opponent && d.id !== player.id) {
          const qData = d.data();
          opponent = qData.player as MultiplayerPlayer;
          opponentDocId = d.id;
          if (qData.timeLimit) matchedTimeLimit = qData.timeLimit as TimeLimit;
        }
      });

      if (isCancelled) return;

      if (opponent && opponentDocId) {
        // Pair immediately
        await deleteDoc(doc(db, QUEUE_COLLECTION, opponentDocId));

        const gameRef = doc(collection(db, GAMES_COLLECTION));
        const hostIsWhite = Math.random() < 0.5;
        const initialMs = getInitialClockMs(matchedTimeLimit);
        const nowIso = new Date().toISOString();

        const newGame: MultiplayerGameData = {
          id: gameRef.id,
          roomCode: generateRoomCode(),
          mode: 'quick',
          status: 'playing',
          whitePlayer: hostIsWhite ? player : opponent,
          blackPlayer: hostIsWhite ? opponent : player,
          currentTurn: 'w',
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          moves: [],
          lastMove: null,
          winner: null,
          endReason: null,
          timeLimit: matchedTimeLimit,
          whiteTimeMs: initialMs,
          blackTimeMs: initialMs,
          turnStartedAt: nowIso,
          drawOfferBy: null,
          rematchOfferBy: null,
          nextGameId: null,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        await setDoc(gameRef, newGame);
        if (!isCancelled) {
          onMatched(gameRef.id);
        }
      } else {
        // Put ourselves into queue
        await setDoc(doc(db, QUEUE_COLLECTION, player.id), {
          player,
          timeLimit,
          createdAt: new Date().toISOString(),
        });

        const gamesQuery = query(
          collection(db, GAMES_COLLECTION),
          where('mode', '==', 'quick'),
          where('status', '==', 'playing'),
          limit(10)
        );

        unsubscribeGameListener = onSnapshot(gamesQuery, (snap) => {
          if (isCancelled) return;
          snap.forEach((d) => {
            const data = d.data() as MultiplayerGameData;
            if (
              (data.whitePlayer?.id === player.id || data.blackPlayer?.id === player.id) &&
              data.status === 'playing'
            ) {
              deleteDoc(doc(db, QUEUE_COLLECTION, player.id)).catch(() => {});
              onMatched(d.id);
            }
          });
        });
      }
    } catch (e: any) {
      if (!isCancelled) {
        onError(e.message || '매칭 처리 중 오류 발생');
      }
    }
  };

  runMatchmaking();

  return () => {
    isCancelled = true;
    if (unsubscribeGameListener) {
      unsubscribeGameListener();
    }
    if (db) {
      deleteDoc(doc(db, QUEUE_COLLECTION, queueDocId)).catch(() => {});
    }
  };
}

/**
 * Real-time listener for a multiplayer game document
 */
export function subscribeToGame(
  gameId: string,
  onUpdate: (game: MultiplayerGameData) => void,
  onError?: (err: Error) => void
): () => void {
  const db = getDb();
  if (!db) return () => {};

  const gameDocRef = doc(db, GAMES_COLLECTION, gameId);
  return onSnapshot(
    gameDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as MultiplayerGameData;
        onUpdate(data);
      }
    },
    (err) => {
      console.error('Error listening to game updates:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Record a move made in a multiplayer game (with clock sync)
 */
export async function makeMultiplayerMove(
  gameId: string,
  move: MultiplayerMove,
  newFen: string,
  nextTurn: PieceColor,
  isGameOver: boolean = false,
  winner: PieceColor | 'draw' | null = null,
  endReason: GameOverReason = null,
  updatedClocks?: { whiteTimeMs: number | null; blackTimeMs: number | null }
): Promise<void> {
  const db = getDb();
  if (!db) return;

  const gameDocRef = doc(db, GAMES_COLLECTION, gameId);
  const snap = await getDoc(gameDocRef);
  if (!snap.exists()) return;

  const currentData = snap.data() as MultiplayerGameData;
  if (currentData.status !== 'playing') return;

  const cleanMove: MultiplayerMove = {
    from: move.from,
    to: move.to,
    san: move.san,
    ...(move.promotion ? { promotion: move.promotion } : {}),
    ply: move.ply,
    timestamp: move.timestamp,
  };
  const currentMoves = (currentData.moves || []) as MultiplayerMove[];
  const updatedMoves = [...currentMoves, cleanMove];
  const nowIso = new Date().toISOString();

  const updateData: Partial<MultiplayerGameData> = {
    fen: newFen,
    moves: updatedMoves,
    currentTurn: nextTurn,
    lastMove: { from: move.from, to: move.to },
    turnStartedAt: nowIso,
    drawOfferBy: null, // Any move implicitly declines/clears pending draw offer
    updatedAt: nowIso,
  };

  if (updatedClocks) {
    updateData.whiteTimeMs = updatedClocks.whiteTimeMs;
    updateData.blackTimeMs = updatedClocks.blackTimeMs;
  }

  if (isGameOver) {
    updateData.status = 'completed';
    updateData.winner = winner;
    updateData.endReason = endReason;
  }

  await updateDoc(gameDocRef, updateData);
}

/**
 * Resign a multiplayer game
 */
export async function resignMultiplayerGame(
  gameId: string,
  resigningColor: PieceColor
): Promise<void> {
  const db = getDb();
  if (!db) return;

  const winner = resigningColor === 'w' ? 'b' : 'w';
  await updateDoc(doc(db, GAMES_COLLECTION, gameId), {
    status: 'completed',
    winner,
    endReason: 'resignation',
    drawOfferBy: null,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Claim timeout when active turn clock reaches 0
 */
export async function claimMultiplayerTimeout(
  gameId: string,
  loserColor: PieceColor
): Promise<void> {
  const db = getDb();
  if (!db) return;

  const gameRef = doc(db, GAMES_COLLECTION, gameId);
  const snap = await getDoc(gameRef);
  if (!snap.exists()) return;
  const data = snap.data() as MultiplayerGameData;
  if (data.status !== 'playing') return;

  const winner = loserColor === 'w' ? 'b' : 'w';
  await updateDoc(gameRef, {
    status: 'completed',
    winner,
    endReason: 'timeout',
    whiteTimeMs: loserColor === 'w' ? 0 : data.whiteTimeMs ?? null,
    blackTimeMs: loserColor === 'b' ? 0 : data.blackTimeMs ?? null,
    drawOfferBy: null,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Offer a draw to the opponent
 */
export async function offerMultiplayerDraw(
  gameId: string,
  offeringColor: PieceColor
): Promise<void> {
  const db = getDb();
  if (!db) return;

  await updateDoc(doc(db, GAMES_COLLECTION, gameId), {
    drawOfferBy: offeringColor,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Accept or decline a pending draw offer
 */
export async function respondMultiplayerDraw(
  gameId: string,
  accept: boolean
): Promise<void> {
  const db = getDb();
  if (!db) return;

  const nowIso = new Date().toISOString();
  if (accept) {
    await updateDoc(doc(db, GAMES_COLLECTION, gameId), {
      status: 'completed',
      winner: 'draw',
      endReason: 'draw_agreement',
      drawOfferBy: null,
      updatedAt: nowIso,
    });
  } else {
    await updateDoc(doc(db, GAMES_COLLECTION, gameId), {
      drawOfferBy: null,
      updatedAt: nowIso,
    });
  }
}

/**
 * Request or accept a rematch after game completion (swaps White/Black sides!)
 */
export async function requestMultiplayerRematch(
  gameId: string,
  requestingColor: PieceColor
): Promise<string | null> {
  const db = getDb();
  if (!db) return null;

  const gameRef = doc(db, GAMES_COLLECTION, gameId);
  const snap = await getDoc(gameRef);
  if (!snap.exists()) return null;

  const data = snap.data() as MultiplayerGameData;
  if (data.nextGameId) {
    return data.nextGameId;
  }

  // If the other player already requested a rematch, create the new game immediately!
  if (data.rematchOfferBy && data.rematchOfferBy !== requestingColor) {
    const newGameRef = doc(collection(db, GAMES_COLLECTION));
    const timeLimit: TimeLimit = data.timeLimit || '10m';
    const initialMs = getInitialClockMs(timeLimit);
    const nowIso = new Date().toISOString();

    const rematchGame: MultiplayerGameData = {
      id: newGameRef.id,
      roomCode: data.roomCode || generateRoomCode(),
      mode: data.mode,
      status: 'playing',
      // Swap sides for fair rematch!
      whitePlayer: data.blackPlayer,
      blackPlayer: data.whitePlayer,
      currentTurn: 'w',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      moves: [],
      lastMove: null,
      winner: null,
      endReason: null,
      timeLimit,
      whiteTimeMs: initialMs,
      blackTimeMs: initialMs,
      turnStartedAt: nowIso,
      drawOfferBy: null,
      rematchOfferBy: null,
      nextGameId: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await setDoc(newGameRef, rematchGame);
    await updateDoc(gameRef, {
      nextGameId: newGameRef.id,
      rematchOfferBy: null,
      updatedAt: nowIso,
    });

    return newGameRef.id;
  }

  // Otherwise mark our rematch offer
  await updateDoc(gameRef, {
    rematchOfferBy: requestingColor,
    updatedAt: new Date().toISOString(),
  });
  return null;
}
