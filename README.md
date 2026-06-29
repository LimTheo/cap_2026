# AIMS_AI-based Multilingual SOP

제조 현장의 작업 영상을 분석하여 자동으로 표준작업절차를 생성하는 AI 기반 시스템입니다.

## 프로젝트 구조

```
캡스톤디자인_2026/
├── aims/              # React + Vite 프론트엔드
├── aims-backend/      # Python FastAPI 백엔드
└── README.md           # 이 파일
```

---

## 시작하기

### 1. 백엔드 시작 (Python FastAPI)

#### 사전 요구사항
- Python 3.9 이상
- pip
- **ffmpeg** (음성 추출용)
  ```bash
  # macOS
  brew install ffmpeg

  # Ubuntu/Debian
  sudo apt-get install ffmpeg
  ```

#### 설치 및 실행

```bash
# 백엔드 디렉토리로 이동
cd aims-backend

# 의존성 설치
pip install -r requirements.txt

# .env 파일 생성 (Google Gemini API 키 필요)
# .env 파일에 다음 내용 추가:
# GOOGLE_API_KEY=your_google_api_key_here

# 서버 시작 (http://localhost:8000)
lsof -ti :8000 | xargs kill -9
python -m uvicorn main:app --reload
```

**API 문서:** http://localhost:8000/docs (Swagger UI)

---

### 2. 프론트엔드 시작 (React + Vite)

#### 사전 요구사항
- Node.js 18 이상
- npm 또는 yarn

#### 설치 및 실행

```bash
# 프론트엔드 디렉토리로 이동
cd aims

# 의존성 설치
npm install

# 개발 서버 시작 (http://localhost:5173)
npm run dev
```

**빌드:**
```bash
npm run build
```

---

## 환경설정

### 백엔드 (.env)

```env
# Google Gemini API 키
# https://aistudio.google.com → "Get API key" (무료)
GOOGLE_API_KEY=your_api_key_here
```

### 프론트엔드 (선택사항)

[aims/.env]에 다음 설정 가능:
```env
VITE_BACKEND_URL=http://localhost:8000
```

기본값: `http://localhost:8000`

---

## 개발 워크플로우

### 터미널 1: 백엔드
```bash
cd aims-backend
python -m uvicorn main:app --reload
```

### 터미널 2: 프론트엔드
```bash
cd aims
npm run dev
```

그 후 브라우저에서 **http://localhost:5173** 접속

---

## API 테스트

1. **Swagger UI:** http://localhost:8000/docs
2. **cURL 예시:**
```bash
curl -X POST "http://localhost:8000/api/analyze/video" \
  -F "file=@your_video.mp4" \
  -F "process_name=전자제품 조립" \
  -F "task_name=기판 납땜"
```

---

## 📋 구현 로드맵

| 단계 | 기능 | 상태 | 설명 |
|------|------|------|------|
| 1 | Gemini Vision API 분석 | 완료 | 영상 프레임에서 동작 설명 생성 (모델 폴백) |
| 2 | MediaPipe 손바닥 뒤집기 분할 | 완료 | 손을 펴서 카메라에 보이면 단계 경계 감지 |
| 3 | YOLO 공구 감지 | 완료 | 실제 단계 경계 기준으로 공구 감지 |
| 4 | Whisper STT (음성→텍스트) | 완료 | 한국어 포함 자동 언어 감지 |

---

## 주요 패키지

**백엔드:**
- FastAPI 0.104.1
- google-genai ≥1.0.0 (Gemini API - 모델 폴백 전략)
- OpenCV 4.8.1.78 (영상 처리)
- mediapipe ≥0.10.0 (손 랜드마크 감지)
- openai-whisper ≥20231117 (음성 → 텍스트)
- ultralytics ≥8.0.0 (YOLO 공구 감지)
- python-multipart 0.0.6 (파일 업로드)

**시스템 의존성:**
- ffmpeg (Whisper 음성 추출용)

**프론트엔드:**
- React 19
- Vite 8
- Tailwind CSS 4
- React Router v7

---

## CORS 설정

백엔드는 모든 `localhost:*` 포트를 허용하도록 설정되어 있습니다:
```python
# aims-backend/main.py
allow_origin_regex=r"http://localhost:.*"
```

---

## 문제 해결

### OPTIONS 400 Bad Request
→ Vite가 5174, 5175 등 다른 포트에서 실행 중일 수 있습니다.
브라우저 콘솔과 터미널의 포트를 확인하세요.

### Google API 할당량 초과 (429)
→ Gemini Free Tier: 분당 15 요청 제한
기다렸다가 다시 시도하세요.

---

---

## 주요 기능 변경 사항

### 1. Gemini API 마이그레이션 (google-generativeai → google-genai)

**변경 전:**
```python
import google.generativeai as genai
genai.configure(api_key="...")
model = genai.GenerativeModel("gemini-1.5-flash")
```

