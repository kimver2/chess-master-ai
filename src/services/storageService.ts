import { UserProfile, LevelRecord, LeaderboardEntry, AvatarType, AvatarColor } from '../types/profile';
import { SavedActiveGame, ArchivedGame, PlayedMoveRecord } from '../types/chess';

const PROFILE_STORAGE_KEY = 'chess_user_profile_v1';
const ACTIVE_GAME_STORAGE_KEY = 'chess_active_game_v1';
const GAME_ARCHIVE_STORAGE_KEY = 'chess_game_archive_v1';
const DAILY_PUZZLE_STORAGE_KEY = 'chess_daily_puzzle_v1';
const PUZZLE_RUSH_BEST_KEY = 'chess_puzzle_rush_best_v1';

export const ALL_AI_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export const AI_RATINGS: Record<number, number> = {
  1: 800,
  2: 1050,
  3: 1300,
  4: 1550,
  5: 1800,
  6: 2050,
  7: 2300,
  8: 2550,
  9: 2800,
  10: 3050,
};

export const AI_NAMES: Record<number, string> = {
  1: '초심자 AI (Lv.1)',
  2: '입문 봇 (Lv.2)',
  3: '클럽 기사 (Lv.3)',
  4: '전술가 AI (Lv.4)',
  5: '숙련 기사 (Lv.5)',
  6: '체스 마스터 (Lv.6)',
  7: '국제 마스터 (Lv.7)',
  8: '그랜드마스터 (Lv.8)',
  9: '슈퍼 GM (Lv.9)',
  10: '스톡피쉬 최고봉 (Lv.10)',
};

const DEFAULT_LEVEL_RECORD = (): LevelRecord => ({
  conquered: false,
  wins: 0,
  losses: 0,
  bestMoves: null,
  bestTimeSec: null,
});

export function generateRandomId(): string {
  return 'usr_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

export function getDefaultProfile(): UserProfile {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const initialRecords: Record<number, LevelRecord> = {};
  for (let lvl = 1; lvl <= 10; lvl++) {
    initialRecords[lvl] = DEFAULT_LEVEL_RECORD();
  }

  return {
    id: generateRandomId(),
    nickname: `체스기사_${randomSuffix}`,
    avatar: 'knight',
    avatarColor: 'amber',
    rating: 1000,
    stats: {
      wins: 0,
      losses: 0,
      draws: 0,
      totalGames: 0,
      streak: 0,
      maxStreak: 0,
    },
    levelRecords: initialRecords,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function loadUserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
      const defaultProf = getDefaultProfile();
      saveUserProfile(defaultProf);
      return defaultProf;
    }
    const parsed = JSON.parse(raw) as UserProfile;
    // Ensure all 1~10 levels exist
    if (!parsed.levelRecords) parsed.levelRecords = {};
    for (let lvl = 1; lvl <= 10; lvl++) {
      if (!parsed.levelRecords[lvl]) {
        parsed.levelRecords[lvl] = DEFAULT_LEVEL_RECORD();
      }
    }
    return parsed;
  } catch (err) {
    console.error('Failed to load user profile from storage', err);
    return getDefaultProfile();
  }
}

export function saveUserProfile(profile: UserProfile): void {
  try {
    profile.updatedAt = new Date().toISOString();
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.error('Failed to save user profile', err);
  }
}

/**
 * Elo rating calculation based on match outcome vs AI
 * @param playerRating Current player rating
 * @param aiLevel AI Level (1~10)
 * @param result 'win' | 'loss' | 'draw'
 */
export function calculateRatingDelta(
  playerRating: number,
  aiLevel: number,
  result: 'win' | 'loss' | 'draw'
): number {
  const opponentRating = AI_RATINGS[aiLevel] || 1300;
  return calculatePvpRatingDelta(playerRating, opponentRating, result);
}

/**
 * Elo rating calculation based on match outcome vs any opponent rating
 */
export function calculatePvpRatingDelta(
  playerRating: number,
  opponentRating: number,
  result: 'win' | 'loss' | 'draw'
): number {
  const expected = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  const actual = result === 'win' ? 1.0 : result === 'draw' ? 0.5 : 0.0;

  const K = 32;
  let delta = Math.round(K * (actual - expected));

  if (result === 'win' && delta < 5) delta = 5;
  if (result === 'loss' && delta > -5) delta = -5;
  if (result === 'draw' && Math.abs(delta) < 2) delta = 0;

  return delta;
}

