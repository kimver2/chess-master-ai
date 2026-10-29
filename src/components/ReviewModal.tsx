import React, { useState, useRef } from 'react';
import { Chess } from 'chess.js';
import { ChessBoard, BoardArrow, SquareBadge } from './ChessBoard';
import { GameReviewData, MoveAnalysis, PieceTheme, BoardTheme } from '../types/chess';
import { soundManager } from '../utils/audio';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  AlertTriangle,
  XCircle,
  HelpCircle,
  CheckCircle2,
  Lightbulb,
  X,
  TrendingUp,
  RotateCcw,
  Target,
  Bot,
} from 'lucide-react';

interface ReviewModalProps {
  reviewData: GameReviewData;
  onClose: () => void;
  playerColor: 'w' | 'b';
  pieceTheme?: PieceTheme;
  boardTheme?: BoardTheme;
  onPlayFromPosition?: (fen: string, side: 'w' | 'b', moveNumber?: number) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  reviewData,
  onClose,
  playerColor,
  pieceTheme = 'metal',
  boardTheme = 'marble',
  onPlayFromPosition,
}) => {
  const isBadMove = (move?: MoveAnalysis) => {
    if (!move) return false;
    const isQualityBad =
      move.quality === 'inaccuracy' || move.quality === 'mistake' || move.quality === 'blunder';
    return isQualityBad && !!move.bestMoveSan && move.bestMoveSan !== move.san;
  };

  // Filter: default to true (see ONLY player moves, not opponent moves)
  const [filterPlayerOnly, setFilterPlayerOnly] = useState<boolean>(() => {
    const hasPlayerMoves = reviewData.moves.some((m) => m.color === playerColor);
    return hasPlayerMoves;
  });

  const displayedMoves = filterPlayerOnly
    ? reviewData.moves.filter((m) => m.color === playerColor)
    : reviewData.moves;

  // Start with the first mistake/blunder by player if exists, otherwise first move
  const [selectedIdx, setSelectedIdx] = useState<number>(() => {
    const playerMoves = reviewData.moves.filter((m) => m.color === playerColor);
    const list = playerMoves.length > 0 ? playerMoves : reviewData.moves;
    const firstBad = list.findIndex((m) => isBadMove(m));
    return firstBad !== -1 ? firstBad : 0;
  });

  const totalMoves = displayedMoves.length;
  const safeIdx = Math.min(selectedIdx, Math.max(0, totalMoves - 1));
  const currentMove: MoveAnalysis | undefined = displayedMoves[safeIdx];

  const [showBestMove, setShowBestMove] = useState<boolean>(() => {
    const playerMoves = reviewData.moves.filter((m) => m.color === playerColor);
    const list = playerMoves.length > 0 ? playerMoves : reviewData.moves;
    const firstBad = list.findIndex((m) => isBadMove(m));
    const initialMove = list[firstBad !== -1 ? firstBad : 0];
    return isBadMove(initialMove);
  });

  // Interactive "Retry Mistake" state
  const [isRetryMode, setIsRetryMode] = useState<boolean>(false);
  const [retryChess, setRetryChess] = useState<Chess | null>(null);
  const [retryLastMove, setRetryLastMove] = useState<{ from: string; to: string } | null>(null);
  const [retrySolved, setRetrySolved] = useState<boolean>(false);
  const [retryShowHint, setRetryShowHint] = useState<boolean>(false);
  const [retryFeedback, setRetryFeedback] = useState<{
    type: 'info' | 'success' | 'error';
    message: string;
  } | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetRetryMode = () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    setIsRetryMode(false);
    setRetryChess(null);
    setRetryLastMove(null);
    setRetrySolved(false);
    setRetryShowHint(false);
    setRetryFeedback(null);
  };

  const startRetryForCurrentMove = () => {
    if (!currentMove) return;
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    const c = new Chess(currentMove.fenBefore);
    setIsRetryMode(true);
    setRetryChess(c);
    setRetryLastMove(null);
    setRetrySolved(false);
    setRetryShowHint(false);
    setRetryFeedback({
      type: 'info',
      message: `${currentMove.san} 대신 스톡피쉬가 추천하는 최선의 수를 직접 찾아 두어보세요!`,
    });
  };

  const handleRetryBoardMove = (from: string, to: string, promotion = 'q') => {
    if (!isRetryMode || !retryChess || !currentMove || retrySolved) return;
    try {
      const next = new Chess(retryChess.fen());
      const move = next.move({ from, to, promotion });
      if (!move) return;

      setRetryChess(next);
      setRetryLastMove({ from, to });

      const expectedUci = currentMove.bestMoveUci?.toLowerCase();
      const playedUci = `${from}${to}${move.promotion || ''}`.toLowerCase();
      const playedBaseUci = `${from}${to}`.toLowerCase();

      const isCorrect =
        move.san === currentMove.bestMoveSan ||
        (expectedUci && (playedUci === expectedUci || playedBaseUci === expectedUci.substring(0, 4))) ||
        next.isCheckmate();

      if (isCorrect) {
        soundManager.victory();
        setRetrySolved(true);
        setRetryFeedback({
          type: 'success',
          message: `🎉 정답입니다! 최선의 수 ${move.san}을(를) 정확히 찾아내셨습니다!`,
        });
      } else {
        soundManager.defeat();
        setRetryFeedback({
          type: 'error',
          message: `❌ 아쉽습니다 (${move.san}). 실수했던 수를 피해 더 강력한 수를 찾아보세요!`,
        });
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => {
          setRetryChess(new Chess(currentMove.fenBefore));
          setRetryLastMove(null);
        }, 900);
      }
    } catch {
      // invalid move
    }
  };

  // Navigate to index with automatic "Show Best Move First" for mistakes/blunders/inaccuracies
  const handleSelectIndex = (idx: number, customList = displayedMoves) => {
    resetRetryMode();
    setSelectedIdx(idx);
    const targetMove = customList[idx];
    if (isBadMove(targetMove)) {
      setShowBestMove(true);
    } else {
      setShowBestMove(false);
    }
  };

  // Jump from Eval Graph click (given 0-based index into reviewData.moves)
  const handleGraphSelectAllIdx = (allMoveIdx: number) => {
    const targetMove = reviewData.moves[allMoveIdx];
    if (!targetMove) return;

    const idxInDisplayed = displayedMoves.indexOf(targetMove);
    if (idxInDisplayed !== -1) {
      handleSelectIndex(idxInDisplayed, displayedMoves);
    } else {
      // Switch to '전체 수' so the clicked opponent move can be inspected immediately
      setFilterPlayerOnly(false);
      handleSelectIndex(allMoveIdx, reviewData.moves);
    }
  };

  const handleToggleFilter = (playerOnly: boolean) => {
    resetRetryMode();
    const activeMove = displayedMoves[safeIdx];
    setFilterPlayerOnly(playerOnly);
    const nextList = playerOnly
      ? reviewData.moves.filter((m) => m.color === playerColor)
      : reviewData.moves;
    const nextIdx = nextList.findIndex((m) => m === activeMove);
    const targetIdx = nextIdx !== -1 ? nextIdx : 0;
    setSelectedIdx(targetIdx);
    const targetMove = nextList[targetIdx];
    if (isBadMove(targetMove)) {
      setShowBestMove(true);
    } else {
      setShowBestMove(false);
    }
  };

  // Reconstruct board at currentPly (or use retryChess when retrying mistake)
  const currentChess = new Chess();
  if (isRetryMode && retryChess) {
    currentChess.load(retryChess.fen());
  } else if (currentMove) {
    if (showBestMove && currentMove.bestMoveUci) {
      currentChess.load(currentMove.fenBefore);
      const from = currentMove.bestMoveUci.substring(0, 2);
      const to = currentMove.bestMoveUci.substring(2, 4);
      const promo = currentMove.bestMoveUci[4];
      try {
        currentChess.move({ from, to, promotion: promo });
      } catch {
        currentChess.load(currentMove.fenAfter);
      }
    } else {
      currentChess.load(currentMove.fenAfter);
    }
  }

  const hasBestMove = !!(
    currentMove?.bestMoveSan &&
    currentMove?.bestMoveUci &&
    currentMove.bestMoveSan !== currentMove.san
  );

  // Calculate board highlights, square badges, and dual-colored arrows
  const highlights: { [square: string]: string } = {};
  const squareBadges: { [square: string]: SquareBadge } = {};
  const arrows: BoardArrow[] = [];
  let myArrowColor = '#38bdf8';

  if (isRetryMode && currentMove) {
    if (retryShowHint && currentMove.bestMoveUci) {
      const bestFrom = currentMove.bestMoveUci.substring(0, 2);
      const bestTo = currentMove.bestMoveUci.substring(2, 4);
      highlights[bestFrom] = 'bg-emerald-500/40 ring-2 ring-inset ring-emerald-400';
      highlights[bestTo] = 'bg-emerald-500/55 ring-2 ring-inset ring-emerald-300';
      arrows.push({ from: bestFrom, to: bestTo, color: '#10b981', opacity: 0.9 });
    }
  } else if (currentMove) {
    let myColorBg = 'bg-sky-500/50 ring-2 ring-inset ring-sky-400';
    let myBadgeClass = 'bg-sky-600 text-white';
    myArrowColor = '#38bdf8';

    if (currentMove.quality === 'good') {
      myColorBg = 'bg-sky-500/50 ring-2 ring-inset ring-sky-400';
      myBadgeClass = 'bg-sky-600 text-white';
      myArrowColor = '#38bdf8';
    } else if (currentMove.quality === 'inaccuracy') {
      myColorBg = 'bg-amber-500/50 ring-2 ring-inset ring-amber-400';
      myBadgeClass = 'bg-amber-500 text-zinc-950 font-black';
      myArrowColor = '#f59e0b';
    } else if (currentMove.quality === 'mistake') {
      myColorBg = 'bg-orange-500/55 ring-2 ring-inset ring-orange-400';
      myBadgeClass = 'bg-orange-600 text-white font-black';
      myArrowColor = '#f97316';
    } else if (currentMove.quality === 'blunder') {
      myColorBg = 'bg-rose-500/60 ring-2 ring-inset ring-rose-400';
      myBadgeClass = 'bg-rose-600 text-white font-black';
      myArrowColor = '#f43f5e';
    }

    if (hasBestMove && currentMove.bestMoveUci) {
      if (showBestMove) {
        const bestFrom = currentMove.bestMoveUci.substring(0, 2);
        const bestTo = currentMove.bestMoveUci.substring(2, 4);

        if (bestFrom === currentMove.from) {
          highlights[bestFrom] =
            'bg-gradient-to-br from-emerald-500/50 via-amber-500/40 to-amber-500/50 ring-2 ring-inset ring-emerald-400';
        } else {
          highlights[bestFrom] = 'bg-emerald-500/40 ring-2 ring-inset ring-emerald-400';
          highlights[currentMove.from] = myColorBg;
        }

        highlights[currentMove.to] = myColorBg;
        highlights[bestTo] = 'bg-emerald-500/65 ring-2 ring-inset ring-emerald-300 shadow-inner';

        if (bestTo !== currentMove.to) {
          squareBadges[currentMove.to] = {
            text: '내 착수',
            className: myBadgeClass,
          };
        }
        squareBadges[bestTo] = {
          text: '💡 최적',
          className: 'bg-emerald-600 text-white ring-1 ring-emerald-300 shadow-sm',
        };

        arrows.push({
          from: currentMove.from,
          to: currentMove.to,
          color: myArrowColor,
          opacity: 0.85,
        });
        arrows.push({
          from: bestFrom,
          to: bestTo,
          color: '#10b981',
          opacity: 0.95,
        });
      } else {
        // Viewing played suboptimal move ("내가 둔 수") + opponent's best reply refutation
        highlights[currentMove.from] = myColorBg;
        highlights[currentMove.to] = myColorBg;
        squareBadges[currentMove.to] = {
          text: '내 착수',
          className: myBadgeClass,
        };
        arrows.push({
          from: currentMove.from,
          to: currentMove.to,
          color: myArrowColor,
          opacity: 0.85,
        });

        if (currentMove.oppBestReplyUci && currentMove.oppBestReplyUci.length >= 4) {
          const oppFrom = currentMove.oppBestReplyUci.substring(0, 2);
          const oppTo = currentMove.oppBestReplyUci.substring(2, 4);
          highlights[oppFrom] = 'bg-purple-500/45 ring-2 ring-inset ring-purple-400';
          if (oppTo !== currentMove.to) {
            highlights[oppTo] = 'bg-purple-500/60 ring-2 ring-inset ring-purple-300';
            squareBadges[oppTo] = {
              text: '⚡ 응수',
              className: 'bg-purple-600 text-white ring-1 ring-purple-300 shadow-sm',
            };
          } else {
            highlights[currentMove.to] =
              'bg-gradient-to-br from-amber-500/55 to-purple-600/65 ring-2 ring-inset ring-purple-300';
            squareBadges[oppFrom] = {
              text: '⚡ 응수',
              className: 'bg-purple-600 text-white ring-1 ring-purple-300 shadow-sm',
            };
          }
          arrows.push({
            from: oppFrom,
            to: oppTo,
            color: '#a855f7',
            opacity: 0.95,
          });
        }
      }
    } else {
      highlights[currentMove.from] = 'bg-emerald-500/40 ring-2 ring-inset ring-emerald-400';
      highlights[currentMove.to] = 'bg-emerald-500/70 ring-2 ring-inset ring-emerald-300';
      squareBadges[currentMove.to] = {
        text: '🌟 최적',
        className: 'bg-emerald-600 text-white ring-1 ring-emerald-300',
      };
      arrows.push({
        from: currentMove.from,
        to: currentMove.to,
        color: '#10b981',
        opacity: 0.95,
      });
    }
  }

  // Build SVG Evaluation Graph coordinates
  const graphWidth = 320;
  const graphHeight = 52;
  const midY = graphHeight / 2;
  const scoreToGraphY = (cp: number) => {
    const clamped = Math.max(-700, Math.min(700, cp));
    return midY - (clamped / 700) * (midY - 4);
  };

  const allMoves = reviewData.moves;
  const graphPoints = allMoves.map((m, idx) => {
    const x =
      allMoves.length <= 1
        ? graphWidth / 2
        : 6 + (idx / (allMoves.length - 1)) * (graphWidth - 12);
    const y = scoreToGraphY(m.scoreAfter);
    return { x, y, move: m, idx };
  });

  const polylinePoints = graphPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath =
    graphPoints.length > 0
      ? `M ${graphPoints[0].x.toFixed(1)},${midY} ` +
        graphPoints.map((p) => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
        ` L ${graphPoints[graphPoints.length - 1].x.toFixed(1)},${midY} Z`
      : '';

  const currentGraphPoint = currentMove
    ? graphPoints.find((p) => p.move.ply === currentMove.ply)
    : null;

  const handleSvgGraphClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (allMoves.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const idx = Math.round(ratio * (allMoves.length - 1));
    handleGraphSelectAllIdx(idx);
  };

  // Quality badge icon and label
  const renderQualityBadge = (quality: MoveAnalysis['quality']) => {
    switch (quality) {
      case 'best':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5" /> 최선의 수 (Best)
          </span>
        );
      case 'good':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> 좋은 수 (Good)
          </span>
        );
      case 'inaccuracy':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <HelpCircle className="w-3.5 h-3.5" /> 아쉬운 수 (Inaccuracy)
          </span>
        );
      case 'mistake':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
            <AlertTriangle className="w-3.5 h-3.5" /> 실수 (Mistake)
          </span>
        );
      case 'blunder':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" /> 치명적 악수 (Blunder)
          </span>
        );
      default:
        return null;
    }
  };

  const formatScore = (score: number) => {
    if (Math.abs(score) >= 9000) {
      return score > 0 ? '체크메이트 (백)' : '체크메이트 (흑)';
    }
    const val = (score / 100).toFixed(1);
    return score > 0 ? `+${val}` : `${val}`;
  };

  const boardOrientation =
    isRetryMode && currentMove
      ? currentMove.color === 'b'
        ? 'black'
        : 'white'
      : playerColor === 'b'
      ? 'black'
      : 'white';

  return (
    <div className="fixed inset-0 z-[60] bg-zinc-950 flex flex-col max-w-lg mx-auto overflow-hidden">
      {/* Top Header with Safe Area Inset */}
      <div
        className="flex items-center justify-between px-4 pb-2.5 border-b border-zinc-800 bg-zinc-900/90 shrink-0"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        }}
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold text-zinc-100">게임 정밀 복기</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 active:scale-95 transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Middle Content: Stats, Eval Graph, Board, and Move Analysis */}
      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
        {/* Accuracy & Stats Cards */}
        <div className="grid grid-cols-2 gap-2 p-3 pb-2 bg-zinc-900 shrink-0">
          <div
            className={`p-2 rounded-xl border transition-all ${
              playerColor === 'w'
                ? 'bg-zinc-800/90 border-amber-500/40 ring-1 ring-amber-500/20'
                : 'bg-zinc-800/50 border-zinc-700/40 opacity-75'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-zinc-300 font-semibold flex items-center gap-1.5">
                백 (White)
                {playerColor === 'w' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    나
                  </span>
                )}
              </span>
              <span className="text-sm font-extrabold text-amber-400">
                {reviewData.whiteStats.accuracy}%
              </span>
            </div>
            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>🌟 {reviewData.whiteStats.best}</span>
              <span>👍 {reviewData.whiteStats.good}</span>
              <span>⚠️ {reviewData.whiteStats.mistake}</span>
              <span className="text-rose-400 font-bold">❌ {reviewData.whiteStats.blunder}</span>
            </div>
          </div>

          <div
            className={`p-2 rounded-xl border transition-all ${
              playerColor === 'b'
                ? 'bg-zinc-800/90 border-sky-500/40 ring-1 ring-sky-500/20'
                : 'bg-zinc-800/50 border-zinc-700/40 opacity-75'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-zinc-300 font-semibold flex items-center gap-1.5">
                흑 (Black)
                {playerColor === 'b' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30">
                    나
                  </span>
                )}
              </span>
              <span className="text-sm font-extrabold text-sky-400">
                {reviewData.blackStats.accuracy}%
              </span>
            </div>
            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>🌟 {reviewData.blackStats.best}</span>
              <span>👍 {reviewData.blackStats.good}</span>
              <span>⚠️ {reviewData.blackStats.mistake}</span>
              <span className="text-rose-400 font-bold">❌ {reviewData.blackStats.blunder}</span>
            </div>
          </div>
        </div>

        {/* Interactive Evaluation Line Graph (형세 변화 그래프) */}
        {allMoves.length > 0 && (
          <div
            data-testid="review-eval-graph"
            className="px-3 pb-2 bg-zinc-900 border-b border-zinc-800 shrink-0"
          >
            <div className="rounded-xl bg-zinc-950/90 border border-zinc-800 p-1.5">
              <div className="flex items-center justify-between px-1.5 pb-1 text-[10px] text-zinc-400">
                <span className="font-bold text-zinc-300 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-amber-400" /> 형세 변화 그래프 (탭하여 해당 수로 이동)
                </span>
                <span className="font-mono text-amber-300 font-bold">
                  {currentMove ? formatScore(currentMove.scoreAfter) : '0.0'}
                </span>
              </div>
              <svg
                viewBox={`0 0 ${graphWidth} ${graphHeight}`}
                onClick={handleSvgGraphClick}
                className="w-full h-12 cursor-pointer select-none rounded-lg overflow-hidden bg-zinc-900"
              >
                {/* Top half subtle white tint, bottom half subtle dark tint */}
                <rect x="0" y="0" width={graphWidth} height={midY} fill="rgba(255,255,255,0.04)" />
                <rect
                  x="0"
                  y={midY}
                  width={graphWidth}
                  height={midY}
                  fill="rgba(0,0,0,0.35)"
                />
                {/* Midline (0.0 equal evaluation) */}
                <line
                  x1="0"
                  y1={midY}
                  x2={graphWidth}
                  y2={midY}
                  stroke="rgba(161,161,170,0.35)"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />

                {/* Area Fill */}
                {areaPath && <path d={areaPath} fill="rgba(251, 191, 36, 0.22)" />}

                {/* Evaluation Curve */}
                {polylinePoints && (
                  <polyline
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={polylinePoints}
                  />
                )}

                {/* Mistake / Blunder Dots */}
                {graphPoints.map((pt) => {
                  if (pt.move.quality !== 'blunder' && pt.move.quality !== 'mistake') return null;
                  return (
                    <circle
                      key={`bad_${pt.idx}`}
                      cx={pt.x}
                      cy={pt.y}
                      r={pt.move.quality === 'blunder' ? 3 : 2.3}
                      fill={pt.move.quality === 'blunder' ? '#f43f5e' : '#f97316'}
                    />
                  );
                })}

                {/* Active Move Indicator */}
                {currentGraphPoint && (
                  <g>
                    <line
                      x1={currentGraphPoint.x}
                      y1="0"
                      x2={currentGraphPoint.x}
                      y2={graphHeight}
                      stroke="#10b981"
                      strokeWidth="1.2"
                      strokeOpacity="0.85"
                    />
                    <circle
                      cx={currentGraphPoint.x}
                      cy={currentGraphPoint.y}
                      r="4"
                      fill="#10b981"
                      stroke="#ffffff"
                      strokeWidth="1.2"
                    />
                  </g>
                )}
              </svg>
            </div>
          </div>
        )}

        {/* Review Filter Mode Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/90 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="font-semibold">
              {isRetryMode
                ? '🎯 실수 다시 두기 훈련 중'
                : filterPlayerOnly
                ? '내가 둔 수만 복기'
                : '전체 수 복기'}
            </span>
            <span className="text-[11px] text-zinc-400">({displayedMoves.length}수)</span>
          </div>
          <div className="flex items-center bg-zinc-800 p-0.5 rounded-lg border border-zinc-700 text-xs">
            <button
              type="button"
              onClick={() => handleToggleFilter(true)}
              className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                filterPlayerOnly
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              👤 내 수만 보기
            </button>
            <button
              type="button"
              onClick={() => handleToggleFilter(false)}
              className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                !filterPlayerOnly
                  ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              전체 수
            </button>
          </div>
        </div>

        {/* Chess Board Area with Responsive Sizing */}
        <div className="p-2 w-full flex flex-col items-center justify-center shrink-0">
          {/* Dynamic Board Color Legend or Retry Banner */}
          {isRetryMode && retryFeedback ? (
            <div
              className={`flex items-center justify-between px-3 py-1.5 rounded-xl border text-xs mb-1.5 w-full max-w-[min(100%,min(42vh,360px))] shrink-0 ${
                retryFeedback.type === 'success'
                  ? 'bg-emerald-950/85 border-emerald-500/60 text-emerald-200'
                  : retryFeedback.type === 'error'
                  ? 'bg-rose-950/85 border-rose-500/60 text-rose-200'
                  : 'bg-amber-950/80 border-amber-500/50 text-amber-200'
              }`}
            >
              <span className="text-[11px] font-bold leading-snug">{retryFeedback.message}</span>
            </div>
          ) : (
            currentMove &&
            hasBestMove && (
              <div className="flex items-center justify-between px-2.5 py-1 bg-zinc-900/90 rounded-lg border border-zinc-800 text-[11px] mb-1.5 w-full max-w-[min(100%,min(42vh,360px))] shrink-0">
                {showBestMove ? (
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center gap-1 font-bold text-emerald-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-xs shadow-emerald-500/60" />
                      최적의 수 ({currentMove.bestMoveSan})
                    </span>
                    <span className="text-zinc-600 font-bold">vs</span>
                    <span
                      className="flex items-center gap-1 font-bold"
                      style={{ color: myArrowColor }}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block shadow-xs"
                        style={{ backgroundColor: myArrowColor }}
                      />
                      내가 둔 수 ({currentMove.san})
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span
                      className="flex items-center gap-1 font-bold"
                      style={{ color: myArrowColor }}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block shadow-xs"
                        style={{ backgroundColor: myArrowColor }}
                      />
                      내가 둔 수 ({currentMove.san})
                    </span>
                    {currentMove.playedLineSan && currentMove.playedLineSan.length > 0 && (
                      <>
                        <span className="text-zinc-500 font-bold">→</span>
                        <span className="flex items-center gap-1 font-bold text-purple-300">
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block shadow-xs shadow-purple-500/60" />
                          상대 응수 ({currentMove.playedLineSan[0]})
                        </span>
                      </>
                    )}
                  </div>
                )}
                <span className="text-[10px] text-zinc-400 font-medium hidden sm:inline">
                  체스판 위 색상 비교
                </span>
              </div>
            )
          )}

          <ChessBoard
            chess={currentChess}
            orientation={boardOrientation}
            interactive={isRetryMode && !retrySolved}
            onMove={isRetryMode ? handleRetryBoardMove : undefined}
            lastMove={isRetryMode ? retryLastMove : undefined}
            highlightSquares={highlights}
            squareBadges={squareBadges}
            arrows={arrows}
            pieceTheme={pieceTheme}
            boardTheme={boardTheme}
            className="w-full max-w-[min(100%,min(42vh,360px))]"
          />
        </div>

        {/* Move Info & Comparison / Retry Controls */}
        {currentMove && (
          <div className="px-3 pb-3 space-y-2 shrink-0">
            {/* Retry Mode Controls */}
            {isRetryMode ? (
              <div className="flex items-center gap-2">
                {!retrySolved && (
                  <button
                    type="button"
                    onClick={() => setRetryShowHint(!retryShowHint)}
                    className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-amber-300 text-xs font-bold border border-amber-500/40 flex items-center gap-1.5"
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                    <span>{retryShowHint ? '힌트 숨기기' : '정답 위치 힌트'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={startRetryForCurrentMove}
                  className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-bold border border-zinc-700 flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>다시 놓기</span>
                </button>
                <button
                  type="button"
                  onClick={resetRetryMode}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <span>복기 해설로 돌아가기</span>
                </button>
              </div>
            ) : (
              <>
                {/* Interactive "Retry Mistake" CTA Button */}
                {hasBestMove && (
                  <button
                    type="button"
                    data-testid="retry-mistake-btn"
                    onClick={startRetryForCurrentMove}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/30 transition-all active:scale-98"
                  >
                    <Target className="w-4 h-4 shrink-0" />
                    <span>이 장면 직접 다시 두어보기 (실수 교정 훈련)</span>
                  </button>
                )}

                {/* Play from this position vs AI */}
                {onPlayFromPosition && currentMove && (
                  <button
                    type="button"
                    data-testid="play-from-review-pos-btn"
                    onClick={() =>
                      onPlayFromPosition(
                        currentMove.fenBefore,
                        currentMove.color,
                        currentMove.moveNumber
                      )
                    }
                    className="w-full py-2 px-3 rounded-xl bg-zinc-800/90 hover:bg-zinc-750 text-amber-300 hover:text-amber-200 font-bold text-xs border border-zinc-700/80 flex items-center justify-center gap-1.5 transition-all active:scale-98 shadow-sm"
                  >
                    <Bot className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      ♟️ 이 국면({currentMove.moveNumber}수 {currentMove.color === 'w' ? '백' : '흑'} 차례)부터 AI와 대국하기
                    </span>
                  </button>
                )}

                {/* Tactical / Missed Check Callout */}
                {currentMove.missedCheck && (
                  <div className="p-2.5 rounded-xl bg-amber-950/70 border border-amber-500/50 flex items-start gap-2 animate-pulse">
                    <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-amber-200">놓친 체크 기회 포착!</div>
                      <div className="text-[11px] text-amber-300/90 leading-relaxed">
                        이번 수 대신 상대 킹을 체크할 수 있는 기회가 있었습니다.
                      </div>
                    </div>
                  </div>
                )}

                {/* Better Move Example Toggle Bar */}
                {hasBestMove && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setShowBestMove(true)}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          showBestMove
                            ? 'bg-emerald-600 text-white shadow-md ring-1 ring-emerald-400/60'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                        <span>💡 더 좋은 수 예시 ({currentMove.bestMoveSan})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowBestMove(false)}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          !showBestMove
                            ? 'bg-zinc-800 text-amber-300 shadow-md border border-amber-500/40 ring-1 ring-amber-500/30'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <span>내가 둔 수 ({currentMove.san})</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Move Detail Analysis Card */}
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-sm font-bold text-zinc-200 whitespace-nowrap shrink-0">
                        {currentMove.moveNumber}. {currentMove.color === 'b' && '...'}
                        {currentMove.san}
                      </span>
                      {renderQualityBadge(currentMove.quality)}
                    </div>
                    {hasBestMove && currentMove.evalBestScore !== undefined ? (
                      <span className="font-mono text-[11px] font-bold text-zinc-400 whitespace-nowrap shrink-0">
                        최적{' '}
                        <span className="text-emerald-400">
                          {formatScore(currentMove.evalBestScore)}
                        </span>{' '}
                        → 실전{' '}
                        <span className="text-zinc-200">
                          {formatScore(currentMove.scoreAfter)}
                        </span>
                      </span>
                    ) : (
                      <span className="font-mono text-xs font-bold text-zinc-400 whitespace-nowrap shrink-0">
                        평가치: {formatScore(currentMove.scoreAfter)}
                      </span>
                    )}
                  </div>

                  {hasBestMove &&
                  (currentMove.whyPlayedSuboptimal || currentMove.whyBestBetter) ? (
                    <div data-testid="move-coach-explanation" className="space-y-2">
                      {currentMove.whyPlayedSuboptimal && (
                        <div
                          data-testid="why-played-suboptimal"
                          className={`p-2 rounded-lg border space-y-1 ${
                            currentMove.quality === 'blunder'
                              ? 'bg-rose-950/35 border-rose-500/35'
                              : currentMove.quality === 'mistake'
                              ? 'bg-orange-950/35 border-orange-500/35'
                              : currentMove.quality === 'inaccuracy'
                              ? 'bg-amber-950/35 border-amber-500/35'
                              : 'bg-sky-950/30 border-sky-500/30'
                          }`}
                        >
                          <div
                            className={`text-[11px] font-extrabold flex items-center gap-1 ${
                              currentMove.quality === 'blunder'
                                ? 'text-rose-300'
                                : currentMove.quality === 'mistake'
                                ? 'text-orange-300'
                                : currentMove.quality === 'inaccuracy'
                                ? 'text-amber-300'
                                : 'text-sky-300'
                            }`}
                          >
                            <span>
                              {currentMove.quality === 'good'
                                ? `🔍 내가 둔 수 (${currentMove.san}) 비교 분석`
                                : `⚠️ 왜 ${currentMove.san} 대신 다른 수가 좋았을까요?`}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-200 leading-relaxed">
                            {currentMove.whyPlayedSuboptimal}
                          </p>
                          {currentMove.playedLineSan &&
                            currentMove.playedLineSan.length > 0 && (
                              <div className="text-[11px] font-mono text-zinc-400 bg-zinc-950/50 px-2 py-0.5 rounded border border-zinc-800/80 inline-block">
                                상대 예상 응수:{' '}
                                <span className="text-purple-300 font-semibold">
                                  {currentMove.playedLineSan.join(' → ')}
                                </span>
                              </div>
                            )}
                        </div>
                      )}

                      {currentMove.whyBestBetter && (
                        <div
                          data-testid="why-best-better"
                          className="p-2 rounded-lg bg-emerald-950/35 border border-emerald-500/35 space-y-1"
                        >
                          <div className="text-[11px] font-extrabold text-emerald-300 flex items-center gap-1">
                            <span>
                              💡 최적의 수 ({currentMove.bestMoveSan}) 추천 이유
                            </span>
                          </div>
                          <p className="text-xs text-zinc-200 leading-relaxed">
                            {currentMove.whyBestBetter}
                          </p>
                          {currentMove.bestLineSan &&
                            currentMove.bestLineSan.length > 0 && (
                              <div className="text-[11px] font-mono text-zinc-400 bg-zinc-950/50 px-2 py-0.5 rounded border border-zinc-800/80 inline-block">
                                추천 진행 수순:{' '}
                                <span className="text-emerald-300 font-semibold">
                                  {currentMove.bestLineSan.join(' → ')}
                                </span>
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-800/60 p-2 rounded-lg">
                      {currentMove.commentary}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Navigation Controls */}
      <div
        className="shrink-0 bg-zinc-900 border-t border-zinc-800 p-2.5 sm:p-3 mt-auto"
        style={{
          paddingBottom: 'clamp(8px, env(safe-area-inset-bottom, 8px), 20px)',
        }}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <button
            onClick={() => handleSelectIndex(0)}
            disabled={safeIdx === 0}
            className="flex-1 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 flex items-center justify-center active:scale-95 transition-all"
            title="첫 번째 수"
          >
            <ChevronsLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleSelectIndex(Math.max(0, safeIdx - 1))}
            disabled={safeIdx === 0}
            className="flex-1 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 flex items-center justify-center active:scale-95 transition-all"
            title="이전 수"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="px-2 text-xs font-mono font-bold text-zinc-300 text-center shrink-0 min-w-[80px]">
            {filterPlayerOnly
              ? `내 수 ${totalMoves > 0 ? safeIdx + 1 : 0}/${totalMoves}`
              : `${totalMoves > 0 ? safeIdx + 1 : 0}/${totalMoves}`}
          </span>
          <button
            onClick={() => handleSelectIndex(Math.min(totalMoves - 1, safeIdx + 1))}
            disabled={safeIdx >= totalMoves - 1}
            className="flex-1 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 flex items-center justify-center active:scale-95 transition-all"
            title="다음 수"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleSelectIndex(totalMoves - 1)}
            disabled={safeIdx >= totalMoves - 1}
            className="flex-1 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 flex items-center justify-center active:scale-95 transition-all"
            title="마지막 수"
          >
            <ChevronsRight className="w-5 h-5" />
          </button>
        </div>

        {/* Horizontal Mini Move Timeline */}
        <div className="flex gap-1 overflow-x-auto pb-1 max-w-full">
          {displayedMoves.map((m, idx) => {
            const isSelected = idx === safeIdx;
            let dotColor = 'bg-emerald-500';
            if (m.quality === 'good') dotColor = 'bg-sky-500';
            if (m.quality === 'inaccuracy') dotColor = 'bg-amber-400';
            if (m.quality === 'mistake') dotColor = 'bg-orange-500';
            if (m.quality === 'blunder') dotColor = 'bg-rose-500';

            return (
              <button
                key={idx}
                onClick={() => handleSelectIndex(idx)}
                className={`px-2 py-1 rounded text-[11px] font-mono shrink-0 flex items-center gap-1 border transition-all ${
                  isSelected
                    ? 'bg-zinc-700 border-amber-400 text-zinc-100 font-bold shadow-xs'
                    : 'bg-zinc-800 border-zinc-700/60 text-zinc-400 hover:bg-zinc-750'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                <span>
                  {m.moveNumber}.{m.color === 'b' && !filterPlayerOnly ? '..' : ''}
                  {m.san}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
