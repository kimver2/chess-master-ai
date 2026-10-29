import React from 'react';
import { ChessPiece, ChessPieceDefs } from './ChessPieces';
import { PieceColor, TimeLimit, PieceTheme } from '../types/chess';
import { Clock, Bot, User } from 'lucide-react';

interface PlayerBarProps {
  name: string;
  isAi?: boolean;
  color: PieceColor;
  timeRemainingMs: number | null;
  timeLimit: TimeLimit;
  isActive: boolean;
  capturedPieces: { [key in 'p' | 'n' | 'b' | 'r' | 'q']?: number };
  materialDiff?: number;
  photoUrl?: string | null;
  pieceTheme?: PieceTheme;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  name,
  isAi = false,
  color,
  timeRemainingMs,
  timeLimit,
  isActive,
  capturedPieces,
  materialDiff = 0,
  photoUrl,
  pieceTheme = 'metal',
}) => {
  const isWhite = color === 'w';

  // Format time remaining
  const formatTime = (ms: number | null) => {
    if (ms === null || timeLimit === 'unlimited') return '∞';
    const totalSecs = Math.max(0, Math.ceil(ms / 1000));
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isLowTime = isActive && timeRemainingMs !== null && timeRemainingMs <= 30000 && timeLimit !== 'unlimited';
  const isCriticalLowTime = isActive && timeRemainingMs !== null && timeRemainingMs <= 10000 && timeLimit !== 'unlimited';

  return (
    <div
      className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all ${
        isActive
          ? 'bg-zinc-800/90 border border-amber-500/40 shadow-md ring-1 ring-amber-500/20'
          : 'bg-zinc-900/60 border border-zinc-800'
      }`}
    >
      <ChessPieceDefs />
      {/* Player Identity */}
      <div className="flex items-center gap-2">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden ${
            isWhite ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-800 text-zinc-100 border border-zinc-700'
          }`}
        >
          {isAi ? (
            <Bot className="w-5 h-5" />
          ) : photoUrl ? (
            <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <User className="w-5 h-5" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-zinc-100 tracking-tight">{name}</span>
            <span
              className={`w-2 h-2 rounded-full ${
                isWhite ? 'bg-amber-100 border border-zinc-400' : 'bg-zinc-950 border border-zinc-500'
              }`}
            />
          </div>

          {/* Captured pieces */}
          <div className="flex items-center gap-0.5 h-4 mt-0.5">
            {(['p', 'n', 'b', 'r', 'q'] as const).map((pType) => {
              const count = capturedPieces[pType] || 0;
              if (count === 0) return null;
              return (
                <div key={pType} className="flex items-center">
                  <div className="w-4 h-4">
                    <ChessPiece type={pType} color={isWhite ? 'b' : 'w'} theme={pieceTheme} />
                  </div>
                  {count > 1 && (
                    <span className="text-[10px] text-zinc-400 font-semibold -ml-0.5">×{count}</span>
                  )}
                </div>
              );
            })}
            {materialDiff > 0 && (
              <span className="text-[10px] font-bold text-emerald-400 ml-1">+{materialDiff}</span>
            )}
          </div>
        </div>
      </div>

      {/* Timer Badge */}
      <div
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-sm font-bold tracking-wider transition-all ${
          isCriticalLowTime
            ? 'bg-rose-950/95 text-rose-300 border border-rose-500 ring-2 ring-rose-500/40 animate-pulse font-black'
            : isLowTime
            ? 'bg-amber-950/85 text-amber-300 border border-amber-500/60 font-extrabold animate-pulse'
            : isActive
            ? 'bg-zinc-700/80 text-amber-300 border border-amber-500/30'
            : 'bg-zinc-800 text-zinc-400'
        }`}
      >
        <Clock className="w-3.5 h-3.5 opacity-70" />
        <span>{formatTime(timeRemainingMs)}</span>
      </div>
    </div>
  );
};
