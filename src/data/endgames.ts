import { EndgamePuzzle } from '../types/chess';

export const ENDGAME_PUZZLES: EndgamePuzzle[] = [
  // ==========================================
  // --- 🟢 초급 (Beginner 1 ~ 16) ---
  // ==========================================
  {
    id: 1,
    title: '투 룩 사다리 메이트 (Ladder Mate)',
    category: 'beginner',
    playerColor: 'w',
    fen: '8/8/8/4k3/8/8/R7/4K2R w - - 0 1',
    goalDescription: '두 개의 룩으로 상대 킹의 도주로를 한 줄씩 차단하여 8랭크에서 체크메이트를 달성하세요.',
    targetResult: 'checkmate',
    tip: '한 룩이 가림막 역할을 하고 다른 룩이 체크를 걸어 계단을 오르듯 킹을 밀어 올리세요.',
    explanation: '체스에서 가장 기본적이면서 확실한 체크메이트 기법입니다. 상대 킹에게 잡히지 않도록 룩을 반대쪽 파일로 멀리 이동시키며 진행하세요. (나무위키 3.1 기본 체크메이트)'
  },
  {
    id: 2,
    title: '킹 + 퀸 vs 킹 메이트',
    category: 'beginner',
    playerColor: 'w',
    fen: '8/8/8/4k3/8/8/4Q3/4K3 w - - 0 1',
    goalDescription: '퀸으로 상대 킹의 활동 영역을 좁힌 뒤, 아군 킹을 전진시켜 체크메이트를 완성하세요.',
    targetResult: 'checkmate',
    tip: '퀸을 나이트 거리(L자)로 유지하며 상자를 좁히되, 스테일메이트(비기는 무승부)가 되지 않도록 주의하세요!',
    explanation: '퀸 혼자서는 체크메이트를 할 수 없습니다. 킹을 구석이나 가장자리로 몬 후 아군 킹이 반드시 지지해 주어야 메이트가 완성됩니다. (나무위키 3.1 기본 체크메이트)'
  },
  {
    id: 3,
    title: '킹 + 룩 vs 킹 메이트',
    category: 'beginner',
    playerColor: 'w',
    fen: '8/8/8/4k3/8/8/4R3/4K3 w - - 0 1',
    goalDescription: '룩의 차단선과 킹의 마주보기(Opposition)를 이용하여 외곽에서 체크메이트를 달성하세요.',
    targetResult: 'checkmate',
    tip: '룩으로 퇴로를 차단하고 킹으로 상대 킹과 정면으로 마주섰을 때(Opposition) 룩으로 체크를 거세요.',
    explanation: '실전에서 매우 빈번하게 발생하는 엔드게임입니다. 룩이 잡히지 않도록 안전한 반대쪽으로 이동하며 킹과 룩의 팀워크를 발휘해야 합니다. (나무위키 3.1 기본 체크메이트)'
  },
  {
    id: 4,
    title: '투 비숍 vs 킹 메이트',
    category: 'beginner',
    playerColor: 'w',
    fen: '8/8/8/4k3/8/3BB3/8/4K3 w - - 0 1',
    goalDescription: '두 비숍의 대각선 장벽을 나란히 구축하여 상대 킹을 판의 구석으로 몰아 체크메이트하세요.',
    targetResult: 'checkmate',
    tip: '두 비숍이 나란히 서면 킹이 통과할 수 없는 완벽한 대각선 벽이 형성됩니다.',
    explanation: '비숍 쌍의 협공 메이트입니다. 상대 킹을 가장자리로 밀어낸 뒤 코너 칸으로 몰아야 메이트가 가능합니다. (나무위키 3.1 기본 체크메이트)'
  },
  {
    id: 5,
    title: '백랭크 메이트 (Back-Rank Mate)',
    category: 'beginner',
    playerColor: 'w',
    fen: '6k1/5ppp/8/8/8/8/1r4PP/R5K1 w - - 0 1',
    goalDescription: '상대 킹의 8랭크 도주로가 아군 폰에 막혀 있는 틈을 타 룩으로 치명적인 백랭크 체크메이트를 가하세요.',
    targetResult: 'checkmate',
    tip: '1. Ra8+ Rb8 2. Rxb8#로 상대 룩을 낚아채며 즉시 게임을 끝낼 수 있습니다.',
    explanation: '실전 엔드게임에서 룩이 다른 폰을 탐내다가 1/8랭크 수비를 소홀히 했을 때 자주 발생하는 치명적 전술입니다.'
  },
  {
    id: 6,
    title: '스모더드 메이트 (Smothered Mate)',
    category: 'beginner',
    playerColor: 'w',
    fen: '6rk/6pp/7N/8/8/8/8/4K3 w - - 0 1',
    goalDescription: '상대 킹이 자신의 기물들에 둘러싸여 숨이 막힌 상태에서 나이트로 체크메이트하세요.',
    targetResult: 'checkmate',
    tip: '1. Nf7# 나이트의 고유한 점프 행마를 이용하여 질식 메이트를 완성하세요.',
    explanation: '자신의 룩과 폰에 둘러싸여 도망칠 칸이 없는 킹을 나이트로 메이트시키는 유명한 패턴입니다.'
  },
  {
    id: 7,
    title: '스테일메이트 함정 피하기 (Avoiding Stalemate)',
    category: 'beginner',
    playerColor: 'w',
    fen: 'k7/8/1K6/8/8/8/8/4Q3 w - - 0 1',
    goalDescription: '흑 킹이 구석에 갇혀 있습니다. 스테일메이트 함정을 피해 깔끔하게 체크메이트를 거세요.',
    targetResult: 'checkmate',
    tip: '1. Qe8#로 8랭크를 직접 타격하면 즉시 체크메이트입니다. Qc7은 흑 킹이 둘 곳이 없어져 무승부가 됩니다!',
    explanation: '엔드게임에서 다 이긴 경기를 스테일메이트로 비기는 실수가 가장 많습니다. 킹에게 합법적인 수가 있는지 항상 살피세요.'
  },
  {
    id: 8,
    title: '폰 사각형의 법칙 (Rule of the Square)',
    category: 'beginner',
    playerColor: 'w',
    fen: '8/8/4P3/8/8/8/7k/4K3 w - - 0 1',
    goalDescription: '상대 킹이 폰의 사각형 범위를 벗어났습니다. e-폰을 전력 질주시켜 퀸으로 승급시키세요.',
    targetResult: 'promotion',
    tip: '폰에서 승급 칸까지의 거리로 만든 가상의 정사각형 안에 상대 킹이 없다면 지원 없이 혼자 승급할 수 있습니다.',
    explanation: '폰 엔드게임의 가장 기초적이면서 강력한 계산법입니다. 턴 낭비 없이 폰을 밀면 상대 킹은 절대로 따라잡을 수 없습니다. (나무위키 3.3.1 사각형 규칙)'
  },
  {
    id: 9,
    title: '키 스퀘어와 대치 (Opposition)',
    category: 'beginner',
    playerColor: 'w',
    fen: '8/8/4k3/8/4P3/4K3/8/8 w - - 0 1',
    goalDescription: '백 킹으로 오포지션(마주보기)을 잡고 e-폰의 승급 경로(키 스퀘어)를 확보하여 승급하세요.',
    targetResult: 'promotion',
    tip: '폰을 무작정 먼저 밀지 말고, 킹이 폰보다 한 걸음 앞장서서 상대 킹의 자리를 뺏어야 합니다.',
    explanation: '킹과 폰 vs 킹 엔드게임의 승패를 가르는 절대 원칙입니다. 킹이 오포지션을 잡고 폰의 앞길을 호위해야 퀸을 만듭니다. (나무위키 3.3.2 킹+폰 vs 킹)'
  },
  {
    id: 10,
    title: '6랭크 킹의 절대 승리 법칙',
    category: 'beginner',
    playerColor: 'w',
    fen: '8/8/4K3/4P3/8/8/4k3/8 w - - 0 1',
    goalDescription: '아군 킹이 폰 앞의 6랭크에 도달했습니다. 오포지션 여부와 상관없이 폰을 밀어 승급시키세요.',
    targetResult: 'promotion',
    tip: '킹이 폰 앞 6랭크(흑이면 3랭크)에 서면 상대 킹이 오포지션을 잡더라도 무조건 승리합니다.',
    explanation: '나무위키 3.3.2에 명시된 핵심 원칙: "공격 킹이 6랭크(흑이면 3랭크)에 위치하면 무조건 승리한다."'
  },
  {
    id: 11,
    title: '룩폰의 무승부 트랩 (Rook Pawn Stalemate)',
    category: 'beginner',
    playerColor: 'w',
    fen: '7k/8/7K/7P/8/8/8/8 w - - 0 1',
    goalDescription: '룩폰(a/h폰)은 상대 킹이 승급 코너에 도달하면 무조건 스테일메이트가 되는 특성을 확인하세요.',
    targetResult: 'draw',
    tip: 'h6를 두면 흑 킹이 Kh8에 갇혀 합법적인 수가 없어지고 즉시 스테일메이트 무승부가 됩니다.',
    explanation: '나무위키 3.3.2.1에 서술된 내용: "룩폰(a, h열)은 공격 킹이 아무리 앞서 있어도 수비 킹이 승진 칸 코너에 도달하면 무조건 비긴다."'
  },
  {
    id: 12,
    title: '룩 컷오프 테크닉 (Rook Cut-Off)',
    category: 'beginner',
    playerColor: 'w',
    fen: '8/8/2k5/8/4P3/1R6/8/4K3 w - - 0 1',
    goalDescription: '룩으로 b-파일을 벽처럼 차단하여 상대 킹의 접근을 원천 봉쇄하고 폰을 전진시키세요.',
    targetResult: 'promotion',
    tip: '룩이 수직 라인을 지키고 있으면 상대 킹은 폰 쪽으로 한 발자국도 다가올 수 없습니다.',
    explanation: '룩의 사거리를 이용해 상대 킹을 특정 구역에 고립시키는 기본적이고 강력한 차단 테크닉입니다.'
  },
  {
    id: 13,
    title: '퀸 vs 비숍 제압 (나무위키 3.2)',
    category: 'beginner',
    playerColor: 'w',
    fen: '8/8/8/4k3/8/8/4Q3/4K1b1 w - - 0 1',
    goalDescription: '비숍은 한 가지 색 칸만 다닐 수 있습니다. 퀸으로 체크를 걸어 비숍을 포크하고 메이트를 달성하세요.',
    targetResult: 'checkmate',
    tip: '비숍의 대각선 공격 범위 밖에서 퀸으로 킹과 비숍을 동시 타격(포크)하세요.',
    explanation: '나무위키 3.2: "퀸 vs 비숍은 퀸이 쉽게 이긴다. 비숍은 한 가지 색 칸만 공격할 수 있다는 점을 이용해 킹을 몰고 비숍을 따낼 수 있다."'
  },
  {
    id: 14,
    title: '2룩 vs 1룩 교환 유도 (나무위키 3.2)',
    category: 'beginner',
    playerColor: 'w',
    fen: '8/8/4k3/8/8/R7/1R6/4K2r w - - 0 1',
    goalDescription: '2룩이 서로를 지키며 상대 룩을 압박하여 교환을 유도하고 승리를 확정지으세요.',
    targetResult: 'checkmate',
    tip: '두 룩이 서로를 보호하는 연결망을 유지하면서 상대 킹을 조여가세요.',
    explanation: '나무위키 3.2: "2룩 vs 룩은 2룩이 이긴다. 룩 두 개를 연결하면서 상대 룩을 계속 공격하거나 킹을 체크해 교환을 유도한다."'
  },
  {
    id: 15,
    title: '연결된 통과한 폰 (나무위키 3.3.3)',
    category: 'beginner',
    playerColor: 'w',
    fen: '8/8/8/4k3/3PP3/8/8/4K3 w - - 0 1',
    goalDescription: '나란히 선 d4, e4 폰은 상대 킹이 직접 잡을 수 없습니다. 전진시켜 승급을 달성하세요.',
    targetResult: 'promotion',
    tip: '한 폰이 전진하면 옆 폰이 그 폰의 뒤를 받쳐주어 상대 킹은 두 폰 모두 잡을 수 없습니다.',
    explanation: '나무위키 3.3.3: "연결된 통과한 폰(Connected Passed Pawns)은 서로를 지켜줄 수 있으므로 킹 혼자서는 이들을 결코 막을 수 없다."'
  },
  {
    id: 16,
    title: '폰 7랭크 안전 승급 (7th Rank Push)',
    category: 'beginner',
    playerColor: 'w',
    fen: '8/4P3/4K3/8/8/8/4k3/8 w - - 0 1',
    goalDescription: '7랭크에 도달한 폰을 안전하게 8랭크로 밀어 퀸으로 승급시키세요.',
    targetResult: 'promotion',
    tip: '1. e8=Q로 프로모션하여 단숨에 승기를 잡으세요.',
    explanation: '폰이 7랭크까지 안전하게 올라왔다면 즉시 퀸이나 룩으로 승급하여 압도적인 기물 우위를 확보합니다.'
  },

  // ==========================================
  // --- 🟡 중급 (Intermediate 17 ~ 33) ---
  // ==========================================
  {
    id: 17,
    title: '폰 3대3 돌파 (Breakthrough - 나무위키 3.3.4)',
    category: 'intermediate',
    playerColor: 'w',
    fen: '8/ppp5/8/PPP5/8/8/8/4K2k w - - 0 1',
    goalDescription: '가운데 b6 폰을 전진시켜 희생타를 날리고, 외곽 폰을 확정 승급시키는 고전 전술을 실습하세요.',
    targetResult: 'promotion',
    tip: '1. b6!를 두면 상대가 axb6이든 cxb6이든 상관없이 반대편 폰을 밀어 통과 폰을 만들어냅니다.',
    explanation: '나무위키 3.3.4: "돌파(Breakthrough)는 폰의 수적 균형이 같더라도 폰 희생을 통해 막을 수 없는 통과한 폰을 창출하는 대표적인 전술이다."'
  },
  {
    id: 18,
    title: '트리앙글레이션 (Triangulation)',
    category: 'intermediate',
    playerColor: 'w',
    fen: '8/8/1k6/1p6/1P1K4/8/8/8 w - - 0 1',
    goalDescription: '킹으로 삼각 행마를 펼쳐 형태를 유지한 채 턴을 상대방에게 넘겨(츠크츠방) 진영을 붕괴시키세요.',
    targetResult: 'promotion',
    tip: '상대 킹은 좁은 칸만 오갈 수 있을 때 아군 킹의 3스텝 삼각형 이동으로 턴을 넘깁니다.',
    explanation: '츠크츠방(Zugzwang: 둘 수록 손해인 상태)을 강제하는 고급 킹 테크닉입니다.'
  },
  {
    id: 19,
    title: '보호받는 패스폰 (Protected Passed Pawn)',
    category: 'intermediate',
    playerColor: 'w',
    fen: '8/5p2/4pk2/3p4/3P1P2/4PK2/8/8 w - - 0 1',
    goalDescription: '보호받는 패스폰을 앞세워 상대 킹을 묶어두고 반대쪽 진영으로 침투하여 승기를 잡으세요.',
    targetResult: 'promotion',
    tip: '아군 폰이 뒤의 폰에게 보호받고 있다면 상대 킹은 절대로 그 폰을 직접 잡을 수 없습니다.',
    explanation: '패스폰이 자생력을 갖추고 있으면 아군 킹은 자유롭게 기동하며 상대의 다른 약점 폰을 공략할 수 있습니다.'
  },
  {
    id: 20,
    title: '아웃사이드 패스폰 (Outside Passed Pawn)',
    category: 'intermediate',
    playerColor: 'w',
    fen: '8/1k6/6p1/1P6/6P1/4K3/8/8 w - - 0 1',
    goalDescription: '판의 가장자리에 있는 b폰을 미끼로 상대 킹을 유인한 뒤 반대편 킹사이드 폰들을 모두 잡으세요.',
    targetResult: 'promotion',
    tip: '상대 킹이 b폰을 잡으러 멀리 이동하는 동안 백 킹은 g폰을 향해 직진합니다.',
    explanation: '외곽 패스폰은 상대 킹의 주의를 완전히 분산시키는 가장 강력한 엔드게임 무기입니다.'
  },
  {
    id: 21,
    title: '퀸 vs 룩 필리도어 포크 (나무위키 3.2)',
    category: 'intermediate',
    playerColor: 'w',
    fen: '8/8/8/8/4K3/8/4Q3/1k1r4 w - - 0 1',
    goalDescription: '퀸으로 나이트 거리를 유지하며 킹을 코너로 몰고, 필리도어 포지션에서 포크로 룩을 따내세요.',
    targetResult: 'checkmate',
    tip: '퀸으로 킹과 룩을 동시에 공격하는 포크 각을 만들어 상대 룩을 낚아채세요.',
    explanation: '나무위키 3.2: "퀸 vs 룩은 좀 까다롭긴 하지만 퀸이 이긴다. 킹으로는 대각선을 파고들고 퀸으로 상대 킹과 룩에 포크를 걸어 룩을 따내고 메이트한다."'
  },
  {
    id: 22,
    title: '퀸 vs 나이트 오포지션 (나무위키 3.2)',
    category: 'intermediate',
    playerColor: 'w',
    fen: '8/8/8/4k3/8/4K3/4Q3/5n2 w - - 0 1',
    goalDescription: '킹끼리 오포지션을 잡고 퀸으로 킹을 밀어올리며 나이트를 포크로 낚아채세요.',
    targetResult: 'checkmate',
    tip: '나이트가 불리한 외곽으로 밀려나면 퀸의 이중 공격에 노출되어 필연적으로 잡히게 됩니다.',
    explanation: '나무위키 3.2: "퀸 vs 나이트는 킹끼리 오포지션을 잡은 다음 퀸으로 킹을 위로 밀어올리고 옆의 나이트를 포크로 견제하여 잡아내 메이트한다."'
  },
  {
    id: 23,
    title: '룩 vs 비숍 코너 방어 (나무위키 3.2)',
    category: 'intermediate',
    playerColor: 'b',
    fen: '8/8/8/8/8/4k3/4b3/4K2r b - - 0 1',
    goalDescription: '비숍과 킹이 협력하여 룩의 공격을 방어하고 이론적 무승부를 이끌어내세요.',
    targetResult: 'draw',
    tip: '비숍이 통제하는 색상의 코너로 킹을 이동시키면 룩의 치명적 체크를 무력화할 수 있습니다.',
    explanation: '나무위키 3.2: "룩 vs 비숍은 보통 무승부이다. 단, 비숍과 킹이 서로 다른 위치에 안전하게 존재할 수 있어야 한다."'
  },
  {
    id: 24,
    title: '룩 vs 나이트 분리 공략 (나무위키 3.2)',
    category: 'intermediate',
    playerColor: 'w',
    fen: '8/8/8/8/4k3/8/n1R5/4K3 w - - 0 1',
    goalDescription: '킹과 멀리 떨어진 외곽 가장자리의 나이트를 룩으로 포위하여 포획하세요.',
    targetResult: 'checkmate',
    tip: '나이트가 구석(a2)에 고립되면 움직일 수 있는 칸이 2개 이하로 제한되어 룩의 쉬운 먹잇감이 됩니다.',
    explanation: '나무위키 3.2: "룩 vs 나이트는 나이트가 중앙에 있거나 킹과 붙어 있으면 비기지만, 나이트가 가장자리에 있고 킹과 떨어져 있으면 룩이 이긴다."'
  },
  {
    id: 25,
    title: '반대색 비숍 무승부 요새 (나무위키 3.5.1)',
    category: 'intermediate',
    playerColor: 'w',
    fen: '8/8/4bk2/8/4P3/8/4KB2/8 w - - 0 1',
    goalDescription: '서로 다른 색 칸을 지배하는 비숍의 성질을 이용해 폰이 열세인 상태에서도 무승부를 방어하세요.',
    targetResult: 'draw',
    tip: '상대 폰이 전진하려는 칸의 색상을 비숍으로 철통같이 통제하면 킹이 침투할 수 없습니다.',
    explanation: '나무위키 3.5.1: "반대색 비숍 엔딩은 폰이 불리하더라도 블록체인을 구축하면 무승부를 만들어내기 가장 쉬운 엔딩이다."'
  },
  {
    id: 26,
    title: '잘못된 색 비숍과 룩폰 (나무위키 3.5.2 - 카스파로프 무승부)',
    category: 'intermediate',
    playerColor: 'w',
    fen: '8/8/8/8/8/5K1k/7P/7B w - - 0 1',
    goalDescription: '비숍의 색상과 승급 칸(h8) 색상이 일치하지 않을 때, 흑 킹이 코너에 숨으면 무승부가 되는 원리를 체험하세요.',
    targetResult: 'draw',
    tip: 'h8 칸이 밝은 칸인데 백 비숍이 어두운 칸 비숍이라면 흑 킹을 쫓아낼 방법이 없습니다.',
    explanation: '나무위키 3.5.2: "비숍의 색이 룩폰의 승진 칸 색과 일치하지 않는 경우를 잘못된 색 비숍이라 부른다. 가리 카스파로프도 이 함정에 걸려 무승부를 기록한 바 있다."'
  },
  {
    id: 27,
    title: '나이트 vs 전진 폰 (Knight Barrier - 나무위키 3.6)',
    category: 'intermediate',
    playerColor: 'w',
    fen: '8/8/8/8/8/3N4/4p1k1/4K3 w - - 0 1',
    goalDescription: '나이트의 포크와 차단 능력을 활용하여 상대 흑 폰의 승급을 저지하고 무승부를 확보하세요.',
    targetResult: 'draw',
    tip: '나이트를 폰 앞의 승급 칸에 배치하거나 킹과 폰을 동시에 위협하는 포크를 노리세요.',
    explanation: '나무위키 3.6: "나이트는 전진하는 폰을 봉쇄(Blockade)하는 데 탁월하며, 보트비닉은 나이트 엔딩의 수읽기가 폰 엔딩과 흡사하다고 강조했다."'
  },
  {
    id: 28,
    title: '비숍의 긴 대각선 차단 (Long Diagonal Stopping - 나무위키 3.5)',
    category: 'intermediate',
    playerColor: 'w',
    fen: '8/8/8/8/B7/8/6pk/4K3 w - - 0 1',
    goalDescription: '비숍의 긴 대각선 사거리를 이용하여 막바지에 다다른 상대 폰의 승급을 무력화하세요.',
    targetResult: 'draw',
    tip: '비숍을 승급 칸(g1)을 내려다보는 긴 대각선 상에 위치시켜 상대 킹의 승급 시도를 좌절시키세요.',
    explanation: '비숍은 원거리에서도 단 한 수로 상대 폰의 승급 칸을 저격할 수 있는 막강한 사거리를 지닙니다.'
  },
  {
    id: 29,
    title: '비숍 vs 나이트: 열린 판 우위 (나무위키 3.8)',
    category: 'intermediate',
    playerColor: 'w',
    fen: '8/p4k2/1p2n3/8/1P2B3/P5P1/5K2/8 w - - 0 1',
    goalDescription: '양 날개에 폰이 분산된 열린 포지션에서 비숍의 압도적인 기동성으로 승리를 가져오세요.',
    targetResult: 'promotion',
    tip: '폰들이 양쪽에 분산되어 있으면 한 번에 판 전체를 횡단할 수 있는 비숍이 느린 나이트를 압도합니다.',
    explanation: '나무위키 3.8: "폰이 보드의 양쪽 날개에 분산되어 있는 열린 포지션에서는 장거리 기물인 비숍이 나이트에 비해 절대적인 우위를 점한다."'
  },
  {
    id: 30,
    title: '비숍 vs 나이트: 닫힌 판 나이트 우위 (나무위키 3.8)',
    category: 'intermediate',
    playerColor: 'w',
    fen: '8/1p3k2/p1p1p1p1/2PpPp1p/1P1P1P1P/4K1P1/1b2N3/8 w - - 0 1',
    goalDescription: '폰들이 서로 얽혀 잠긴 닫힌 포지션에서 나이트의 점프 능력으로 갇힌 비숍을 제압하세요.',
    targetResult: 'promotion',
    tip: '비숍은 아군 폰 사슬에 가로막혀 바보가 되지만, 나이트는 폰을 뛰어넘어 약점 칸에 침투할 수 있습니다.',
    explanation: '나무위키 3.8: "폰 구조가 닫혀 움직이기 힘든 상황에서는 나쁜 비숍보다 장벽을 넘을 수 있는 나이트가 훨씬 강력하다."'
  },
  {
    id: 31,
    title: '킹사이드 다수파 폰 돌파 (3 vs 2 Majority)',
    category: 'intermediate',
    playerColor: 'w',
    fen: '8/8/5kp1/8/5PPP/5K2/8/8 w - - 0 1',
    goalDescription: 'f, g, h 폰의 다수파 우위를 앞세워 패스폰을 창출하고 승급하세요.',
    targetResult: 'promotion',
    tip: '폰들을 나란히 전진시키고 상대 폰을 교환해 홀로 남는 통과 폰을 만드세요.',
    explanation: '날개 진영에서의 폰 다수파(Majority)는 결정적인 패스폰을 만드는 가장 정석적인 승리 루트입니다.'
  },
  {
    id: 32,
    title: '나이트 아웃포스트 엔드게임 (Knight Outpost)',
    category: 'intermediate',
    playerColor: 'w',
    fen: '8/5pk1/4p1p1/4N3/8/5KP1/8/8 w - - 0 1',
    goalDescription: '중앙 e5에 든든하게 자리 잡은 나이트를 중심으로 상대 진영을 압박하세요.',
    targetResult: 'promotion',
    tip: '상대 폰이 쫓아낼 수 없는 중앙 칸(Outpost)에 있는 나이트는 룩에 버금가는 위력을 발휘합니다.',
    explanation: '나이트의 굳건한 전초기지는 상대 킹의 움직임을 묶어두고 아군 킹의 전진을 돕습니다.'
  },
  {
    id: 33,
    title: '룩 vs 폰: 킹이 폰 뒤를 쫓는 엔딩 (나무위키 3.10)',
    category: 'intermediate',
    playerColor: 'w',
    fen: '8/8/8/3k4/8/1p6/1K6/R7 w - - 0 1',
    goalDescription: '상대 폰이 전진하기 전에 룩으로 측면을 압박하고 킹으로 폰을 낚아채세요.',
    targetResult: 'checkmate',
    tip: '폰을 아군 킹과 룩으로 협공하여 안전하게 제거한 뒤 룩 체크메이트로 전환하세요.',
    explanation: '나무위키 3.10: "룩 vs 폰 엔딩에서는 상대 킹이 폰을 지키러 오기 전에 아군 기물로 폰을 고립시키는 속도가 승패를 좌우한다."'
  },

  // ==========================================
  // --- 🔴 고급 (Advanced / Master 34 ~ 50) ---
  // ==========================================
  {
    id: 34,
    title: '루세나 포지션 (Lucena Position - 다리 놓기, 나무위키 3.4.2)',
    category: 'advanced',
    playerColor: 'w',
    fen: '1K1R4/3P1k2/8/8/8/8/8/2r5 w - - 0 1',
    goalDescription: 'Rd4!로 룩을 4번째 랭크에 배치하고 킹 탈출 후 룩으로 다리(Bridge)를 놓아 폰을 승급시키세요.',
    targetResult: 'promotion',
    tip: '1. Rd4! -> 2. Ke7 -> 3. Rd5/Rd6 -> 상대 룩의 무한 체크를 아군 룩으로 막아서는(Bridge) 기술입니다.',
    explanation: '나무위키 3.4.2: "룩 엔드게임의 바이블. 7랭크 폰과 승진 칸을 점유한 킹을 위해 4랭크 룩으로 다리(Bridge)를 놓아 승진을 강제한다."'
  },
  {
    id: 35,
    title: '필리도르 방어 (Philidor Defense - 룩 무승부, 나무위키 3.4.1)',
    category: 'advanced',
    playerColor: 'b',
    fen: '3R4/8/4k3/4p3/8/8/2r5/4K3 b - - 0 1',
    goalDescription: '룩을 6번째 랭크(백 기준 3랭크)에 고정해 킹 진입을 막다가, 상대 폰이 전진하면 후방 무한 체크로 비기세요.',
    targetResult: 'draw',
    tip: '폰이 아직 안 넘어왔을 땐 6랭크를 차단하고, 폰이 전진하는 순간 룩을 맨 뒤(1랭크)로 내려 무한 체크를 퍼부으세요.',
    explanation: '나무위키 3.4.1: "필리도어 포지션은 1폰 불리한 룩 엔딩의 기초적인 비김 포지션이다. 3랭크 차단 후 폰 전진 시 8랭크 후방 무한 체크로 무승부를 거둔다."'
  },
  {
    id: 36,
    title: '쇼트 사이드 방어 (Short Side Defense, 나무위키 3.4.2.1)',
    category: 'advanced',
    playerColor: 'b',
    fen: '8/8/4k3/4P3/8/8/r7/2R1K3 b - - 0 1',
    goalDescription: '킹은 공간이 좁은 쇼트 사이드에, 룩은 거리가 먼 롱 사이드에 배치하여 4열 거리의 체크를 확보하세요.',
    targetResult: 'draw',
    tip: '체크를 거는 룩과 상대 킹 사이에는 최소 3~4칸 이상의 거리가 확보되어야 안전하게 체크를 이어갈 수 있습니다.',
    explanation: '나무위키 3.4.2.1: "폰을 기준으로 수비 킹이 숏 사이드에, 수비 룩이 롱 사이드에 위치해 최소 4열 이상 떨어져 측면 체크를 가하면 무승부가 된다."'
  },
  {
    id: 37,
    title: '바의 규칙 (Bahr\'s Rule - 나무위키 3.3.5)',
    category: 'advanced',
    playerColor: 'w',
    fen: '8/8/8/p1K5/8/k7/8/8 w - - 0 1',
    goalDescription: '공격 측 킹이 룩폰 옆에 붙은 상태에서 상대 폰을 추격하여 바의 기하학적 승리 선을 실습하세요.',
    targetResult: 'promotion',
    tip: '백 킹이 상대 a-폰을 잡고 아군 폰을 승급시킬 수 있는지 여부는 체스판 절반을 넘었는지에 달렸습니다.',
    explanation: '나무위키 3.3.5: "바의 규칙은 공격 킹이 룩폰을 잡으러 갈 때의 승패 판정법이다. 룩폰이 절반을 넘어가면 무조건 이기며, 그렇지 않을 경우 특유의 대각선 선상 규칙을 따른다."'
  },
  {
    id: 38,
    title: '반추라 포지션 (Vančura Position, 나무위키 3.10 & 3.4)',
    category: 'advanced',
    playerColor: 'b',
    fen: '8/7k/8/R7/7P/8/8/r3K3 b - - 0 1',
    goalDescription: '룩을 측면(a-file 또는 6랭크)에서 대기시키며 상대 폰과 킹을 옆에서 괴롭혀 승급을 저지하세요.',
    targetResult: 'draw',
    tip: '룩이 측면에서 체크를 걸면 상대 킹은 폰을 방패 삼아 숨을 공간이 없어집니다.',
    explanation: '나무위키 3.4: "반추라 포지션은 룩과 룩폰 엔드게임에서 룩을 측면에 배치해 폰의 전진을 무력화시키는 고난도 무승부 방어법이다."'
  },
  {
    id: 39,
    title: '타라시 규칙 (Tarrasch Rule - 룩은 패스폰 뒤에, 나무위키 3.10)',
    category: 'advanced',
    playerColor: 'w',
    fen: '8/R7/8/3P4/8/8/k7/1r2K3 w - - 0 1',
    goalDescription: '룩을 아군 패스폰의 바로 뒤에 위치시켜 폰이 전진할수록 룩의 활동 영역을 극대화하세요.',
    targetResult: 'promotion',
    tip: '지크베르트 타라시의 명언: "룩은 패스폰의 앞이 아니라 반드시 뒤에 두어야 한다."',
    explanation: '나무위키 3.10: "타라시 규칙에 따라 룩을 패스폰 뒤에 두면 폰이 전진할수록 룩의 활동 반경이 넓어져 상대를 압도할 수 있다."'
  },
  {
    id: 40,
    title: '비숍 + 나이트 vs 킹 메이트 (B+N Mate, 나무위키 3.1)',
    category: 'advanced',
    playerColor: 'w',
    fen: '7k/8/5K2/8/8/5B2/5N2/8 w - - 0 1',
    goalDescription: '비숍과 같은 색상의 코너(h8)로 상대 킹을 몰아넣고 나이트와 비숍의 협공으로 메이트를 완성하세요.',
    targetResult: 'checkmate',
    tip: '나이트가 비숍이 통제하지 못하는 색상의 칸을 완벽하게 차단하는 W자 패턴을 만드세요.',
    explanation: '나무위키 3.1: "기본 기물 메이트 중 가장 까다로운 메이트로, 비숍과 같은 색 칸의 코너로 킹을 몰아야만 체크메이트가 가능하다."'
  },
  {
    id: 41,
    title: '룩 + 비숍 vs 룩 요새 방어 (나무위키 3.2 - 기네스북 269수 무승부)',
    category: 'advanced',
    playerColor: 'b',
    fen: '8/8/8/4k3/8/4B3/4R3/4K2r b - - 0 1',
    goalDescription: '공격 측의 강력한 R+B 압박에 맞서 룩 체크와 킹의 안정적 위치 선정으로 무승부를 지켜내세요.',
    targetResult: 'draw',
    tip: '킹이 코너로 몰리지 않도록 중심부를 유지하며 상대 비숍의 침투 각도를 견제하세요.',
    explanation: '나무위키 3.2: "룩+비숍 vs 룩은 이론상 무승부이지만 수비가 매우 까다롭다. 공식 체스 역사상 가장 긴 기네스북 등재 269수 무승부 대국도 이 엔딩에서 나왔다."'
  },
  {
    id: 42,
    title: '퀸 vs 2룩 요새 무승부 (나무위키 3.2 퀸 vs 2룩)',
    category: 'advanced',
    playerColor: 'b',
    fen: '8/8/5k2/8/8/2rr4/8/4KQ2 b - - 0 1',
    goalDescription: '두 룩이 서로를 지키는 견고한 방어선을 구축하여 퀸의 체크 공세를 무력화하고 무승부를 달성하세요.',
    targetResult: 'draw',
    tip: '두 룩이 같은 파일이나 랭크에서 서로를 지켜주는 포지션을 유지하세요.',
    explanation: '나무위키 3.2: "두 룩이 서로를 지켜주는 포지션을 만든 상황이라면 일단 무승부는 확보했다고 봐도 될 정도로 룩이 유리하다."'
  },
  {
    id: 43,
    title: '퀸 vs 2비숍 50수 방어 (나무위키 3.2 퀸 vs 2비숍)',
    category: 'advanced',
    playerColor: 'b',
    fen: '8/8/4k3/8/3bb3/8/8/4K1Q1 b - - 0 1',
    goalDescription: '두 비숍이 나란히 서서 장벽을 치면 퀸이라도 50수 이내에 뚫기 어렵습니다. 견고히 버티세요.',
    targetResult: 'draw',
    tip: '두 비숍이 킹과 밀착하여 서로의 약점 칸을 보완하며 요새를 유지하세요.',
    explanation: '나무위키 3.2: "퀸 vs 2비숍은 최선의 수로 100수가 넘어가기 때문에 50수 무승부 룰에 따라 대부분 무승부로 끝난다."'
  },
  {
    id: 44,
    title: '2비숍 vs 나이트 (나무위키 3.2 2비숍 vs 나이트)',
    category: 'advanced',
    playerColor: 'w',
    fen: '8/8/4k3/8/8/4B3/3NB3/4K3 w - - 0 1',
    goalDescription: '비숍 쌍의 협공으로 나이트의 발을 묶고 상대 킹을 밀어내어 승기를 잡으세요.',
    targetResult: 'checkmate',
    tip: '비숍 두 개로 나이트가 도약할 수 있는 칸들을 하나씩 지워가며 퇴로를 차단하세요.',
    explanation: '나무위키 3.2: "2마이너 피스 vs 1마이너 피스 중 2비숍 vs 나이트의 경우에만 2비숍 측이 승리를 노려볼 수 있다."'
  },
  {
    id: 45,
    title: '마이너 피스 vs 3개 연결된 폰 (나무위키 3.9)',
    category: 'advanced',
    playerColor: 'w',
    fen: '8/8/8/8/4ppp1/8/5B2/4K2k w - - 0 1',
    goalDescription: '3개의 연결된 전진 폰은 비숍 하나를 삼킬 수 있습니다. 비숍의 기동성으로 폰들을 분리하여 저지하세요.',
    targetResult: 'draw',
    tip: '선두 폰의 승급 칸을 비숍으로 미리 봉쇄하고 백 킹을 신속히 접근시키세요.',
    explanation: '나무위키 3.9: "마이너 피스 vs 3폰 엔딩에서 3개의 연결된 패스폰은 마이너 피스를 압도하는 위력을 발휘할 수 있어 정확한 저지가 필수적이다."'
  },
  {
    id: 46,
    title: '룩 vs 연결된 2개 패스폰 (나무위키 3.10)',
    category: 'advanced',
    playerColor: 'w',
    fen: '8/8/8/8/4pp2/8/4R3/4K1k1 w - - 0 1',
    goalDescription: '6랭크까지 전진한 위험천만한 2개 폰을 룩의 후방 타격과 킹의 차단으로 막아내세요.',
    targetResult: 'draw',
    tip: '폰들이 동시에 7랭크로 들어서기 전에 룩으로 한 폰을 잡거나 킹을 폰 앞으로 데려와야 합니다.',
    explanation: '나무위키 3.10: "연결된 6랭크 폰 2개는 룩과 대등할 정도로 무섭습니다. 룩의 침착한 핀과 체크로 승급을 저지해야 합니다."'
  },
  {
    id: 47,
    title: '퀸 vs 7랭크 c-폰 스테일메이트 트랩 (나무위키 3.7)',
    category: 'advanced',
    playerColor: 'w',
    fen: '8/8/8/8/8/4K3/2p5/1k4Q1 w - - 0 1',
    goalDescription: 'c-폰이나 f-폰이 7랭크에 오면 흑 킹이 코너로 들어가 스테일메이트를 유도합니다. 이를 파훼하세요.',
    targetResult: 'checkmate',
    tip: '무작정 폰을 잡으면 스테일메이트가 될 수 있으므로 퀸 체크로 킹을 몰아내고 킹을 전진시키세요.',
    explanation: '나무위키 3.7: "비숍 폰(c, f열)이 7랭크에 도달하면 흑 킹이 코너에 숨어 스테일메이트를 강제하므로 승리하기 매우 까다롭다."'
  },
  {
    id: 48,
    title: '보트비닉의 나이트 엔딩 법칙 (나무위키 3.6)',
    category: 'advanced',
    playerColor: 'w',
    fen: '8/5k2/1p1p1p2/pP1P1P2/P3N3/5K2/8/8 w - - 0 1',
    goalDescription: '나이트로 d6 약점 폰을 타격하고 킹을 전진시켜 폰 엔딩처럼 깔끔하게 승리하세요.',
    targetResult: 'promotion',
    tip: 'Nxd6+로 상대 폰을 회수한 뒤 아군 패스폰을 앞세워 킹과 함께 밀고 들어가세요.',
    explanation: '나무위키 3.6: "미하일 보트비닉의 유명한 격언: \'나이트 엔딩은 폰 엔딩과 같다.\' 나이트로 핵심 칸을 통제한 뒤 폰 엔딩 원리로 승리한다."'
  },
  {
    id: 49,
    title: '레티 엔드게임 스터디 (Réti Study - 기적의 대각선 행마, 나무위키 3.3.6)',
    category: 'advanced',
    playerColor: 'w',
    fen: '7K/8/k1P5/7p/8/8/8/8 w - - 0 1',
    goalDescription: '도저히 불가능해 보이는 형세에서 백 킹의 환상적인 대각선 행마(Kg7->Kf6->Ke5)로 폰을 지키고 무승부를 일궈내세요.',
    targetResult: 'draw',
    tip: '1. Kg7! h4 2. Kf6! Kb6 3. Ke5! 로 상대 h폰 추격과 아군 c폰 수비를 동시에 달성합니다.',
    explanation: '나무위키 3.3.6: "리하르트 레티가 1921년에 발표한 불후의 명작. 킹의 대각선 이동으로 두 가지 위협을 동시에 가하며 기적의 무승부를 만든다."'
  },
  {
    id: 50,
    title: '사베드라 포지션 (Saavedra Position - 전설의 룩 언더프로모션)',
    category: 'advanced',
    playerColor: 'w',
    fen: '8/2P5/8/8/8/8/1r6/k1K5 w - - 0 1',
    goalDescription: '체스 역사상 가장 유명한 묘수! 퀸 승급 시 스테일메이트를 피하기 위해 1. c8=R!! 룩으로 승급하여 승리하세요.',
    targetResult: 'promotion',
    tip: '퀸으로 승급하면 흑이 Rc2+! Rxc2 스테일메이트를 노립니다. 룩으로 승급하면 Ra8# 체크메이트 위협으로 승리합니다!',
    explanation: '페르난도 사베드라 신부가 1895년 발견한 역사적 걸작 퍼즐입니다. 언더프로모션의 정수를 보여줍니다.'
  }
];
