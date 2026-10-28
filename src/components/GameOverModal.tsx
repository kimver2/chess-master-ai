import React from 'react';
import { Trophy, TrendingUp, Eye } from 'lucide-react';
import { AvatarIcon } from './AvatarIcon';
import { UserProfile, getTier } from '../types/profile';
import { DifficultyLevel, GameOverReason, GameResult } from '../types/chess';

export interface LastGameReward {
  ratingDelta: number;
  isFirstConquest: boolean;
  isBestMoves: boolean;
  isBestTime: boolean;
}

interface GameOverModalProps {
  isOpen: boolean;
  gameResult: GameResult;
  gameOverReason: GameOverReason;
  lastGameReward: LastGameReward | null;
  userProfile: UserProfile;
  difficulty: DifficultyLevel;
  playedMovesCount: number;
  isAnalyzing: boolean;
  onRunReview: () => void;
  onCloseToBoard: () => void;
  onStartNewGame: () => void;
  onOpenRanking: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  gameResult,
  gameOverReason,
  lastGameReward,
  userProfile,
  difficulty,
  playedMovesCount,
  isAnalyzing,
  onRunReview,
  onCloseToBoard,
  onStartNewGame,
  onOpenRanking,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl max-w-sm w-full text-center space-y-4 shadow-2xl">
        <div className="text-3xl">
          {gameResult === 'win' ? '🏆' : gameResult === 'loss' ? '💀' : '🤝'}
        </div>
        <div>
          <h3 className="text-lg font-extrabold text-zinc-100">
            {gameResult === 'win'
              ? '플레이어 승리! 🎉'
              : gameResult === 'loss'
              ? 'AI 승리'
              : '무승부 (Draw)'}
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            {gameOverReason === 'checkmate'
              ? '체크메이트로 경기가 종료되었습니다.'
              : gameOverReason === 'timeout'
              ? '시간 초과로 승패가 결정되었습니다.'
              : gameOverReason === 'resignation'
              ? '기권으로 종료되었습니다.'
              : '스테일메이트 또는 기물 부족 무승부입니다.'}
          </p>
        </div>

        {/* Player Rating & Achievement Card */}
        {lastGameReward && (
          <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <AvatarIcon
                  avatar={userProfile.avatar}
                  color={userProfile.avatarColor}
                  size="sm"
                />
                <div>
                  <span className="font-bold text-white text-xs block">
                    {userProfile.nickname}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {getTier(userProfile.rating).name}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 font-mono font-bold text-xs">
                  <span className="text-zinc-200">{userProfile.rating} Elo</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      lastGameReward.ratingDelta >= 0
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {lastGameReward.ratingDelta >= 0
                      ? `+${lastGameReward.ratingDelta}`
                      : lastGameReward.ratingDelta}
                  </span>
                </div>
              </div>
            </div>

            {lastGameReward.isFirstConquest && (
              <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5">
                <span>🏆</span>
                <span>AI Lv.{difficulty} 최초 격파! 명예 훈장 획득!</span>
              </div>
            )}

            {lastGameReward.isBestMoves && !lastGameReward.isFirstConquest && (
              <div className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1">
                <span>⚡</span>
                <span>새로운 최소 수 승리 기록 ({playedMovesCount}수)!</span>
              </div>
            )}

            <button
              type="button"
              onClick={onOpenRanking}
              className="w-full py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-amber-400 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>명예의 전당 순위표 확인</span>
            </button>
          </div>
        )}

        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={onRunReview}
            disabled={isAnalyzing}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all"
          >
            <TrendingUp className="w-4 h-4" /> 대국 정밀 복기하기
          </button>
          <button
            type="button"
            onClick={onCloseToBoard}
            className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-98 text-zinc-200 font-semibold text-xs border border-zinc-700 flex items-center justify-center gap-1.5 transition-all"
          >
            <Eye className="w-4 h-4 text-amber-400" /> 체스판 둘러보기
          </button>
          <button
            type="button"
            onClick={onStartNewGame}
            className="w-full py-2.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 font-medium text-xs border border-zinc-700/60 transition-all"
          >
            새 대국 시작하기
          </button>
        </div>
      </div>
    </div>
  );
};
