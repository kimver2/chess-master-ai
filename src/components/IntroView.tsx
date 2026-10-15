import React, { useRef } from 'react';
import { PlayerProfile, PlayerProfileId } from '../types/profile';
import { Crown, Camera, Sparkles, Swords, Trophy, Play } from 'lucide-react';

interface IntroViewProps {
  profiles: { [key in PlayerProfileId]: PlayerProfile };
  onSelectProfile: (id: PlayerProfileId) => void;
  onUpdatePhoto: (id: PlayerProfileId, photoUrl: string) => void;
}

export const IntroView: React.FC<IntroViewProps> = ({
  profiles,
  onSelectProfile,
  onUpdatePhoto,
}) => {
  const daegyeomFileInputRef = useRef<HTMLInputElement>(null);
  const mingyeomFileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    id: PlayerProfileId
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onUpdatePhoto(id, reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div
      className="flex flex-col h-full w-full max-w-md mx-auto bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100 px-5 justify-between overflow-y-auto"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
      }}
    >
      {/* Top Welcome Title */}
      <div className="text-center pt-2 space-y-2 shrink-0">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold tracking-wide">
          <Sparkles className="w-3.5 h-3.5" />
          <span>대겸이 & 민겸이의 체스 아카데미</span>
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-1.5">
          <span>체스 마스터</span>
          <Crown className="w-6 h-6 text-amber-400 fill-amber-400" />
        </h1>
        <p className="text-xs text-zinc-400">
          오늘 체스판 위에서 멋진 전략을 펼칠 선수를 선택해 주세요!
        </p>
      </div>

      {/* Profiles Cards */}
      <div className="my-auto py-6 space-y-4">
        {/* Daegyeom Card */}
        <div className="relative group bg-zinc-900/90 hover:bg-zinc-850 border-2 border-amber-500/40 hover:border-amber-400 rounded-3xl p-4 transition-all shadow-xl shadow-amber-950/20">
          <div className="flex items-center gap-4">
            {/* Photo Avatar */}
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-amber-400/80 bg-gradient-to-br from-amber-600 to-amber-900 shadow-lg flex items-center justify-center">
                {profiles.daegyeom.photoUrl ? (
                  <img
                    src={profiles.daegyeom.photoUrl}
                    alt="대겸이"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-3xl select-none">👑</div>
                )}
              </div>
              <button
                onClick={() => daegyeomFileInputRef.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/50 shadow"
                title="사진 변경"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input
                ref={daegyeomFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(e, 'daegyeom')}
              />
            </div>

            {/* Profile Info */}
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-extrabold text-white flex items-center gap-1.5">
                  대겸이
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Master
                  </span>
                </h3>
              </div>
              <p className="text-xs text-amber-200/80 font-medium">
                {profiles.daegyeom.tagline}
              </p>
              <div className="flex items-center gap-3 text-[11px] text-zinc-400 pt-0.5">
                <span className="flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  <strong>{profiles.daegyeom.wins}승</strong> {profiles.daegyeom.losses}패
                </span>
                <span>총 {profiles.daegyeom.gamesPlayed}게임</span>
              </div>
            </div>
          </div>

          {/* Select Button */}
          <button
            onClick={() => onSelectProfile('daegyeom')}
            className="w-full mt-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-98 text-zinc-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/40"
          >
            <Play className="w-4 h-4 fill-zinc-950" />
            대겸이로 플레이하기
          </button>
        </div>

        {/* Mingyeom Card */}
        <div className="relative group bg-zinc-900/90 hover:bg-zinc-850 border-2 border-sky-500/40 hover:border-sky-400 rounded-3xl p-4 transition-all shadow-xl shadow-sky-950/20">
          <div className="flex items-center gap-4">
            {/* Photo Avatar */}
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-sky-400/80 bg-gradient-to-br from-sky-600 to-sky-900 shadow-lg flex items-center justify-center">
                {profiles.mingyeom.photoUrl ? (
                  <img
                    src={profiles.mingyeom.photoUrl}
                    alt="민겸이"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-3xl select-none">⚡</div>
                )}
              </div>
              <button
                onClick={() => mingyeomFileInputRef.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-sky-300 border border-sky-500/50 shadow"
                title="사진 변경"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input
                ref={mingyeomFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(e, 'mingyeom')}
              />
            </div>

            {/* Profile Info */}
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-extrabold text-white flex items-center gap-1.5">
                  민겸이
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    Champion
                  </span>
                </h3>
              </div>
              <p className="text-xs text-sky-200/80 font-medium">
                {profiles.mingyeom.tagline}
              </p>
              <div className="flex items-center gap-3 text-[11px] text-zinc-400 pt-0.5">
                <span className="flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-sky-400" />
                  <strong>{profiles.mingyeom.wins}승</strong> {profiles.mingyeom.losses}패
                </span>
                <span>총 {profiles.mingyeom.gamesPlayed}게임</span>
              </div>
            </div>
          </div>

          {/* Select Button */}
          <button
            onClick={() => onSelectProfile('mingyeom')}
            className="w-full mt-3 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 active:scale-98 text-zinc-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-sky-950/40"
          >
            <Play className="w-4 h-4 fill-zinc-950" />
            민겸이로 플레이하기
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center pb-2 shrink-0">
        <p className="text-[11px] text-zinc-500">
          💡 각 카드의 카메라 아이콘을 누르면 휴대폰 갤러리의 아들 사진으로 언제든 등록할 수 있습니다.
        </p>
      </div>
    </div>
  );
};
