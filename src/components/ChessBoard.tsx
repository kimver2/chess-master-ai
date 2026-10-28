import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Chess, Square, PieceSymbol, Color } from 'chess.js';
import { ChessPiece, ChessPieceDefs } from './ChessPieces';
import { PieceTheme, BoardTheme } from '../types/chess';

export interface BoardArrow {
  from: string;
  to: string;
  color: string;
  opacity?: number;
}

export interface SquareBadge {
  text: string;
  className: string;
}

export interface PremoveData {
  from: string;
  to: string;
  promotion?: string;
}

interface ChessBoardProps {
  chess: Chess;
  orientation?: 'white' | 'black';
  onMove?: (from: string, to: string, promotion?: string) => boolean | void;
  interactive?: boolean;
  allowPremove?: boolean;
  playerColor?: Color;
  premove?: PremoveData | null;
  onPremoveChange?: (premove: PremoveData | null) => void;
  confirmMoveEnabled?: boolean;
  lastMove?: { from: string; to: string } | null;
  highlightSquares?: { [square: string]: string }; // e.g. { e4: 'bg-green-500/40', e2: 'bg-green-500/20' }
  squareBadges?: { [square: string]: SquareBadge };
  arrows?: BoardArrow[];
  customKingCheckSquare?: string | null;
  pieceTheme?: PieceTheme;
  boardTheme?: BoardTheme;
  rotateTopPieces?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

interface DragGhostState {
  fromSquare: string;
  pieceType: PieceSymbol;
  pieceColor: Color;
  xPct: number;
  yPct: number;
  hoverSquare: string | null;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

const getSquareCoord = (square: string, isFlipped: boolean) => {
  if (!square || square.length < 2) return null;
  const file = square[0].toLowerCase();
  const rank = square[1];
  let fileIdx = file.charCodeAt(0) - 97;
  let rankIdx = 8 - parseInt(rank, 10);
  if (isNaN(fileIdx) || isNaN(rankIdx) || fileIdx < 0 || fileIdx > 7 || rankIdx < 0 || rankIdx > 7) {
    return null;
  }
  if (isFlipped) {
    fileIdx = 7 - fileIdx;
    rankIdx = 7 - rankIdx;
  }
  return {
    x: fileIdx * 12.5 + 6.25,
    y: rankIdx * 12.5 + 6.25,
  };
};

const calculateArrowPath = (
  from: { x: number; y: number },
  to: { x: number; y: number }
): string => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return '';

  const ux = dx / dist;
  const uy = dy / dist;
  const px = -uy;
  const py = ux;

  const scale = Math.min(1, Math.max(0.65, dist / 16));
  const headLen = 4.4 * scale;
  const headWidth = 3.2 * scale;
  const shaftWidth = 1.3;

  const startOffset = 2.4;
  const endOffset = 2.0;

  const sx = from.x + ux * startOffset;
  const sy = from.y + uy * startOffset;
  const tx = to.x - ux * endOffset;
  const ty = to.y - uy * endOffset;

  const bx = tx - ux * headLen;
  const by = ty - uy * headLen;

