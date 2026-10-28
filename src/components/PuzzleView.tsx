import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Chess } from 'chess.js';
import { ChessBoard, BoardArrow } from './ChessBoard';
import { PieceTheme, BoardTheme } from '../types/chess';
import { TACTICS_PUZZLES, TacticsPuzzle, PuzzleDifficulty } from '../data/puzzles';
import {
  getLocalTodayString,
  loadDailyPuzzleData,
  markDailyPuzzleSolved,
  loadPuzzleRushBest,
  savePuzzleRushBest,
  DailyPuzzleData,
} from '../services/storageService';
import { soundManager } from '../utils/audio';
import {
  Sparkles,
  RotateCcw,
  Lightbulb,
  CheckCircle,
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Zap,
  Calendar,
  Flame,
  Heart,
  Timer,
  Trophy,
} from 'lucide-react';

interface PuzzleViewProps {
  pieceTheme?: PieceTheme;
  boardTheme?: BoardTheme;
}

function getDailyPuzzleForDate(dateStr: string): TacticsPuzzle {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
  }
  return TACTICS_PUZZLES[hash % TACTICS_PUZZLES.length];
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const PuzzleView: React.FC<PuzzleViewProps> = ({
  pieceTheme = 'metal',
  boardTheme = 'marble',
}) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | PuzzleDifficulty>('all');
  const [activePuzzle, setActivePuzzle] = useState<TacticsPuzzle | null>(null);
  const [playMode, setPlayMode] = useState<'standard' | 'daily' | 'rush'>('standard');

  // Daily Puzzle & Rush Stats
  const todayStr = useMemo(() => getLocalTodayString(), []);
  const dailyPuzzle = useMemo(() => getDailyPuzzleForDate(todayStr), [todayStr]);
  const [dailyData, setDailyData] = useState<DailyPuzzleData>(() => loadDailyPuzzleData());
  const isDailySolvedToday =
    dailyData.lastSolvedDate === todayStr || dailyData.solvedDates.includes(todayStr);

  // Puzzle Rush State
  const [rushBest, setRushBest] = useState<number>(() => loadPuzzleRushBest());
  const [rushDeck, setRushDeck] = useState<TacticsPuzzle[]>([]);
  const [rushIndex, setRushIndex] = useState<number>(0);
  const [rushScore, setRushScore] = useState<number>(0);
  const [rushStrikes, setRushStrikes] = useState<number>(0);
  const [rushRemainingSec, setRushRemainingSec] = useState<number>(180);
  const [isRushOver, setIsRushOver] = useState<boolean>(false);

  // Puzzle gameplay state
  const [chess, setChess] = useState<Chess | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isOpponentMoving, setIsOpponentMoving] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Puzzle Rush 1-second Countdown Timer
  useEffect(() => {
    if (playMode !== 'rush' || !activePuzzle || isRushOver) return;

    const interval = setInterval(() => {
      setRushRemainingSec((prev) => {
        if (prev <= 1) {
          finishRushRun(rushScore);
          return 0;
        }
        if (prev === 30 || prev <= 10) {
          soundManager.lowTime();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [playMode, activePuzzle, isRushOver, rushScore]);

  const finishRushRun = (finalScore: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsOpponentMoving(false);
    setIsRushOver(true);
    const updatedBest = savePuzzleRushBest(finalScore);
    setRushBest(updatedBest);
    if (finalScore > 0) {
      soundManager.victory();
    } else {
      soundManager.defeat();
    }
  };

  const filteredPuzzles = TACTICS_PUZZLES.filter(
    (p) => selectedDifficulty === 'all' || p.difficulty === selectedDifficulty
  );

  const loadBoardForPuzzle = (puzzle: TacticsPuzzle) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsOpponentMoving(false);
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

  const startPuzzle = (puzzle: TacticsPuzzle, mode: 'standard' | 'daily' = 'standard') => {
    setPlayMode(mode);
    setIsRushOver(false);
    loadBoardForPuzzle(puzzle);
  };

  const startPuzzleRush = () => {
    const beginners = shuffleArray(TACTICS_PUZZLES.filter((p) => p.difficulty === 'beginner'));
    const intermediates = shuffleArray(
      TACTICS_PUZZLES.filter((p) => p.difficulty === 'intermediate')
    );
    const advanced = shuffleArray(TACTICS_PUZZLES.filter((p) => p.difficulty === 'advanced'));
    const deck = [...beginners, ...intermediates, ...advanced];

    setPlayMode('rush');
    setRushDeck(deck);
    setRushIndex(0);
    setRushScore(0);
    setRushStrikes(0);
    setRushRemainingSec(180);
    setIsRushOver(false);
    soundManager.gameStart();
    loadBoardForPuzzle(deck[0]);
  };

  const advanceRushPuzzle = (nextIdx: number, deck = rushDeck) => {
    const wrappedIdx = nextIdx % deck.length;
    setRushIndex(nextIdx);
    loadBoardForPuzzle(deck[wrappedIdx]);
  };

  const resetCurrentPuzzle = () => {
    if (activePuzzle) {
      loadBoardForPuzzle(activePuzzle);
    }
  };

  const exitToCatalog = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsOpponentMoving(false);
    setActivePuzzle(null);
    setIsRushOver(false);
    setPlayMode('standard');
  };

  const nextPuzzle = () => {
    if (!activePuzzle) return;
    if (playMode === 'daily') {
      exitToCatalog();
      return;
    }
    const currentIndex = TACTICS_PUZZLES.findIndex((p) => p.id === activePuzzle.id);
    if (currentIndex >= 0 && currentIndex < TACTICS_PUZZLES.length - 1) {
      startPuzzle(TACTICS_PUZZLES[currentIndex + 1], 'standard');
    } else {
      exitToCatalog();
    }
  };

  const handlePlayerMove = (from: string, to: string, promotion = 'q') => {
    if (
      !chess ||
      !activePuzzle ||
      isSuccess ||
      isOpponentMoving ||
      isRushOver ||
      feedbackType === 'error'
    ) {
      return;
    }

    try {
      const move = chess.move({ from, to, promotion });
      if (!move) return;

      const expectedSan = activePuzzle.solutionMoves[currentStep];
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

          // Record puzzle cleared in localStorage
          try {
            localStorage.setItem(`chess_puzzle_cleared_${activePuzzle.id}`, 'true');
            setClearedIds((prev) => new Set(prev).add(activePuzzle.id));
          } catch {}

          if (playMode === 'daily') {
            const updatedDaily = markDailyPuzzleSolved(todayStr);
            setDailyData(updatedDaily);
            setFeedbackMessage(
              `🎉 오늘의 데일리 퍼즐 클리어! (🔥 ${updatedDaily.streak}일 연속 달성)`
            );
            return;
          }

          if (playMode === 'rush') {
            const newScore = rushScore + 1;
            setRushScore(newScore);
            setFeedbackMessage(`⚡ 정답! (+1점 · 현재 ${newScore}점)`);
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
              advanceRushPuzzle(rushIndex + 1);
            }, 380);
            return;
          }

          setFeedbackMessage('🎉 정답입니다! 완벽한 체크메이트를 달성하셨습니다!');
          return;
        }

        // Opponent response move
        setIsOpponentMoving(true);
        const opponentExpectedSan = activePuzzle.solutionMoves[nextStepIndex];
        setCurrentStep(nextStepIndex + 1);
        setFeedbackType('info');
        setFeedbackMessage('좋은 수입니다! 상대가 응수합니다...');

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setIsOpponentMoving(false);
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
        }, 450);
      } else {
        // Wrong move
        soundManager.defeat();
        setFeedbackType('error');

        if (playMode === 'rush') {
          const nextStrikes = rushStrikes + 1;
          setRushStrikes(nextStrikes);
          if (nextStrikes >= 3) {
            setFeedbackMessage('💔 라이프 3개 소진! 퍼즐 러시가 종료되었습니다.');
            finishRushRun(rushScore);
          } else {
            setFeedbackMessage(`💔 오답! 남은 기회 ${3 - nextStrikes}번 — 다음 문제로 이동합니다.`);
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
              advanceRushPuzzle(rushIndex + 1);
            }, 700);
          }
          return;
        }

        setFeedbackMessage('체크메이트가 되지 않았습니다! 다시 시도해보세요.');
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          resetCurrentPuzzle();
        }, 1000);
      }
    } catch {
      // Invalid move
    }
  };

  const getHintArrows = (): BoardArrow[] => {
    if (!showHint || !activePuzzle || !chess || playMode === 'rush') return [];
    try {
      const expectedSan = activePuzzle.solutionMoves[currentStep];
      const c = new Chess(chess.fen());
      const m = c.move(expectedSan);
      if (m) {
        return [{ from: m.from, to: m.to, color: '#10b981', opacity: 0.95 }];
      }
    } catch {}
    return [];
  };

  const getHintHighlights = (): Record<string, string> => {
    if (!showHint || !activePuzzle || !chess || playMode === 'rush') return {};
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

  const formatRushTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // ==========================================
  // Render: Puzzle Rush Summary Modal/Screen
  // ==========================================
  if (playMode === 'rush' && isRushOver) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full p-4 select-none">
        <div className="bg-zinc-900 border border-amber-500/40 rounded-2xl p-6 w-full max-w-sm text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-3xl">
            ⚡
          </div>
          <div>
            <h3 className="text-lg font-black text-white">퍼즐 러시 종료!</h3>
            <p className="text-xs text-zinc-400 mt-1">
              {rushRemainingSec <= 0 ? '3분 제한 시간이 모두 경과했습니다.' : '라이프 3개를 모두 사용했습니다.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-[11px] text-zinc-400 block">이번 달성 점수</span>
              <strong className="text-2xl font-black text-amber-400 font-mono">{rushScore}</strong>
            </div>
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-[11px] text-emerald-400 block flex items-center justify-center gap-1">
                <Trophy className="w-3 h-3" /> 내 최고 기록
              </span>
              <strong className="text-2xl font-black text-emerald-300 font-mono">{rushBest}</strong>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={exitToCatalog}
              className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all"
            >
              목록으로
            </button>
            <button
              type="button"
              onClick={startPuzzleRush}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-zinc-950 text-xs font-black shadow-md transition-all"
            >
              ⚡ 다시 도전
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // Render: Active Puzzle Screen (Standard / Daily / Rush)
  // ==========================================
  if (activePuzzle && chess) {
    const hintArrows = getHintArrows();
    const hintHighlights = getHintHighlights();

    return (
      <div className="flex flex-col min-h-full justify-between p-3 space-y-2 select-none">
        {/* Top Header */}
        {playMode === 'rush' ? (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900 border border-amber-500/40">
            <button
              type="button"
              onClick={() => finishRushRun(rushScore)}
              className="text-[11px] font-bold text-zinc-400 hover:text-rose-300 px-2 py-1 rounded-lg bg-zinc-800"
            >
              종료
            </button>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 font-mono font-black text-sm text-amber-300">
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>{rushScore}점</span>
              </div>
              <div
                className={`flex items-center gap-1 font-mono font-black text-sm px-2 py-0.5 rounded-lg ${
                  rushRemainingSec <= 30
                    ? 'bg-rose-500/20 text-rose-300 animate-pulse'
                    : 'bg-zinc-800 text-zinc-100'
                }`}
              >
                <Timer className="w-3.5 h-3.5" />
                <span>{formatRushTime(rushRemainingSec)}</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {[0, 1, 2].map((heartIdx) => (
                <Heart
                  key={heartIdx}
                  className={`w-4 h-4 ${
                    heartIdx < 3 - rushStrikes
                      ? 'text-rose-500 fill-rose-500'
                      : 'text-zinc-700'
                  }`}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={exitToCatalog}
              className="flex items-center gap-1 text-xs font-bold text-zinc-400 hover:text-amber-400 py-1.5 px-2.5 rounded-lg bg-zinc-900 border border-zinc-800 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              목록으로
            </button>

            <div className="text-center min-w-0 px-2">
              <div className="text-xs font-black text-zinc-100 truncate">
                {playMode === 'daily'
                  ? `📅 오늘의 퍼즐 (${todayStr})`
                  : `#${activePuzzle.id}. ${activePuzzle.title}`}
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
        )}

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
        <div className="relative my-auto flex items-center justify-center shrink-0">
          <ChessBoard
            chess={chess}
            orientation={activePuzzle.playerColor === 'w' ? 'white' : 'black'}
            onMove={handlePlayerMove}
            interactive={!isSuccess && !isOpponentMoving && feedbackType !== 'error'}
            lastMove={lastMove}
            highlightSquares={hintHighlights}
            arrows={hintArrows}
            pieceTheme={pieceTheme}
            boardTheme={boardTheme}
            className="w-full max-w-[min(100%,min(44vh,370px))]"
          />
        </div>

        {/* Hint Box (Standard & Daily only) */}
        {showHint && playMode !== 'rush' && (
          <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 flex items-start gap-2 shadow-sm animate-fadeIn">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-tight">
              <span className="font-bold text-amber-300">💡 힌트: </span>
              {activePuzzle.hint}
            </div>
          </div>
        )}

        {/* Explanation Box (Standard & Daily only) */}
        {showExplanation && playMode !== 'rush' && (
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
        {playMode !== 'rush' && (
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
                  {playMode === 'daily' ? '퍼즐 홈으로 돌아가기' : '다음 문제 도전'}{' '}
                  <ChevronRight className="w-4 h-4" />
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
                  {playMode === 'daily' ? '목록' : '다음'}
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // Render: Puzzle List / Catalog Screen
  // ==========================================
  return (
    <div className="flex flex-col h-full p-3 space-y-2.5 overflow-hidden select-none">
      {/* Title & Progress Header */}
      <div className="bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-900 p-3 rounded-2xl border border-zinc-800/80 shadow-md shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-zinc-100">체크메이트 전술 퍼즐</h2>
              <p className="text-[10px] text-zinc-400">실전 체크메이트 50선 · 데일리 & 타임어택</p>
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

      {/* Special Modes Grid: Daily Puzzle & Puzzle Rush */}
      <div className="grid grid-cols-2 gap-2 shrink-0">
        {/* Daily Puzzle Card */}
        <button
          type="button"
          data-testid="daily-puzzle-card"
          onClick={() => startPuzzle(dailyPuzzle, 'daily')}
          className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-950/60 to-zinc-900 border border-emerald-500/40 hover:border-emerald-400 text-left space-y-1.5 transition-all active:scale-98 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-300">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              오늘의 퍼즐
            </span>
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-bold">
              <Flame className="w-2.5 h-2.5 text-orange-400 fill-orange-400" />
              {dailyData.streak}일
            </span>
          </div>
          <div className="text-[10px] text-zinc-300 truncate font-semibold">
            {dailyPuzzle.title}
          </div>
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[9px] text-zinc-400 font-mono">{todayStr}</span>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                isDailySolvedToday
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-emerald-500 text-zinc-950'
              }`}
            >
              {isDailySolvedToday ? '완료 ✓' : '도전'}
            </span>
          </div>
        </button>

        {/* Puzzle Rush Card */}
        <button
          type="button"
          data-testid="puzzle-rush-card"
          onClick={startPuzzleRush}
          className="p-2.5 rounded-xl bg-gradient-to-br from-amber-950/60 to-zinc-900 border border-amber-500/40 hover:border-amber-400 text-left space-y-1.5 transition-all active:scale-98 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-300">
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              3분 퍼즐 러시
            </span>
            <span className="text-[9px] font-mono font-bold text-amber-200 bg-zinc-800 px-1.5 py-0.2 rounded-full">
              최고 {rushBest}점
            </span>
          </div>
          <div className="text-[10px] text-zinc-300 truncate font-semibold">
            타임어택 · 라이프 ❤️×3
          </div>
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[9px] text-zinc-400">연속 메이트 기록 도전</span>
            <span className="px-2 py-0.5 rounded-md bg-amber-500 text-zinc-950 text-[10px] font-black">
              시작 ⚡
            </span>
          </div>
        </button>
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
              onClick={() => startPuzzle(puzzle, 'standard')}
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
