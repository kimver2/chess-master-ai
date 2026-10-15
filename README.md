# ♟️ Chess Master AI (체스 마스터 AI)

오프라인 환경에서도 스톡피쉬(Stockfish) 체스 엔진과 실전 대국을 즐길 수 있는 **3D 크로스 플랫폼 안드로이드 체스 앱**입니다.  
React, TypeScript, Tailwind CSS 및 Capacitor를 기반으로 제작되었습니다.

🔗 **GitHub Repository**: [https://github.com/kimver2/chess-master-ai](https://github.com/kimver2/chess-master-ai)

---

## 🌟 주요 핵심 기능

### 1. 🤖 고성능 스톡피쉬(Stockfish) AI 대국
- **완전한 오프라인 구동**: 인터넷 연결 없이 Web Worker 기반의 Stockfish WASM 엔진으로 빠르고 정밀한 수읽기 지원
- **난이도 설정**: 초급자(Lv.1)부터 그랜드마스터(Lv.10)까지 세분화된 난이도 제공
- **스마트 힌트 시스템**: 다음 최적수를 체스판 위 화살표와 뱃지로 실시간 가이드
- **대국 정밀 복기(Review)**: 대국 종료 후 각 수의 평가치(+/-)와 실수/최선의 수를 단계별로 분석

### 2. 🎨 프리미엄 3D 그래픽 & 사운드 테마
- **3D 메탈릭 스틸 & 스테운톤 기물**: 세련된 금속 질감의 3D 기물 디자인
- **고급 보드 테마**: 대리석(Marble), 토너먼트 그린, 다크 우드, 월넛 등 지원
- **청각 & 진동 피드백**: 이동, 기물 포획, 체크, 승리/패배 효과음 및 햅틱 진동

### 3. 📖 체스 오프닝 가이드 & 백과사전
- **50개 이상의 오프닝 라이브러리**: 이탈리안, 루이 로페즈, 시실리안 나이도프, 프렌치, 카로-칸, 퀸스 갬빗, 런던 시스템 등
- **실시간 오프닝 감지**: 착수 수순에 따라 ECO 코드와 오프닝 명칭을 실시간 감지
- **인터랙티브 가이드 대국 모드**: 원하는 오프닝을 선택하면 단계별 추천 착수 화살표와 기물 이동 이유를 안내하며, AI가 오프닝 북 수순으로 자동 맞대응

### 4. ⏪ 실시간 수 탐색기 (Live Stepper)
- 대국 진행 중에도 `|◀`, `◀`, `▶`, `▶|` 버튼으로 이전 수들을 자유롭게 탐색
- 실시간 대국은 안전하게 백그라운드에서 유지되며, 원클릭으로 실시간 국면 복귀 가능

### 5. 📊 실시간 형세 평가 바 (Eval Bar)
- 스톡피쉬 엔진의 유불리 점수(폰 우세)를 체스판 좌측 세로 막대로 실시간 표시
- 원클릭 ON/OFF 토글 지원

### 6. 🧩 체크메이트 엔드게임 & 전술 퍼즐
- **엔드게임 훈련**: 퀸, 룩, 비숍 등 기본 체크메이트 패턴을 단계별로 실전 마스터
- **전술 퍼즐 60선**: 초급 / 중급 / 고급 난이도별 핀, 포크, 스큐어 전술 문제 풀이

### 7. 🧭 인터랙티브 온보딩 스포트라이트 가이드
- 첫 실행 시 각 영역(상대 정보, 오프닝 바, 체스판, 형세 바/탐색기, 컨트롤)을 집중 조명하여 튜토리얼 진행
- 상단 헤더의 `?` 버튼이나 설정 모달에서 언제든 다시 보기 가능

---

## 🛠️ 기술 스택 (Tech Stack)

| 구분 | 기술 |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS v4 |
| **Icons & Audio** | Lucide React, Web Audio API |
| **Chess Logic** | chess.js, Stockfish.js (Web Worker + WebAssembly) |
| **Mobile Runtime** | Capacitor 7 (Android SDK 35) |

---

## 🚀 시작하기 (Getting Started)

### 필수 설치 항목
- Node.js 18+
- Android Studio & JDK 17+ (안드로이드 빌드 시)

### 개발 서버 실행
```bash
# 의존성 설치
npm install

# 로컬 개발 서버 실행 (웹 브라우저)
npm run dev
```

### 웹 빌드
```bash
npm run build
```

### 안드로이드 APK 및 AAB 빌드
```bash
# Debug APK 생성 (프로젝트 루트에 chess-master-ai.apk 생성)
npm run build:apk

# Debug AAB 번들 생성 (프로젝트 루트에 chess-master-ai.aab 생성)
npm run build:aab
```

---

## 📄 라이선스 (License)

이 프로젝트는 MIT 라이선스를 따릅니다.
