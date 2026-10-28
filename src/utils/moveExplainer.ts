import { Chess, Square } from 'chess.js';
import { MoveQuality, PieceColor } from '../types/chess';

const PIECE_KO: Record<string, string> = {
  p: '폰',
  n: '나이트',
  b: '비숍',
  r: '룩',
  q: '퀸',
  k: '킹',
};

const PIECE_VAL: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

function getBatchimCode(word: string): number {
  const base = word.replace(/\([^)]*\)/g, '').trim();
  if (!base) return 0;
  const code = base.charCodeAt(base.length - 1);
  if (code >= 0xac00 && code <= 0xd7a3) {
    return (code - 0xac00) % 28;
  }
  return 0;
}

function withObjJosa(word: string): string {
  return `${word}${getBatchimCode(word) !== 0 ? '을' : '를'}`;
}

function withRoJosa(word: string): string {
  const jong = getBatchimCode(word);
  return `${word}${jong === 0 || jong === 8 ? '로' : '으로'}`;
}

const CENTER_SQUARES = new Set(['d4', 'e4', 'd5', 'e5']);
const EXTENDED_CENTER = new Set([
  'c3', 'd3', 'e3', 'f3',
  'c4', 'd4', 'e4', 'f4',
  'c5', 'd5', 'e5', 'f5',
  'c6', 'd6', 'e6', 'f6',
]);

export interface MoveExplanationInput {
  fenBefore: string;
  fenAfter: string;
  ply: number;
  moveNumber: number;
  color: PieceColor;
  san: string;
  from: string;
  to: string;
  promotion?: string;
  bestMoveUci: string;
  bestPvUci?: string[];
  oppReplyPvUci?: string[];
  playerEvalBefore: number; // centipawns from mover's perspective
  playerEvalAfter: number;  // centipawns from mover's perspective
  quality: MoveQuality;
}

export interface MoveExplanationOutput {
  whyPlayedSuboptimal: string;
  whyBestBetter: string;
  playedLineSan: string[];
  bestLineSan: string[];
  oppBestReplyUci?: string;
}

function uciLineToSan(startFen: string, uciMoves: string[], maxPlies = 3): string[] {
  const result: string[] = [];
  if (!uciMoves || uciMoves.length === 0) return result;
  try {
    const c = new Chess(startFen);
    for (let i = 0; i < Math.min(maxPlies, uciMoves.length); i++) {
      const uci = uciMoves[i];
      if (!uci || uci.length < 4) break;
      const from = uci.substring(0, 2);
      const to = uci.substring(2, 4);
      const promo = uci.length > 4 ? uci[4] : undefined;
      const mv = c.move({ from, to, promotion: promo });
      if (!mv) break;
      result.push(mv.san);
    }
  } catch {
    // stop if invalid continuation
  }
  return result;
}

function parseSingleMove(fen: string, uci?: string) {
  if (!uci || uci.length < 4) return null;
  try {
    const c = new Chess(fen);
    const from = uci.substring(0, 2);
    const to = uci.substring(2, 4);
    const promo = uci.length > 4 ? uci[4] : undefined;
    const mv = c.move({ from, to, promotion: promo });
    if (!mv) return null;
    return { move: mv, chessAfter: c };
  } catch {
    return null;
  }
}

function hasBackRankMinorPieces(chess: Chess, color: PieceColor): boolean {
  const homeRank = color === 'w' ? 7 : 0; // board()[0] is rank 8, board()[7] is rank 1
  const row = chess.board()[homeRank];
  if (!row) return false;
  return row.some((cell) => cell && cell.color === color && (cell.type === 'n' || cell.type === 'b'));
}

