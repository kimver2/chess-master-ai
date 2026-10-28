import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Play,
  RotateCcw,
} from 'lucide-react';
import { soundManager } from '../utils/audio';

export interface TourStep {
  targetKey: string; // matches data-tour="key"
  title: string;
  badge: string;
  icon: string;
  description: string;
  details: string[];
}

export const TOUR_STEPS: TourStep[] = [
  {
    targetKey: 'profile-badge',
    title: '내 프로필 & 체스 Elo 티어',
    badge: '플레이어 랭크',
    icon: '👑',
    description: '내 닉네임과 기물 아바타를 커스텀하고, 대국에서 승리해 비기너부터 그랜드마스터까지 티어를 올려보세요!',
    details: [
      '6종 체스 기물 아바타 및 6가지 보석 테마 색상 커스터마이징',
      'AI 및 1:1 온라인 대국 결과에 따른 실시간 Elo 레이팅 반영',
      'AI 난이도별(Lv.1~Lv.10) 정복 훈장 및 내 기보 보관함(PGN 공유)',
    ],
  },
  {
    targetKey: 'ranking-button',
    title: '명예의 전당 & 실시간 온라인 랭킹',
    badge: '글로벌 순위표',
    icon: '🏆',
    description: '각 AI 난이도를 가장 적은 수(Moves)로 격파한 명예의 전당입니다. 파이어베이스로 전 세계 유저와 실시간 경쟁하세요.',
    details: [
      'AI Lv.1~Lv.10 레벨별 최단 수(Moves) 명예의 전당 순위표',
      '전 세계 유저 실시간 온라인 랭킹 & 닉네임·최고 기록 자동 동기화',
    ],
  },
  {
    targetKey: 'opponent-bar',
    title: '상대 AI 정보 & 기물 획득 현황',
    badge: '스톡피쉬 AI',
    icon: '🤖',
    description: '스톡피쉬 AI의 레벨과 남은 시간을 확인하세요. 서로 잡은 기물과 폰 점수 차이가 실시간으로 계산됩니다.',
    details: [
      '난이도 설정(초심자 Lv.1 ~ 최고봉 Lv.10) 및 2초 숙고 착수',
      '획득한 기물 아이콘 및 유불리 점수(+/-) 실시간 집계',
    ],
  },
  {
    targetKey: 'opening-banner',
    title: '실시간 오프닝 감지 & 백과사전',
    badge: '오프닝 가이드',
    icon: '📖',
    description: '대국 중 두는 수에 따라 현재 오프닝을 실시간 감지하며, 탭하면 50개 이상의 오프닝 백과사전이 열립니다.',
    details: [
      '실시간 ECO 코드 및 공식 오프닝 명칭 자동 감지',
      '유명 오프닝 선택 시 단계별 맞춤형 가이드 대국 지원',
    ],
  },
  {
    targetKey: 'chessboard',
    title: '3D 메탈 체스판 & 드래그 착수',
    badge: '인터랙티브 보드',
    icon: '♟️',
    description: '고품질 3D 메탈릭 스틸 기물과 대리석 보드에서 기물을 탭하거나 손가락으로 드래그하여 부드럽게 착수할 수 있습니다.',
    details: [
      '탭 이동 & 드래그 앤 드롭 이동 + 부드러운 기물 슬라이딩 연출',
      '착수 가능 위치 안내, 체크 경고 및 대국 중 자동 저장·이어하기 지원',
    ],
  },
  {
    targetKey: 'eval-stepper',
    title: '형세 평가 바 & 이전 수 탐색기',
    badge: '전략 & 수 탐색',
    icon: '📊',
    description: '실시간 유불리 형세 바를 토글할 수 있으며, 대국 중에도 이전 수들을 자유롭게 돌려볼 수 있습니다.',
    details: [
      '[형세 바 ON/OFF]: 스톡피쉬의 판세 분석 막대 실시간 토글',
      '[|◀, ◀, ▶, ▶|]: 실시간 대국을 유지한 채 과거 수순 안전 탐색',
    ],
  },
  {
    targetKey: 'player-bar',
    title: '내 프로필 & 제한 시간',
    badge: '플레이어 현황',
    icon: '👤',
    description: '현재 내 차례인지 확인하고, 남은 시간과 내가 잡은 상대 기물을 한눈에 파악합니다.',
    details: [
      '내 턴일 때 시간 카운트다운 및 활성화 테두리 강조',
      '상대 기물을 획득할 때마다 실시간 업데이트',
    ],
  },
  {
    targetKey: 'action-controls',
    title: '힌트 · 실수 방지 컨트롤 · 정밀 복기',
    badge: '도움 & 복기 훈련',
    icon: '💡',
    description: '막힐 땐 💡 힌트를 받고, 대국 후에는 형세 변화 그래프와 실수 다시 두기 훈련으로 실력을 키우세요.',
    details: [
      '[💡 힌트 / 무르기 / 실수 방지 확인창]: 안전한 대국 제어',
      '[정밀 복기]: 형세 그래프 탐색 & 실수 장면 직접 다시 두어보기',
    ],
  },
  {
    targetKey: 'bottom-tabs',
    title: '1:1 PVP 대전 & 데일리/퍼즐 러시',
    badge: '다양한 게임 모드',
    icon: '👥',
    description: '친구와의 1:1 온라인 대전, 데일리 퍼즐 & 3분 퍼즐 러시, 엔드게임 50선 훈련을 자유롭게 즐기세요!',
    details: [
      '1:1 대전: 제한 시간, 무승부 제안, 재대결, 마주보기 기물 회전 지원',
      '전술 퍼즐: 오늘의 데일리 퍼즐(연속 출석) & 3분 퍼즐 러시 타임어택',
      '엔드게임 50: 퀸, 룩, 비숍 등 실전 메이트 기술 마스터',
    ],
  },
];

