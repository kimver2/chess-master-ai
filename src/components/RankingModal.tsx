import React, { useState, useEffect } from 'react';
import {
  X,
  Trophy,
  Globe,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { UserProfile, LeaderboardEntry, getTier } from '../types/profile';
import { AI_NAMES, ALL_AI_LEVELS } from '../services/storageService';
import {
  fetchOnlineLeaderboard,
  submitOnlineScore,
  syncUserProfileToOnlineRankings,
} from '../services/firebaseService';
import { AvatarIcon } from './AvatarIcon';

interface RankingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
}

export const RankingModal: React.FC<RankingModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmittingScore, setIsSubmittingScore] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const initAndLoad = async () => {
      setIsLoading(true);
      await syncUserProfileToOnlineRankings(currentUser);
      const onlineEntries = await fetchOnlineLeaderboard(selectedLevel, currentUser.id);
      if (!cancelled) {
        setEntries(onlineEntries);
        setIsLoading(false);
      }
    };

    initAndLoad();
    return () => {
      cancelled = true;
    };
  }, [isOpen, currentUser.nickname, currentUser.avatar, currentUser.avatarColor]);

  const loadRankings = async (lvl: number) => {
    setIsLoading(true);
    const onlineEntries = await fetchOnlineLeaderboard(lvl, currentUser.id);
    setEntries(onlineEntries);
    setIsLoading(false);
  };

  const handleUploadMyLocalRecord = async () => {
    const rec = currentUser.levelRecords[selectedLevel];
    if (!rec || !rec.conquered || !rec.bestMoves) return;

    setIsSubmittingScore(true);
    try {
      await submitOnlineScore({
        userId: currentUser.id,
        nickname: currentUser.nickname,
        avatar: currentUser.avatar,
        avatarColor: currentUser.avatarColor,
        rating: currentUser.rating,
        aiLevel: selectedLevel,
        moves: rec.bestMoves,
        timeSec: rec.bestTimeSec || 60,
        date: new Date().toISOString().substring(0, 10),
      });
      await loadRankings(selectedLevel);
    } catch (e) {
      console.error('Failed to submit score:', e);
    } finally {
      setIsSubmittingScore(false);
    }
  };

  const handleLevelChange = (lvl: number) => {
    setSelectedLevel(lvl);
    loadRankings(lvl);
  };

  if (!isOpen) return null;

  const userRankIndex = entries.findIndex((e) => e.isCurrentUser || e.userId === currentUser.id);
  const localRecord = currentUser.levelRecords[selectedLevel];
  const canSyncBetterLocalRecord =
    Boolean(localRecord?.conquered && localRecord?.bestMoves) &&
    (userRankIndex === -1 ||
      (localRecord!.bestMoves! < entries[userRankIndex].moves));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80 shrink-0">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">명예의 전당 & 온라인 랭킹</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Level Tabs (Lv.1 to Lv.10) */}
        <div className="p-2 bg-zinc-950/40 border-b border-zinc-800 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {ALL_AI_LEVELS.map((lvl) => {
            const isSelected = selectedLevel === lvl;
            const isConquered = currentUser.levelRecords[lvl]?.conquered;
            return (
              <button
                key={lvl}
                type="button"
                onClick={() => handleLevelChange(lvl)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all shrink-0 ${
                  isSelected
                    ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                    : 'bg-zinc-850 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                <span>Lv.{lvl}</span>
                {isConquered && <span className="text-[10px]">👑</span>}
              </button>
            );
          })}
        </div>

        {/* Subheader: Level Name & Online Refresh */}
        <div className="px-4 py-2.5 bg-zinc-850/60 border-b border-zinc-800/80 flex items-center justify-between shrink-0">
          <div>
            <span className="text-xs font-bold text-white block">{AI_NAMES[selectedLevel]}</span>
            <span className="text-[10px] text-zinc-400">실시간 유저 최단 수(Moves) 온라인 순위표</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-bold flex items-center gap-1">
              <Globe className="w-3 h-3 text-amber-400" />
              <span>실시간 온라인</span>
            </span>

            <button
              type="button"
              onClick={() => loadRankings(selectedLevel)}
              disabled={isLoading}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-300 transition-colors"
              title="새로고침"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Leaderboard List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {isLoading ? (
            <div className="py-12 text-center text-zinc-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
              <span>실시간 온라인 순위표를 불러오는 중입니다...</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs space-y-3">
              <Trophy className="w-10 h-10 mx-auto text-amber-500/40" />
              <div>
                <p className="font-bold text-zinc-300 text-sm">
                  아직 등록된 온라인 순위가 없습니다.
                </p>
                <p className="text-[11px] text-zinc-500 mt-1">
                  첫 번째로 승리하여 명예의 전당 1등에 이름을 올려보세요!
                </p>
              </div>

              {canSyncBetterLocalRecord && localRecord?.bestMoves && (
                <button
                  type="button"
                  disabled={isSubmittingScore}
                  onClick={handleUploadMyLocalRecord}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>
                    {isSubmittingScore
                      ? '등록 중...'
                      : `내 클리어 기록 (${localRecord.bestMoves}수) 온라인에 등록하기`}
                  </span>
                </button>
              )}
            </div>
          ) : (
            <>
              {canSyncBetterLocalRecord && localRecord?.bestMoves && (
                <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] text-emerald-200 font-semibold">
                    내 최고 기록({localRecord.bestMoves}수)을 온라인 순위에 반영할 수 있습니다.
                  </span>
                  <button
                    type="button"
                    disabled={isSubmittingScore}
                    onClick={handleUploadMyLocalRecord}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-[11px] font-black shrink-0"
                  >
                    {isSubmittingScore ? '등록 중...' : '온라인 반영'}
                  </button>
                </div>
              )}

              {entries.map((entry, index) => {
                const rank = index + 1;
                const isUser = entry.isCurrentUser || entry.userId === currentUser.id;
                const tier = getTier(entry.rating);

                return (
                  <div
                    key={entry.id || index}
                    className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                      isUser
                        ? 'bg-amber-950/40 border-amber-500/80 ring-1 ring-amber-500/50 shadow-md'
                        : rank === 1
                        ? 'bg-gradient-to-r from-yellow-950/30 to-zinc-850/80 border-yellow-500/40'
                        : rank === 2
                        ? 'bg-gradient-to-r from-slate-900/40 to-zinc-850/80 border-slate-400/40'
                        : rank === 3
                        ? 'bg-gradient-to-r from-amber-950/20 to-zinc-850/80 border-amber-700/40'
                        : 'bg-zinc-850/40 border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Rank Badge */}
                      <div className="w-7 text-center shrink-0">
                        {rank === 1 ? (
                          <span className="text-lg">🥇</span>
                        ) : rank === 2 ? (
                          <span className="text-lg">🥈</span>
                        ) : rank === 3 ? (
                          <span className="text-lg">🥉</span>
                        ) : (
                          <span className="font-mono font-bold text-xs text-zinc-400">
                            {rank}
                          </span>
                        )}
                      </div>

                      {/* Avatar */}
                      <AvatarIcon avatar={entry.avatar} color={entry.avatarColor} size="sm" />

                      {/* Nickname & Tier */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold truncate ${isUser ? 'text-amber-300' : 'text-zinc-200'}`}>
                            {entry.nickname}
                          </span>
                          {isUser && (
                            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-zinc-950 text-[9px] font-black shrink-0">
                              나
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                          <span className={tier.textColor}>{tier.name}</span>
                          <span>·</span>
                          <span className="font-mono">{entry.rating} Elo</span>
                        </div>
                      </div>
                    </div>

                    {/* Score & Moves */}
                    <div className="text-right shrink-0">
                      <div className="font-mono text-xs font-bold text-emerald-400">
                        {entry.moves}수 <span className="text-[10px] text-zinc-400">승리</span>
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        {entry.timeSec}초 · {entry.date}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Bottom Current User Sticky Footer */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-950/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">내 온라인 순위:</span>
            {userRankIndex !== -1 ? (
              <strong className="text-xs text-amber-300 font-mono">
                {userRankIndex + 1}위 ({entries[userRankIndex].moves}수 승리)
              </strong>
            ) : currentUser.levelRecords[selectedLevel]?.conquered ? (
              <span className="text-xs text-emerald-400 font-bold">클리어 완료 (미등록)</span>
            ) : (
              <span className="text-xs text-zinc-500">Lv.{selectedLevel} 미정복</span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
