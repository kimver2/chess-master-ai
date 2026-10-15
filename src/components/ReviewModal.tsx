import React, { useState } from 'react';
import { Chess } from 'chess.js';
import { ChessBoard, BoardArrow, SquareBadge } from './ChessBoard';
import { GameReviewData, MoveAnalysis, PieceTheme, BoardTheme } from '../types/chess';
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
} from 'lucide-react';

interface ReviewModalProps {
  reviewData: GameReviewData;
  onClose: () => void;
  playerColor: 'w' | 'b';
  pieceTheme?: PieceTheme;
  boardTheme?: BoardTheme;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  reviewData,
  onClose,
  playerColor,
  pieceTheme = 'metal',
  boardTheme = 'marble',
}) => {
  const isBadMove = (move?: MoveAnalysis) => {
    if (!move) return false;
    const isQualityBad =
      move.quality === 'inaccuracy' || move.quality === 'mistake' || move.quality === 'blunder';
    return isQualityBad && !!move.bestMoveSan && move.bestMoveSan !== move.san;
  };

  // Filter: default to true (see ONLY player moves, not opponent moves)
  const [filterPlayerOnly, setFilterPlayerOnly] = useState<boolean>(true);

  const displayedMoves = filterPlayerOnly
    ? reviewData.moves.filter((m) => m.color === playerColor)
    : reviewData.moves;

  // Start with the first mistake/blunder by player if exists, otherwise first move
  const [selectedIdx, setSelectedIdx] = useState<number>(() => {
    const playerMoves = reviewData.moves.filter((m) => m.color === playerColor);
    const firstBad = playerMoves.findIndex((m) => isBadMove(m));
    return firstBad !== -1 ? firstBad : 0;
  });

  const totalMoves = displayedMoves.length;
  const safeIdx = Math.min(selectedIdx, Math.max(0, totalMoves - 1));
  const currentMove: MoveAnalysis | undefined = displayedMoves[safeIdx];

  const [showBestMove, setShowBestMove] = useState<boolean>(() => {
    const playerMoves = reviewData.moves.filter((m) => m.color === playerColor);
    const firstBad = playerMoves.findIndex((m) => isBadMove(m));
    const initialMove = playerMoves[firstBad !== -1 ? firstBad : 0];
    return isBadMove(initialMove);
  });

  // Navigate to index with automatic "Show Best Move First" for mistakes/blunders/inaccuracies
  const handleSelectIndex = (idx: number) => {
    setSelectedIdx(idx);
    const targetMove = displayedMoves[idx];
    if (isBadMove(targetMove)) {
      setShowBestMove(true);
    } else {
      setShowBestMove(false);
    }
  };

  const handleToggleFilter = (playerOnly: boolean) => {
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

  // Reconstruct board at currentPly
  const currentChess = new Chess();
  if (currentMove) {
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
  let myArrowColor = '#38bdf8'; // sky default

  if (currentMove) {
    // Determine player's move colors based on quality
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
      const bestFrom = currentMove.bestMoveUci.substring(0, 2);
      const bestTo = currentMove.bestMoveUci.substring(2, 4);

      // Best Move highlights (Vibrant Emerald Green)
      if (bestFrom === currentMove.from) {
        highlights[bestFrom] =
          'bg-gradient-to-br from-emerald-500/50 via-amber-500/40 to-amber-500/50 ring-2 ring-inset ring-emerald-400';
      } else {
        highlights[bestFrom] = 'bg-emerald-500/40 ring-2 ring-inset ring-emerald-400';
        highlights[currentMove.from] = myColorBg;
      }

      highlights[bestTo] = 'bg-emerald-500/65 ring-2 ring-inset ring-emerald-300 shadow-inner';
      highlights[currentMove.to] = myColorBg;

      // Badges
      squareBadges[bestTo] = {
        text: '💡 최적',
        className: 'bg-emerald-600 text-white ring-1 ring-emerald-300 shadow-sm',
      };
      squareBadges[currentMove.to] = {
        text: '내 착수',
        className: myBadgeClass,
      };

      // Both Arrows with distinct colors
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
      // Best / Good move where player already played best move
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

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col max-w-lg mx-auto overflow-hidden">
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

      {/* Accuracy & Stats Cards */}
      <div className="grid grid-cols-2 gap-2 p-3 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <div
          className={`p-2.5 rounded-xl border transition-all ${
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
          className={`p-2.5 rounded-xl border transition-all ${
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

      {/* Review Filter Mode Bar: '내 수만 보기 (기본)' vs '전체 수 보기' */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/90 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-zinc-300">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="font-semibold">
            {filterPlayerOnly ? '내가 둔 수만 복기' : '전체 수 복기'}
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

      {/* Chess Board Area with Dual Move Color Comparison */}
      <div className="p-2 flex-1 flex flex-col items-center justify-center min-h-0 overflow-hidden">
        {/* Dynamic Board Color Legend */}
        {currentMove && hasBestMove && (
          <div className="flex items-center justify-between px-2.5 py-1 bg-zinc-900/90 rounded-lg border border-zinc-800 text-[11px] mb-1.5 w-full max-w-[380px] shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1 font-bold text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-xs shadow-emerald-500/60" />
                최적의 수 ({currentMove.bestMoveSan})
              </span>
              <span className="text-zinc-600 font-bold">vs</span>
              <span className="flex items-center gap-1 font-bold" style={{ color: myArrowColor }}>
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block shadow-xs"
                  style={{ backgroundColor: myArrowColor }}
                />
                내가 둔 수 ({currentMove.san})
              </span>
            </div>
            <span className="text-[10px] text-zinc-400 font-medium hidden sm:inline">체스판 위 색상 비교</span>
          </div>
        )}

        <ChessBoard
          chess={currentChess}
          orientation={playerColor === 'b' ? 'black' : 'white'}
          interactive={false}
          highlightSquares={highlights}
          squareBadges={squareBadges}
          arrows={arrows}
          pieceTheme={pieceTheme}
          boardTheme={boardTheme}
        />
      </div>

      {/* Move Info & Comparison Controls */}
      {currentMove && (
        <div className="px-3 pb-2 space-y-2 shrink-0">
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

          {/* Better Move Example Toggle Bar (Shows Better Move First for Mistake/Blunder) */}
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

              {/* Informational Banner depending on active view */}
              {showBestMove ? (
                <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-between text-xs text-emerald-200">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-[11px]">
                      추천 수 <strong>{currentMove.bestMoveSan}</strong>을(를) 두었을 때의 보드 상황입니다.
                    </span>
                  </div>
                  <button
                    onClick={() => setShowBestMove(false)}
                    className="text-[11px] underline text-emerald-300 font-bold shrink-0 ml-2"
                  >
                    내 착수 보기
                  </button>
                </div>
              ) : (
                <div className="p-2 rounded-xl bg-zinc-850 border border-zinc-700/60 flex items-center justify-between text-xs text-zinc-300">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-[11px]">
                      실제 둔 수: <strong>{currentMove.san}</strong> ({currentMove.quality === 'blunder' ? '치명적 악수' : currentMove.quality === 'mistake' ? '실수' : '아쉬운 수'})
                    </span>
                  </div>
                  <button
                    onClick={() => setShowBestMove(true)}
                    className="text-[11px] text-emerald-400 font-bold shrink-0 ml-2 underline"
                  >
                    더 좋은 수 보기
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Move Detail Analysis Card */}
          <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-zinc-200">
                  {currentMove.moveNumber}. {currentMove.color === 'b' && '...'}
                  {currentMove.san}
                </span>
                {renderQualityBadge(currentMove.quality)}
              </div>
              <span className="font-mono text-xs font-bold text-zinc-400">
                평가치: {formatScore(currentMove.scoreAfter)}
              </span>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-800/60 p-2 rounded-lg">
              {currentMove.commentary}
            </p>
          </div>
        </div>
      )}

      {/* Navigation Controls */}
      <div
        className="shrink-0 bg-zinc-900 border-t border-zinc-800 p-3 mt-auto"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)',
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