export function explainSuboptimalMove(input: MoveExplanationInput): MoveExplanationOutput {
  const {
    fenBefore,
    fenAfter,
    ply,
    color,
    san,
    from,
    to,
    promotion,
    bestMoveUci,
    bestPvUci = [],
    oppReplyPvUci = [],
    playerEvalBefore,
    playerEvalAfter,
    quality,
  } = input;

  const oppColor: PieceColor = color === 'w' ? 'b' : 'w';
  const lossPawns = Math.max(0.1, Math.abs(playerEvalAfter - playerEvalBefore) / 100);

  let chessBefore: Chess | null = null;
  try {
    chessBefore = new Chess(fenBefore);
  } catch {
    chessBefore = null;
  }

  const playedParsed = parseSingleMove(
    fenBefore,
    `${from}${to}${promotion || ''}`
  );
  const bestParsed = parseSingleMove(fenBefore, bestMoveUci);
  const oppBestReplyUci = oppReplyPvUci[0];
  const oppReplyParsed = parseSingleMove(fenAfter, oppBestReplyUci);

  const playedObj = playedParsed?.move;
  const bestObj = bestParsed?.move;
  const oppReplyObj = oppReplyParsed?.move;

  const bestSan = bestObj?.san || '최선수';
  const oppReplySan = oppReplyObj?.san;

  const bestLineSan = uciLineToSan(
    fenBefore,
    bestPvUci.length > 0 ? bestPvUci : [bestMoveUci],
    3
  );
  const playedLineSan = uciLineToSan(fenAfter, oppReplyPvUci, 3);

  // =====================================================
  // 1. WHY THE PLAYED MOVE WAS SUBOPTIMAL
  // =====================================================
  let whyPlayedSuboptimal = '';

  const myCapturedVal = playedObj?.captured ? PIECE_VAL[playedObj.captured] || 0 : 0;
  const oppCapturedVal = oppReplyObj?.captured ? PIECE_VAL[oppReplyObj.captured] || 0 : 0;
  const bestCapturedVal = bestObj?.captured ? PIECE_VAL[bestObj.captured] || 0 : 0;

  if (playerEvalAfter <= -8000 && playerEvalBefore > -5000) {
    if (oppReplySan?.includes('#')) {
      whyPlayedSuboptimal = `이 수로 킹의 방어선이 무너지며 상대에게 곧바로 ${oppReplySan} 체크메이트를 허용했습니다.`;
    } else {
      whyPlayedSuboptimal = `킹 수비에 치명적인 빈틈이 생겨 상대에게 ${
        oppReplySan ? `${oppReplySan}부터 시작되는 ` : ''
      }강제 체크메이트 수순을 허용했습니다.`;
    }
  } else if (playerEvalBefore >= 8000 && playerEvalAfter < 6000) {
    whyPlayedSuboptimal = `상대 킹을 즉각 무너뜨릴 수 있었던 강제 체크메이트 수순(${bestSan})을 놓쳤습니다.`;
  } else if (oppReplyObj?.captured && oppCapturedVal > myCapturedVal && lossPawns >= 1.1) {
    if (oppReplyObj.to === to) {
      const movedKo = PIECE_KO[playedObj?.piece || 'p'] || '기물';
      whyPlayedSuboptimal = `${withObjJosa(movedKo)} 상대의 공격이 닿는 ${to} 칸으로 이동시켜, 곧바로 ${oppReplySan} 반격에 잡히며 기물 손실을 입게 됩니다.`;
    } else {
      const lostKo = PIECE_KO[oppReplyObj.captured] || '기물';
      whyPlayedSuboptimal = `다른 곳(${san})에 수를 두는 사이 ${oppReplyObj.to} 칸의 아군 ${lostKo} 수비가 비어, 상대의 ${oppReplySan} 타격으로 기물을 내주게 됩니다.`;
    }
  } else if (
    playedObj?.captured &&
    oppReplyObj?.captured &&
    oppReplyObj.to === to &&
    oppCapturedVal === myCapturedVal
  ) {
    if (oppReplyObj.piece !== 'p') {
      const oppDevPieceKo = PIECE_KO[oppReplyObj.piece] || '기물';
      whyPlayedSuboptimal = `성급한 교환(${san})으로 상대가 곧바로 ${oppReplySan} 되잡기를 통해 ${withObjJosa(oppDevPieceKo)} 자연스럽게 좋은 위치로 전개하도록 도와주었습니다.`;
    } else {
      whyPlayedSuboptimal = `이 시점의 교환(${san})은 상대가 ${oppReplySan} 되잡기로 중앙 폰 구조와 열린 열을 유리하게 정비하도록 허용합니다.`;
    }
  } else if (
    bestObj?.captured &&
    bestCapturedVal > myCapturedVal &&
    (bestCapturedVal >= 3 || lossPawns >= 1.2)
  ) {
    const targetKo = PIECE_KO[bestObj.captured] || '기물';
    whyPlayedSuboptimal = `당장 ${bestSan} 착수로 상대의 ${withObjJosa(`${targetKo}(${bestObj.to})`)} 잡아 확실한 이득을 챙길 수 있었던 전술 기회를 놓쳤습니다.`;
  } else if (bestSan.includes('+') && !san.includes('+') && lossPawns >= 0.7) {
    whyPlayedSuboptimal = `${bestSan} 체크로 상대 응수를 강제하고 주도권을 쥘 수 있었던 기회를 놓쳤습니다.`;
  } else if (
    ply < 20 &&
    playedObj?.piece === 'p' &&
    ((color === 'w' && (from === 'f2' || from === 'g2')) ||
      (color === 'b' && (from === 'f7' || from === 'g7'))) &&
    lossPawns >= 0.5
  ) {
    whyPlayedSuboptimal = `초반에 킹을 보호하는 방어벽 폰(${san})을 성급하게 밀어 킹 주변 대각선이 위험하게 노출되었습니다${
      oppReplySan ? ` (상대 최선 반격: ${oppReplySan})` : ''
    }.`;
  } else if (oppReplySan?.includes('+')) {
    whyPlayedSuboptimal = `상대에게 곧바로 ${oppReplySan} 체크 반격을 허용해 아군 킹이 흔들리고 공격 주도권(템포)을 내주게 됩니다.`;
  } else if (ply < 12 && playedObj?.piece === 'q' && !playedObj.captured) {
    whyPlayedSuboptimal = `기물 전개가 끝나기 전 초반에 퀸(${san})을 일찍 움직여, 상대가 ${
      oppReplySan ? `${oppReplySan} 응수로` : '기물 전개로'
    } 템포를 얻으며 압박할 빌미를 주었습니다.`;
  } else if (
    ply < 16 &&
    playedObj?.piece === 'p' &&
    !playedObj.captured &&
    (from[0] === 'a' || from[0] === 'h')
  ) {
    whyPlayedSuboptimal = `중앙 싸움과 기물 전개가 시급한 초반에 외곽 폰(${san})에 수를 써 중앙 통제력이 약해졌습니다${
      oppReplySan ? ` (상대 최선 응수: ${oppReplySan})` : ''
    }.`;
  } else if (
    ply < 18 &&
    chessBefore &&
    (playedObj?.piece === 'n' || playedObj?.piece === 'b') &&
    from[1] !== (color === 'w' ? '1' : '8') &&
    !playedObj.captured &&
    hasBackRankMinorPieces(chessBefore, color)
  ) {
    const movedPieceLabel = `${PIECE_KO[playedObj.piece]}(${san})`;
    whyPlayedSuboptimal = `뒷줄에 아직 나오지 못한 기물이 남아 있는데 이미 전개된 ${withObjJosa(
      movedPieceLabel
    )} 반복 이동하여 전개 템포가 늦어졌습니다${
      oppReplySan ? ` (상대 응수: ${oppReplySan})` : ''
    }.`;
  } else if (quality === 'good') {
    whyPlayedSuboptimal = `충분히 둘 수 있는 무난한 수이지만, ${bestSan} 착수에 비해 압박 강도가 약해 상대가 ${
      oppReplySan ? `${oppReplySan} 응수로` : '안정적인 응수로'
    } 편하게 균형을 맞출 수 있습니다.`;
  } else {
    whyPlayedSuboptimal = `기물 활성도와 주요 칸 장악력이 다소 떨어져, 상대가 ${
      oppReplySan ? `${oppReplySan} 응수로` : '최선 응수로'
    } 주도권을 잡으며 약 ${lossPawns.toFixed(1)}점가량 불리해졌습니다.`;
  }

  // =====================================================
  // 2. WHY THE RECOMMENDED BEST MOVE WAS BETTER
  // =====================================================
  let whyBestBetter = '';

  if (!bestObj || !bestParsed) {
    whyBestBetter = `추천 수 ${bestSan} 착수로 기물 협응과 중앙 통제력을 가장 안정적으로 유지할 수 있습니다.`;
  } else {
    const bestChessAfter = bestParsed.chessAfter;
    const bestPieceKo = PIECE_KO[bestObj.piece] || '기물';
    const wasMovedPieceAttacked =
      chessBefore ? chessBefore.isAttacked(bestObj.from as Square, oppColor) : false;
    const isSafeAfter = !bestChessAfter.isAttacked(bestObj.to as Square, oppColor);

    // Check high-value enemy pieces newly attacked from bestObj.to
    const attackedEnemyPieces: Array<{ type: string; square: string }> = [];
    for (const row of bestChessAfter.board()) {
      for (const cell of row) {
        if (cell && cell.color === oppColor && cell.type !== 'p') {
          const attackers = bestChessAfter.attackers(cell.square as Square, color);
          if (attackers.includes(bestObj.to as Square)) {
            attackedEnemyPieces.push({ type: cell.type, square: cell.square });
          }
        }
      }
    }

    if (bestSan.includes('#') || playerEvalBefore >= 8000) {
      whyBestBetter = `추천 수 ${bestSan} 착수는 상대 킹의 도주로를 완전히 차단하여 승부를 결정짓는 최강 마무리 수입니다.`;
    } else if (bestSan === 'O-O' || bestSan === 'O-O-O') {
      whyBestBetter = `캐슬링(${bestSan})으로 킹을 안전한 구석으로 대피시키는 동시에 구석에 있던 룩을 중앙 싸움에 합류시키는 핵심 수입니다.`;
    } else if (
      wasMovedPieceAttacked &&
      isSafeAfter &&
      (PIECE_VAL[bestObj.piece] || 0) >= 3 &&
      !bestObj.captured
    ) {
      whyBestBetter = `상대에게 노려지고 있던 ${bestObj.from} 칸의 아군 ${withObjJosa(bestPieceKo)} ${bestSan} 착수로 안전하게 피신시켜 기물 손실을 막아줍니다.`;
    } else if (bestObj.captured) {
      const capKo = PIECE_KO[bestObj.captured] || '기물';
      if (bestSan.includes('+')) {
        whyBestBetter = `${bestSan} 착수로 ${bestObj.to} 칸의 상대 ${withObjJosa(capKo)} 잡으면서 동시에 체크를 걸어 상대 응수를 강제할 수 있습니다.`;
      } else {
        whyBestBetter = `${bestSan} 착수로 ${bestObj.to} 칸의 상대 ${withObjJosa(capKo)} 직접 타격하여 실질적인 전력·포지션 우위를 확보합니다.`;
      }
    } else if (bestObj.promotion) {
      const promoKo = PIECE_KO[bestObj.promotion] || '퀸';
      whyBestBetter = `${bestSan} 착수로 폰을 ${withRoJosa(promoKo)} 승진시켜 전력을 결정적으로 강화합니다.`;
    } else if (bestSan.includes('+')) {
      whyBestBetter = `${bestSan} 체크로 상대 킹의 수비를 흔들고 공격 템포를 확실하게 가져옵니다.`;
    } else if (attackedEnemyPieces.length >= 2) {
      const targetList = attackedEnemyPieces.slice(0, 2);
      const targetNames = targetList
        .map((t) => `${PIECE_KO[t.type]}(${t.square})`)
        .join('·');
      whyBestBetter = `${bestSan} 착수로 상대의 ${withObjJosa(targetNames)} 동시에 겨냥하는 날카로운 양걸이(포크) 압박을 가합니다.`;
    } else if (
      attackedEnemyPieces.some((t) => t.type === 'q' || t.type === 'r')
    ) {
      const majorTarget = attackedEnemyPieces.find((t) => t.type === 'q' || t.type === 'r')!;
      const majorLabel = `${PIECE_KO[majorTarget.type]}(${majorTarget.square})`;
      whyBestBetter = `${bestSan} 착수로 상대 핵심 전력인 ${withObjJosa(majorLabel)} 직접 겨냥해 후퇴를 강제하고 템포를 얻습니다.`;
    } else if (
      ply < 22 &&
      (bestObj.piece === 'n' || bestObj.piece === 'b') &&
      bestObj.from[1] === (color === 'w' ? '1' : '8')
    ) {
      whyBestBetter = `${bestSan} 착수는 뒷줄에 머물던 ${withObjJosa(bestPieceKo)} 활성 칸(${bestObj.to})으로 깨워 중앙 통제력을 높이고 빠른 캐슬링을 준비하는 정석 전개 수입니다.`;
    } else if (bestObj.piece === 'p' && CENTER_SQUARES.has(bestObj.to)) {
      whyBestBetter = `${bestSan} 착수로 체스판의 핵심인 중앙(${bestObj.to})을 직접 점유하여 아군 기물의 활동 공간을 넓혀줍니다.`;
    } else if (bestObj.piece === 'r' && ['c', 'd', 'e', 'f'].includes(bestObj.to[0])) {
      whyBestBetter = `${bestSan} 착수로 룩을 핵심 중앙 열(${bestObj.to[0]}열)에 배치해 열린 줄 장악력과 침투 화력을 극대화합니다.`;
    } else if (EXTENDED_CENTER.has(bestObj.to)) {
      whyBestBetter = `${bestSan} 착수로 ${withObjJosa(bestPieceKo)} 중앙 요충지(${bestObj.to})에 배치해 기물 간 협응력과 공수 밸런스를 크게 높여줍니다.`;
    } else {
      whyBestBetter = `${bestSan} 착수는 아군 진영의 약점을 단단히 지키면서 다음 공격 전개를 가장 효율적으로 준비하는 최선의 수입니다.`;
    }
  }

  return {
    whyPlayedSuboptimal,
    whyBestBetter,
    playedLineSan,
    bestLineSan,
    oppBestReplyUci,
  };
}
