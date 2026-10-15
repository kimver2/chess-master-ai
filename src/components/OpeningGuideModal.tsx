import React, { useState, useMemo } from 'react';
import {
  ChessOpening,
  OPENINGS,
  OPENING_CATEGORIES,
  OpeningCategory,
} from '../data/openings';
import {
  X,
  Search,
  BookOpen,
  Sparkles,
  Swords,
  ChevronRight,
  Target,
  CheckCircle2,
  Info,
} from 'lucide-react';

interface OpeningGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGuidedOpening: (opening: ChessOpening) => void;
  currentOpening?: ChessOpening | null;
}

export const OpeningGuideModal: React.FC<OpeningGuideModalProps> = ({
  isOpen,
  onClose,
  onStartGuidedOpening,
  currentOpening,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<OpeningCategory | 'all' | 'famous'>('famous');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOpeningEco, setExpandedOpeningEco] = useState<string | null>(null);

  // Filter openings by category and search query
  const filteredOpenings = useMemo(() => {
    let list = OPENINGS;

    if (selectedCategory === 'famous') {
      list = list.filter((o) => o.isFamous);
    } else if (selectedCategory !== 'all') {
      list = list.filter((o) => o.category === selectedCategory);
    }

    if (!searchQuery.trim()) return list;

    const query = searchQuery.trim().toLowerCase();
    return list.filter(
      (o) =>
        o.nameKo.toLowerCase().includes(query) ||
        o.nameEn.toLowerCase().includes(query) ||
        o.eco.toLowerCase().includes(query) ||
        o.moves.some((m) => m.toLowerCase().includes(query)) ||
        (o.descriptionKo && o.descriptionKo.toLowerCase().includes(query))
    );
  }, [selectedCategory, searchQuery]);

  if (!isOpen) return null;

  // Format SAN moves into standard pair notation: "1. e4 e5  2. Nf3 Nc6 ..."
  const formatMovePairs = (moves: string[]): string[] => {
    const pairs: string[] = [];
    for (let i = 0; i < moves.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const whiteMove = moves[i];
      const blackMove = moves[i + 1];
      if (blackMove) {
        pairs.push(`${moveNum}. ${whiteMove} ${blackMove}`);
      } else {
        pairs.push(`${moveNum}. ${whiteMove}`);
      }
    }
    return pairs;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-zinc-800 bg-zinc-900/95 sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                오프닝 가이드 & 백과사전
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  총 {OPENINGS.length}개
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                원하는 오프닝을 선택하고 단계별 가이드 대국을 체험해보세요
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Categories */}
        <div className="px-4 sm:px-6 py-3 border-b border-zinc-800/80 bg-zinc-950/60 flex flex-col gap-2.5 shrink-0">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="오프닝 명칭, ECO 코드 (예: 이탈리안, C50, Najdorf, 런던)..."
              className="w-full pl-9 pr-8 py-2 bg-zinc-900/90 border border-zinc-700 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 text-xs p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Chips Carousel */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 text-xs">
            {OPENING_CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full whitespace-nowrap font-medium text-xs transition-all flex items-center gap-1.5 shrink-0 ${
                    active
                      ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20'
                      : 'bg-zinc-800/90 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700/60'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.nameKo}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Opening Cards List */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
          {filteredOpenings.length === 0 ? (
            <div className="py-12 text-center text-zinc-400">
              <BookOpen className="w-10 h-10 mx-auto text-zinc-600 mb-2 opacity-50" />
              <p className="text-sm">검색 결과와 일치하는 오프닝이 없습니다.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="mt-3 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-amber-300 font-semibold"
              >
                전체 목록 보기
              </button>
            </div>
          ) : (
            filteredOpenings.map((opening) => {
              const openingKey = opening.eco + opening.nameEn;
              const isCurrent = currentOpening?.eco === opening.eco;
              const isExpanded = expandedOpeningEco === openingKey;
              const hasExplanations =
                opening.moveExplanationsKo && opening.moveExplanationsKo.length > 0;
              const hasGoals = opening.keyGoalsKo && opening.keyGoalsKo.length > 0;

              return (
                <div
                  key={opening.eco + opening.nameEn}
                  className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                    isCurrent
                      ? 'bg-amber-950/20 border-amber-500/70 shadow-lg shadow-amber-500/5'
                      : 'bg-zinc-800/40 hover:bg-zinc-800/70 border-zinc-700/70'
                  }`}
                >
                  {/* Card Main Header */}
                  <div className="p-3.5 sm:p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-amber-300">
                            {opening.eco}
                          </span>
                          {opening.isFamous && (
                            <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300">
                              <Sparkles className="w-3 h-3 text-amber-400" />
                              추천 유명
                            </span>
                          )}
                          {opening.recommendedSide && (
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                                opening.recommendedSide === 'w'
                                  ? 'bg-zinc-100/10 text-zinc-200 border-zinc-500/40'
                                  : 'bg-zinc-900 text-zinc-300 border-zinc-600'
                              }`}
                            >
                              {opening.recommendedSide === 'w' ? '⚪ 백 추천' : '⚫ 흑 추천'}
                            </span>
                          )}
                          {isCurrent && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                              현재 대국 중
                            </span>
                          )}
                        </div>

                        <div className="pt-1">
                          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                            {opening.nameKo}
                            <span className="text-xs font-normal text-zinc-400 truncate">
                              ({opening.nameEn})
                            </span>
                          </h3>
                        </div>
                      </div>

                      {/* Action Button: Start Guided Match */}
                      <button
                        type="button"
                        onClick={() => onStartGuidedOpening(opening)}
                        className="shrink-0 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                        title="이 오프닝으로 가이드 대국 시작"
                      >
                        <Swords className="w-3.5 h-3.5" />
                        <span className="hidden xs:inline">가이드</span> 대국 시작
                      </button>
                    </div>

                    {/* Description */}
                    {opening.descriptionKo && (
                      <p className="mt-2 text-xs text-zinc-300 leading-relaxed">
                        {opening.descriptionKo}
                      </p>
                    )}

                    {/* Moves Preview Chips */}
                    <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-zinc-400 font-semibold mr-1">
                        주요 수순:
                      </span>
                      {formatMovePairs(opening.moves).map((pair, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-zinc-900/90 border border-zinc-700/60 font-mono text-[11px] text-zinc-300"
                        >
                          {pair}
                        </span>
                      ))}
                    </div>

                    {/* Strategic Key Goals (if available) */}
                    {hasGoals && (
                      <div className="mt-3 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
                          <Target className="w-3.5 h-3.5 text-amber-400" />
                          <span>핵심 전략 목표:</span>
                        </div>
                        <ul className="space-y-1 pl-1">
                          {opening.keyGoalsKo!.map((goal, gIdx) => (
                            <li
                              key={gIdx}
                              className="text-xs text-zinc-300 flex items-start gap-1.5 leading-snug"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{goal}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Move-by-Move Explanations Accordion Button */}
                    {hasExplanations && (
                      <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedOpeningEco(isExpanded ? null : openingKey)
                          }
                          className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium transition-colors"
                        >
                          <Info className="w-3.5 h-3.5" />
                          <span>
                            {isExpanded
                              ? '단계별 수 설명 접기'
                              : `단계별 수 설명 자세히 보기 (${opening.moveExplanationsKo!.length}단계)`}
                          </span>
                          <ChevronRight
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${
                              isExpanded ? 'rotate-90' : ''
                            }`}
                          />
                        </button>
                      </div>
                    )}

                    {/* Expanded Step-by-Step Move Explanations */}
                    {isExpanded && hasExplanations && (
                      <div className="mt-2.5 p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 space-y-2 text-xs animate-fadeIn">
                        <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                          수별 상세 해설 & 의도
                        </div>
                        <div className="space-y-1.5 divide-y divide-zinc-800/50">
                          {opening.moveExplanationsKo!.map((exp, stepIdx) => {
                            const [sanLabel, ...rest] = exp.split(':');
                            const detail = rest.join(':').trim();
                            return (
                              <div key={stepIdx} className="pt-1.5 first:pt-0 flex items-start gap-2">
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold text-[11px] shrink-0">
                                  {sanLabel}
                                </span>
                                <span className="text-zinc-300 text-xs leading-relaxed">
                                  {detail || exp}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info banner */}
        <div className="px-4 sm:px-6 py-2.5 border-t border-zinc-800 bg-zinc-950/90 flex items-center justify-between text-xs text-zinc-400 shrink-0">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>가이드 대국을 시작하면 화살표와 힌트로 한 수씩 배울 수 있습니다.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
