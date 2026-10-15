export type OpeningCategory = 'open_e4' | 'semi_open' | 'closed_d4' | 'indian' | 'flank';

export interface ChessOpening {
  eco: string;
  nameKo: string;
  nameEn: string;
  moves: string[]; // array of SAN moves, e.g. ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']
  descriptionKo?: string;
  category: OpeningCategory;
  recommendedSide?: 'w' | 'b';
  isFamous?: boolean;
  keyGoalsKo?: string[];
  moveExplanationsKo?: string[];
}

export const OPENING_CATEGORIES: { id: OpeningCategory | 'all' | 'famous'; nameKo: string; icon: string }[] = [
  { id: 'famous', nameKo: '🌟 추천 유명 오프닝', icon: '🌟' },
  { id: 'all', nameKo: '전체 보기', icon: '📚' },
  { id: 'open_e4', nameKo: '1.e4 오픈 게임', icon: '⚔️' },
  { id: 'semi_open', nameKo: '1.e4 세미 오픈', icon: '🛡️' },
  { id: 'closed_d4', nameKo: '1.d4 퀸스 폰', icon: '👑' },
  { id: 'indian', nameKo: '인디언 디펜스', icon: '🏹' },
  { id: 'flank', nameKo: '플랭크 / 기타', icon: '⚡' },
];

