import React, { useState } from 'react';
import {
  X,
  Trophy,
  Award,
  Flame,
  CheckCircle2,
  Lock,
  Edit2,
  Check,
  TrendingUp,
  Sparkles,
  FileText,
} from 'lucide-react';
import { UserProfile, AvatarType, AvatarColor, getTier, TIERS } from '../types/profile';
import { saveUserProfile, AI_NAMES, AI_RATINGS, ALL_AI_LEVELS } from '../services/storageService';
import { syncUserProfileToOnlineRankings } from '../services/firebaseService';
import { AvatarIcon } from './AvatarIcon';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  onSelectLevelToPlay?: (level: number) => void;
  onOpenRanking?: () => void;
  onOpenArchive?: () => void;
}

const AVATAR_OPTIONS: Array<{ type: AvatarType; label: string }> = [
  { type: 'knight', label: '나이트' },
  { type: 'king', label: '킹' },
  { type: 'queen', label: '퀸' },
  { type: 'rook', label: '룩' },
  { type: 'bishop', label: '비숍' },
  { type: 'pawn', label: '폰' },
];

const COLOR_OPTIONS: Array<{ color: AvatarColor; label: string; bg: string }> = [
  { color: 'amber', label: '골드', bg: 'bg-amber-500' },
  { color: 'emerald', label: '에메랄드', bg: 'bg-emerald-500' },
  { color: 'blue', label: '사파이어', bg: 'bg-blue-500' },
  { color: 'purple', label: '아메지스트', bg: 'bg-purple-500' },
  { color: 'rose', label: '루비', bg: 'bg-rose-500' },
  { color: 'cyan', label: '다이아', bg: 'bg-cyan-500' },
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdateProfile,
  onSelectLevelToPlay,
  onOpenRanking,
  onOpenArchive,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(profile.nickname);
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarType>(profile.avatar);
  const [selectedColor, setSelectedColor] = useState<AvatarColor>(profile.avatarColor);
  const [isCustomizing, setIsCustomizing] = useState(false);

  if (!isOpen) return null;

  const tier = getTier(profile.rating);
  const nextTierIndex = TIERS.findIndex((t) => t.name === tier.name) + 1;
  const nextTier = nextTierIndex < TIERS.length ? TIERS[nextTierIndex] : null;

  const currentTierFloor = tier.minRating;
  const currentTierCeil = nextTier ? nextTier.minRating : tier.maxRating;
  const tierProgress = nextTier
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(((profile.rating - currentTierFloor) / (currentTierCeil - currentTierFloor)) * 100)
        )
      )
    : 100;

  const totalGames = profile.stats.totalGames;
  const winRate =
    totalGames > 0 ? Math.round((profile.stats.wins / totalGames) * 100) : 0;

  const handleSaveNickname = () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed) return;
    const updated: UserProfile = {
      ...profile,
      nickname: trimmed,
      avatar: selectedAvatar,
      avatarColor: selectedColor,
    };
    onUpdateProfile(updated);
    saveUserProfile(updated);
    syncUserProfileToOnlineRankings(updated).catch(console.warn);
    setIsEditingName(false);
  };

  const handleSaveAvatar = (newAvatar: AvatarType, newColor: AvatarColor) => {
    setSelectedAvatar(newAvatar);
    setSelectedColor(newColor);
    const updated: UserProfile = {
      ...profile,
      avatar: newAvatar,
      avatarColor: newColor,
    };
    onUpdateProfile(updated);
    saveUserProfile(updated);
    syncUserProfileToOnlineRankings(updated).catch(console.warn);
  };

  const conqueredCount = ALL_AI_LEVELS.filter((lvl) => profile.levelRecords[lvl]?.conquered).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70 shrink-0">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">플레이어 프로필</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Profile Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-zinc-850 to-zinc-900 border border-zinc-750 shadow-inner">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative group cursor-pointer" onClick={() => setIsCustomizing(!isCustomizing)}>
                  <AvatarIcon avatar={profile.avatar} color={profile.avatarColor} size="lg" />
                  <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-zinc-800 border border-zinc-600 text-amber-300">
                    <Edit2 className="w-2.5 h-2.5" />
                  </span>
                </div>

                <div className="min-w-0">
                  {isEditingName ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        maxLength={12}
                        value={nicknameInput}
                        onChange={(e) => setNicknameInput(e.target.value)}
                        className="bg-zinc-950 border border-amber-500/80 rounded-lg px-2 py-0.5 text-sm text-white font-bold w-32 focus:outline-hidden"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveNickname}
                        className="p-1 rounded-md bg-amber-500 text-zinc-950 hover:bg-amber-400"
                      >
                        <Check className="w-3.5 h-3.5 font-bold" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-base truncate">{profile.nickname}</h3>
                      <button
                        onClick={() => {
                          setNicknameInput(profile.nickname);
                          setIsEditingName(true);
                        }}
                        className="text-zinc-400 hover:text-amber-400 transition-colors"
                        title="닉네임 변경"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${tier.bgColor} ${tier.textColor} border ${tier.borderColor}`}
                    >
                      <span>{tier.icon}</span>
                      <span>{tier.name}</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-300">
                      {profile.rating} <span className="text-[10px] text-zinc-400">Elo</span>
                    </span>
                  </div>
                </div>
              </div>

              {onOpenRanking && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenRanking();
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1 shrink-0 transition-colors"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>랭킹 순위표</span>
                </button>
              )}
            </div>

            {/* Tier Progress Bar */}
            <div className="mt-3.5 pt-3 border-t border-zinc-800/80 space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-zinc-400">
                  다음 티어: <strong className="text-zinc-200">{nextTier ? nextTier.name : '최고 티어 도달!'}</strong>
                </span>
                <span className="text-zinc-400 font-mono">
                  {nextTier ? `${profile.rating} / ${nextTier.minRating} Elo` : 'MAX'}
                </span>
              </div>
              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
                  style={{ width: `${tierProgress}%` }}
                />
              </div>
            </div>

            {/* Avatar & Color Customizer Drawer */}
            {isCustomizing && (
              <div className="mt-3 pt-3 border-t border-zinc-800 space-y-3 animate-in fade-in">
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1.5">
                    기물 아바타 선택
                  </label>
                  <div className="grid grid-cols-6 gap-1.5">
                    {AVATAR_OPTIONS.map((opt) => (
                      <button
                        key={opt.type}
                        type="button"
                        onClick={() => handleSaveAvatar(opt.type, selectedColor)}
                        className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                          selectedAvatar === opt.type
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <AvatarIcon avatar={opt.type} color={selectedColor} size="sm" />
                        <span className="text-[10px]">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1.5">
                    테마 색상 선택
                  </label>
                  <div className="flex items-center gap-2">
                    {COLOR_OPTIONS.map((col) => (
                      <button
                        key={col.color}
                        type="button"
                        onClick={() => handleSaveAvatar(selectedAvatar, col.color)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${col.bg} ${
                          selectedColor === col.color ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110' : 'opacity-70 hover:opacity-100'
                        }`}
                        title={col.label}
                      >
                        {selectedColor === col.color && <Check className="w-3.5 h-3.5 text-zinc-950 font-bold" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-2">
            <div className="p-2.5 rounded-xl bg-zinc-850 border border-zinc-800 text-center">
              <span className="text-[10px] text-zinc-400 block">총 대국</span>
              <strong className="text-sm font-bold text-white">{totalGames}</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-850 border border-zinc-800 text-center">
              <span className="text-[10px] text-emerald-400 block">승리</span>
              <strong className="text-sm font-bold text-emerald-300">{profile.stats.wins}</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-850 border border-zinc-800 text-center">
              <span className="text-[10px] text-amber-400 block">승률</span>
              <strong className="text-sm font-bold text-amber-300">{winRate}%</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-850 border border-zinc-800 text-center">
              <span className="text-[10px] text-rose-400 flex items-center justify-center gap-0.5">
                <Flame className="w-3 h-3 text-rose-500 fill-rose-500" /> 연승
              </span>
              <strong className="text-sm font-bold text-rose-300">
                {profile.stats.streak} <span className="text-[9px] text-zinc-500 font-normal">(최대 {profile.stats.maxStreak})</span>
              </strong>
            </div>
          </div>

          {/* Archive Quick Button */}
          {onOpenArchive && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenArchive();
              }}
              className="w-full py-2.5 px-3.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 text-zinc-200 text-xs font-bold flex items-center justify-between transition-all active:scale-98"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>내 대국 기보 보관함 & PGN 공유</span>
              </span>
              <span className="text-[11px] text-emerald-400 font-bold">열기 →</span>
            </button>
          )}

          {/* AI Level Conquest Section (Lv.1 to Lv.10) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-zinc-200">
                  AI 난이도별 정복 훈장 ({conqueredCount}/10)
                </h4>
              </div>
              <span className="text-[11px] text-zinc-400">최단 수 / 최단 시간 기록</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ALL_AI_LEVELS.map((lvl) => {
                const rec = profile.levelRecords[lvl] || {
                  conquered: false,
                  wins: 0,
                  losses: 0,
                  bestMoves: null,
                  bestTimeSec: null,
                };
                const aiName = AI_NAMES[lvl];
                const aiElo = AI_RATINGS[lvl];

                return (
                  <div
                    key={lvl}
                    className={`p-2.5 rounded-xl border transition-all ${
                      rec.conquered
                        ? 'bg-amber-950/20 border-amber-500/40'
                        : 'bg-zinc-850/60 border-zinc-800 opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                            rec.conquered
                              ? 'bg-amber-500 text-zinc-950 shadow-xs'
                              : 'bg-zinc-800 text-zinc-500'
                          }`}
                        >
                          {rec.conquered ? <CheckCircle2 className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-zinc-200">{aiName}</div>
                          <div className="text-[10px] text-zinc-400 font-mono">레이팅 ~{aiElo} Elo</div>
                        </div>
                      </div>

                      {onSelectLevelToPlay && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onSelectLevelToPlay(lvl);
                          }}
                          className="px-2 py-1 rounded-md bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-300 text-[10px] font-bold transition-all"
                        >
                          대국하기
                        </button>
                      )}
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                      <span>전적: {rec.wins}승 {rec.losses}패</span>
                      {rec.bestMoves ? (
                        <span className="text-amber-300 font-bold">
                          최고: {rec.bestMoves}수 ({rec.bestTimeSec}초)
                        </span>
                      ) : (
                        <span className="text-zinc-600">미달성</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-950 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
