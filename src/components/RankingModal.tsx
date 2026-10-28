import React, { useState, useEffect } from 'react';
import {
  X,
  Trophy,
  Flame,
  Globe,
  Smartphone,
  Sparkles,
  RefreshCw,
  HelpCircle,
  KeyRound,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { UserProfile, LeaderboardEntry, getTier } from '../types/profile';
import { getLocalLadder, AI_NAMES } from '../services/storageService';
import {
  isFirebaseConfigured,
  fetchOnlineLeaderboard,
  saveCustomFirebaseConfig,
  getFirebaseConfig,
  FirebaseConfig,
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
  const [rankingMode, setRankingMode] = useState<'local' | 'online'>('local');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showConfigDrawer, setShowConfigDrawer] = useState<boolean>(false);

  // Firebase config input states
  const [apiKey, setApiKey] = useState('');
  const [projectId, setProjectId] = useState('');
  const [appId, setAppId] = useState('');
  const [configSaved, setConfigSaved] = useState(false);

  const hasFirebase = isFirebaseConfigured();

  useEffect(() => {
    if (isOpen) {
      if (hasFirebase) {
        setRankingMode('online');
      } else {
        setRankingMode('local');
      }
      loadRankings(selectedLevel, hasFirebase ? 'online' : 'local');

      const saved = getFirebaseConfig();
      if (saved) {
        setApiKey(saved.apiKey || '');
        setProjectId(saved.projectId || '');
        setAppId(saved.appId || '');
      }
    }
  }, [isOpen]);

  const loadRankings = async (lvl: number, mode: 'local' | 'online') => {
    setIsLoading(true);
    if (mode === 'online' && hasFirebase) {
      const onlineEntries = await fetchOnlineLeaderboard(lvl, currentUser.id);
      if (onlineEntries.length > 0) {
        setEntries(onlineEntries);
      } else {
        // Fallback to local if empty online list
        setEntries(getLocalLadder(lvl, currentUser));
      }
    } else {
      setEntries(getLocalLadder(lvl, currentUser));
    }
    setIsLoading(false);
  };

  const handleLevelChange = (lvl: number) => {
    setSelectedLevel(lvl);
    loadRankings(lvl, rankingMode);
  };

  const handleModeChange = (mode: 'local' | 'online') => {
    setRankingMode(mode);
    loadRankings(selectedLevel, mode);
  };

  const handleSaveFirebaseConfig = () => {
    if (!apiKey || !projectId) return;
    const cfg: FirebaseConfig = {
      apiKey: apiKey.trim(),
      authDomain: `${projectId.trim()}.firebaseapp.com`,
      projectId: projectId.trim(),
      appId: appId.trim() || 'app',
    };
    saveCustomFirebaseConfig(cfg);
    setConfigSaved(true);
    setTimeout(() => {
      setConfigSaved(false);
      setShowConfigDrawer(false);
      setRankingMode('online');
      loadRankings(selectedLevel, 'online');
    }, 1200);
  };

  if (!isOpen) return null;

  const userRankIndex = entries.findIndex((e) => e.isCurrentUser || e.userId === currentUser.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80 shrink-0">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">명예의 전당 & AI 랭킹</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Level Tabs (Lv.1 to Lv.8) */}
        <div className="p-2 bg-zinc-950/40 border-b border-zinc-800 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((lvl) => {
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

        {/* Subheader: Mode Toggle & Level Name */}
        <div className="px-4 py-2.5 bg-zinc-850/60 border-b border-zinc-800/80 flex items-center justify-between shrink-0">
          <div>
            <span className="text-xs font-bold text-white block">{AI_NAMES[selectedLevel]}</span>
            <span className="text-[10px] text-zinc-400">클리어 최단 수(Moves) 순위표</span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Mode Switch: Online vs Local */}
            <div className="flex items-center bg-zinc-900 p-0.5 rounded-lg border border-zinc-750 text-[11px]">
              <button
                type="button"
                onClick={() => handleModeChange('local')}
                className={`px-2 py-1 rounded-md font-bold flex items-center gap-1 transition-all ${
                  rankingMode === 'local'
                    ? 'bg-zinc-700 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="로컬 AI 래더 랭킹"
              >
                <Smartphone className="w-3 h-3" />
                <span>래더</span>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('online')}
                className={`px-2 py-1 rounded-md font-bold flex items-center gap-1 transition-all ${
                  rankingMode === 'online'
                    ? 'bg-amber-500 text-zinc-950 shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="실시간 온라인 랭킹 (Firebase)"
              >
                <Globe className="w-3 h-3" />
                <span>온라인</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => loadRankings(selectedLevel, rankingMode)}
              disabled={isLoading}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-300 transition-colors"
              title="새로고침"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Optional Firebase Banner / Collapsible */}
        {rankingMode === 'online' && !hasFirebase && (
          <div className="px-4 py-2.5 bg-amber-950/30 border-b border-amber-500/30 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-amber-200">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>구글 Firebase 무료 DB를 연결하면 실시간 온라인 순위표가 활성화됩니다!</span>
              </div>
              <button
                onClick={() => setShowConfigDrawer(!showConfigDrawer)}
                className="text-[11px] font-bold text-amber-400 hover:underline flex items-center gap-0.5 shrink-0 ml-2"
              >
                {showConfigDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>{showConfigDrawer ? '접기' : '연동 설정'}</span>
              </button>
            </div>

            {showConfigDrawer && (
              <div className="mt-2.5 pt-2 border-t border-amber-500/20 space-y-2 text-xs">
                <p className="text-[11px] text-zinc-300">
                  Firebase 콘솔에서 생성한 무료 프로젝트의 API Key와 Project ID를 넣으시면 즉시 전 세계 유저와 실시간 랭킹이 공유됩니다.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="API Key (예: AIzaSy...)"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white"
                  />
                  <input
                    type="text"
                    placeholder="Project ID (예: my-chess-app)"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleSaveFirebaseConfig}
                    className="px-3 py-1 rounded-lg bg-amber-500 text-zinc-950 font-bold text-xs flex items-center gap-1"
                  >
                    {configSaved ? <Check className="w-3 h-3" /> : <KeyRound className="w-3 h-3" />}
                    <span>{configSaved ? '저장 완료!' : 'Firebase 키 저장'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Leaderboard List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {isLoading ? (
            <div className="py-12 text-center text-zinc-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
              <span>순위표를 불러오는 중입니다...</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs space-y-2">
              <Trophy className="w-8 h-8 mx-auto text-zinc-600 opacity-50" />
              <p>아직 이 난이도의 클리어 기록이 없습니다.</p>
              <p className="text-[11px] text-zinc-600">첫 번째로 승리하여 명예의 전당에 이름을 올려보세요!</p>
            </div>
          ) : (
            entries.map((entry, index) => {
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
            })
          )}
        </div>

        {/* Bottom Current User Sticky Footer */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-950/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">내 현재 순위:</span>
            {userRankIndex !== -1 ? (
              <strong className="text-xs text-amber-300 font-mono">
                {userRankIndex + 1}위 ({entries[userRankIndex].moves}수 승리)
              </strong>
            ) : currentUser.levelRecords[selectedLevel]?.conquered ? (
              <span className="text-xs text-emerald-400 font-bold">클리어 완료</span>
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
