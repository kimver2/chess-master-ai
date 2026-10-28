import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Firestore,
} from 'firebase/firestore';
import { LeaderboardEntry } from '../types/profile';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

const FIREBASE_CONFIG_STORAGE_KEY = 'chess_firebase_config_v1';

// Read from Vite environment or localStorage
export function getFirebaseConfig(): FirebaseConfig | null {
  try {
    const metaEnv = (import.meta as any).env || {};
    const envConfig: FirebaseConfig = {
      apiKey: metaEnv.VITE_FIREBASE_API_KEY || '',
      authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || '',
      projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || '',
      storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: metaEnv.VITE_FIREBASE_APP_ID || '',
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
  return null;
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

function getDb(): Firestore | null {
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
 * Submit player score to Firestore 'rankings' collection
 */
export async function submitOnlineScore(
  entry: Omit<LeaderboardEntry, 'id'>
): Promise<{ success: boolean; docId?: string; error?: string }> {
  const db = getDb();
  if (!db) {
    return { success: false, error: 'Firebase is not configured' };
  }

  try {
    const colRef = collection(db, 'rankings');
    const docRef = await addDoc(colRef, {
      userId: entry.userId,
      nickname: entry.nickname,
      avatar: entry.avatar,
      avatarColor: entry.avatarColor,
      rating: entry.rating,
      aiLevel: entry.aiLevel,
      moves: entry.moves,
      timeSec: entry.timeSec,
      date: entry.date,
      createdAt: new Date().toISOString(),
    });

    return { success: true, docId: docRef.id };
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
    // Order by fewest moves, limit to top 50
    const q = query(
      colRef,
      where('aiLevel', '==', aiLevel),
      orderBy('moves', 'asc'),
      limit(50)
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

    // Secondary sort by time if moves are equal
    results.sort((a, b) => {
      if (a.moves !== b.moves) return a.moves - b.moves;
      return a.timeSec - b.timeSec;
    });

    return results;
  } catch (err) {
    console.error('Error fetching online leaderboard:', err);
    return [];
  }
}
