import React from 'react';
import {
  Palette,
  Volume2,
  VolumeX,
  Smartphone,
  BarChart2,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import {
  BoardTheme,
  DifficultyLevel,
  PieceTheme,
  PlayerSide,
  TimeLimit,
} from '../types/chess';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isGameStarted: boolean;
  pieceTheme: PieceTheme;
  onPieceThemeChange: (t: PieceTheme) => void;
  boardTheme: BoardTheme;
  onBoardThemeChange: (b: BoardTheme) => void;
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
  hapticsEnabled: boolean;
  onToggleHaptics: (enabled: boolean) => void;
  showEvalBar: boolean;
  onToggleEvalBar: (enabled: boolean) => void;
  confirmMoveEnabled: boolean;
  onToggleConfirmMove: (enabled: boolean) => void;
  timeLimit: TimeLimit;
  onTimeLimitChange: (t: TimeLimit) => void;
  chosenSide: PlayerSide;
  onChosenSideChange: (s: PlayerSide) => void;
  difficulty: DifficultyLevel;
  onDifficultyChange: (d: DifficultyLevel) => void;
  onReplayTourGuide: () => void;
  onApplyAndStartGame: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isGameStarted,
  pieceTheme,
  onPieceThemeChange,
  boardTheme,
  onBoardThemeChange,
  soundEnabled,
  onToggleSound,
  hapticsEnabled,
  onToggleHaptics,
  showEvalBar,
  onToggleEvalBar,
  confirmMoveEnabled,
  onToggleConfirmMove,
  timeLimit,
  onTimeLimitChange,
  chosenSide,
  onChosenSideChange,
  difficulty,
  onDifficultyChange,
  onReplayTourGuide,
  onApplyAndStartGame,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl max-w-sm w-full space-y-4 max-h-[88vh] overflow-y-auto shadow-2xl">
        <h3 className="text-base font-bold text-zinc-100 border-b border-zinc-800 pb-2 flex items-center justify-between">
          <span>게임 환경 설정</span>
          <span className="text-[11px] text-zinc-500 font-normal">오프라인 완벽 지원</span>
        </h3>

        {/* Piece Theme Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-amber-400" />
            체스 기물 그래픽 (3D 리얼)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: '3d_staunton', label: '3D 프리미엄 우드', desc: '고급 원목 & 입체 섀도' },
              { id: '3d_wood', label: '3D 골든 래커', desc: '광택 목조 조각상' },
              { id: 'metal', label: '3D 메탈릭 스틸', desc: '세련된 크롬 금속' },
              { id: 'classic', label: '클래식 벡터', desc: '단정한 2D 플랫' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onPieceThemeChange(t.id as PieceTheme)}
                className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                  pieceTheme === t.id
                    ? 'bg-amber-500/15 border-amber-400 text-amber-300 ring-1 ring-amber-400/50'
                    : 'bg-zinc-800/80 border-zinc-700/80 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-zinc-950/70 flex items-center justify-center p-0.5 shrink-0 border border-zinc-700/50">
                  {t.id !== 'classic' ? (
                    <img
                      src={`/pieces/${t.id}/wn.png`}
                      alt=""
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-xs font-bold text-amber-200">♞</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold truncate">{t.label}</div>
                  <div className="text-[9px] text-zinc-400 truncate">{t.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Board Theme Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300">체스판 테마</label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'walnut', label: '월넛 원목' },
              { id: 'tournament', label: '토너먼트' },
              { id: 'marble', label: '대리석' },
              { id: 'dark_wood', label: '다크 흑단' },
              { id: 'classic', label: '클래식 플랫' },
            ].map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => onBoardThemeChange(b.id as BoardTheme)}
                className={`py-2 px-1 rounded-lg text-[11px] font-bold border transition-all text-center truncate ${
                  boardTheme === b.id
                    ? 'bg-amber-500 border-amber-400 text-zinc-950 shadow-sm'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-750'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Audio & Haptic Feedback */}
        <div className="space-y-1.5 pt-1 border-t border-zinc-800/80">
          <label className="text-xs font-semibold text-zinc-300">사운드 & 진동 피드백</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onToggleSound(!soundEnabled)}
              className={`py-2 px-2.5 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                soundEnabled
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              효과음 {soundEnabled ? '켜짐' : '꺼짐'}
            </button>

            <button
              type="button"
              onClick={() => onToggleHaptics(!hapticsEnabled)}
              className={`py-2 px-2.5 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                hapticsEnabled
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              진동 {hapticsEnabled ? '켜짐' : '꺼짐'}
            </button>
          </div>
        </div>

        {/* Real-time Evaluation Bar Setting */}
        <div className="space-y-1.5 pt-1 border-t border-zinc-800/80">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
              실시간 형세 평가 바 (Eval Bar)
            </label>
            <button
              type="button"
              onClick={() => onToggleEvalBar(!showEvalBar)}
              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                showEvalBar
                  ? 'bg-amber-500 border-amber-400 text-zinc-950 shadow-sm'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400'
              }`}
            >
              {showEvalBar ? '켜짐' : '꺼짐'}
            </button>
          </div>
          <p className="text-[10px] text-zinc-400 leading-tight">
            체스판 좌측에 스톡피쉬 엔진의 유불리 점수(+- 폰 우세)를 세로 막대로 실시간 표시합니다.
          </p>
        </div>

        {/* Move Confirmation (Touch Safety) Setting */}
        <div className="space-y-1.5 pt-1 border-t border-zinc-800/80">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              착수 확인 버튼 (터치 실수 방지)
            </label>
            <button
              type="button"
              data-testid="toggle-confirm-move-setting"
              onClick={() => onToggleConfirmMove(!confirmMoveEnabled)}
              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                confirmMoveEnabled
                  ? 'bg-emerald-500 border-emerald-400 text-zinc-950 shadow-sm'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400'
              }`}
            >
              {confirmMoveEnabled ? '켜짐' : '꺼짐'}
            </button>
          </div>
          <p className="text-[10px] text-zinc-400 leading-tight">
            켜면 기물을 옮길 때 [착수 확정 / 취소] 확인 바가 먼저 표시되어 모바일 오터치 실수를 방지합니다.
          </p>
        </div>

        {/* Time Control */}
        <div className="space-y-1.5 pt-1 border-t border-zinc-800/80">
          <label className="text-xs font-semibold text-zinc-300">대국 제한 시간</label>
          <div className="grid grid-cols-3 gap-2">
            {(['5m', '10m', 'unlimited'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onTimeLimitChange(t)}
                className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                  timeLimit === t
                    ? 'bg-amber-500 border-amber-400 text-zinc-950 shadow-sm'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                }`}
              >
                {t === '5m' ? '5분' : t === '10m' ? '10분' : '무제한'}
              </button>
            ))}
          </div>
        </div>

        {/* Side Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300">진영 선택</label>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'white', label: '백 (White)' },
                { id: 'black', label: '흑 (Black)' },
                { id: 'random', label: '랜덤' },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onChosenSideChange(s.id)}
                className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                  chosenSide === s.id
                    ? 'bg-amber-500 border-amber-400 text-zinc-950 shadow-sm'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty Slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
            <span>AI 난이도</span>
            <span className="text-amber-400 font-bold">
              Lv.{difficulty}{' '}
              {difficulty <= 3
                ? '(초급)'
                : difficulty <= 6
                ? '(중급)'
                : difficulty <= 8
                ? '(고급)'
                : '(마스터)'}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={difficulty}
            onChange={(e) => onDifficultyChange(parseInt(e.target.value, 10) as DifficultyLevel)}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-zinc-500">
            <span>1 (쉬움)</span>
            <span>5 (보통)</span>
            <span>10 (최상)</span>
          </div>
        </div>

        {/* Tour Guide Replay */}
        <div className="pt-1 border-t border-zinc-800/80">
          <button
            type="button"
            onClick={onReplayTourGuide}
            className="w-full py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-amber-300 text-xs font-bold flex items-center justify-center gap-2 border border-zinc-700/80 transition-all active:scale-98 cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>앱 기능 가이드 (튜토리얼) 다시 보기</span>
          </button>
        </div>

        {/* Legal & Open Source Info */}
        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400 px-1">
          <a
            href="/privacy.html"
            target="_blank"
            rel="noreferrer"
            className="hover:text-amber-300 underline underline-offset-2 flex items-center gap-1 transition-colors"
            title="개인정보처리방침 열기"
          >
            <span>개인정보처리방침</span>
            <span className="text-[10px]">↗</span>
          </a>
          <span className="text-zinc-500 font-mono text-[10px]">Stockfish GPL v3</span>
        </div>

        {/* Start Button */}
        <div className="pt-2 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={onApplyAndStartGame}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 text-zinc-950 text-xs font-bold shadow-md shadow-amber-950/30"
          >
            {!isGameStarted ? '설정 적용 후 게임 시작' : '설정 적용 후 새 게임'}
          </button>
        </div>
      </div>
    </div>
  );
};