  return `M ${sx + px * shaftWidth} ${sy + py * shaftWidth} ` +
         `L ${bx + px * shaftWidth} ${by + py * shaftWidth} ` +
         `L ${bx + px * headWidth} ${by + py * headWidth} ` +
         `L ${tx} ${ty} ` +
         `L ${bx - px * headWidth} ${by - py * headWidth} ` +
         `L ${bx - px * shaftWidth} ${by - py * shaftWidth} ` +
         `L ${sx - px * shaftWidth} ${sy - py * shaftWidth} Z`;
};

const getPremoveTargets = (
  fromSquare: string,
  pieceType: PieceSymbol,
  pieceColor: Color
): string[] => {
  if (!fromSquare || fromSquare.length < 2) return [];
  const f = fromSquare.charCodeAt(0) - 97;
  const r = parseInt(fromSquare[1], 10) - 1;
  if (f < 0 || f > 7 || r < 0 || r > 7) return [];

  const targets: string[] = [];
  const addSq = (nf: number, nr: number) => {
    if (nf >= 0 && nf <= 7 && nr >= 0 && nr <= 7 && !(nf === f && nr === r)) {
      targets.push(`${String.fromCharCode(97 + nf)}${nr + 1}`);
    }
  };

  if (pieceType === 'p') {
    const dir = pieceColor === 'w' ? 1 : -1;
    const homeRank = pieceColor === 'w' ? 1 : 6;
    addSq(f, r + dir);
    if (r === homeRank) addSq(f, r + dir * 2);
    addSq(f - 1, r + dir);
    addSq(f + 1, r + dir);
  } else if (pieceType === 'n') {
    const jumps = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1],
    ];
    for (const [df, dr] of jumps) addSq(f + df, r + dr);
  } else if (pieceType === 'k') {
    for (let df = -1; df <= 1; df++) {
      for (let dr = -1; dr <= 1; dr++) {
        if (df !== 0 || dr !== 0) addSq(f + df, r + dr);
      }
    }
    if (pieceColor === 'w' && fromSquare === 'e1') {
      addSq(6, 0);
      addSq(2, 0);
    } else if (pieceColor === 'b' && fromSquare === 'e8') {
      addSq(6, 7);
      addSq(2, 7);
    }
  } else {
    const dirs: Array<[number, number]> = [];
    if (pieceType === 'b' || pieceType === 'q') {
      dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
    }
    if (pieceType === 'r' || pieceType === 'q') {
      dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
    }
    for (const [df, dr] of dirs) {
      for (let step = 1; step <= 7; step++) {
        addSq(f + df * step, r + dr * step);
      }
    }
  }
  return targets;
};

