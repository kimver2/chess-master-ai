import { PieceColor, GameOverReason, TimeLimit } from './chess';
import { AvatarType, AvatarColor } from './profile';

export type MultiplayerMode = 'friend' | 'quick' | 'local';

export type MultiplayerGameStatus =
  | 'waiting' // 방 생성 후 상대 대기 중
  | 'playing' // 양쪽 접속 후 대국 진행 중
  | 'completed' // 대국 종료
  | 'abandoned'; // 상대 나감 / 중도 포기

export interface MultiplayerPlayer {
  id: string;
  nickname: string;
  avatar: AvatarType;
  avatarColor: AvatarColor;
  rating: number;
}

export interface MultiplayerMove {
  from: string;
  to: string;
  san: string;
  promotion?: string;
  ply: number;
  timestamp: string;
}

export type MultiplayerEmojiId = 'hello' | 'nice' | 'thinking' | 'oops' | 'gg';

export interface MultiplayerReaction {
  senderColor: PieceColor;
  emojiId: MultiplayerEmojiId;
  sentAt: number;
}

export interface MultiplayerGameData {
  id: string;
  roomCode: string;
  mode: MultiplayerMode;
  status: MultiplayerGameStatus;
  whitePlayer: MultiplayerPlayer | null;
  blackPlayer: MultiplayerPlayer | null;
  currentTurn: PieceColor;
  fen: string;
  moves: MultiplayerMove[];
  lastMove: { from: string; to: string } | null;
  winner: PieceColor | 'draw' | null;
  endReason: GameOverReason | null;
  timeLimit?: TimeLimit;
  whiteTimeMs?: number | null;
  blackTimeMs?: number | null;
  turnStartedAt?: string;
  drawOfferBy?: PieceColor | null;
  rematchOfferBy?: PieceColor | null;
  rematchDeclinedBy?: PieceColor | null;
  leftRoomBy?: PieceColor[];
  nextGameId?: string | null;
  lastReaction?: MultiplayerReaction | null;
  expireAt?: any; // Firestore Timestamp for automatic TTL deletion
  createdAt: string;
  updatedAt: string;
}

export interface QuickMatchQueueItem {
  id: string;
  player: MultiplayerPlayer;
  timeLimit?: TimeLimit;
  createdAt: string;
}
