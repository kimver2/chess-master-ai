import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  getDocs,
  Firestore,
} from 'firebase/firestore';
import { LeaderboardEntry, UserProfile } from '../types/profile';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyCiUvrezaqLtEUppahQd_mLwQsB6F9JElA",
  authDomain: "chess-master-81b27.firebaseapp.com",
  projectId: "chess-master-81b27",
  storageBucket: "chess-master-81b27.firebasestorage.app",
  messagingSenderId: "690657232029",
  appId: "1:690657232029:web:d11d9770681f9db04d4074",
};

const FIREBASE_CONFIG_STORAGE_KEY = 'chess_firebase_config_v1';

// Read from Vite environment, localStorage, or embedded default
export function getFirebaseConfig(): FirebaseConfig {
  try {
    const metaEnv = (import.meta as any).env || {};
    const envConfig: FirebaseConfig = {
      apiKey: metaEnv.VITE_FIREBASE_API_KEY || DEFAULT_FIREBASE_CONFIG.apiKey,
      authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || DEFAULT_FIREBASE_CONFIG.authDomain,
      projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_CONFIG.projectId,
      storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || DEFAULT_FIREBASE_CONFIG.storageBucket,
      messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
      appId: metaEnv.VITE_FIREBASE_APP_ID || DEFAULT_FIREBASE_CONFIG.appId,
    };

    if (envConfig.apiKey && envConfig.projectId) {
      return envConfig;
    }

    const saved = localStorage.getItem(FIREBASE_CONFIG_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading Firebase config:', err);
  }
  return DEFAULT_FIREBASE_CONFIG;
}

export function saveCustomFirebaseConfig(config: FirebaseConfig): void {
  try {
    localStorage.setItem(FIREBASE_CONFIG_STORAGE_KEY, JSON.stringify(config));
    // Reset any cached app instance
  } catch (err) {
    console.error('Failed to save Firebase config:', err);
  }
}

export function isFirebaseConfigured(): boolean {
  const config = getFirebaseConfig();
  return Boolean(config && config.apiKey && config.projectId);
}

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;

export function getDb(): Firestore | null {
  if (dbInstance) return dbInstance;
  const config = getFirebaseConfig();
  if (!config) return null;

  try {
    appInstance = getApps().length > 0 ? getApp() : initializeApp(config);
    dbInstance = getFirestore(appInstance);
    return dbInstance;
  } catch (err) {
    console.error('Failed to initialize Firebase app / Firestore:', err);
    return null;
  }
}

/**
 * Submit player score to Firestore 'rankings' collection using deterministic per-user/per-level document ID
 * so each player maintains a single up-to-date best record per AI level.
 */
export async function submitOnlineScore(
  entry: Omit<LeaderboardEntry, 'id'>
): Promise<{ success: boolean; docId?: string; error?: string }> {
  const db = getDb();
  if (!db) {
    return { success: false, error: 'Firebase is not configured' };
  }

  try {
    const docId = `${entry.userId}_lvl_${entry.aiLevel}`;
    const docRef = doc(db, 'rankings', docId);
    const existingSnap = await getDoc(docRef);

    let bestMoves = entry.moves;
    let bestTimeSec = entry.timeSec;
    let bestDate = entry.date;

    if (existingSnap.exists()) {
      const prev = existingSnap.data();
      const prevMoves = typeof prev.moves === 'number' ? prev.moves : Infinity;
      const prevTimeSec = typeof prev.timeSec === 'number' ? prev.timeSec : Infinity;

      const isNewStrictlyBetter =
        entry.moves < prevMoves ||
        (entry.moves === prevMoves && entry.timeSec < prevTimeSec);

      if (!isNewStrictlyBetter) {
        bestMoves = prevMoves;
        bestTimeSec = prevTimeSec;
        bestDate = prev.date || entry.date;
      }
    }

    await setDoc(docRef, {
      userId: entry.userId,
      nickname: entry.nickname,
      avatar: entry.avatar,
      avatarColor: entry.avatarColor,
      rating: entry.rating,
      aiLevel: entry.aiLevel,
      moves: bestMoves,
      timeSec: bestTimeSec,
      date: bestDate,
      updatedAt: new Date().toISOString(),
    });

    return { success: true, docId };
  } catch (err: any) {
    console.error('Failed to submit online score:', err);
    return { success: false, error: err.message || 'Submission failed' };
  }
}

/**
 * Fetch top leaderboard entries for a given AI level
 */
export async function fetchOnlineLeaderboard(
  aiLevel: number,
  currentUserId?: string
): Promise<LeaderboardEntry[]> {
  const db = getDb();
  if (!db) {
    return [];
  }

  try {
    const colRef = collection(db, 'rankings');
    // Fetch recent top records for this AI level (index-free client-side sorting)
    const q = query(
      colRef,
      where('aiLevel', '==', aiLevel),
      limit(100)
    );

    const snapshot = await getDocs(q);
    const results: LeaderboardEntry[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      results.push({
        id: doc.id,
        userId: data.userId,
        nickname: data.nickname,
        avatar: data.avatar,
        avatarColor: data.avatarColor,
        rating: data.rating,
        aiLevel: data.aiLevel,
        moves: data.moves,
        timeSec: data.timeSec,
        date: data.date,
        isCurrentUser: currentUserId ? data.userId === currentUserId : false,
      });
    });

    // Sort by fewest moves, then fastest time
    results.sort((a, b) => {
      if (a.moves !== b.moves) return a.moves - b.moves;
      return a.timeSec - b.timeSec;
    });

    // Deduplicate by userId: keep each player's best record
    const userBestMap = new Map<string, LeaderboardEntry>();
    for (const r of results) {
      if (!userBestMap.has(r.userId)) {
        userBestMap.set(r.userId, r);
      }
    }

    return Array.from(userBestMap.values()).slice(0, 50);
  } catch (err) {
    console.error('Error fetching online leaderboard:', err);
    return [];
  }
}

