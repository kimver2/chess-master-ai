import React from 'react';

interface EvalBarProps {
  score: number | null; // Centipawns from White's perspective (+ is white advantage, - is black advantage)
  orientation?: 'white' | 'black';
  isLoading?: boolean;
}

/**
 * Calculates winning probability percentage (0 to 100) from centipawn score.
 * Uses the standard chess logistic formula: 1 / (1 + 10^(-score / 400)) * 100.
 */
function getWhitePercentage(score: number | null): number {
  if (score === null) return 50;
  if (score >= 8000) return 100;
  if (score <= -8000) return 0;

  const winProbability = 1 / (1 + Math.pow(10, -score / 400));
  const pct = winProbability * 100;

  // Clamp to 5% - 95% unless forced checkmate
  return Math.min(96, Math.max(4, pct));
}

function formatScore(score: number | null): string {
  if (score === null) return '0.0';
  if (score >= 8000) {
    const mateIn = Math.max(1, Math.round((10000 - score) / 100));
    return `M${mateIn}`;
  }
  if (score <= -8000) {
    const mateIn = Math.max(1, Math.round((10000 + score) / 100));
    return `-M${mateIn}`;
  }
  const pawns = score / 100;
  if (Math.abs(pawns) < 0.05) return '0.0';
  return `${pawns > 0 ? '+' : ''}${pawns.toFixed(1)}`;
}

export const EvalBar: React.FC<EvalBarProps> = ({
  score,
  orientation = 'white',
  isLoading = false,
}) => {
  const whitePct = getWhitePercentage(score);
  const isFlipped = orientation === 'black';

  // Percentage of the BOTTOM portion of the vertical bar
  // If orientation is white, bottom is White (whitePct).
  // If orientation is black, bottom is Black (100 - whitePct).
  const bottomPct = isFlipped ? 100 - whitePct : whitePct;
  const scoreText = formatScore(score);
  const isWhiteFavored = (score ?? 0) >= 0;

  return (
    <div
      className="relative flex flex-col justify-end w-5 sm:w-6 h-full rounded-lg overflow-hidden border border-zinc-700/80 bg-zinc-900 shadow-xl select-none shrink-0"
      title={`형세 평가: ${scoreText} (${scoreText.startsWith('+') ? '백 유리' : scoreText.startsWith('-') ? '흑 유리' : '동등'})`}
    >
      {/* Black's portion (top) */}
      <div
        className="w-full bg-zinc-950 transition-[height] duration-500 ease-out flex items-start justify-center pt-1"
        style={{ height: `${100 - bottomPct}%` }}
      >
        {/* If Black is favored and oriented at top, show text here */}
        {!isFlipped && !isWhiteFavored && (
          <span className="text-[10px] font-black text-zinc-100 tracking-tighter drop-shadow-sm px-0.5">
            {scoreText}
          </span>
        )}
        {isFlipped && isWhiteFavored && (
          <span className="text-[10px] font-black text-zinc-100 tracking-tighter drop-shadow-sm px-0.5">
            {scoreText}
          </span>
        )}
      </div>

      {/* White's portion (bottom) */}
      <div
        className="w-full bg-gradient-to-t from-zinc-100 to-zinc-200 transition-[height] duration-500 ease-out flex items-end justify-center pb-1"
        style={{ height: `${bottomPct}%` }}
      >
        {/* If White is favored and oriented at bottom, show text here */}
        {!isFlipped && isWhiteFavored && (
          <span className="text-[10px] font-black text-zinc-900 tracking-tighter drop-shadow-xs px-0.5">
            {scoreText}
          </span>
        )}
        {isFlipped && !isWhiteFavored && (
          <span className="text-[10px] font-black text-zinc-900 tracking-tighter drop-shadow-xs px-0.5">
            {scoreText}
          </span>
        )}
      </div>

      {/* Loading pulse indicator */}
      {isLoading && (
        <div className="absolute inset-0 bg-amber-400/10 animate-pulse pointer-events-none" />
      )}
    </div>
  );
};