export const OPENINGS: ChessOpening[] = [
  // ==========================================
  // 1. Open Games (1.e4 e5)
  // ==========================================
  {
    eco: 'C50',
    nameKo: '이탈리안 게임',
    nameEn: 'Italian Game',
    category: 'open_e4',
    isFamous: true,
    recommendedSide: 'w',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
    descriptionKo: '가장 고전적이고 균형 잡힌 백의 전개 오프닝으로, f7 취약점을 겨냥합니다.',
    keyGoalsKo: [
      '중앙 e4 폰과 d4 전진을 통한 탄탄한 중앙 장악',
      '흑의 가장 취약한 지점인 f7 폰을 정조준',
      '신속한 킹사이드 캐슬링과 밝은색 비숍 활동성 확보',
    ],
    moveExplanationsKo: [
      'e4: 중앙 영역(d5, f5)을 선점하고 퀸과 밝은 비숍의 대각선을 엽니다.',
      'e5: 백의 중앙 독점을 방어하며 대칭적으로 중앙을 점유합니다.',
      'Nf3: 흑의 e5 폰을 직접 공격하면서 킹사이드 나이트를 빠르게 전개합니다.',
      'Nc6: 위협받는 e5 폰을 든든하게 수비하며 퀸사이드 기물을 전개합니다.',
      'Bc4: 흑 진영에서 오직 킹만 지키고 있는 가장 취약한 f7 폰을 정조준합니다.',
    ],
  },
  {
    eco: 'C53',
    nameKo: '지우코 피아노',
    nameEn: 'Giuoco Piano',
    category: 'open_e4',
    isFamous: true,
    recommendedSide: 'w',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'],
    descriptionKo: '이탈리안 게임의 기본 비숍 맞대결로 차분하고 깊은 포지셔널 게임을 이끕니다.',
    keyGoalsKo: [
      '이탈리안의 대칭적 비숍 전개와 균형 잡힌 전선',
      'c3 후 d4 전진으로 중앙 주도권 장악',
      '안전한 캐슬링 및 유기적 기물 연계',
    ],
    moveExplanationsKo: [
      'e4: 킹 앞 폰을 전진해 중앙을 장악합니다.',
      'e5: 백에 맞서 중앙 균형을 맞춥니다.',
      'Nf3: e5 폰을 위협하며 나이트를 전개합니다.',
      'Nc6: e5 폰을 보호합니다.',
      'Bc4: f7을 조준하는 강력한 이탈리안 비숍을 배치합니다.',
      'Bc5: 흑 역시 백의 f2 지점을 노리며 비숍을 대칭적으로 전개합니다.',
    ],
  },
  {
    eco: 'C54',
    nameKo: '지우코 피아니시모',
    nameEn: 'Giuoco Pianissimo',
    category: 'open_e4',
    recommendedSide: 'w',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3'],
    descriptionKo: '이탈리안 게임의 차분하고 전략적인 발전형으로 매우 안정적입니다.',
    keyGoalsKo: [
      'd3로 e4 폰을 안전하게 지키고 c1 비숍의 활로를 개방',
      '무리한 공격 대신 점진적인 공간 확장',
    ],
    moveExplanationsKo: [
      'e4: 중앙 장악.',
      'e5: 중앙 대항.',
      'Nf3: e5 공격.',
      'Nc6: e5 수비.',
      'Bc4: f7 압박.',
      'Bc5: 대칭적 비숍 전개.',
      'd3: e4 폰을 견고히 보호하며 차분하게 c1 비숍의 활로를 엽니다.',
    ],
  },
  {
    eco: 'C51',
    nameKo: '에반스 갬빗',
    nameEn: 'Evans Gambit',
    category: 'open_e4',
    isFamous: true,
    recommendedSide: 'w',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4'],
    descriptionKo: '빠른 기물 전개와 중앙 장악을 위해 b4 폰을 과감하게 희생하는 공격적 갬빗입니다.',
    keyGoalsKo: [
      'b4 폰 희생으로 템포를 벌고 흑 비숍을 유인',
      'c3 후 폭발적인 d4 전진으로 완벽한 중앙 지배',
      'Ba3 또는 Qb3를 통한 파괴적인 공격 전개',
    ],
    moveExplanationsKo: [
      'e4: 중앙 장악과 기물 활로 개방.',
      'e5: 중앙 대항.',
      'Nf3: e5 폰 공격.',
      'Nc6: 폰 수비 및 기물 전개.',
      'Bc4: f7을 조준하는 비숍 전개.',
      'Bc5: 흑의 비숍 맞대결.',
      'b4: [에반스 갬빗!] 폰을 희생하여 흑 비숍을 끌어내고, c3-d4로 폭발적인 중앙 주도권을 쥡니다.',
    ],
  },
  {
    eco: 'C55',
    nameKo: '투 나이츠 디펜스',
    nameEn: 'Two Knights Defence',
    category: 'open_e4',
    recommendedSide: 'b',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'],
    descriptionKo: '흑이 수동적인 비숍 대신 나이트로 백의 e4를 직접 반격하는 역동적 수비입니다.',
    keyGoalsKo: [
      '수비 대신 백의 e4 폰을 맞타격하여 주도권 쟁탈',
      '백의 Ng5 공격을 정교하게 받아치며 난전 유도',
    ],
  },
  {
    eco: 'C57',
    nameKo: '프라이드 리버 어택',
    nameEn: 'Fried Liver Attack',
    category: 'open_e4',
    isFamous: true,
    recommendedSide: 'w',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nxd5', 'Nxf7'],
    descriptionKo: '흑의 f7 약점을 나이트 희생으로 폭파하여 흑 킹을 사냥하는 파괴적 전술입니다.',
    keyGoalsKo: [
      '흑의 취약한 f7 지점을 나이트 희생으로 격파',
      '흑 킹을 안전지대에서 중앙으로 끌어내어 무자비한 핀 공격',
      'Qf3+ 및 Nc3를 통한 흑 나이트 압박 및 체크메이트 위협',
    ],
    moveExplanationsKo: [
      'e4: 킹스 폰 전진.',
      'e5: 대칭적 중앙 대응.',
      'Nf3: 나이트 전개 및 e5 위협.',
      'Nc6: e5 수비.',
      'Bc4: f7을 겨냥하는 비숍.',
      'Nf6: 투 나이츠 디펜스로 백의 e4를 공격.',
      'Ng5: 비숍과 협력하여 흑의 f7 칸을 2대1로 강력하게 위협합니다.',
      'd5: f7 길을 막기 위한 흑의 최선의 중앙 차단 수.',
      'exd5: 백이 d5 폰을 취하며 폰 길을 엽니다.',
      'Nxd5: 흑이 나이트로 되잡는 순간 치명적인 함정에 빠집니다.',
      'Nxf7: [프라이드 리버 희생!] f7을 찢고 퀸과 룩을 포크하며, 흑 킹을 노출시킵니다.',
    ],
  },
  {
    eco: 'C60',
    nameKo: '루이 로페즈 (스페니시)',
    nameEn: 'Ruy Lopez',
    category: 'open_e4',
    isFamous: true,
    recommendedSide: 'w',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
    descriptionKo: '체스 역사상 가장 깊이 연구된 강력한 오프닝으로, e5의 수비수를 압박합니다.',
    keyGoalsKo: [
      'e5 폰을 수비하는 c6 나이트에 대한 핀과 간접적 압박',
      '안전한 캐슬링 후 c3-d4 폰 센터 구축',
      '장기적인 포지셔널 우위 확보',
    ],
    moveExplanationsKo: [
      'e4: 중앙 장악과 퀸/비숍 길 확보.',
      'e5: 중앙 균형.',
      'Nf3: e5 폰을 직접 공격.',
      'Nc6: 나이트로 e5를 수비.',
      'Bb5: [루이 로페즈!] e5의 수비수인 c6 나이트를 핀에 걸거나 교환을 위협하여 중앙 주도권을 쥡니다.',
    ],
  },
  {
    eco: 'C65',
    nameKo: '루이 로페즈: 베를린 디펜스',
    nameEn: 'Berlin Defence',
    category: 'open_e4',
    recommendedSide: 'b',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6'],
    descriptionKo: '견고한 방어로 무승부나 단단한 엔드게임을 이끌어내는 현대 마스터들의 철벽 방패입니다.',
  },
  {
    eco: 'C84',
    nameKo: '루이 로페즈: 클로즈드',
    nameEn: 'Closed Ruy Lopez',
    category: 'open_e4',
    recommendedSide: 'w',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7'],
    descriptionKo: '루이 로페즈의 정통 메인 라인으로 장기전 포지셔널 대결의 정수입니다.',
  },
  {
    eco: 'C68',
    nameKo: '루이 로페즈: 익스체인지',
    nameEn: 'Exchange Variation',
    category: 'open_e4',
    recommendedSide: 'w',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Bxc6'],
    descriptionKo: '나이트와 비숍을 교환해 흑에게 더블 폰을 안기고 엔드게임 폰 구조 우위를 노립니다.',
  },
  {
    eco: 'C45',
    nameKo: '스코치 게임',
    nameEn: 'Scotch Game',
    category: 'open_e4',
    isFamous: true,
    recommendedSide: 'w',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4'],
    descriptionKo: '3수만에 중앙 폰을 즉시 부딪혀 빠른 개방전과 주도권을 유도합니다.',
    keyGoalsKo: [
      '3수 만에 d4를 쳐서 중앙을 즉각 개방',
      '빠른 기물 활성화와 열린 d-열 장악',
      '카스파로프가 즐겨 사용한 날카로운 무기',
    ],
    moveExplanationsKo: [
      'e4: 중앙 장악.',
      'e5: 흑의 대항.',
      'Nf3: e5 폰 공격.',
      'Nc6: 수비 및 전개.',
      'd4: [스코치 게임] 흑의 e5 폰을 즉각 쳐서 중앙을 폭파하고 포지션을 신속히 개방합니다.',
    ],
  },
  {
    eco: 'C42',
    nameKo: '페트로프 디펜스 (러시안)',
    nameEn: 'Petrov Defence',
    category: 'open_e4',
    recommendedSide: 'b',
    moves: ['e4', 'e5', 'Nf3', 'Nf6'],
    descriptionKo: '수비 대신 백의 폰을 직접 노리는 대칭적 전개로 견고한 균형을 만듭니다.',
  },
  {
    eco: 'C47',
    nameKo: '포 나이츠 게임',
    nameEn: 'Four Knights Game',
    category: 'open_e4',
    recommendedSide: 'w',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6'],
    descriptionKo: '양측 모든 나이트가 빠르게 전개되는 대칭적이고 정통적인 형태입니다.',
  },
  {
    eco: 'C40',
    nameKo: '킹스 갬빗',
    nameEn: 'King’s Gambit',
    category: 'open_e4',
    isFamous: true,
    recommendedSide: 'w',
    moves: ['e4', 'e5', 'f4'],
    descriptionKo: '낭만주의 체스의 상징으로, f4 폰을 희생하여 열린 f-열과 빠른 공격을 도모합니다.',
    keyGoalsKo: [
      'f4 폰 희생으로 흑의 e5 중앙 폰을 끌어냄',
      'd4와 Nf3로 중앙 지배 및 열린 f-열을 통한 킹사이드 맹공',
    ],
    moveExplanationsKo: [
      'e4: 중앙 장악.',
      'e5: 중앙 대항.',
      'f4: [킹스 갬빗!] f-폰을 희생하여 흑의 중앙 폰을 유인하고 f-열을 공격로로 개방합니다.',
    ],
  },
  {
    eco: 'C23',
    nameKo: '비숍스 오프닝',
    nameEn: 'Bishop’s Opening',
    category: 'open_e4',
    recommendedSide: 'w',
    moves: ['e4', 'e5', 'Bc4'],
    descriptionKo: '나이트보다 비숍을 먼저 전개해 f7을 노리는 유연한 시스템입니다.',
  },
  {
    eco: 'C25',
    nameKo: '비엔나 게임',
    nameEn: 'Vienna Game',
    category: 'open_e4',
    isFamous: true,
    recommendedSide: 'w',
    moves: ['e4', 'e5', 'Nc3'],
    descriptionKo: 'c3 나이트로 중앙을 지키며 이후 f4 전진을 노리는 유연하고 강력한 오프닝입니다.',
    keyGoalsKo: [
      'c3 나이트로 중앙 d5 통제 및 폰 f4 전진 준비',
      '킹스 갬빗보다 안전하게 f-열을 여는 공격적 빌드업',
    ],
    moveExplanationsKo: [
      'e4: 킹스 폰 전진.',
      'e5: 대칭 전개.',
      'Nc3: [비엔나 게임] Nf3 대신 나이트를 c3에 두어 f-폰의 전진(f4) 길을 열어둡니다.',
    ],
  },
  {
    eco: 'C21',
    nameKo: '센터 게임',
    nameEn: 'Center Game',
    category: 'open_e4',
    moves: ['e4', 'e5', 'd4'],
    descriptionKo: '2수만에 중앙 d4를 밀어올리는 직접적 돌파입니다.',
  },
  {
    eco: 'C40',
    nameKo: '킹스 나이트 오프닝',
    nameEn: 'King’s Knight Opening',
    category: 'open_e4',
    moves: ['e4', 'e5', 'Nf3'],
    descriptionKo: '가장 대중적인 백의 2수 전개입니다.',
  },
  {
    eco: 'C20',
    nameKo: '오픈 게임 (킹스 폰)',
    nameEn: 'Open Game',
    category: 'open_e4',
    moves: ['e4', 'e5'],
    descriptionKo: '양측 중앙 폰 전진으로 시작되는 정통 대국입니다.',
  },

  // ==========================================
  // 2. Semi-Open Games (1.e4 non-e5)
  // ==========================================
  {
    eco: 'B90',
    nameKo: '시실리안: 나이도프 바리에이션',
    nameEn: 'Sicilian Najdorf',
    category: 'semi_open',
    isFamous: true,
    recommendedSide: 'b',
    moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'],
    descriptionKo: '카스파로프와 피셔가 애용한 가장 날카롭고 승률 높은 현대 시실리안의 최고봉입니다.',
    keyGoalsKo: [
      'a6로 백 나이트와 비숍의 b5 침투 사전 완벽 차단',
      'c-열 세미 오픈을 활용한 흑의 강력한 퀸사이드 반격',
      '비대칭적인 역동적 승리 지향 포지션 구축',
    ],
    moveExplanationsKo: [
      'e4: 백의 중앙 폰 전진.',
      'c5: 중앙을 측면 폰으로 견제하며 비대칭 포지션을 만듭니다.',
      'Nf3: 백의 d4 돌파 준비.',
      'd6: e5 칸을 통제하고 비숍 길을 엽니다.',
      'd4: 백이 중앙을 열기 위해 d4를 밀어올립니다.',
      'cxd4: 측면 폰으로 중앙 d-폰을 교환하여 흑이 장기적 중앙 폰 우위를 쥡니다.',
      'Nxd4: 백이 나이트로 중앙에 자리잡습니다.',
      'Nf6: 백의 e4 폰을 공격하며 나이트 전개.',
      'Nc3: 백이 e4 폰을 수비합니다.',
      'a6: [나이도프의 핵심!] Bb5+와 Nb5 침투를 완벽히 막고, 추후 ...b5 퀸사이드 확장을 준비합니다.',
    ],
  },
  {
    eco: 'B70',
    nameKo: '시실리안: 드래곤 바리에이션',
    nameEn: 'Sicilian Dragon',
    category: 'semi_open',
    isFamous: true,
    recommendedSide: 'b',
    moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6'],
    descriptionKo: '피앙케토 비숍으로 대각선을 장악하며 극적인 반대 캐슬링 공격전을 펼칩니다.',
    keyGoalsKo: [
      'g6-Bg7 피앙케토로 a1-h8 대각선 완전 지배',
      '서로 반대 방향 캐슬링 후 극적인 킹 레이스 공격전',
      '날카롭고 전술적인 카운터 어택',
    ],
    moveExplanationsKo: [
      'e4: 킹스 폰.',
      'c5: 시실리안 전개.',
      'Nf3: 나이트 전개.',
      'd6: 중앙 지탱.',
      'd4: 중앙 개방.',
      'cxd4: 교환.',
      'Nxd4: 나이트 리캡처.',
      'Nf6: e4 공격.',
      'Nc3: e4 수비.',
      'g6: [드래곤 바리에이션!] 폰 형태가 용자리를 닮아 붙여진 이름으로, 강력한 Bg7 피앙케토를 준비합니다.',
    ],
  },
  {
    eco: 'B22',
    nameKo: '알라핀 시실리안',
    nameEn: 'Alapin Sicilian',
    category: 'semi_open',
    recommendedSide: 'w',
    moves: ['e4', 'c5', 'c3'],
    descriptionKo: 'c3-d4로 든든한 폰 센터를 구축하려는 백의 전략적 선택입니다.',
  },
  {
    eco: 'B23',
    nameKo: '클로즈드 시실리안',
    nameEn: 'Closed Sicilian',
    category: 'semi_open',
    recommendedSide: 'w',
    moves: ['e4', 'c5', 'Nc3'],
    descriptionKo: '중앙을 닫아두고 천천히 킹사이드를 공략하는 시스템입니다.',
  },
  {
    eco: 'B20',
    nameKo: '시실리안 디펜스',
    nameEn: 'Sicilian Defence',
    category: 'semi_open',
    isFamous: true,
    recommendedSide: 'b',
    moves: ['e4', 'c5'],
    descriptionKo: '1.e4에 대항하는 흑의 가장 강력하고 대중적인 승률 높은 비대칭 대응입니다.',
    keyGoalsKo: [
      '중앙 d4를 측면 c-폰으로 견제',
      '장기적으로 중앙 폰 다수 우위 및 c-열 카운터',
    ],
    moveExplanationsKo: [
      'e4: 중앙 장악.',
      'c5: [시실리안 디펜스] 백의 중앙 독점을 측면 폰으로 견제하며 역동적인 승부수를 던집니다.',
    ],
  },
  {
    eco: 'C02',
    nameKo: '프렌치 디펜스: 어드밴스',
    nameEn: 'French Advance Variation',
    category: 'semi_open',
    recommendedSide: 'w',
    moves: ['e4', 'e6', 'd4', 'd5', 'e5'],
    descriptionKo: '중앙 공간을 백이 e5 전진으로 먼저 선점하고 흑의 진영을 압박합니다.',
  },
  {
    eco: 'C00',
    nameKo: '프렌치 디펜스',
    nameEn: 'French Defence',
    category: 'semi_open',
    isFamous: true,
    recommendedSide: 'b',
    moves: ['e4', 'e6', 'd4', 'd5'],
    descriptionKo: '견고한 폰 체인을 바탕으로 중앙을 지키고 카운터를 노리는 정통 방어입니다.',
    keyGoalsKo: [
      '1...e6 후 2...d5로 견고한 폰 중앙 맞서기',
      '...c5 폰 브레이크를 통해 백의 d4 중앙 파괴',
      '견고한 수비 후 백 진영의 과확장된 폰 공격',
    ],
    moveExplanationsKo: [
      'e4: 중앙 장악.',
      'e6: [프렌치 디펜스] 다음 수 d5 전진을 안전하게 받쳐줍니다.',
      'd4: 백이 이상적인 두 개의 중앙 폰을 세웁니다.',
      'd5: 흑이 곧바로 중앙 e4 폰에 도전을 겁니다.',
    ],
  },
  {
    eco: 'B12',
    nameKo: '카로-칸: 어드밴스',
    nameEn: 'Caro-Kann Advance',
    category: 'semi_open',
    recommendedSide: 'w',
    moves: ['e4', 'c6', 'd4', 'd5', 'e5'],
    descriptionKo: '흑의 밝은색 비숍 전개를 시험하는 현대적이고 날카로운 대응입니다.',
  },
  {
    eco: 'B10',
    nameKo: '카로-칸 디펜스',
    nameEn: 'Caro-Kann Defence',
    category: 'semi_open',
    isFamous: true,
    recommendedSide: 'b',
    moves: ['e4', 'c6', 'd4', 'd5'],
    descriptionKo: '프렌치와 달리 밝은 비숍의 활로를 막지 않으며 극도로 견고한 폰 구조를 자랑합니다.',
    keyGoalsKo: [
      '프렌치와 달리 밝은색 비숍(c8)의 길이 막히지 않음',
      '견고하고 흠잡을 데 없는 단단한 폰 구조',
      '엔드게임에서 흑의 구조적 우위 확보',
    ],
    moveExplanationsKo: [
      'e4: 중앙 장악.',
      'c6: [카로-칸 디펜스] d5 전진을 준비하면서도 나중에 c8 비숍이 밖으로 나올 수 있습니다.',
      'd4: 백이 중앙을 장악합니다.',
      'd5: 중앙 e4 폰을 직접 타격합니다.',
    ],
  },
  {
    eco: 'B01',
    nameKo: '스칸디나비안 디펜스',
    nameEn: 'Scandinavian Defence',
    category: 'semi_open',
    isFamous: true,
    recommendedSide: 'b',
    moves: ['e4', 'd5'],
    descriptionKo: '1수만에 백의 중앙 e4를 d5로 즉시 타격하는 적극적이고 단순한 반격입니다.',
    keyGoalsKo: [
      '1수만에 백의 e4를 d5로 즉시 타격',
      '포지션을 빠르게 단순화하여 복잡한 오프닝 이론 회피',
      '안정적인 기물 전개',
    ],
    moveExplanationsKo: [
      'e4: 중앙 장악.',
      'd5: [스칸디나비안 디펜스] 백의 e4를 1수 만에 바로 공격하여 포지션을 흔듭니다.',
    ],
  },
  {
    eco: 'B07',
    nameKo: '피르츠 디펜스',
    nameEn: 'Pirc Defence',
    category: 'semi_open',
    recommendedSide: 'b',
    moves: ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6'],
    descriptionKo: '중앙을 먼저 내주고 이후 비숍 피앙케토로 반격을 도모하는 하이퍼모던 수비입니다.',
  },
  {
    eco: 'B06',
    nameKo: '모던 디펜스',
    nameEn: 'Modern Defence',
    category: 'semi_open',
    recommendedSide: 'b',
    moves: ['e4', 'g6'],
    descriptionKo: '킹사이드 비숍 피앙케토를 우선하는 유연한 접근입니다.',
  },
  {
    eco: 'B02',
    nameKo: '알레킨 디펜스',
    nameEn: 'Alekhine’s Defence',
    category: 'semi_open',
    recommendedSide: 'b',
    moves: ['e4', 'Nf6'],
    descriptionKo: '백의 중앙 폰 전진을 고의로 유도해 과확장된 약점을 만드는 도발적 전략입니다.',
  },

  // ==========================================
  // 3. Closed Games & d4 Openings (1.d4 d5)
  // ==========================================
  {
    eco: 'D06',
    nameKo: '퀸스 갬빗',
    nameEn: 'Queen’s Gambit',
    category: 'closed_d4',
    isFamous: true,
    recommendedSide: 'w',
    moves: ['d4', 'd5', 'c4'],
    descriptionKo: 'd4 체스의 가장 대표적인 무기로, 측면 폰으로 중앙 d5를 허물어 e4를 차지하려 합니다.',
    keyGoalsKo: [
      'c4 갬빗으로 흑의 d5 중앙 폰을 측면으로 유인',
      'e4까지 밀어올려 완전한 중앙 독점 달성',
      '풍부하고 깊이 있는 전략적 기물 전개',
    ],
    moveExplanationsKo: [
      'd4: 여왕 앞 폰을 전진하여 안전하고 단단한 중앙을 구축합니다.',
      'd5: 흑도 중앙을 양보하지 않고 맞섭니다.',
      'c4: [퀸스 갬빗!] 흑의 d5 폰을 측면 c4 폰으로 유인하여 백이 e4를 차지하려는 전략적 승부수입니다.',
    ],
  },
  {
    eco: 'D30',
    nameKo: '퀸스 갬빗 디클라인드 (QGD)',
    nameEn: 'Queen’s Gambit Declined',
    category: 'closed_d4',
    isFamous: true,
    recommendedSide: 'b',
    moves: ['d4', 'd5', 'c4', 'e6'],
    descriptionKo: '갬빗 폰을 잡지 않고 e6로 중앙 d5를 단단하게 지키는 최고 권위의 정통 수비입니다.',
    keyGoalsKo: [
      'd5 중앙 폰을 끝까지 수호하여 백의 e4 전진 억제',
      '견고한 진형을 갖추고 나중에 ...c5 또는 ...e5 카운터 준비',
    ],
    moveExplanationsKo: [
      'd4: 중앙 장악.',
      'd5: 중앙 대항.',
      'c4: 퀸스 갬빗 유인.',
      'e6: [디클라인드!] 폰을 잡지 않고 e6로 d5를 강력하게 지지합니다.',
    ],
  },
  {
    eco: 'D20',
    nameKo: '퀸스 갬빗 억셉티드 (QGA)',
    nameEn: 'Queen’s Gambit Accepted',
    category: 'closed_d4',
    recommendedSide: 'b',
    moves: ['d4', 'd5', 'c4', 'dxc4'],
    descriptionKo: '갬빗 폰을 취하고 빠른 기물 전개와 중앙 압박을 꾀합니다.',
  },
  {
    eco: 'D10',
    nameKo: '슬라브 디펜스',
    nameEn: 'Slav Defence',
    category: 'closed_d4',
    isFamous: true,
    recommendedSide: 'b',
    moves: ['d4', 'd5', 'c4', 'c6'],
    descriptionKo: 'e6 대신 c6로 d5를 받쳐 밝은색 비숍(c8)의 길을 열어두는 견고한 방어입니다.',
    keyGoalsKo: [
      '밝은색 비숍의 활로를 막지 않고 c6로 d5를 지탱',
      '세계 챔피언십에서 수없이 검증된 철벽 수비',
    ],
    moveExplanationsKo: [
      'd4: 중앙 전진.',
      'd5: 중앙 맞대결.',
      'c4: 퀸스 갬빗 제안.',
      'c6: [슬라브 디펜스] c8 비숍의 활로를 막지 않은 채 d5를 든든하게 받쳐줍니다.',
    ],
  },
  {
    eco: 'D02',
    nameKo: '런던 시스템',
    nameEn: 'London System',
    category: 'closed_d4',
    isFamous: true,
    recommendedSide: 'w',
    moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4'],
    descriptionKo: '밝은 비숍을 안전하게 밖으로 빼낸 뒤 피라미드형 철벽 폰 구조를 만드는 현대 인기 오프닝입니다.',
    keyGoalsKo: [
      '밝은 비숍을 e3 폰 사슬 밖(Bf4)으로 안전하게 먼저 빼놓기',
      'c3, e3 피라미드형 난공불락의 폰 삼각지대 구축',
      '흑의 어떤 수에도 일관된 전개와 강력한 킹사이드 공격 기회',
    ],
    moveExplanationsKo: [
      'd4: 안정적인 중앙 폰 전진.',
      'd5: 흑의 대항.',
      'Nf3: 나이트를 전개하며 중앙 컨트롤.',
      'Nf6: 흑의 대칭 전개.',
      'Bf4: [런던 시스템!] e3를 두기 전에 비숍을 f4로 빼내어 비숍이 갇히지 않는 완벽한 포지션을 만듭니다.',
    ],
  },
  {
    eco: 'A45',
    nameKo: '트롬포브스키 어택',
    nameEn: 'Trompowsky Attack',
    category: 'closed_d4',
    recommendedSide: 'w',
    moves: ['d4', 'Nf6', 'Bg5'],
    descriptionKo: '흑의 나이트를 즉시 위협하며 빠른 난전을 유도하는 공격적 무기입니다.',
  },
  {
    eco: 'A80',
    nameKo: '더치 디펜스',
    nameEn: 'Dutch Defence',
    category: 'closed_d4',
    recommendedSide: 'b',
    moves: ['d4', 'f5'],
    descriptionKo: 'd4에 맞서 f5로 킹사이드 공간을 노리는 공격적이고 날카로운 수비입니다.',
  },
  {
    eco: 'D00',
    nameKo: '클로즈드 게임 (퀸스 폰)',
    nameEn: 'Queen’s Pawn Game',
    category: 'closed_d4',
    moves: ['d4', 'd5'],
    descriptionKo: '차분하고 장기적인 포지셔널 게임의 시작입니다.',
  },

  // ==========================================
  // 4. Indian Defences (1.d4 Nf6)
  // ==========================================
  {
    eco: 'E60',
    nameKo: '킹스 인디언 디펜스 (KID)',
    nameEn: 'King’s Indian Defence',
    category: 'indian',
    isFamous: true,
    recommendedSide: 'b',
    moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6'],
    descriptionKo: '중앙을 일단 양보한 뒤 ...e5 또는 ...c5로 중앙을 반격하고 킹사이드 총공격을 감행합니다.',
    keyGoalsKo: [
      '초반 백에게 넓은 중앙 공간을 내어줌',
      'g6-Bg7 피앙케토와 d6-e5로 단단하게 웅크린 뒤 폭발적 반격',
      '백의 퀸사이드 확장에 맞서 백 킹을 향한 총공격 감행',
    ],
    moveExplanationsKo: [
      'd4: 백의 퀸스 폰.',
      'Nf6: 중앙 e4 전진을 막으며 나이트 전개.',
      'c4: 백이 공간을 넓히고 d5를 지탱합니다.',
      'g6: [킹스 인디언] Bg7 피앙케토를 준비하며 하이퍼모던 전략을 취합니다.',
      'Nc3: 백의 중앙 기물 전개.',
      'Bg7: 강력한 대각선 비숍 배치.',
      'e4: 백이 넓은 중앙을 차지합니다.',
      'd6: e5 전진을 방어하고 나중에 ...e5 또는 ...c5 카운터를 준비합니다.',
    ],
  },
  {
    eco: 'E20',
    nameKo: '님조-인디언 디펜스',
    nameEn: 'Nimzo-Indian Defence',
    category: 'indian',
    isFamous: true,
    recommendedSide: 'b',
    moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'],
    descriptionKo: '백의 c3 나이트를 핀에 걸어 e4 전진을 저지하고 더블 폰을 유도하는 최고 수준의 방어입니다.',
    keyGoalsKo: [
      'c3 나이트를 핀에 걸어 백의 e4 중앙 장악 차단',
      '나이트와 비숍 교환 후 백에게 약점(더블 폰)을 안김',
    ],
    moveExplanationsKo: [
      'd4: 백의 퀸스 폰.',
      'Nf6: 나이트 전개.',
      'c4: 백의 영역 확장.',
      'e6: 비숍 길을 엽니다.',
      'Nc3: 백이 e4 전진을 준비합니다.',
      'Bb4: [님조-인디언!] c3 나이트를 핀에 걸어 백의 e4 야망을 완전히 차단합니다.',
    ],
  },
  {
    eco: 'E12',
    nameKo: '퀸스 인디언 디펜스',
    nameEn: 'Queen’s Indian Defence',
    category: 'indian',
    recommendedSide: 'b',
    moves: ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6'],
    descriptionKo: '퀸사이드 비숍 피앙케토(b6-Bb7)를 통한 우아하고 견고한 중앙 통제입니다.',
  },
  {
    eco: 'D80',
    nameKo: '그륀펠트 디펜스',
    nameEn: 'Grünfeld Defence',
    category: 'indian',
    isFamous: true,
    recommendedSide: 'b',
    moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5'],
    descriptionKo: '중앙 d5 즉각 타격으로 백의 폰 센터를 반파하는 카스파로프의 주무기입니다.',
    keyGoalsKo: [
      '백에게 거대한 폰 센터를 유도한 뒤 ...c5와 ...Bg7로 파괴',
      '고도의 다이나믹한 전술과 주도권 장악',
    ],
    moveExplanationsKo: [
      'd4: 백의 퀸스 폰.',
      'Nf6: 나이트 전개.',
      'c4: 백의 공간 확장.',
      'g6: 피앙케토 준비.',
      'Nc3: 백의 전개.',
      'd5: [그륀펠트!] 중앙 폰을 곧바로 부딪혀 백의 폰 센터를 직접 타격합니다.',
    ],
  },
  {
    eco: 'A56',
    nameKo: '베노니 디펜스',
    nameEn: 'Benoni Defence',
    category: 'indian',
    recommendedSide: 'b',
    moves: ['d4', 'Nf6', 'c4', 'c5'],
    descriptionKo: '비대칭적 폰 구조로 양측 모두 치열한 난전을 유도하는 공격적 수비입니다.',
  },
  {
    eco: 'A45',
    nameKo: '인디언 디펜스',
    nameEn: 'Indian Defence',
    category: 'indian',
    moves: ['d4', 'Nf6'],
    descriptionKo: '1.d4에 대해 유연하게 대처하는 현대 체스의 핵심 출발점입니다.',
  },

  // ==========================================
  // 5. Flank Openings (1.c4, 1.Nf3, 1.b3, 1.f4)
  // ==========================================
  {
    eco: 'A10',
    nameKo: '잉글리시 오프닝',
    nameEn: 'English Opening',
    category: 'flank',
    isFamous: true,
    recommendedSide: 'w',
    moves: ['c4'],
    descriptionKo: '플랭크 폰으로 d5 칸을 통제하며 유연하게 다양한 시스템으로 전환할 수 있습니다.',
    keyGoalsKo: [
      '측면 c-폰으로 d5 중앙 칸을 간접 지배',
      'e-폰이나 d-폰의 길을 막지 않는 고도의 유연성',
      '흑의 대응에 따라 시실리안 역방향 또는 d4 시스템으로 자유자재 전환',
    ],
    moveExplanationsKo: [
      'c4: [잉글리시 오프닝] 중앙 폰을 밀지 않고 측면에서 d5 칸을 제어하는 유연한 첫 수입니다.',
    ],
  },
  {
    eco: 'A20',
    nameKo: '잉글리시 오프닝: 킹스 잉글리시',
    nameEn: 'King’s English',
    category: 'flank',
    recommendedSide: 'w',
    moves: ['c4', 'e5'],
    descriptionKo: '백이 시실리안 디펜스의 흑 역할을 한 수 먼저 두는 유리한 형태입니다.',
  },
  {
    eco: 'A04',
    nameKo: '레티 오프닝',
    nameEn: 'Réti Opening',
    category: 'flank',
    recommendedSide: 'w',
    moves: ['Nf3'],
    descriptionKo: '초반 중앙 폰 전진 없이 비숍 피앙케토로 중앙을 압박하는 하이퍼모던 오프닝입니다.',
  },
  {
    eco: 'A01',
    nameKo: '님조비치-라르센 어택',
    nameEn: 'Nimzo-Larsen Attack',
    category: 'flank',
    recommendedSide: 'w',
    moves: ['b3'],
    descriptionKo: '퀸사이드 비숍 피앙케토로 e4-d5 대각선을 통제하는 전략입니다.',
  },
  {
    eco: 'A02',
    nameKo: '버드 오프닝',
    nameEn: 'Bird’s Opening',
    category: 'flank',
    recommendedSide: 'w',
    moves: ['f4'],
    descriptionKo: 'e5 칸을 장악하려는 독특하고 공격적인 첫 수입니다.',
  },
  {
    eco: 'B00',
    nameKo: '킹스 폰 오프닝',
    nameEn: 'King’s Pawn Opening',
    category: 'open_e4',
    moves: ['e4'],
    descriptionKo: '체스에서 가장 대중적이고 인기 있는 첫 수입니다.',
  },
  {
    eco: 'A40',
    nameKo: '퀸스 폰 오프닝',
    nameEn: 'Queen’s Pawn Opening',
    category: 'closed_d4',
    moves: ['d4'],
    descriptionKo: '탄탄하고 전략적인 첫 수입니다.',
  },
];

/**
 * Given the list of SAN moves played so far, find the most specific matching opening.
 */
export function getOpeningFromMoves(playedSans: string[]): ChessOpening | null {
  if (!playedSans || playedSans.length === 0) return null;

  let bestMatch: ChessOpening | null = null;
  let maxMatchedLength = 0;

  for (const op of OPENINGS) {
    if (op.moves.length <= playedSans.length) {
      // Check if op.moves matches prefix of playedSans
      let matches = true;
      for (let i = 0; i < op.moves.length; i++) {
        if (op.moves[i] !== playedSans[i]) {
          matches = false;
          break;
        }
      }
      if (matches && op.moves.length > maxMatchedLength) {
        maxMatchedLength = op.moves.length;
        bestMatch = op;
      }
    }
  }

  return bestMatch;
}

export function getFamousOpenings(): ChessOpening[] {
  return OPENINGS.filter((o) => o.isFamous);
}
