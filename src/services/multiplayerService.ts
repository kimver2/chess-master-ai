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
  arrayUnion,
  Timestamp,
} from 'firebase/firestore';
import { getDb } from './firebaseService';
import {
  MultiplayerGameData,
  MultiplayerPlayer,
  MultiplayerMove,
  MultiplayerEmojiId,
} from '../types/multiplayer';
import { PieceColor, GameOverReason, TimeLimit } from '../types/chess';

const GAMES_COLLECTION = 'multiplayer_games';
const QUEUE_COLLECTION = 'matchmaking_queue';

// 24-hour TTL (Time To Live) for Firestore documents
const TTL_DURATION_MS = 24 * 60 * 60 * 1000;

export function getTtlTimestamp(durationMs: number = TTL_DURATION_MS): Timestamp {
  return Timestamp.fromMillis(Date.now() + durationMs);
}

let lastCleanupTime = 0;
const CLEANUP_COOLDOWN_MS = 5 * 60 * 1000; // Run at most once per 5 minutes per client

/**
 * Automatically clean up expired and abandoned multiplayer games
 * - Deletes completed/abandoned games older than 24 hours
 * - Deletes unstarted waiting rooms older than 2 hours
 * - Deletes old test games created without expireAt field
 * - Runs silently in background on lobby load without blocking UI
 */
export async function cleanupExpiredGames(force: boolean = false): Promise<number> {
  const now = Date.now();
  if (!force && now - lastCleanupTime < CLEANUP_COOLDOWN_MS) {
    return 0;
  }
  lastCleanupTime = now;

  const db = getDb();
  if (!db) return 0;

  try {
    const q = query(
      collection(db, GAMES_COLLECTION),
      where('status', 'in', ['completed', 'waiting', 'abandoned']),
      limit(50)
    );
    const snap = await getDocs(q);
    if (snap.empty) return 0;

    let deletedCount = 0;
    const deletePromises: Promise<void>[] = [];

    snap.forEach((d) => {
      const data = d.data() as MultiplayerGameData;
      let shouldDelete = false;

      // 1. Check expireAt timestamp if present
      if (data.expireAt?.seconds) {
        if (data.expireAt.seconds * 1000 <= now) {
          shouldDelete = true;
        }
      }

      // 2. Completed / abandoned games older than 24 hours
      if (!shouldDelete && (data.status === 'completed' || data.status === 'abandoned')) {
        const timeRef = data.updatedAt || data.createdAt;
        if (timeRef) {
          const gameTime = new Date(timeRef).getTime();
          if (now - gameTime > TTL_DURATION_MS) {
            shouldDelete = true;
          }
        }
      }

      // 3. Unstarted waiting rooms older than 2 hours (abandoned host rooms)
      if (!shouldDelete && data.status === 'waiting') {
        const timeRef = data.createdAt || data.updatedAt;
        if (timeRef) {
          const roomTime = new Date(timeRef).getTime();
          if (now - roomTime > 2 * 60 * 60 * 1000) {
            shouldDelete = true;
          }
        }
      }

      if (shouldDelete) {
        deletedCount++;
        deletePromises.push(deleteDoc(d.ref).catch(() => {}));
      }
    });

    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
    }

    return deletedCount;
  } catch (err) {
    console.warn('Background cleanup of expired games skipped:', err);
    return 0;
  }
}

/**
 * Delete a game room from Firestore (e.g. host cancelled waiting room)
 */
export async function deleteGameRoom(gameId: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  try {
    await deleteDoc(doc(db, GAMES_COLLECTION, gameId));
  } catch (err) {
    console.warn('Failed to delete game room:', err);
  }
}

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
    expireAt: getTtlTimestamp(),
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
          expireAt: getTtlTimestamp(),
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
    updateData.expireAt = getTtlTimestamp();
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
    expireAt: getTtlTimestamp(),
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
    expireAt: getTtlTimestamp(),
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
      expireAt: getTtlTimestamp(),
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
      rematchDeclinedBy: null,
      leftRoomBy: [],
      nextGameId: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      expireAt: getTtlTimestamp(),
    };

    await setDoc(newGameRef, rematchGame);
    await updateDoc(gameRef, {
      nextGameId: newGameRef.id,
      rematchOfferBy: null,
      rematchDeclinedBy: null,
      updatedAt: nowIso,
    });

    return newGameRef.id;
  }

  // Otherwise mark our rematch offer (and clear any prior decline)
  await updateDoc(gameRef, {
    rematchOfferBy: requestingColor,
    rematchDeclinedBy: null,
    updatedAt: new Date().toISOString(),
  });
  return null;
}

/**
 * Decline an incoming rematch offer so the requester is notified immediately
 */
export async function declineMultiplayerRematch(
  gameId: string,
  decliningColor: PieceColor
): Promise<void> {
  const db = getDb();
  if (!db) return;

  await updateDoc(doc(db, GAMES_COLLECTION, gameId), {
    rematchOfferBy: null,
    rematchDeclinedBy: decliningColor,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Mark that a player navigated away from the post-game screen back to the lobby
 */
export async function markPlayerLeftPostGame(
  gameId: string,
  leavingColor: PieceColor
): Promise<void> {
  const db = getDb();
  if (!db) return;

  try {
    await updateDoc(doc(db, GAMES_COLLECTION, gameId), {
      leftRoomBy: arrayUnion(leavingColor),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Failed to mark post-game leave:', err);
  }
}

/**
 * Send a quick preset emoji reaction/stamp in an online 1:1 game
 */
export async function sendMultiplayerReaction(
  gameId: string,
  senderColor: PieceColor,
  emojiId: MultiplayerEmojiId
): Promise<void> {
  const db = getDb();
  if (!db) return;

  try {
    await updateDoc(doc(db, GAMES_COLLECTION, gameId), {
      lastReaction: {
        senderColor,
        emojiId,
        sentAt: Date.now(),
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Failed to send multiplayer reaction:', err);
  }
}