interface FeatureTourGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export const FeatureTourGuide: React.FC<FeatureTourGuideProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = TOUR_STEPS[currentStep];

  // Measure and update target rect
  const updateTargetRect = useCallback(() => {
    if (!isOpen || !step) return;
    const el = document.querySelector(`[data-tour="${step.targetKey}"]`);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [isOpen, step]);

  useEffect(() => {
    if (isOpen) {
      updateTargetRect();
      const timer = setTimeout(updateTargetRect, 60);
      window.addEventListener('resize', updateTargetRect);
      window.addEventListener('scroll', updateTargetRect);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', updateTargetRect);
        window.removeEventListener('scroll', updateTargetRect);
      };
    }
  }, [isOpen, currentStep, updateTargetRect]);

  const handleNext = () => {
    soundManager.move();
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    soundManager.move();
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleFinish = () => {
    try {
      localStorage.setItem('chess_feature_tour_completed', 'true');
    } catch {}
    if (onComplete) onComplete();
    onClose();
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'Escape') {
        handleFinish();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, currentStep]);

  if (!isOpen) return null;

  // Determine card vertical position relative to target
  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const isTargetInUpperHalf = targetRect ? targetRect.top + targetRect.height / 2 < windowHeight * 0.52 : true;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none animate-fadeIn pointer-events-auto">
      {/* Target Spotlight Cutout & Glowing Ring */}
      {targetRect && (
        <div
          className="fixed pointer-events-none transition-all duration-300 ease-out z-10 rounded-2xl"
          style={{
            top: `${Math.max(4, targetRect.top - 4)}px`,
            left: `${Math.max(4, targetRect.left - 4)}px`,
            width: `${targetRect.width + 8}px`,
            height: `${targetRect.height + 8}px`,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.78)',
          }}
        >
          {/* Animated Glowing Ring around target */}
          <div className="absolute inset-0 rounded-2xl ring-3 ring-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.5)] animate-pulse" />
        </div>
      )}

      {/* Fallback dark overlay if targetRect is not available */}
      {!targetRect && <div className="fixed inset-0 bg-black/80 backdrop-blur-xs" />}

      {/* Floating Tour Guide Card */}
      <div
        className={`fixed left-4 right-4 max-w-sm mx-auto z-20 transition-all duration-300 ease-out ${
          isTargetInUpperHalf
            ? 'bottom-6 sm:bottom-8'
            : 'top-6 sm:top-10'
        }`}
      >
        <div className="bg-zinc-900 border border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-md text-zinc-100 flex flex-col gap-3">
          {/* Card Header: Step Pill & Close */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold">
                {currentStep + 1} / {TOUR_STEPS.length}
              </span>
              <span className="text-[11px] font-semibold text-zinc-400">
                {step.badge}
              </span>
            </div>

            <button
              type="button"
              onClick={handleFinish}
              className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded-md hover:bg-zinc-800 transition-colors flex items-center gap-1 cursor-pointer"
              title="가이드 건너뛰기"
            >
              <span>건너뛰기</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Title & Description */}
          <div className="space-y-1.5">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <span className="text-lg">{step.icon}</span>
              <span>{step.title}</span>
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Key Details Bullets */}
          {step.details && step.details.length > 0 && (
            <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-1">
              {step.details.map((detail, dIdx) => (
                <div key={dIdx} className="flex items-start gap-1.5 text-[11px] text-zinc-300 leading-snug">
                  <CheckCircle2 className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                  <span>{detail}</span>
                </div>
              ))}
            </div>
          )}

          {/* Navigation Controls & Progress Dots */}
          <div className="flex items-center justify-between pt-1">
            {/* Dots */}
            <div className="flex items-center gap-1">
              {TOUR_STEPS.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentStep(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === currentStep
                      ? 'w-5 bg-amber-400'
                      : 'w-1.5 bg-zinc-700 hover:bg-zinc-500'
                  }`}
                  title={`스텝 ${idx + 1}로 이동`}
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-300 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>이전</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 text-xs font-black flex items-center gap-1 shadow-md shadow-amber-500/25 transition-all cursor-pointer"
              >
                <span>
                  {currentStep === TOUR_STEPS.length - 1 ? '대국 시작하기 ♟️' : '다음'}
                </span>
                {currentStep < TOUR_STEPS.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
