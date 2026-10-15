import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { ChessBoard } from './ChessBoard';
import { EndgamePuzzle, PieceTheme, BoardTheme } from '../types/chess';
import { ENDGAME_PUZZLES } from '../data/endgames';
import { stockfishService } from '../engine/stockfishService';
import { soundManager } from '../utils/audio';
import {
  Trophy,
  RotateCcw,
  Lightbulb,
  CheckCircle,
  XCircle,
  ArrowLeft,
  BookOpen,
} from 'lucide-react';

interface EndgameViewProps {
  pieceTheme?: PieceTheme;
  boardTheme?: BoardTheme;
}

export const EndgameView: React.FC<EndgameViewProps> = ({
  pieceTheme = 'metal',
  boardTheme = 'marble',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  const [activePuzzle, setActivePuzzle] = useState<EndgamePuzzle | null>(null);

  // Puzzle playing state
  const sessionRef = useRef<number>(0);
  const [chess, setChess] = useState<Chess | null>(null);
  const [statusText, setStatusText] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  const filteredPuzzles = ENDGAME_PUZZLES.filter(
    (p) => selectedCategory === 'all' || p.category === selectedCategory
  );

  const startPuzzle = (puzzle: EndgamePuzzle) => {
    sessionRef.current += 1;
    setIsAiThinking(false);
    const newChess = new Chess(puzzle.fen);
    setActivePuzzle(puzzle);
    setChess(newChess);
    setStatusText(puzzle.goalDescription);
    setIsSuccess(false);
    setLastMove(null);
    setShowExplanation(false);
  };

  const handlePlayerMove = (from: string, to: string, promotion = 'q') => {
    if (!chess || !activePuzzle || isSuccess || isAiThinking) return;

    try {
      const move = chess.move({ from, to, promotion });
      if (!move) return;

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

      // Check success condition
      if (activePuzzle.targetResult === 'checkmate' && nextChess.isCheckmate()) {
        setIsSuccess(true);
        soundManager.victory();
        setStatusText('🎉 성공! 체크메이트를 달성하셨습니다!');
        return;
      }

      if (activePuzzle.targetResult === 'promotion' && move.promotion) {
        setIsSuccess(true);
        soundManager.victory();
        setStatusText('🎉 성공! 폰을 성공적으로 승급시켰습니다!');
        return;
      }

      if (activePuzzle.targetResult === 'draw' && nextChess.isDraw()) {
        setIsSuccess(true);
        soundManager.victory();
        setStatusText('🎉 성공! 완벽한 방어로 무승부를 확보했습니다!');
        return;
      }

      if (nextChess.isGameOver()) {
        setStatusText('게임 종료: 목표가 충족되지 않았습니다.');
        return;
      }

      // AI Response move passing fresh board and session
      triggerAiDefense(nextChess, sessionRef.current);
    } catch {
      // Invalid move
    }
  };

  const triggerAiDefense = async (currentBoard: Chess, session: number = sessionRef.current) => {
    if (!activePuzzle || sessionRef.current !== session) return;
    setIsAiThinking(true);
    setStatusText('상대 AI가 응수하는 중...');

    try {
      const best = await stockfishService.getBestMove(currentBoard.fen(), 9);
      if (sessionRef.current !== session) return;
      if (best) {
        const aiMove = currentBoard.move({
          from: best.from,
          to: best.to,
          promotion: best.promotion || 'q',
        });
        if (aiMove) {
          if (sessionRef.current !== session) return;
          if (aiMove.captured) {
            soundManager.capture();
          } else {
            soundManager.move();
          }

          setLastMove({ from: best.from, to: best.to });
          const nextChess = new Chess(currentBoard.fen());
          setChess(nextChess);

          if (nextChess.isCheck()) {
            soundManager.check();
          }

          if (nextChess.isCheckmate()) {
            soundManager.defeat();
            setStatusText('체크메이트를 당했습니다. 다시 시도해 보세요!');
          } else if (nextChess.isDraw()) {
            if (activePuzzle.targetResult === 'draw') {
              setIsSuccess(true);
              soundManager.victory();
              setStatusText('🎉 성공! 무승부를 지켜냈습니다!');
            } else {
              setStatusText('무승부로 종료되었습니다.');
            }
          } else {
            setStatusText(activePuzzle.goalDescription);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (sessionRef.current === session) {
        setIsAiThinking(false);
      }
    }
  };

  const resetPuzzle = () => {
    if (activePuzzle) {
      startPuzzle(activePuzzle);
    }
  };

  // If in Puzzle Detail Play Mode
  if (activePuzzle && chess) {
    return (
      <div className="flex flex-col max-w-lg mx-auto p-4 space-y-3 pb-24">
        {/* Back and Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              sessionRef.current += 1;
              setIsAiThinking(false);
              setActivePuzzle(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> 목록으로
          </button>
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                activePuzzle.category === 'beginner'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : activePuzzle.category === 'intermediate'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              {activePuzzle.category === 'beginner' ? '초급' : activePuzzle.category === 'intermediate' ? '중급' : '고급'}
            </span>
            <h3 className="text-sm font-bold text-zinc-100 truncate max-w-[200px]">
              {activePuzzle.title}
            </h3>
          </div>
        </div>

        {/* Status / Goal Banner */}
        <div
          className={`p-3 rounded-xl border text-xs leading-relaxed transition-all ${
            isSuccess
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200 font-bold'
              : 'bg-zinc-800/80 border-zinc-700 text-zinc-300'
          }`}
        >
          {statusText}
        </div>

        {/* Board */}
        <ChessBoard
          chess={chess}
          orientation={activePuzzle.playerColor === 'b' ? 'black' : 'white'}
          interactive={!isSuccess && !isAiThinking}
          onMove={handlePlayerMove}
          lastMove={lastMove}
          pieceTheme={pieceTheme}
          boardTheme={boardTheme}
        />

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={resetPuzzle}
            className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-98 text-zinc-200 text-xs font-bold flex items-center justify-center gap-2 border border-zinc-700"
          >
            <RotateCcw className="w-4 h-4" /> 다시 시작
          </button>
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="flex-1 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 active:scale-98 text-xs font-bold flex items-center justify-center gap-2 border border-amber-500/30"
          >
            <Lightbulb className="w-4 h-4" /> 힌트 & 해설
          </button>
        </div>

        {/* Explanation Card */}
        {showExplanation && (
          <div className="p-3.5 rounded-xl bg-zinc-800/90 border border-zinc-700 text-xs text-zinc-300 space-y-2 animate-fadeIn">
            <div>
              <strong className="text-amber-400">💡 힌트:</strong> {activePuzzle.tip}
            </div>
            <div className="border-t border-zinc-700/60 pt-2 text-zinc-400 leading-relaxed">
              <strong className="text-zinc-200">📖 이론 설명:</strong> {activePuzzle.explanation}
            </div>
          </div>
        )}
      </div>
    );
  }

  const beginnerCount = ENDGAME_PUZZLES.filter((p) => p.category === 'beginner').length;
  const intermediateCount = ENDGAME_PUZZLES.filter((p) => p.category === 'intermediate').length;
  const advancedCount = ENDGAME_PUZZLES.filter((p) => p.category === 'advanced').length;

  // Puzzle Selection List View
  return (
    <div className="flex flex-col h-full max-w-lg mx-auto p-4 space-y-4">
      {/* Category Pills */}
      <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
        {[
          { id: 'all' as const, label: `전체 (${ENDGAME_PUZZLES.length})` },
          { id: 'beginner' as const, label: `초급 (${beginnerCount})` },
          { id: 'intermediate' as const, label: `중급 (${intermediateCount})` },
          { id: 'advanced' as const, label: `고급 (${advancedCount})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedCategory(tab.id)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedCategory === tab.id
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid of Puzzles */}
      <div className="grid grid-cols-1 gap-2.5 overflow-y-auto pb-16">
        {filteredPuzzles.map((puzzle) => (
          <div
            key={puzzle.id}
            onClick={() => startPuzzle(puzzle)}
            className="p-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 active:scale-99 transition-all cursor-pointer flex flex-col gap-1.5 group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-zinc-400">#{puzzle.id}</span>
                <h4 className="text-sm font-bold text-zinc-200 group-hover:text-amber-400 transition-colors">
                  {puzzle.title}
                </h4>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  puzzle.category === 'beginner'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : puzzle.category === 'intermediate'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {puzzle.category === 'beginner' ? '초급' : puzzle.category === 'intermediate' ? '중급' : '고급'}
              </span>
            </div>

            <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
              {puzzle.goalDescription}
            </p>

            <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60 text-[11px] text-zinc-500">
              <span>목표: {puzzle.targetResult === 'checkmate' ? '체크메이트' : puzzle.targetResult === 'promotion' ? '폰 승급' : '무승부 방어'}</span>
              <span className="text-amber-400/90 font-medium">실습 시작 →</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