const ChessBoardInner: React.FC<ChessBoardProps> = ({
  chess,
  orientation = 'white',
  onMove,
  interactive = true,
  allowPremove = false,
  playerColor,
  premove = null,
  onPremoveChange,
  confirmMoveEnabled = false,
  lastMove,
  highlightSquares = {},
  squareBadges = {},
  arrows = [],
  customKingCheckSquare,
  pieceTheme = 'metal',
  boardTheme = 'marble',
  rotateTopPieces = false,
  className,
  style,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);
  const [pendingConfirmMove, setPendingConfirmMove] = useState<{
    from: string;
    to: string;
    usedDrag: boolean;
  } | null>(null);
  const [dragGhost, setDragGhost] = useState<DragGhostState | null>(null);

  const isPremoveMode = !interactive && Boolean(allowPremove && playerColor && onPremoveChange);
  const canInteractBoard = interactive || isPremoveMode;
  const controllableColor: Color = interactive ? chess.turn() : (playerColor || chess.turn());

  const boardRef = useRef<HTMLDivElement | null>(null);
  const pieceWrapperRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const prevFenRef = useRef<string>(chess.fen());
  const skipNextSlideAnimRef = useRef<string | null>(null);
  const suppressNextClickRef = useRef<boolean>(false);

  const pointerTrackRef = useRef<{
    pointerId: number;
    fromSquare: string;
    pieceType: PieceSymbol;
    pieceColor: Color;
    startX: number;
    startY: number;
    isDragging: boolean;
  } | null>(null);

  const currentFen = chess.fen();
  useEffect(() => {
    setSelectedSquare(null);
    setPendingPromotion(null);
    setPendingConfirmMove(null);
    setDragGhost(null);
    pointerTrackRef.current = null;
  }, [currentFen, interactive, isPremoveMode]);

  const isFlipped = orientation === 'black';
  const displayFiles = isFlipped ? [...FILES].reverse() : FILES;
  const displayRanks = isFlipped ? [...RANKS].reverse() : RANKS;

  // Smooth sliding piece animation on tap/AI/opponent moves
  useLayoutEffect(() => {
    if (prevFenRef.current === currentFen) return;
    prevFenRef.current = currentFen;

    if (!lastMove?.from || !lastMove?.to) return;
    const moveKey = `${lastMove.from}-${lastMove.to}`;
    if (skipNextSlideAnimRef.current === moveKey) {
      skipNextSlideAnimRef.current = null;
      return;
    }

    const fromCoord = getSquareCoord(lastMove.from, isFlipped);
    const toCoord = getSquareCoord(lastMove.to, isFlipped);
    const targetEl = pieceWrapperRefs.current[lastMove.to];

    if (fromCoord && toCoord && targetEl && typeof targetEl.animate === 'function') {
      const dxSquares = (fromCoord.x - toCoord.x) / 12.5;
      const dySquares = (fromCoord.y - toCoord.y) / 12.5;
      try {
        targetEl.animate(
          [
            { transform: `translate(${dxSquares * 100}%, ${dySquares * 100}%)` },
            { transform: 'translate(0%, 0%)' },
          ],
          {
            duration: 190,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          }
        );
      } catch {
        // Fallback silently if Web Animations API fails
      }
    }
  }, [currentFen, lastMove?.from, lastMove?.to, isFlipped]);

  // Helper to resolve board square from clientX, clientY
  const resolveSquareAtClientPoint = (clientX: number, clientY: number): string | null => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return null;
    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      return null;
    }
    const colIdx = Math.min(7, Math.max(0, Math.floor(((clientX - rect.left) / rect.width) * 8)));
    const rowIdx = Math.min(7, Math.max(0, Math.floor(((clientY - rect.top) / rect.height) * 8)));
    const file = displayFiles[colIdx];
    const rank = displayRanks[rowIdx];
    return file && rank ? `${file}${rank}` : null;
  };

  // Find king square in check
  let inCheckSquare: string | null = null;
  if (customKingCheckSquare !== undefined) {
    inCheckSquare = customKingCheckSquare;
  } else if (chess.isCheck()) {
    const turn = chess.turn();
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'k' && piece.color === turn) {
          inCheckSquare = `${FILES[c]}${8 - r}`;
          break;
        }
      }
    }
  }

  // Get legal destination squares (or premove pseudo-targets) for currently selected piece
  const legalMovesForSelected: string[] = (() => {
    if (!selectedSquare) return [];
    if (interactive) {
      return chess
        .moves({ square: selectedSquare as Square, verbose: true })
        .map((m) => m.to as string);
    }
    if (isPremoveMode) {
      const p = chess.get(selectedSquare as Square);
      if (p && p.color === controllableColor) {
        return getPremoveTargets(selectedSquare, p.type, p.color);
      }
    }
    return [];
  })();

  const commitMoveOrPromptPromotion = (from: string, to: string, usedDrag = false) => {
    if (!onMove) return;
    const piece = chess.get(from as Square);
    if (
      piece &&
      piece.type === 'p' &&
      ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'))
    ) {
      if (usedDrag) {
        skipNextSlideAnimRef.current = `${from}-${to}`;
      }
      setPendingPromotion({ from, to });
      return;
    }

    if (usedDrag) {
      skipNextSlideAnimRef.current = `${from}-${to}`;
    }
    onMove(from, to);
    setSelectedSquare(null);
  };

  const executeMoveOrPromptPromotion = (from: string, to: string, usedDrag = false) => {
    if (isPremoveMode && onPremoveChange) {
      const piece = chess.get(from as Square);
      const isPromo =
        piece &&
        piece.type === 'p' &&
        ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'));
      onPremoveChange({ from, to, ...(isPromo ? { promotion: 'q' } : {}) });
      setSelectedSquare(null);
      return;
    }

    if (confirmMoveEnabled) {
      setPendingConfirmMove({ from, to, usedDrag });
      setSelectedSquare(null);
      return;
    }

    commitMoveOrPromptPromotion(from, to, usedDrag);
  };

  // Pointer Drag-and-Drop Handlers
  const handleGridPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canInteractBoard || pendingPromotion || pendingConfirmMove) return;
    if (interactive && !onMove) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const sq = resolveSquareAtClientPoint(e.clientX, e.clientY);
    if (!sq) return;

    const piece = chess.get(sq as Square);
    if (piece && piece.color === controllableColor) {
      pointerTrackRef.current = {
        pointerId: e.pointerId,
        fromSquare: sq,
        pieceType: piece.type,
        pieceColor: piece.color,
        startX: e.clientX,
        startY: e.clientY,
        isDragging: false,
      };
    } else {
      pointerTrackRef.current = null;
    }
  };

  const handleGridPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const track = pointerTrackRef.current;
    if (!track || track.pointerId !== e.pointerId) return;

    const dist = Math.hypot(e.clientX - track.startX, e.clientY - track.startY);
    if (!track.isDragging && dist > 6) {
      track.isDragging = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
      setSelectedSquare(track.fromSquare);
    }

    if (track.isDragging) {
      const rect = boardRef.current?.getBoundingClientRect();
      if (!rect || rect.width <= 0 || rect.height <= 0) return;

      const xPct = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
      const yPct = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
      const hoverSquare = resolveSquareAtClientPoint(e.clientX, e.clientY);

      setDragGhost({
        fromSquare: track.fromSquare,
        pieceType: track.pieceType,
        pieceColor: track.pieceColor,
        xPct,
        yPct,
        hoverSquare,
      });
    }
  };

  const finishPointerInteraction = (
    e: React.PointerEvent<HTMLDivElement>,
    cancelled: boolean
  ) => {
    const track = pointerTrackRef.current;
    if (!track || track.pointerId !== e.pointerId) return;
    pointerTrackRef.current = null;

    if (!track.isDragging) {
      return; // Let normal onClick handle tap-to-tap!
    }

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    suppressNextClickRef.current = true;
    setTimeout(() => {
      suppressNextClickRef.current = false;
    }, 100);

    setDragGhost(null);

    if (cancelled) return;

    const dropSquare = resolveSquareAtClientPoint(e.clientX, e.clientY);
    if (!dropSquare || dropSquare === track.fromSquare) {
      return;
    }

    const legalDests = interactive
      ? chess
          .moves({ square: track.fromSquare as Square, verbose: true })
          .map((m) => m.to as string)
      : isPremoveMode
      ? getPremoveTargets(track.fromSquare, track.pieceType, track.pieceColor)
      : [];

    if (legalDests.includes(dropSquare)) {
      executeMoveOrPromptPromotion(track.fromSquare, dropSquare, true);
    } else {
      const targetPiece = chess.get(dropSquare as Square);
      if (targetPiece && targetPiece.color === controllableColor) {
        setSelectedSquare(dropSquare);
      } else {
        setSelectedSquare(null);
      }
    }
  };

  const handleSquareClick = (square: string) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    if (!canInteractBoard || pendingPromotion) return;
    if (interactive && !onMove) return;

    if (pendingConfirmMove) {
      setPendingConfirmMove(null);
      return;
    }

    // If a premove is already set and user taps when no square is selected, cancel premove unless tapping own piece to start a new premove
    if (isPremoveMode && premove && !selectedSquare) {
      onPremoveChange?.(null);
      const tappedPiece = chess.get(square as Square);
      if (tappedPiece && tappedPiece.color === controllableColor && square !== premove.from) {
        setSelectedSquare(square);
      }
      return;
    }

    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        return;
      }

      if (legalMovesForSelected.includes(square)) {
        executeMoveOrPromptPromotion(selectedSquare, square, false);
        return;
      }
    }

    const piece = chess.get(square as Square);
    if (piece && piece.color === controllableColor) {
      setSelectedSquare(square);
    } else {
      setSelectedSquare(null);
    }
  };

  const handlePromotionChoice = (promoPiece: 'q' | 'r' | 'b' | 'n') => {
    if (pendingPromotion && onMove) {
      onMove(pendingPromotion.from, pendingPromotion.to, promoPiece);
    }
    setPendingPromotion(null);
    setSelectedSquare(null);
  };

  // Combine caller arrows with Premove / Move Confirmation preview arrows
  const combinedArrows: BoardArrow[] = [...arrows];
  if (premove) {
    combinedArrows.push({
      from: premove.from,
      to: premove.to,
      color: '#38bdf8',
      opacity: 0.92,
    });
  }
  if (pendingConfirmMove) {
    combinedArrows.push({
      from: pendingConfirmMove.from,
      to: pendingConfirmMove.to,
      color: '#10b981',
      opacity: 0.95,
    });
  }

  const isTexturedBoard = boardTheme !== 'classic';
  const shouldRotatePiece = (pieceColor: Color) => {
    if (!rotateTopPieces) return false;
    return isFlipped ? pieceColor === 'w' : pieceColor === 'b';
  };

  return (
    <div
      ref={boardRef}
      className={`relative aspect-square mx-auto select-none rounded-xl overflow-hidden shadow-2xl border-2 border-zinc-800 bg-zinc-900 shrink-0 ${className || 'w-full max-w-[380px]'}`}
      style={{
        backgroundImage: isTexturedBoard ? `url(/boards/${boardTheme}.png)` : undefined,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        ...style,
      }}
    >
      <ChessPieceDefs />
      {/* 8x8 Board Grid */}
      <div
        className="w-full h-full grid grid-cols-8 grid-rows-8"
        style={{ touchAction: canInteractBoard ? 'none' : 'auto' }}
        onPointerDown={handleGridPointerDown}
        onPointerMove={handleGridPointerMove}
        onPointerUp={(e) => finishPointerInteraction(e, false)}
        onPointerCancel={(e) => finishPointerInteraction(e, true)}
      >
        {displayRanks.map((rank, rankIdx) =>
          displayFiles.map((file, fileIdx) => {
            const square = `${file}${rank}`;
            const piece = chess.get(square as Square);
            const isLight = (fileIdx + rankIdx) % 2 === 0;

            const isSelected = selectedSquare === square;
            const isLegalDest = legalMovesForSelected.includes(square);
            const isLastMoveFrom = lastMove?.from === square;
            const isLastMoveTo = lastMove?.to === square;
            const isPremoveSq = premove?.from === square || premove?.to === square;
            const isConfirmSq =
              pendingConfirmMove?.from === square || pendingConfirmMove?.to === square;
            const isKingInCheck = inCheckSquare === square;
            const customHighlight = highlightSquares[square];
            const isDragSource = dragGhost?.fromSquare === square;
            const isDragHoverTarget =
              dragGhost?.hoverSquare === square && isLegalDest;

            // Background square styling
            let bgClass = isTexturedBoard
              ? 'bg-transparent'
              : isLight
              ? 'bg-amber-100'
              : 'bg-emerald-700';

            if (isDragHoverTarget) {
              bgClass = isPremoveMode
                ? 'bg-sky-400/55 ring-3 ring-inset ring-sky-300'
                : 'bg-emerald-400/55 ring-3 ring-inset ring-emerald-300';
            } else if (isConfirmSq) {
              bgClass = 'bg-emerald-500/50 ring-2 ring-inset ring-emerald-300';
            } else if (isPremoveSq) {
              bgClass = 'bg-sky-500/45 ring-2 ring-inset ring-sky-300';
            } else if (customHighlight) {
              bgClass = customHighlight;
            } else if (isKingInCheck) {
              bgClass = 'bg-red-500/75 animate-pulse';
            } else if (isSelected) {
              bgClass = isPremoveMode
                ? 'bg-sky-400/45 ring-2 ring-inset ring-sky-300'
                : isTexturedBoard
                ? 'bg-amber-400/50 ring-2 ring-inset ring-amber-400'
                : 'bg-amber-300 ring-2 ring-inset ring-amber-500';
            } else if (isLastMoveFrom || isLastMoveTo) {
              bgClass = isTexturedBoard
                ? 'bg-yellow-400/35 ring-1 ring-inset ring-yellow-400/50'
                : isLight
                ? 'bg-yellow-200/90'
                : 'bg-emerald-600/90';
            }

            const effectiveBadge: SquareBadge | undefined =
              squareBadges?.[square] ||
              (premove?.to === square
                ? { text: '⚡ 예약', className: 'bg-sky-600 text-white ring-1 ring-sky-300' }
                : undefined);

            return (
              <div
                key={square}
                data-square={square}
                onClick={() => handleSquareClick(square)}
                className={`relative flex items-center justify-center cursor-pointer transition-colors duration-150 ${
                  isLastMoveTo ? 'z-10' : ''
                } ${bgClass}`}
              >
                {/* Board Rank & File Labels on edges */}
                {fileIdx === 0 && (
                  <span
                    className={`absolute top-0.5 left-1 text-[9px] font-bold pointer-events-none ${
                      isTexturedBoard
                        ? 'text-amber-100/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]'
                        : isLight
                        ? 'text-emerald-800/80'
                        : 'text-amber-100/70'
                    }`}
                  >
                    {rank}
                  </span>
                )}
                {rankIdx === 7 && (
                  <span
                    className={`absolute bottom-0.5 right-1 text-[9px] font-bold pointer-events-none ${
                      isTexturedBoard
                        ? 'text-amber-100/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]'
                        : isLight
                        ? 'text-emerald-800/80'
                        : 'text-amber-100/70'
                    }`}
                  >
                    {file}
                  </span>
                )}

                {/* Chess Piece */}
                {piece && (
                  <div
                    ref={(el) => {
                      pieceWrapperRefs.current[square] = el;
                    }}
                    className={`w-full h-full flex items-center justify-center pointer-events-none ${
                      isDragSource ? 'opacity-30 scale-90' : ''
                    }`}
                  >
                    <div
                      className={`w-[88%] h-[88%] flex items-center justify-center drop-shadow-md transition-transform ${
                        shouldRotatePiece(piece.color) ? 'rotate-180' : ''
                      }`}
                    >
                      <ChessPiece type={piece.type} color={piece.color} theme={pieceTheme} />
                    </div>
                  </div>
                )}

                {/* Legal / Premove Indicator */}
                {isLegalDest && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {piece ? (
                      <div
                        className={`w-full h-full rounded-full border-4 ${
                          isPremoveMode
                            ? 'border-sky-400/75 ring-2 ring-sky-300/35'
                            : 'border-amber-400/80 ring-2 ring-amber-400/40'
                        }`}
                      />
                    ) : (
                      <div
                        className={`w-3.5 h-3.5 rounded-full shadow-md ${
                          isPremoveMode
                            ? 'bg-sky-400/80 ring-2 ring-sky-300/35'
                            : 'bg-amber-400/85 ring-2 ring-amber-300/40'
                        }`}
                      />
                    )}
                  </div>
                )}

                {/* Custom Square Badge (e.g. '내 착수', '최적', '⚡ 예약') */}
                {effectiveBadge && (
                  <div className="absolute top-0.5 right-0.5 z-10 pointer-events-none">
                    <span
                      className={`px-1 py-0.2 rounded text-[8px] font-black leading-tight shadow-md select-none ${effectiveBadge.className}`}
                    >
                      {effectiveBadge.text}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Floating Dragged Piece Ghost */}
      {dragGhost && (
        <div
          className="absolute pointer-events-none z-30 flex items-center justify-center"
          style={{
            width: '15%',
            height: '15%',
            left: `${dragGhost.xPct}%`,
            top: `${dragGhost.yPct}%`,
            transform: `translate(-50%, -62%) ${
              shouldRotatePiece(dragGhost.pieceColor) ? 'rotate(180deg)' : ''
            }`,
            filter: 'drop-shadow(0 10px 14px rgba(0,0,0,0.65))',
          }}
        >
          <ChessPiece
            type={dragGhost.pieceType}
            color={dragGhost.pieceColor}
            theme={pieceTheme}
          />
        </div>
      )}

      {/* SVG Arrows Layer for Moves / Best Moves / Premoves */}
      {combinedArrows.length > 0 && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-20"
          viewBox="0 0 100 100"
        >
          {combinedArrows.map((arr, idx) => {
            const fromCoord = getSquareCoord(arr.from, isFlipped);
            const toCoord = getSquareCoord(arr.to, isFlipped);
            if (!fromCoord || !toCoord) return null;
            const pathData = calculateArrowPath(fromCoord, toCoord);
            if (!pathData) return null;
            return (
              <path
                key={idx}
                d={pathData}
                fill={arr.color}
                fillOpacity={arr.opacity ?? 0.85}
                filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.75))"
              />
            );
          })}
        </svg>
      )}

      {/* Active Premove Cancel Pill */}
      {premove && onPremoveChange && (
        <button
          type="button"
          data-testid="cancel-premove-btn"
          onClick={() => onPremoveChange(null)}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded-full bg-sky-950/95 hover:bg-sky-900 border border-sky-400/70 text-sky-200 text-[11px] font-black flex items-center gap-1.5 shadow-xl whitespace-nowrap"
        >
          <span>⚡ 예약 착수 ({premove.from}→{premove.to})</span>
          <span className="text-sky-400">✕ 취소</span>
        </button>
      )}

      {/* Move Confirmation Floating Bar */}
      {pendingConfirmMove && (
        <div
          data-testid="confirm-move-bar"
          className="absolute bottom-2 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-zinc-950/95 border border-emerald-400/70 shadow-2xl backdrop-blur-md whitespace-nowrap"
        >
          <button
            type="button"
            data-testid="confirm-move-yes"
            onClick={() => {
              const { from, to, usedDrag } = pendingConfirmMove;
              setPendingConfirmMove(null);
              commitMoveOrPromptPromotion(from, to, usedDrag);
            }}
            className="px-3 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black transition-all active:scale-95"
          >
            ✓ 착수 확정 ({pendingConfirmMove.from}→{pendingConfirmMove.to})
          </button>
          <button
            type="button"
            data-testid="confirm-move-no"
            onClick={() => setPendingConfirmMove(null)}
            className="px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all"
          >
            ✕ 취소
          </button>
        </div>
      )}

      {/* Pawn Promotion Modal */}
      {pendingPromotion && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-700 shadow-2xl flex flex-col items-center">
            <span className="text-sm font-semibold text-zinc-200 mb-3">승급할 기물 선택</span>
            <div className="flex gap-3">
              {(['q', 'r', 'b', 'n'] as const).map((pType) => (
                <button
                  key={pType}
                  onClick={() => handlePromotionChoice(pType)}
                  className="w-14 h-14 p-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 active:scale-95 transition-all flex items-center justify-center border border-zinc-600 shadow"
                >
                  <ChessPiece type={pType} color={chess.turn()} theme={pieceTheme} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function areBoardPropsEqual(prev: ChessBoardProps, next: ChessBoardProps): boolean {
  return (
    prev.chess.fen() === next.chess.fen() &&
    prev.orientation === next.orientation &&
    prev.interactive === next.interactive &&
    prev.allowPremove === next.allowPremove &&
    prev.playerColor === next.playerColor &&
    prev.confirmMoveEnabled === next.confirmMoveEnabled &&
    prev.pieceTheme === next.pieceTheme &&
    prev.boardTheme === next.boardTheme &&
    prev.rotateTopPieces === next.rotateTopPieces &&
    prev.className === next.className &&
    prev.customKingCheckSquare === next.customKingCheckSquare &&
    prev.lastMove?.from === next.lastMove?.from &&
    prev.lastMove?.to === next.lastMove?.to &&
    prev.premove?.from === next.premove?.from &&
    prev.premove?.to === next.premove?.to &&
    prev.premove?.promotion === next.premove?.promotion &&
    prev.highlightSquares === next.highlightSquares &&
    prev.squareBadges === next.squareBadges &&
    prev.arrows === next.arrows &&
    prev.onMove === next.onMove &&
    prev.onPremoveChange === next.onPremoveChange
  );
}

export const ChessBoard = React.memo(ChessBoardInner, areBoardPropsEqual);
