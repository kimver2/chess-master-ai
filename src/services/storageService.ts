import { UserProfile, LevelRecord, LeaderboardEntry, AvatarType, AvatarColor } from '../types/profile';

const PROFILE_STORAGE_KEY = 'chess_user_profile_v1';

export const AI_RATINGS: Record<number, number> = {
  1: 800,
  2: 1100,
  3: 1400,
  4: 1700,
  5: 2000,
  6: 2300,
  7: 2600,
  8: 2900,
};

export const AI_NAMES: Record<number, string> = {
  1: '초심자 AI (Lv.1)',
  2: '입문 봇 (Lv.2)',
  3: '클럽 기사 (Lv.3)',
  4: '전술가 AI (Lv.4)',
  5: '체스 마스터 (Lv.5)',
  6: '국제 마스터 (Lv.6)',
  7: '그랜드마스터 (Lv.7)',
  8: '스톡피쉬 최고봉 (Lv.8)',
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
  for (let lvl = 1; lvl <= 8; lvl++) {
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
    // Ensure all 1~8 levels exist
    if (!parsed.levelRecords) parsed.levelRecords = {};
    for (let lvl = 1; lvl <= 8; lvl++) {
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
 * Elo rating calculation based on match outcome
 * @param playerRating Current player rating
 * @param aiLevel AI Level (1~8)
 * @param result 'win' | 'loss' | 'draw'
 */
export function calculateRatingDelta(
  playerRating: number,
  aiLevel: number,
  result: 'win' | 'loss' | 'draw'
): number {
  const opponentRating = AI_RATINGS[aiLevel] || 1200;
  // Expected score formula: 1 / (1 + 10^((opponent - player)/400))
  const expected = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  const actual = result === 'win' ? 1.0 : result === 'draw' ? 0.5 : 0.0;

  // Dynamic K-factor (higher K if player has low total games or facing tough challenge)
  const K = 32;
  let delta = Math.round(K * (actual - expected));

  // Minimum guarantees: winning against an AI always grants at least +5 rating
  if (result === 'win' && delta < 5) delta = 5;
  if (result === 'loss' && delta > -5) delta = -5;
  if (result === 'draw' && Math.abs(delta) < 2) delta = 0;

  return delta;
}

/**
 * Record a game result in local profile and return delta rating and new achievements
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
    if (rec.bestMoves === null || moveCount < rec.bestMoves) {
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
 * Generate simulated local / mock bot ladder for display when offline or before Firebase connection
 */
export function getLocalLadder(aiLevel: number, currentUser: UserProfile): LeaderboardEntry[] {
  const userRec = currentUser.levelRecords[aiLevel];
  const list: LeaderboardEntry[] = [];

  // Simulated rankers
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
      { name: '마스터K', moves: 22, time: 112, rating: 2150 },
      { name: '디펜스마스터', moves: 27, time: 154, rating: 2080 },
      { name: '체스그랜드', moves: 34, time: 198, rating: 2020 },
    ],
    6: [
      { name: '딥블루_챌린저', moves: 26, time: 140, rating: 2380 },
      { name: '피셔의후예', moves: 31, time: 185, rating: 2310 },
    ],
    7: [
      { name: '알레킨의기백', moves: 32, time: 195, rating: 2620 },
      { name: '탈의마술사', moves: 38, time: 230, rating: 2580 },
    ],
    8: [
      { name: '칼슨매니아', moves: 36, time: 240, rating: 2950 },
      { name: '알파제로러버', moves: 42, time: 290, rating: 2910 },
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
