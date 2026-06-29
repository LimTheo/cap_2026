# AIMS Frontend - React + Vite

제조 현장 표준작업절차 분석 시스템의 React 기반 프론트엔드입니다.

## 🚀 시작하기

### 설치

```bash
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 **http://localhost:5173** 접속

### 빌드

```bash
npm run build
```

### 미리보기

```bash
npm run preview
```

---

## 📋 프로젝트 구조

```
aims/
├── src/
│   ├── App.jsx              # 메인 앱 컴포넌트
│   ├── pages/
│   │   ├── manager/
│   │   │   ├── DashboardPage.jsx     # 대시보드
│   │   │   ├── UploadPage.jsx        # 영상 업로드
│   │   │   └── AIAnalysisPage.jsx    # AI 분석 결과
│   │   ├── HomePage.jsx             # 홈페이지
│   │   └── NavBar.jsx               # 네비게이션
│   ├── components/           # 재사용 컴포넌트
│   ├── styles/              # 전역 스타일
│   └── main.jsx             # 진입점
├── public/                  # 정적 파일
├── vite.config.js          # Vite 설정
├── package.json
└── tailwind.config.js       # Tailwind CSS 설정
```

---

## 🔧 주요 기능

### 1. 대시보드 (DashboardPage)
- 최근 분석 목록
- 분석 통계

### 2. 영상 업로드 (UploadPage)
- MP4/AVI/MOV/MKV 파일 업로드
- 업로드 진행률 추적
- 작업 이름/공정 입력

### 3. AI 분석 결과 (AIAnalysisPage)
- 단계별 설명
- 감지된 공구 목록
- 신뢰도 점수

---

## 🌐 백엔드 연동

### 환경변수 설정 (선택)

`.env` 파일 생성:
```env
VITE_BACKEND_URL=http://localhost:8000
```

기본값 사용 시 (권장):
```javascript
// src/pages/manager/UploadPage.jsx
const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
```

### API 엔드포인트

| 메서드 | URL | 설명 |
|--------|-----|------|
| POST | `/api/analyze/video` | 영상 분석 요청 |
| GET | `/api/analyze/{id}` | 분석 결과 조회 |

---

## 🛠️ 기술 스택

- **프레임워크:** React 19
- **빌드 도구:** Vite 8
- **스타일링:** Tailwind CSS 4
- **라우팅:** React Router v7
- **UI:** 커스텀 + Tailwind 컴포넌트

---

## 📝 Vite 설정

`vite.config.js`:
```javascript
export default {
  plugins: [react()],
  server: {
    port: 5173, // 기본 포트 (사용 중이면 자동 증가)
  }
}
```

---

## 🔗 관련 문서

- 프로젝트 루트: [../../README.md](../../README.md)
- 백엔드: [../aims-backend/README.md](../aims-backend/README.md)

---

## 💡 팁

### 개발 중 CORS 오류가 나면?
1. 백엔드가 실행 중인지 확인: `http://localhost:8000/health`
2. Vite 포트 확인 (터미널 출력)
3. 백엔드 CORS 설정 확인

### Hot Module Replacement (HMR)
- 파일 저장 시 자동으로 브라우저 갱신
- `vite.config.js`에서 설정 가능

---

## 📦 npm 스크립트

```bash
npm run dev      # 개발 서버 시작
npm run build    # 프로덕션 빌드
npm run preview  # 빌드 결과 미리보기
npm run lint     # ESLint 실행
```
