import { Chess } from 'chess.js';
import { UserProfile, LevelRecord } from '../types/profile';
import {
  SavedActiveGame,
  ArchivedGame,
  PlayedMoveRecord,
  GameReviewData,
} from '../types/chess';

const PROFILE_STORAGE_KEY = 'chess_user_profile_v1';
const ACTIVE_GAME_STORAGE_KEY = 'chess_active_game_v1';
const GAME_ARCHIVE_STORAGE_KEY = 'chess_game_archive_v1';
const DAILY_PUZZLE_STORAGE_KEY = 'chess_daily_puzzle_v1';
const PUZZLE_RUSH_BEST_KEY = 'chess_puzzle_rush_best_v1';
const ENDGAME_CLEARED_KEY = 'chess_endgame_cleared_v1';
const REVIEW_CACHE_KEY = 'chess_review_cache_v1';
const CONFIRM_MOVE_KEY = 'chess_confirm_move_v1';

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

// ==========================================
// Move Confirmation Preference
// ==========================================
export function loadConfirmMoveEnabled(): boolean {
  try {
    return localStorage.getItem(CONFIRM_MOVE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveConfirmMoveEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(CONFIRM_MOVE_KEY, String(enabled));
  } catch {}
}

// ==========================================
// Endgame 50 Cleared Persistence
// ==========================================
export function loadClearedEndgameIds(): number[] {
  try {
    const raw = localStorage.getItem(ENDGAME_CLEARED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'number') : [];
  } catch {
    return [];
  }
}

export function markEndgameCleared(id: number): number[] {
  const current = loadClearedEndgameIds();
  if (current.includes(id)) return current;
  const updated = [...current, id];
  try {
    localStorage.setItem(ENDGAME_CLEARED_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
}

// ==========================================
// Game Review Analysis Cache (0ms Re-open)
// ==========================================
interface ReviewCacheEntry {
  sig: string;
  review: GameReviewData;
  savedAt: number;
}

export function getMovesSignature(moves: PlayedMoveRecord[]): string {
  if (!moves || moves.length === 0) return '';
  return `${moves[0].fenBefore}|${moves.map((m) => `${m.from}${m.to}${m.promotion || ''}`).join(',')}`;
}

export function getCachedReviewForMoves(
  moves: PlayedMoveRecord[],
  archivedGame?: ArchivedGame
): GameReviewData | null {
  if (archivedGame?.cachedReview && archivedGame.cachedReview.moves.length === moves.length) {
    return archivedGame.cachedReview;
  }
  const sig = getMovesSignature(moves);
  if (!sig) return null;

  try {
    const raw = localStorage.getItem(REVIEW_CACHE_KEY);
    if (raw) {
      const list = JSON.parse(raw) as ReviewCacheEntry[];
      const hit = Array.isArray(list) ? list.find((e) => e.sig === sig) : undefined;
      if (hit && hit.review?.moves?.length === moves.length) {
        return hit.review;
      }
    }
  } catch {}

  // Fallback check inside archived games
  try {
    const archives = loadGameArchive();
    const match = archives.find(
      (g) => g.cachedReview && getMovesSignature(g.moves) === sig
    );
    if (match?.cachedReview) return match.cachedReview;
  } catch {}

  return null;
}

export function saveCachedReviewForMoves(
  moves: PlayedMoveRecord[],
  review: GameReviewData,
  archiveId?: string
): ArchivedGame[] {
  const sig = getMovesSignature(moves);
  if (sig) {
    try {
      const raw = localStorage.getItem(REVIEW_CACHE_KEY);
      const prev = raw ? (JSON.parse(raw) as ReviewCacheEntry[]) : [];
      const filtered = Array.isArray(prev) ? prev.filter((e) => e.sig !== sig) : [];
      const next: ReviewCacheEntry[] = [
        { sig, review, savedAt: Date.now() },
        ...filtered,
      ].slice(0, 10);
      localStorage.setItem(REVIEW_CACHE_KEY, JSON.stringify(next));
    } catch {}
  }

  try {
    const archives = loadGameArchive();
    let changed = false;
    const updated = archives.map((g) => {
      if (
        (archiveId && g.id === archiveId) ||
        (!archiveId && sig && getMovesSignature(g.moves) === sig)
      ) {
        changed = true;
        return { ...g, cachedReview: review };
      }
      return g;
    });
    if (changed) {
      localStorage.setItem(GAME_ARCHIVE_STORAGE_KEY, JSON.stringify(updated));
    }
    return updated;
  } catch {
    return loadGameArchive();
  }
}

// ==========================================
// External PGN / FEN Importer
// ==========================================
export type ParsedImportResult =
  | {
      ok: true;
      isCustomFenOnly: boolean;
      startFen: string;
      finalFen: string;
      pgn: string;
      moves: PlayedMoveRecord[];
      whiteName: string;
      blackName: string;
    }
  | {
      ok: false;
      error: string;
    };

export function parseImportedPgnOrFen(rawText: string): ParsedImportResult {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return { ok: false, error: 'PGN 기보 또는 FEN 문자열을 입력해 주세요.' };
  }

  // 1. Check if input is a single FEN string (contains 7 '/' in piece placement and no newline move list)
  const firstLine = trimmed.split(/\r?\n/)[0].trim();
  const slashCount = (firstLine.split(' ')[0]?.match(/\//g) || []).length;
  if (slashCount === 7 && !trimmed.includes('[Event') && !/\b1\.\s*[a-hNBRQK]/.test(trimmed)) {
    try {
      const fenCandidate = firstLine.split(/\s+/).length >= 4 ? firstLine : `${firstLine} w - - 0 1`;
      const testChess = new Chess(fenCandidate);
      const validFen = testChess.fen();
      return {
        ok: true,
        isCustomFenOnly: true,
        startFen: validFen,
        finalFen: validFen,
        pgn: `[SetUp "1"]\n[FEN "${validFen}"]\n\n*`,
        moves: [],
        whiteName: '백 (FEN 연구)',
        blackName: '흑 (FEN 연구)',
      };
    } catch {
      return { ok: false, error: '유효하지 않은 FEN 형식입니다. 기물 배치와 턴 정보를 확인해 주세요.' };
    }
  }

  // 2. Otherwise parse as PGN or SAN move sequence
  const whiteMatch = trimmed.match(/\[White\s+"([^"]+)"\]/i);
  const blackMatch = trimmed.match(/\[Black\s+"([^"]+)"\]/i);
  const fenHeaderMatch = trimmed.match(/\[FEN\s+"([^"]+)"\]/i);
  const whiteName = whiteMatch?.[1]?.trim() || '백 플레이어';
  const blackName = blackMatch?.[1]?.trim() || '흑 플레이어';

  let startFen = new Chess().fen();
  if (fenHeaderMatch?.[1]) {
    try {
      startFen = new Chess(fenHeaderMatch[1].trim()).fen();
    } catch {
      return { ok: false, error: 'PGN 내부의 [FEN] 시작 국면이 올바르지 않습니다.' };
    }
  }

  // Try native loadPgn first, then fallback to clean SAN token parser
  let verboseHistory: ReturnType<Chess['history']> = [];
  let loadedViaPgn = false;

  try {
    const pgnChess = new Chess();
    pgnChess.loadPgn(trimmed);
    const hist = pgnChess.history({ verbose: true });
    if (hist.length > 0) {
      verboseHistory = hist;
      loadedViaPgn = true;
    }
  } catch {
    loadedViaPgn = false;
  }

  if (!loadedViaPgn) {
    // Strip headers, {comments}, ;comments, (variations), move numbers, NAGs ($1), results
    let body = trimmed.replace(/^\[[^\]]*\]\s*$/gm, ' ');
    body = body.replace(/\{[^}]*\}/g, ' ');
    body = body.replace(/;[^\r\n]*/g, ' ');
    // Strip nested variations (...) iteratively
    let prev = '';
    while (prev !== body) {
      prev = body;
      body = body.replace(/\([^()]*\)/g, ' ');
    }
    body = body.replace(/\$\d+/g, ' ');
    body = body.replace(/\b\d+\.(\.\.)?/g, ' ');
    body = body.replace(/\b(1-0|0-1|1\/2-1\/2|\*)\b/g, ' ');

    const tokens = body
      .trim()
      .split(/\s+/)
      .map((t) => t.replace(/[!?]+$/g, ''))
      .filter(Boolean);

    if (tokens.length === 0) {
      return { ok: false, error: '인식할 수 있는 기보 수순(예: 1. e4 e5 2. Nf3 ...)이 없습니다.' };
    }

    const replay = new Chess(startFen);
    for (let i = 0; i < tokens.length; i++) {
      try {
        const mv = replay.move(tokens[i]);
        if (!mv) {
          return {
            ok: false,
            error: `${i + 1}번째 수('${tokens[i]}')를 해석할 수 없습니다. 올바른 PGN/대수기보인지 확인해 주세요.`,
          };
        }
      } catch {
        return {
          ok: false,
          error: `${i + 1}번째 수('${tokens[i]}')가 규칙에 맞지 않습니다.`,
        };
      }
    }
    verboseHistory = replay.history({ verbose: true });
  }

  if (verboseHistory.length === 0) {
    return { ok: false, error: '최소 1수 이상의 기보가 포함되어야 합니다.' };
  }

  // Reconstruct PlayedMoveRecord[] accurately
  const tracker = new Chess(startFen);
  const moves: PlayedMoveRecord[] = [];
  for (let i = 0; i < verboseHistory.length; i++) {
    const v = verboseHistory[i] as any;
    const fenBefore = tracker.fen();
    const step = tracker.move({ from: v.from, to: v.to, promotion: v.promotion });
    if (!step) break;
    const fenAfter = tracker.fen();
    moves.push({
      ply: i,
      moveNumber: Math.floor(i / 2) + 1,
      color: step.color,
      san: step.san,
      from: step.from,
      to: step.to,
      ...(step.promotion ? { promotion: step.promotion } : {}),
      ...(step.captured ? { captured: step.captured } : {}),
      fenBefore,
      fenAfter,
    });
  }

  const finalFen = tracker.fen();
  const stdPgn =
    startFen === new Chess().fen()
      ? buildStandardPgn(moves, {
          event: 'Imported PGN Analysis',
          white: whiteName,
          black: blackName,
          result: '*',
        })
      : `[Event "Imported Position"]\n[SetUp "1"]\n[FEN "${startFen}"]\n\n${moves
          .map((m, idx) => (idx % 2 === 0 ? `${m.moveNumber}. ${m.san}` : m.san))
          .join(' ')} *`;

  return {
    ok: true,
    isCustomFenOnly: false,
    startFen,
    finalFen,
    pgn: stdPgn,
    moves,
    whiteName,
    blackName,
  };
}