/**
 * Record an AI game result in local profile and return delta rating and new achievements
 */
export function recordGameResult(
  result: 'win' | 'loss' | 'draw',
  aiLevel: number,
  moveCount: number,
  durationSec: number
): {
  profile: UserProfile;
  ratingDelta: number;
  isFirstConquest: boolean;
  isBestMoves: boolean;
  isBestTime: boolean;
} {
  const profile = loadUserProfile();
  const ratingDelta = calculateRatingDelta(profile.rating, aiLevel, result);

  profile.rating = Math.max(100, profile.rating + ratingDelta);
  profile.stats.totalGames += 1;

  if (result === 'win') {
    profile.stats.wins += 1;
    profile.stats.streak += 1;
    if (profile.stats.streak > profile.stats.maxStreak) {
      profile.stats.maxStreak = profile.stats.streak;
    }
  } else if (result === 'loss') {
    profile.stats.losses += 1;
    profile.stats.streak = 0;
  } else {
    profile.stats.draws += 1;
    profile.stats.streak = 0;
  }

  const rec = profile.levelRecords[aiLevel] || DEFAULT_LEVEL_RECORD();
  let isFirstConquest = false;
  let isBestMoves = false;
  let isBestTime = false;

  if (result === 'win') {
    rec.wins += 1;
    if (!rec.conquered) {
      rec.conquered = true;
      isFirstConquest = true;
    }
    if (moveCount > 0 && (rec.bestMoves === null || moveCount < rec.bestMoves)) {
      rec.bestMoves = moveCount;
      isBestMoves = true;
    }
    if (rec.bestTimeSec === null || durationSec < rec.bestTimeSec) {
      rec.bestTimeSec = durationSec;
      isBestTime = true;
    }
    rec.lastWonAt = new Date().toISOString();
  } else if (result === 'loss') {
    rec.losses += 1;
  }

  profile.levelRecords[aiLevel] = rec;
  saveUserProfile(profile);

  return {
    profile,
    ratingDelta,
    isFirstConquest,
    isBestMoves,
    isBestTime,
  };
}

/**
 * Record an Online 1:1 PVP game result in local profile
 */
export function recordPvpGameResult(
  result: 'win' | 'loss' | 'draw',
  opponentRating: number
): {
  profile: UserProfile;
  ratingDelta: number;
} {
  const profile = loadUserProfile();
  const ratingDelta = calculatePvpRatingDelta(profile.rating, opponentRating || 1000, result);

  profile.rating = Math.max(100, profile.rating + ratingDelta);
  profile.stats.totalGames += 1;

  if (result === 'win') {
    profile.stats.wins += 1;
    profile.stats.streak += 1;
    if (profile.stats.streak > profile.stats.maxStreak) {
      profile.stats.maxStreak = profile.stats.streak;
    }
  } else if (result === 'loss') {
    profile.stats.losses += 1;
    profile.stats.streak = 0;
  } else {
    profile.stats.draws += 1;
    profile.stats.streak = 0;
  }

  saveUserProfile(profile);
  return { profile, ratingDelta };
}

/**
 * Generate simulated local / mock bot ladder for display when offline or before Firebase connection
 */
