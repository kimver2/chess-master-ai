import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { ChessBoard, BoardArrow } from './ChessBoard';
import { PieceTheme, BoardTheme } from '../types/chess';
import { TACTICS_PUZZLES, TacticsPuzzle, PuzzleDifficulty } from '../data/puzzles';
import { soundManager } from '../utils/audio';
import {
  Sparkles,
  RotateCcw,
  Lightbulb,
  CheckCircle,
  ArrowLeft,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Trophy,
  Zap,
} from 'lucide-react';

interface PuzzleViewProps {
  pieceTheme?: PieceTheme;
  boardTheme?: BoardTheme;
}

export const PuzzleView: React.FC<PuzzleViewProps> = ({
  pieceTheme = 'metal',
  boardTheme = 'marble',
}) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | PuzzleDifficulty>('all');
  const [activePuzzle, setActivePuzzle] = useState<TacticsPuzzle | null>(null);

  // Puzzle gameplay state
  const [chess, setChess] = useState<Chess | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [feedbackType, setFeedbackType] = useState<'info' | 'success' | 'error'>('info');
  const [showHint, setShowHint] = useState<boolean>(false);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);

  // Cleared puzzle IDs tracked in localStorage
  const [clearedIds, setClearedIds] = useState<Set<number>>(() => {
    const set = new Set<number>();
    TACTICS_PUZZLES.forEach((p) => {
      if (localStorage.getItem(`chess_puzzle_cleared_${p.id}`) === 'true') {
        set.add(p.id);
      }
    });
    return set;
  });

  const filteredPuzzles = TACTICS_PUZZLES.filter(
    (p) => selectedDifficulty === 'all' || p.difficulty === selectedDifficulty
  );

  const startPuzzle = (puzzle: TacticsPuzzle) => {
    const newChess = new Chess(puzzle.fen);
    setActivePuzzle(puzzle);
    setChess(newChess);
    setCurrentStep(0);
    setIsSuccess(false);
    setShowHint(false);
    setShowExplanation(false);
    setLastMove(null);

    const movesCount = Math.ceil(puzzle.solutionMoves.length / 2);
    setFeedbackType('info');
    setFeedbackMessage(
      `${puzzle.playerColor === 'w' ? '백' : '흑'}의 차례: ${movesCount}수 만에 체크메이트하세요!`
    );
  };

  const resetCurrentPuzzle = () => {
    if (activePuzzle) {
      startPuzzle(activePuzzle);
    }
  };

  const nextPuzzle = () => {
    if (!activePuzzle) return;
    const currentIndex = TACTICS_PUZZLES.findIndex((p) => p.id === activePuzzle.id);
    if (currentIndex >= 0 && currentIndex < TACTICS_PUZZLES.length - 1) {
      startPuzzle(TACTICS_PUZZLES[currentIndex + 1]);
    } else {
      setActivePuzzle(null);
    }
  };

  const prevPuzzle = () => {
    if (!activePuzzle) return;
    const currentIndex = TACTICS_PUZZLES.findIndex((p) => p.id === activePuzzle.id);
    if (currentIndex > 0) {
      startPuzzle(TACTICS_PUZZLES[currentIndex - 1]);
    }
  };

  const handlePlayerMove = (from: string, to: string, promotion = 'q') => {
    if (!chess || !activePuzzle || isSuccess) return;

    try {
      const move = chess.move({ from, to, promotion });
      if (!move) return;

      const expectedSan = activePuzzle.solutionMoves[currentStep];

      // Verify if the move matches the puzzle's solution or delivers checkmate immediately
      const isExpected = move.san === expectedSan;
      const isCheckmateNow = chess.isCheckmate();

      if (move.captured) {
        soundManager.capture();
      } else {
        soundManager.move();
      }

      setLastMove({ from, to });
      const nextChess = new Chess(chess.fen());
      setChess(nextChess);

      if (nextChess.isCheck()) {
        soundManager.check();
      }

      if (isExpected || (isCheckmateNow && currentStep >= activePuzzle.solutionMoves.length - 2)) {
        const nextStepIndex = currentStep + 1;

        // Check if puzzle is fully solved
        if (nextStepIndex >= activePuzzle.solutionMoves.length || isCheckmateNow) {
          setIsSuccess(true);
          soundManager.victory();
          setFeedbackType('success');
          setFeedbackMessage('🎉 정답입니다! 완벽한 체크메이트를 달성하셨습니다!');

          // Record in localStorage
          try {
            localStorage.setItem(`chess_puzzle_cleared_${activePuzzle.id}`, 'true');
            setClearedIds((prev) => new Set(prev).add(activePuzzle.id));
          } catch {}
          return;
        }

        // If there is an opponent response move
        const opponentExpectedSan = activePuzzle.solutionMoves[nextStepIndex];
        setCurrentStep(nextStepIndex + 1);
        setFeedbackType('info');
        setFeedbackMessage('좋은 수입니다! 상대가 응수합니다...');

        setTimeout(() => {
          try {
            const aiMove = nextChess.move(opponentExpectedSan);
            if (aiMove) {
              if (aiMove.captured) soundManager.capture();
              else soundManager.move();
              setLastMove({ from: aiMove.from, to: aiMove.to });
              const updatedChess = new Chess(nextChess.fen());
              setChess(updatedChess);
              setFeedbackMessage('마지막 결정타를 날려 체크메이트하세요!');
            }
          } catch (e) {
            console.error('Opponent move error:', e);
          }
        }, 500);
      } else {
        // Wrong move
        soundManager.defeat();
        setFeedbackType('error');
        setFeedbackMessage('체크메이트가 되지 않았습니다! 다시 시도해보세요.');

        // Auto undo after 1.1 seconds
        setTimeout(() => {
          resetCurrentPuzzle();
        }, 1100);
      }
    } catch {
      // Invalid move
    }
  };

  // Compute hint arrows or square highlights when hint is enabled
  const getHintArrows = (): BoardArrow[] => {
    if (!showHint || !activePuzzle || !chess) return [];
    try {
      const expectedSan = activePuzzle.solutionMoves[currentStep];
      // Clone chess to find from and to of the expected move
      const c = new Chess(chess.fen());
      const m = c.move(expectedSan);
      if (m) {
        return [{ from: m.from, to: m.to, color: '#10b981', opacity: 0.95 }];
      }
    } catch {}
    return [];
  };

  const getHintHighlights = (): Record<string, string> => {
    if (!showHint || !activePuzzle || !chess) return {};
    try {
      const expectedSan = activePuzzle.solutionMoves[currentStep];
      const c = new Chess(chess.fen());
      const m = c.move(expectedSan);
      if (m) {
        return {
          [m.from]: 'bg-emerald-500/35 ring-2 ring-emerald-400/70',
          [m.to]: 'bg-emerald-500/50 ring-2 ring-emerald-400',
        };
      }
    } catch {}
    return {};
  };

  const clearedCount = clearedIds.size;
  const progressPercent = Math.round((clearedCount / TACTICS_PUZZLES.length) * 100);

  // ==========================================
  // Render: Active Puzzle Screen
  // ==========================================
  if (activePuzzle && chess) {
    const hintArrows = getHintArrows();
    const hintHighlights = getHintHighlights();

    return (
      <div className="flex flex-col h-full justify-between p-3 space-y-2 overflow-hidden select-none">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setActivePuzzle(null)}
            className="flex items-center gap-1 text-xs font-bold text-zinc-400 hover:text-amber-400 py-1.5 px-2.5 rounded-lg bg-zinc-900 border border-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            목록으로
          </button>

          <div className="text-center min-w-0 px-2">
            <div className="text-xs font-black text-zinc-100 truncate">
              #{activePuzzle.id}. {activePuzzle.title}
            </div>
            <div className="text-[10px] text-zinc-400 truncate">{activePuzzle.theme}</div>
          </div>

          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
              activePuzzle.difficulty === 'beginner'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : activePuzzle.difficulty === 'intermediate'
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            }`}
          >
            {activePuzzle.difficultyLabel.split(' ')[0]}
          </span>
        </div>

        {/* Mission Guidance Banner */}
        <div
          className={`flex items-center justify-between px-3 py-1.5 rounded-xl border text-xs shadow-xs transition-colors ${
            feedbackType === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200'
              : feedbackType === 'error'
              ? 'bg-rose-950/80 border-rose-500/60 text-rose-200 animate-shake'
              : 'bg-zinc-900/90 border-zinc-800 text-zinc-200'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {feedbackType === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : feedbackType === 'error' ? (
              <RotateCcw className="w-4 h-4 text-rose-400 shrink-0 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span className="font-bold text-[11px] truncate">{feedbackMessage}</span>
          </div>

          <span className="text-[10px] font-mono text-zinc-400 shrink-0 ml-1">
            진행: {Math.floor(currentStep / 2) + 1}/
            {Math.ceil(activePuzzle.solutionMoves.length / 2)}수
          </span>
        </div>

        {/* Chess Board Area */}
        <div className="relative my-auto flex items-center justify-center">
          <ChessBoard
            chess={chess}
            orientation={activePuzzle.playerColor === 'w' ? 'white' : 'black'}
            onMove={handlePlayerMove}
            interactive={!isSuccess}
            lastMove={lastMove}
            highlightSquares={hintHighlights}
            arrows={hintArrows}
            pieceTheme={pieceTheme}
            boardTheme={boardTheme}
          />
        </div>

        {/* Hint Box (if toggled) */}
        {showHint && (
          <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 flex items-start gap-2 shadow-sm animate-fadeIn">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-tight">
              <span className="font-bold text-amber-300">💡 힌트: </span>
              {activePuzzle.hint}
            </div>
          </div>
        )}

        {/* Explanation Box (if toggled) */}
        {showExplanation && (
          <div className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 space-y-1 shadow-sm animate-fadeIn">
            <div className="flex items-center gap-1.5 font-bold text-amber-300 text-xs">
              <BookOpen className="w-3.5 h-3.5" /> 정답 수순 및 해설
            </div>
            <div className="font-mono text-emerald-400 text-xs font-bold">
              {activePuzzle.solutionMoves.join(' → ')}
            </div>
            <p className="text-zinc-400 text-[10px] leading-relaxed">{activePuzzle.explanation}</p>
          </div>
        )}

        {/* In-Game Bottom Actions */}
        <div className="space-y-1.5 pt-0.5">
          {isSuccess ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetCurrentPuzzle}
                className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-800 transition-all flex items-center justify-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> 다시 풀기
              </button>
              <button
                type="button"
                onClick={nextPuzzle}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all"
              >
                다음 문제 도전 <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setShowHint(!showHint)}
                className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all flex items-center justify-center gap-1 ${
                  showHint
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                힌트
              </button>

              <button
                type="button"
                onClick={resetCurrentPuzzle}
                className="py-2 px-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[11px] font-semibold border border-zinc-800 transition-all flex items-center justify-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                다시 시도
              </button>

              <button
                type="button"
                onClick={() => setShowExplanation(!showExplanation)}
                className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all flex items-center justify-center gap-1 ${
                  showExplanation
                    ? 'bg-teal-500/20 border-teal-400 text-teal-300'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-teal-400" />
                해설
              </button>

              <button
                type="button"
                onClick={nextPuzzle}
                className="py-2 px-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[11px] font-bold border border-zinc-800 transition-all flex items-center justify-center gap-1"
              >
                다음
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // Render: Puzzle List / Catalog Screen
  // ==========================================
  return (
    <div className="flex flex-col h-full p-3 space-y-3 overflow-hidden select-none">
      {/* Title & Progress Header */}
      <div className="bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-900 p-3.5 rounded-2xl border border-zinc-800/80 shadow-md">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-zinc-100">체크메이트 전술 퍼즐</h2>
              <p className="text-[10px] text-zinc-400">1~3수 안에 결정타를 꽂는 실전 체크메이트 50선</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-black text-amber-300">
              {clearedCount} / {TACTICS_PUZZLES.length}
            </span>
            <div className="text-[9px] text-zinc-400">달성률 {progressPercent}%</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Difficulty Category Tabs */}
      <div className="grid grid-cols-4 gap-1.5 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800/80 shrink-0">
        {[
          { id: 'all', label: '전체', count: TACTICS_PUZZLES.length },
          {
            id: 'beginner',
            label: '초급 1수',
            count: TACTICS_PUZZLES.filter((p) => p.difficulty === 'beginner').length,
          },
          {
            id: 'intermediate',
            label: '중급 2수',
            count: TACTICS_PUZZLES.filter((p) => p.difficulty === 'intermediate').length,
          },
          {
            id: 'advanced',
            label: '고급 전술',
            count: TACTICS_PUZZLES.filter((p) => p.difficulty === 'advanced').length,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedDifficulty(tab.id as 'all' | PuzzleDifficulty)}
            className={`py-1.5 px-1 rounded-lg text-[10px] font-bold text-center transition-all truncate ${
              selectedDifficulty === tab.id
                ? 'bg-amber-500 text-zinc-950 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Puzzle Card List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
        {filteredPuzzles.map((puzzle) => {
          const isCleared = clearedIds.has(puzzle.id);

          return (
            <div
              key={puzzle.id}
              onClick={() => startPuzzle(puzzle)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                isCleared
                  ? 'bg-zinc-900/60 border-emerald-500/30 hover:border-emerald-500/50'
                  : 'bg-zinc-900/90 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 border ${
                    isCleared
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : puzzle.difficulty === 'beginner'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : puzzle.difficulty === 'intermediate'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}
                >
                  {isCleared ? '⭐' : `#${puzzle.id}`}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-xs text-zinc-100 truncate">
                      {puzzle.title}
                    </span>
                    {isCleared && (
                      <span className="px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">
                        완료
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                    {puzzle.theme} · {puzzle.difficultyLabel}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors ${
                  isCleared
                    ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    : 'bg-amber-500 text-zinc-950 hover:bg-amber-400 shadow-xs'
                }`}
              >
                {isCleared ? '다시 풀기' : '도전'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
