export type PieceColor = 'w' | 'b';
export type PlayerSide = 'white' | 'black' | 'random';
export type TimeLimit = '5m' | '10m' | 'unlimited';
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type PieceTheme = '3d_staunton' | '3d_wood' | 'metal' | 'classic';
export type BoardTheme = 'walnut' | 'tournament' | 'dark_wood' | 'marble' | 'classic';

export type GameResult = 'win' | 'loss' | 'draw' | 'ongoing';
export type GameOverReason =
  | 'checkmate'
  | 'stalemate'
  | 'insufficient_material'
  | 'threefold_repetition'
  | 'timeout'
  | 'resignation'
  | null;

export type MoveQuality = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder' | 'book';

export interface MoveAnalysis {
  ply: number; // 0-indexed ply
  moveNumber: number; // 1, 1, 2, 2...
  color: PieceColor;
  san: string; // "Nf3"
  from: string; // "g1"
  to: string; // "f3"
  promotion?: string;
  fenBefore: string;
  fenAfter: string;
  scoreBefore: number; // in centipawns from perspective of player whose turn it is
  scoreAfter: number;
  scoreDelta: number; // score loss (>= 0 is good, large negative is blunder)
  quality: MoveQuality;
  bestMoveSan?: string;
  bestMoveUci?: string;
  missedCheck: boolean;
  commentary: string;
}

export interface PlayerStats {
  best: number;
  good: number;
  inaccuracy: number;
  mistake: number;
  blunder: number;
  accuracy: number; // 0 ~ 100%
}

export interface GameReviewData {
  moves: MoveAnalysis[];
  whiteStats: PlayerStats;
  blackStats: PlayerStats;
}

export interface EndgamePuzzle {
  id: number;
  title: string;
  category: 'beginner' | 'intermediate' | 'advanced';
  playerColor: PieceColor;
  fen: string;
  goalDescription: string;
  targetResult: 'checkmate' | 'promotion' | 'draw';
  tip: string;
  explanation: string;
}