export function getLocalLadder(aiLevel: number, currentUser: UserProfile): LeaderboardEntry[] {
  const userRec = currentUser.levelRecords[aiLevel];
  const list: LeaderboardEntry[] = [];

  // Simulated rankers across Lv.1 ~ Lv.10
  const botsByLevel: Record<number, Array<{ name: string; moves: number; time: number; rating: number }>> = {
    1: [
      { name: '속기마스터_준', moves: 6, time: 24, rating: 1420 },
      { name: '체스초보탈출', moves: 8, time: 38, rating: 1250 },
      { name: '폰의반란', moves: 11, time: 45, rating: 1180 },
      { name: '루키플레이어', moves: 14, time: 62, rating: 1050 },
    ],
    2: [
      { name: '스탠다드오프닝', moves: 9, time: 42, rating: 1540 },
      { name: '나이트포크장인', moves: 12, time: 55, rating: 1390 },
      { name: '체스사랑', moves: 16, time: 78, rating: 1280 },
    ],
    3: [
      { name: '퀸스갬빗연구가', moves: 14, time: 65, rating: 1720 },
      { name: '엔드게임도사', moves: 18, time: 92, rating: 1610 },
      { name: '비숍사냥꾼', moves: 22, time: 110, rating: 1530 },
    ],
    4: [
      { name: '스칸디나비안', moves: 18, time: 88, rating: 1910 },
      { name: '전술의달인', moves: 24, time: 135, rating: 1840 },
      { name: '카스파로프팬', moves: 28, time: 160, rating: 1760 },
    ],
    5: [
      { name: '마스터K', moves: 22, time: 112, rating: 2050 },
      { name: '디펜스마스터', moves: 27, time: 154, rating: 1980 },
      { name: '체스그랜드', moves: 34, time: 198, rating: 1920 },
    ],
    6: [
      { name: '딥블루_챌린저', moves: 26, time: 140, rating: 2280 },
      { name: '피셔의후예', moves: 31, time: 185, rating: 2210 },
    ],
    7: [
      { name: '알레킨의기백', moves: 30, time: 175, rating: 2480 },
      { name: '탈의마술사', moves: 36, time: 215, rating: 2410 },
    ],
    8: [
      { name: '칼슨매니아', moves: 34, time: 220, rating: 2680 },
      { name: '카루아나정석', moves: 40, time: 265, rating: 2610 },
    ],
    9: [
      { name: '슈퍼GM_하늘', moves: 38, time: 255, rating: 2860 },
      { name: '나카무라속기', moves: 44, time: 295, rating: 2810 },
    ],
    10: [
      { name: '알파제로러버', moves: 42, time: 290, rating: 3080 },
      { name: '스톡피쉬슬레이어', moves: 48, time: 340, rating: 3020 },
    ],
  };

  const pool = botsByLevel[aiLevel] || [];
  pool.forEach((item, idx) => {
    list.push({
      id: `bot_${aiLevel}_${idx}`,
      userId: `bot_${idx}`,
      nickname: item.name,
      avatar: (['queen', 'king', 'knight', 'rook'][idx % 4]) as AvatarType,
      avatarColor: (['amber', 'emerald', 'blue', 'purple'][idx % 4]) as AvatarColor,
      rating: item.rating,
      aiLevel,
      moves: item.moves,
      timeSec: item.time,
      date: '2026-10-25',
      isCurrentUser: false,
    });
  });

  // If user has conquered this level, insert user into leaderboard!
  if (userRec && userRec.conquered && userRec.bestMoves) {
    list.push({
      id: `user_${currentUser.id}_lvl_${aiLevel}`,
      userId: currentUser.id,
      nickname: currentUser.nickname,
      avatar: currentUser.avatar,
      avatarColor: currentUser.avatarColor,
      rating: currentUser.rating,
      aiLevel,
      moves: userRec.bestMoves,
      timeSec: userRec.bestTimeSec || 60,
      date: userRec.lastWonAt ? userRec.lastWonAt.substring(0, 10) : '오늘',
      isCurrentUser: true,
    });
  }

  // Sort by fewest moves, then fastest time
  list.sort((a, b) => {
    if (a.moves !== b.moves) return a.moves - b.moves;
    return a.timeSec - b.timeSec;
  });

  return list;
}

