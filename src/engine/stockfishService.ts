import { Chess } from 'chess.js';
import {
  DifficultyLevel,
  MoveAnalysis,
  MoveQuality,
  GameReviewData,
  PlayerStats,
  PieceColor,
} from '../types/chess';
import { explainSuboptimalMove } from '../utils/moveExplainer';

interface EvalResult {
  score: number; // centipawns from White's perspective (+ is white advantage, - is black advantage)
  bestMoveUci?: string;
  pvUci?: string[];
  depth: number;
}

export class StockfishService {
  private worker: Worker | null = null;
  private isInitialized = false;
  private messageListeners: ((line: string) => void)[] = [];
  private taskQueue: Promise<unknown> = Promise.resolve();

  private runSequentially<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.taskQueue.then(fn, fn);
    this.taskQueue = next.then(() => {}, () => {});
    return next;
  }

  public async init(): Promise<void> {
    if (this.isInitialized && this.worker) return;

    return new Promise(async (resolve) => {
      try {
        try {
          this.worker = new Worker('/stockfish.js');
        } catch {
          const response = await fetch('/stockfish.js');
          const scriptText = await response.text();
          const blob = new Blob([scriptText], { type: 'application/javascript' });
          const blobUrl = URL.createObjectURL(blob);
          this.worker = new Worker(blobUrl);
        }

        this.worker.onmessage = (event: MessageEvent) => {
          const line = typeof event.data === 'string' ? event.data : '';
          for (const listener of [...this.messageListeners]) {
            listener(line);
          }
        };

        this.worker.onerror = (err) => {
          console.error('Stockfish Worker Error:', err);
        };

        this.sendCommand('uci');
        await this.waitForResponse((line) => line === 'uciok', 4000);
        this.sendCommand('isready');
        await this.waitForResponse((line) => line === 'readyok', 3000);

        this.isInitialized = true;
        resolve();
      } catch (err) {
        console.error('Failed to initialize Stockfish:', err);
        this.isInitialized = true;
        resolve();
      }
    });
  }

  private sendCommand(command: string) {
    if (this.worker) {
      this.worker.postMessage(command);
    }
  }

  private waitForResponse(
    predicate: (line: string) => boolean,
    timeoutMs = 5000
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`Stockfish response timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      const listener = (line: string) => {
        if (predicate(line)) {
          cleanup();
          resolve(line);
        }
      };

      const cleanup = () => {
        clearTimeout(timeout);
        this.messageListeners = this.messageListeners.filter((l) => l !== listener);
      };

      this.messageListeners.push(listener);
    });
  }

  public async getBestMove(
    fen: string,
    level: DifficultyLevel
  ): Promise<{ from: string; to: string; promotion?: string }> {
    return this.runSequentially(async () => {
      await this.init();

      const skillLevel = Math.min(20, Math.max(0, (level - 1) * 2));
      const depth = Math.min(15, Math.max(2, Math.floor(level * 1.4)));
      const movetime = Math.min(1500, Math.max(200, level * 120));

      this.sendCommand(`setoption name Skill Level value ${skillLevel}`);
      this.sendCommand(`position fen ${fen}`);
      this.sendCommand(`go depth ${depth} movetime ${movetime}`);

      const bestMoveLine = await this.waitForResponse(
        (line) => line.startsWith('bestmove'),
        movetime + 3000
      );

      const parts = bestMoveLine.split(' ');
      const moveStr = parts[1];
      if (!moveStr || moveStr === '(none)') {
        throw new Error('No valid move found');
      }

      const from = moveStr.substring(0, 2);
      const to = moveStr.substring(2, 4);
      const promotion = moveStr.length > 4 ? moveStr[4] : undefined;

      return { from, to, promotion };
    });
  }

  public async evaluatePosition(fen: string, depth = 8): Promise<EvalResult> {
    return this.runSequentially(async () => {
      await this.init();

      // Handle terminal positions immediately without invoking engine search
      try {
        const tempChess = new Chess(fen);
        if (tempChess.isCheckmate()) {
          const turnIsW = tempChess.turn() === 'w';
          return { score: turnIsW ? -10000 : 10000, depth };
        }
        if (tempChess.isDraw() || tempChess.isStalemate() || tempChess.isInsufficientMaterial()) {
          return { score: 0, depth };
        }
      } catch {
        // continue to engine if FEN parsing fails
      }

      // Always reset Skill Level to maximum (20) for accurate evaluation, hints, and game review
      this.sendCommand('setoption name Skill Level value 20');
      this.sendCommand(`position fen ${fen}`);
      this.sendCommand(`go depth ${depth}`);

      let latestScore = 0;
      let latestBestMove: string | undefined;
      let latestPvUci: string[] = [];
      const turnIsWhite = fen.split(' ')[1] === 'w';

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          cleanup();
          resolve({ score: latestScore, bestMoveUci: latestBestMove, pvUci: latestPvUci, depth });
        }, 3500);

        const listener = (line: string) => {
          if (line.includes('score cp ')) {
            const match = line.match(/score cp (-?\d+)/);
            if (match) {
              const cp = parseInt(match[1], 10);
              latestScore = turnIsWhite ? cp : -cp;
            }
          } else if (line.includes('score mate ')) {
            const match = line.match(/score mate (-?\d+)/);
            if (match) {
              const mateIn = parseInt(match[1], 10);
              const mateScore = (mateIn > 0 ? 10000 : -10000) - mateIn * 100;
              latestScore = turnIsWhite ? mateScore : -mateScore;
            }
          }

          if (line.includes(' pv ')) {
            const pvPart = line.split(' pv ')[1];
            if (pvPart) {
              const tokens = pvPart
                .trim()
                .split(/\s+/)
                .filter((t) => /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(t));
              if (tokens.length > 0) {
                latestBestMove = tokens[0];
                latestPvUci = tokens.slice(0, 3);
              }
            }
          }

          if (line.startsWith('bestmove')) {
            const parts = line.split(' ');
            if (parts[1] && parts[1] !== '(none)') {
              latestBestMove = parts[1];
              if (latestPvUci.length === 0) {
                latestPvUci = [parts[1]];
              }
            }
            cleanup();
            resolve({ score: latestScore, bestMoveUci: latestBestMove, pvUci: latestPvUci, depth });
          }
        };

        const cleanup = () => {
          clearTimeout(timeout);
          this.messageListeners = this.messageListeners.filter((l) => l !== listener);
        };

        this.messageListeners.push(listener);
      });
    });
  }

  public async getHint(
    fen: string,
    depth = 10
  ): Promise<{ from: string; to: string; promotion?: string; san: string; score: number } | null> {
    const evalRes = await this.evaluatePosition(fen, depth);
    if (!evalRes.bestMoveUci) return null;

    const from = evalRes.bestMoveUci.substring(0, 2);
    const to = evalRes.bestMoveUci.substring(2, 4);
    const promotion = evalRes.bestMoveUci.length > 4 ? evalRes.bestMoveUci[4] : undefined;

    try {
      const chess = new Chess(fen);
      const move = chess.move({ from, to, promotion: promotion || 'q' });
      return {
        from,
        to,
        promotion,
        san: move ? move.san : `${from}-${to}`,
        score: evalRes.score,
      };
    } catch {
      return {
        from,
        to,
        promotion,
        san: `${from}-${to}`,
        score: evalRes.score,
      };
    }
  }

  public async analyzeGame(
    playedMoves: {
      ply: number;
      moveNumber: number;
      color: PieceColor;
      san: string;
      from: string;
      to: string;
      promotion?: string;
      fenBefore: string;
      fenAfter: string;
      hintFollowed?: boolean;
      hintBestSan?: string;
    }[],
    onProgress?: (current: number, total: number) => void
  ): Promise<GameReviewData> {
    const analysisResults: MoveAnalysis[] = [];
    const totalMoves = playedMoves.length;

    if (totalMoves === 0) {
      return {
        moves: [],
        whiteStats: { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0, accuracy: 100 },
        blackStats: { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0, accuracy: 100 },
      };
    }

    // Cache evalBefore so each position is only evaluated ONCE instead of twice!
    let cachedEvalBefore: EvalResult = await this.evaluatePosition(playedMoves[0].fenBefore, 10);

    for (let i = 0; i < playedMoves.length; i++) {
      const m = playedMoves[i];
      if (onProgress) {
        onProgress(i + 1, totalMoves);
      }

      const evalBefore =
        i === 0 || playedMoves[i - 1].fenAfter !== m.fenBefore
          ? i === 0
            ? cachedEvalBefore
            : await this.evaluatePosition(m.fenBefore, 10)
          : cachedEvalBefore;

      const evalAfter = await this.evaluatePosition(m.fenAfter, 10);
      cachedEvalBefore = evalAfter;

      const isWhite = m.color === 'w';
      const playerEvalBefore = isWhite ? evalBefore.score : -evalBefore.score;
      const playerEvalAfter = isWhite ? evalAfter.score : -evalAfter.score;
      const scoreDelta = playerEvalAfter - playerEvalBefore;

      const chessBefore = new Chess(m.fenBefore);
      let bestMoveSan: string | undefined;
      if (evalBefore.bestMoveUci) {
        try {
          const from = evalBefore.bestMoveUci.substring(0, 2);
          const to = evalBefore.bestMoveUci.substring(2, 4);
          const promo = evalBefore.bestMoveUci[4];
          const testMove = chessBefore.move({ from, to, promotion: promo });
          if (testMove) {
            bestMoveSan = testMove.san;
          }
        } catch {
          // ignore
        }
      }

      const isActualMoveCheck = m.san.includes('+') || m.san.includes('#');
      let missedCheck = false;
      let checkAlternativeSan: string | undefined;

      if (!isActualMoveCheck && bestMoveSan && (bestMoveSan.includes('+') || bestMoveSan.includes('#'))) {
        missedCheck = true;
        checkAlternativeSan = bestMoveSan;
      }

      let quality: MoveQuality = 'good';
      let commentary = '';

      const isEngineBest = (bestMoveSan && bestMoveSan === m.san) || m.hintFollowed;

      if (m.hintFollowed) {
        quality = 'best';
        bestMoveSan = m.san;
        commentary = '🌟 대국 중 추천된 최적 힌트를 정확히 착수한 최선의 수입니다.';
      } else if (isEngineBest || scoreDelta >= -15) {
        quality = 'best';
        bestMoveSan = m.san;
        commentary = '🌟 엔진이 추천하는 가장 최선의 수입니다.';
      } else if (scoreDelta >= -60) {
        quality = 'good';
        commentary = '👍 형세를 견고하게 유지하는 좋은 수입니다.';
      } else if (scoreDelta >= -150) {
        quality = 'inaccuracy';
        commentary = `🟡 아쉬운 수: 더 나은 대안(${bestMoveSan || '최선수'})이 있었습니다.`;
      } else if (scoreDelta >= -300) {
        quality = 'mistake';
        commentary = `🟠 실수: 주도권을 상대에게 내어주었습니다. 추천 수: ${bestMoveSan || '최선수'}`;
      } else {
        quality = 'blunder';
        commentary = `🔴 치명적인 악수(Blunder): 형세가 크게 기울었습니다. 최선의 수: ${bestMoveSan || '최선수'}`;
      }

      if (missedCheck && (quality === 'mistake' || quality === 'blunder' || quality === 'inaccuracy')) {
        commentary = `💡 놓친 체크 기회: ${checkAlternativeSan || '체크 수'}로 상대 킹을 위협할 수 있었습니다!`;
      }

      let whyPlayedSuboptimal: string | undefined;
      let whyBestBetter: string | undefined;
      let playedLineSan: string[] | undefined;
      let bestLineSan: string[] | undefined;
      let oppBestReplyUci: string | undefined;

      if (
        quality !== 'best' &&
        evalBefore.bestMoveUci &&
        bestMoveSan &&
        bestMoveSan !== m.san
      ) {
        const explained = explainSuboptimalMove({
          fenBefore: m.fenBefore,
          fenAfter: m.fenAfter,
          ply: m.ply,
          moveNumber: m.moveNumber,
          color: m.color,
          san: m.san,
          from: m.from,
          to: m.to,
          promotion: m.promotion,
          bestMoveUci: evalBefore.bestMoveUci,
          bestPvUci: evalBefore.pvUci,
          oppReplyPvUci: evalAfter.pvUci || (evalAfter.bestMoveUci ? [evalAfter.bestMoveUci] : []),
          playerEvalBefore,
          playerEvalAfter,
          quality,
        });
        whyPlayedSuboptimal = explained.whyPlayedSuboptimal;
        whyBestBetter = explained.whyBestBetter;
        playedLineSan = explained.playedLineSan;
        bestLineSan = explained.bestLineSan;
        oppBestReplyUci = explained.oppBestReplyUci;
      }

      analysisResults.push({
        ply: m.ply,
        moveNumber: m.moveNumber,
        color: m.color,
        san: m.san,
        from: m.from,
        to: m.to,
        promotion: m.promotion,
        fenBefore: m.fenBefore,
        fenAfter: m.fenAfter,
        scoreBefore: evalBefore.score,
        scoreAfter: evalAfter.score,
        scoreDelta,
        quality,
        bestMoveSan,
        bestMoveUci: evalBefore.bestMoveUci,
        oppBestReplyUci,
        evalBestScore: evalBefore.score,
        whyPlayedSuboptimal,
        whyBestBetter,
        playedLineSan,
        bestLineSan,
        missedCheck,
        commentary,
      });
    }

    const calcStats = (color: PieceColor): PlayerStats => {
      const colorMoves = analysisResults.filter((r) => r.color === color);
      if (colorMoves.length === 0) {
        return { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0, accuracy: 100 };
      }
      const best = colorMoves.filter((m) => m.quality === 'best').length;
      const good = colorMoves.filter((m) => m.quality === 'good').length;
      const inaccuracy = colorMoves.filter((m) => m.quality === 'inaccuracy').length;
      const mistake = colorMoves.filter((m) => m.quality === 'mistake').length;
      const blunder = colorMoves.filter((m) => m.quality === 'blunder').length;

      const positiveMoves = best * 100 + good * 85 + inaccuracy * 60 + mistake * 30 + blunder * 10;
      const accuracy = Math.round(positiveMoves / colorMoves.length);

      return { best, good, inaccuracy, mistake, blunder, accuracy };
    };

    return {
      moves: analysisResults,
      whiteStats: calcStats('w'),
      blackStats: calcStats('b'),
    };
  }
}

export const stockfishService = new StockfishService();