/**
 * Synchronize user's current nickname, avatar, avatarColor, and rating across ALL their online ranking records (Lv.1 ~ Lv.10),
 * and consolidate any legacy duplicate documents per AI level into deterministic `{userId}_lvl_{aiLevel}` docs.
 */
export async function syncUserProfileToOnlineRankings(profile: UserProfile): Promise<number> {
  const db = getDb();
  if (!db || !profile.id) return 0;

  try {
    const colRef = collection(db, 'rankings');
    const q = query(colRef, where('userId', '==', profile.id));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return 0;

    // Group documents by aiLevel so legacy random-ID docs also get consolidated cleanly
    const byLevel = new Map<number, Array<{ id: string; data: Record<string, any> }>>();
    snapshot.forEach((d) => {
      const data = d.data();
      const lvl = Number(data.aiLevel);
      if (lvl >= 1 && lvl <= 10) {
        const arr = byLevel.get(lvl) || [];
        arr.push({ id: d.id, data });
        byLevel.set(lvl, arr);
      }
    });

    let updatedCount = 0;
    const nowIso = new Date().toISOString();

    for (const [lvl, docsForLevel] of byLevel.entries()) {
      // Pick strictly best record among all docs for this level
      docsForLevel.sort((a, b) => {
        if (a.data.moves !== b.data.moves) return a.data.moves - b.data.moves;
        return a.data.timeSec - b.data.timeSec;
      });
      const best = docsForLevel[0];
      const canonicalId = `${profile.id}_lvl_${lvl}`;
      const canonicalDoc = docsForLevel.find((d) => d.id === canonicalId);

      const needsCanonicalWrite =
        !canonicalDoc ||
        canonicalDoc.data.nickname !== profile.nickname ||
        canonicalDoc.data.avatar !== profile.avatar ||
        canonicalDoc.data.avatarColor !== profile.avatarColor ||
        canonicalDoc.data.rating !== profile.rating ||
        canonicalDoc.data.moves !== best.data.moves ||
        canonicalDoc.data.timeSec !== best.data.timeSec;

      if (needsCanonicalWrite) {
        if (canonicalDoc) {
          await updateDoc(doc(db, 'rankings', canonicalId), {
            nickname: profile.nickname,
            avatar: profile.avatar,
            avatarColor: profile.avatarColor,
            rating: profile.rating,
            moves: best.data.moves,
            timeSec: best.data.timeSec,
            date: best.data.date || nowIso.substring(0, 10),
            updatedAt: nowIso,
          });
        } else {
          await setDoc(doc(db, 'rankings', canonicalId), {
            userId: profile.id,
            nickname: profile.nickname,
            avatar: profile.avatar,
            avatarColor: profile.avatarColor,
            rating: profile.rating,
            aiLevel: lvl,
            moves: best.data.moves,
            timeSec: best.data.timeSec,
            date: best.data.date || nowIso.substring(0, 10),
            updatedAt: nowIso,
          });
        }
        updatedCount++;
      }

      // Delete any legacy non-canonical duplicate documents for this user & level
      for (const item of docsForLevel) {
        if (item.id !== canonicalId) {
          await deleteDoc(doc(db, 'rankings', item.id));
        }
      }
    }

    return updatedCount;
  } catch (err) {
    console.warn('Failed to sync user profile to online rankings:', err);
    return 0;
  }
}