// ==========================================
// Active Ongoing Game Auto-Save & Resume
// ==========================================
export function saveActiveGame(state: SavedActiveGame): void {
  try {
    localStorage.setItem(ACTIVE_GAME_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Failed to auto-save active game:', err);
  }
}

export function loadActiveGame(): SavedActiveGame | null {
  try {
    const raw = localStorage.getItem(ACTIVE_GAME_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedActiveGame;
    if (!parsed || !Array.isArray(parsed.playedMoves) || parsed.playedMoves.length === 0) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearActiveGame(): void {
  try {
    localStorage.removeItem(ACTIVE_GAME_STORAGE_KEY);
  } catch {}
}

// ==========================================
// Game Archive & Standard PGN Builder
// ==========================================
export function buildStandardPgn(
  moves: PlayedMoveRecord[],
  meta: {
    event?: string;
    white: string;
    black: string;
    result: '1-0' | '0-1' | '1/2-1/2' | '*';
    date?: string;
  }
): string {
  const datePart = (meta.date || new Date().toISOString().substring(0, 10)).replace(/-/g, '.');
  const headers = [
    `[Event "${meta.event || 'Chess Master AI Match'}"]`,
    `[Site "Chess Master AI App"]`,
    `[Date "${datePart}"]`,
    `[White "${meta.white}"]`,
    `[Black "${meta.black}"]`,
    `[Result "${meta.result}"]`,
  ];

  const moveTokens: string[] = [];
  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    if (i % 2 === 0) {
      moveTokens.push(`${Math.floor(i / 2) + 1}. ${m.san}`);
    } else {
      moveTokens.push(m.san);
    }
  }
  moveTokens.push(meta.result);

  return `${headers.join('\n')}\n\n${moveTokens.join(' ')}`;
}

export function loadGameArchive(): ArchivedGame[] {
  try {
    const raw = localStorage.getItem(GAME_ARCHIVE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ArchivedGame[]) : [];
  } catch {
    return [];
  }
}

export function saveGameToArchive(entry: Omit<ArchivedGame, 'id'>): ArchivedGame {
  const fullEntry: ArchivedGame = {
    ...entry,
    id: 'arc_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7),
  };

  try {
    const current = loadGameArchive();
    const updated = [fullEntry, ...current].slice(0, 30); // Keep most recent 30 games
    localStorage.setItem(GAME_ARCHIVE_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save game to archive:', err);
  }

  return fullEntry;
}

export function deleteArchivedGame(id: string): ArchivedGame[] {
  try {
    const updated = loadGameArchive().filter((g) => g.id !== id);
    localStorage.setItem(GAME_ARCHIVE_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return loadGameArchive();
  }
}

// ==========================================
// Daily Puzzle Streak & Puzzle Rush High Score
// ==========================================
export interface DailyPuzzleData {
  lastSolvedDate: string | null; // YYYY-MM-DD
  streak: number;
  maxStreak: number;
  solvedDates: string[];
}

export function getLocalTodayString(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function loadDailyPuzzleData(): DailyPuzzleData {
  try {
    const raw = localStorage.getItem(DAILY_PUZZLE_STORAGE_KEY);
    if (!raw) {
      return { lastSolvedDate: null, streak: 0, maxStreak: 0, solvedDates: [] };
    }
    const parsed = JSON.parse(raw) as DailyPuzzleData;
    return {
      lastSolvedDate: parsed.lastSolvedDate || null,
      streak: parsed.streak || 0,
      maxStreak: parsed.maxStreak || 0,
      solvedDates: Array.isArray(parsed.solvedDates) ? parsed.solvedDates : [],
    };
  } catch {
    return { lastSolvedDate: null, streak: 0, maxStreak: 0, solvedDates: [] };
  }
}

export function markDailyPuzzleSolved(todayStr = getLocalTodayString()): DailyPuzzleData {
  const data = loadDailyPuzzleData();
  if (data.lastSolvedDate === todayStr || data.solvedDates.includes(todayStr)) {
    return data;
  }

  // Check if yesterday was solved
  const [y, m, d] = todayStr.split('-').map(Number);
  const yesterdayDate = new Date(y, m - 1, d - 1);
  const yStr = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(
    yesterdayDate.getDate()
  ).padStart(2, '0')}`;

  const nextStreak = data.lastSolvedDate === yStr ? data.streak + 1 : 1;
  const nextMax = Math.max(data.maxStreak, nextStreak);
  const nextSolvedDates = [...data.solvedDates, todayStr].slice(-60);

  const updated: DailyPuzzleData = {
    lastSolvedDate: todayStr,
    streak: nextStreak,
    maxStreak: nextMax,
    solvedDates: nextSolvedDates,
  };

  try {
    localStorage.setItem(DAILY_PUZZLE_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
}

export function loadPuzzleRushBest(): number {
  try {
    return Number(localStorage.getItem(PUZZLE_RUSH_BEST_KEY) || 0);
  } catch {
    return 0;
  }
}

export function savePuzzleRushBest(score: number): number {
  const prev = loadPuzzleRushBest();
  const best = Math.max(prev, score);
  try {
    localStorage.setItem(PUZZLE_RUSH_BEST_KEY, String(best));
  } catch {}
  return best;
}
