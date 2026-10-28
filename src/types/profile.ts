export type PlayerProfileId = 'daegyeom' | 'mingyeom';

export interface PlayerProfile {
  id: PlayerProfileId;
  name: string;
  tagline: string;
  photoUrl: string | null;
  gamesPlayed: number;
  wins: number;
  losses: number;
}

export type AvatarType = 'king' | 'queen' | 'knight' | 'rook' | 'bishop' | 'pawn';
export type AvatarColor = 'amber' | 'emerald' | 'blue' | 'purple' | 'rose' | 'cyan';

export interface LevelRecord {
  conquered: boolean;
  wins: number;
  losses: number;
  bestMoves: number | null; // 최단 수 승리
  bestTimeSec: number | null; // 최단 시간 승리 (초)
  lastWonAt?: string;
}

export interface UserStats {
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
  streak: number;
  maxStreak: number;
}

export interface UserProfile {
  id: string;
  nickname: string;
  avatar: AvatarType;
  avatarColor: AvatarColor;
  rating: number; // Elo 레이팅 (기본 1000)
  stats: UserStats;
  levelRecords: Record<number, LevelRecord>; // Level 1 ~ 10
  createdAt: string;
  updatedAt: string;
}

export interface TierInfo {
  name: string;
  engName: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  minRating: number;
  maxRating: number;
  icon: string;
}

export interface LeaderboardEntry {
  id: string;
  userId: string;
  nickname: string;
  avatar: AvatarType;
  avatarColor: AvatarColor;
  rating: number;
  aiLevel: number;
  moves: number;
  timeSec: number;
  date: string;
  isCurrentUser?: boolean;
}

export const TIERS: TierInfo[] = [
  {
    name: '비기너',
    engName: 'Beginner',
    color: 'text-zinc-400',
    bgColor: 'bg-zinc-800/80',
    borderColor: 'border-zinc-700',
    textColor: 'text-zinc-300',
    minRating: 0,
    maxRating: 1099,
    icon: '♟️',
  },
  {
    name: '브론즈',
    engName: 'Bronze',
    color: 'text-amber-600',
    bgColor: 'bg-amber-950/40',
    borderColor: 'border-amber-700/60',
    textColor: 'text-amber-500',
    minRating: 1100,
    maxRating: 1299,
    icon: '🥉',
  },
  {
    name: '실버',
    engName: 'Silver',
    color: 'text-slate-300',
    bgColor: 'bg-slate-800/50',
    borderColor: 'border-slate-500/60',
    textColor: 'text-slate-200',
    minRating: 1300,
    maxRating: 1499,
    icon: '🥈',
  },
  {
    name: '골드',
    engName: 'Gold',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-950/40',
    borderColor: 'border-yellow-500/60',
    textColor: 'text-yellow-300',
    minRating: 1500,
    maxRating: 1699,
    icon: '🥇',
  },
  {
    name: '플래티넘',
    engName: 'Platinum',
    color: 'text-cyan-300',
    bgColor: 'bg-cyan-950/40',
    borderColor: 'border-cyan-500/60',
    textColor: 'text-cyan-200',
    minRating: 1700,
    maxRating: 1899,
    icon: '💎',
  },
  {
    name: '마스터',
    engName: 'Master',
    color: 'text-purple-400',
    bgColor: 'bg-purple-950/40',
    borderColor: 'border-purple-500/60',
    textColor: 'text-purple-300',
    minRating: 1900,
    maxRating: 2099,
    icon: '👑',
  },
  {
    name: '그랜드마스터',
    engName: 'Grandmaster',
    color: 'text-rose-400',
    bgColor: 'bg-rose-950/50',
    borderColor: 'border-rose-500/70',
    textColor: 'text-rose-300',
    minRating: 2100,
    maxRating: 9999,
    icon: '🏆',
  },
];

export function getTier(rating: number): TierInfo {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (rating >= TIERS[i].minRating) {
      return TIERS[i];
    }
  }
  return TIERS[0];
}