**변경 후:**
```python
from google import genai
from google.genai import types
client = genai.Client(api_key="...")
client.models.generate_content(model="gemini-2.0-flash-lite", contents=...)
```

**이유:**
- 구 SDK(google-generativeai) 지원 종료
- 새 SDK(google-genai)는 더 빠른 모델 지원
- 모델 폴백 전략 추가로 할당량 초과 대응

**모델 폴백 순서:**
1. `gemini-2.0-flash-lite` (경량, 별도 할당량)
2. `gemini-1.5-flash` (구 모델, 다른 할당량 풀)
3. `gemini-2.0-flash` (기존 모델)

파일: `aims-backend/services/ai_service.py`

---

### 2. MediaPipe 손바닥 뒤집기로 단계 분할 (새로 추가)

**알고리즘:**
- 손가락 3개 이상 펼쳐있고 + 손바닥이 카메라를 향하면 → 단계 경계
- 1.5초 이상 유지되어야 경계로 인식
- 왼손/오른손 자동 구분 (cross product)

**코드 핵심:**
```python
def _is_palm_open_facing_camera(hand_landmarks, handedness_label: str) -> bool:
    # 조건 1: 손가락 3개 이상 펴짐 (tip.y < PIP.y)
    finger_extended = [
        lm[8].y < lm[6].y,    # 검지
        lm[12].y < lm[10].y,  # 중지
        lm[16].y < lm[14].y,  # 약지
        lm[20].y < lm[18].y,  # 소지
    ]
    if sum(finger_extended) < 3:
        return False

    # 조건 2: 손바닥 방향 (왼손/오른손 구분)
    v1 = (lm[5].x - lm[0].x, lm[5].y - lm[0].y)  # wrist→index_MCP
    v2 = (lm[17].x - lm[0].x, lm[17].y - lm[0].y)  # wrist→pinky_MCP
    cross_z = v1[0] * v2[1] - v1[1] * v2[0]

    if handedness_label == "Right":
        return cross_z < 0
    else:  # "Left"
        return cross_z > 0
```

**설정값:**
- `PALM_HOLD_DURATION_SEC = 1.5` (손바닥 유지 시간)
- `BOUNDARY_COOLDOWN_SEC = 2.0` (경계 재감지 대기)
- `MIN_STEPS = 2`, `MAX_STEPS = 7` (단계 범위)

파일: `aims-backend/services/step_segmentation.py`

---

### 3. YOLO 공구 감지 최적화 (단계 경계 활용)

**변경 전:**
- 영상을 고정된 3개 구간으로 나눔 (균등 분할)
- 각 구간별 공구 감지

**변경 후:**
- MediaPipe에서 감지한 실제 단계 경계 사용
- 각 단계별 공구 감지 (동적 구간)

파일: `aims-backend/routers/analyze.py` (Phase 2)

---

### 4. Whisper STT 음성→텍스트 (새로 추가)

**기능:**
- 영상에서 음성 자동 추출 (ffmpeg 필요)
- 한국어 포함 자동 언어 감지
- 타임스탐프와 함께 세그먼트 반환

**응답 구조:**
```json
{
  "text": "전사된 전체 텍스트...",
  "language": "ko",
  "segments": [
    {
      "start": 0.0,
      "end": 2.5,
      "text": "첫 번째 문장"
    }
  ]
}
```

**에러 처리:**
- ffmpeg 미설치 → 친절한 안내 메시지
- 음성 감지 실패 → 빈 문자열 + 에러 기록
- Whisper 실패 → 다른 단계는 계속 진행

파일: `aims-backend/services/whisper_stt.py`

---

## 전체 분석 파이프라인

```
POST /api/analyze/video (영상 업로드)
    ↓
Phase 1: MediaPipe 손바닥 뒤집기
    ├─ 손 랜드마크 추출
    ├─ 손바닥 상태 추적 (1.5초 유지)
    └─ 단계 경계 생성 (2~7개)
    ↓
Phase 2: YOLO 공구 감지
    ├─ 각 단계 구간 추출
    └─ 공구별 감지 (신발끈 당기기, 매듭 묶기 등)
    ↓
Phase 3: Gemini Vision 분석
    ├─ 프레임 8개 샘플링
    └─ 각 단계별 동작 설명 생성 (모델 폴백)
    ↓
Phase 4: Whisper STT
    ├─ ffmpeg로 음성 추출
    └─ 언어 자동 감지 + 전사
    ↓
응답 반환
{
  "id": "분석ID",
  "steps": [{...}, {...}],
  "descriptions": ["설명1", "설명2"],
  "detectedTools": [{...}],
  "transcript": {"text": "...", "segments": [...]},
  "debugInfo": {...}
}
```

---

## 기여 가이드

1. 기능 브랜치 생성: `git checkout -b feature/your-feature`
2. 변경사항 커밋: `git commit -m "설명"`
3. 푸시: `git push origin feature/your-feature`
