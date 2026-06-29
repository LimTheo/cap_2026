# AIMS Backend - FastAPI

제조 현장 표준작업절차 분석 시스템의 Python FastAPI 백엔드입니다.

## 🚀 시작하기

### 사전 요구사항

- Python 3.9 이상
- pip

### 설치

```bash
# 의존성 설치
pip install -r requirements.txt
```

### 환경 설정

`.env` 파일 생성:
```env
# Google Gemini API 키 (필수)
# https://aistudio.google.com → "Get API key" (무료)
GOOGLE_API_KEY=your_api_key_here
```

### 서버 실행

```bash
# 개발 모드 (자동 재로드)
python -m uvicorn main:app --reload

# 프로덕션 모드
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

**서버 URL:** http://127.0.0.1:8000
**API 문서:** http://127.0.0.1:8000/docs (Swagger UI)

---

## 📁 프로젝트 구조

```
aims-backend/
├── main.py                      # FastAPI 진입점
├── routers/
│   ├── __init__.py
│   └── analyze.py              # /api/analyze 엔드포인트
├── services/
│   ├── __init__.py
│   └── ai_service.py           # Google Gemini API 연동
├── requirements.txt             # Python 패키지 의존성
├── .env                         # 환경 설정 (로컬)
├── .env.example                # 환경 설정 템플릿
└── README.md                   # 이 파일
```

---

## 📡 API 엔드포인트

### 1. 영상 분석 요청

**POST `/api/analyze/video`**

요청:
```bash
curl -X POST "http://localhost:8000/api/analyze/video" \
  -F "file=@sample.mp4" \
  -F "process_name=전자제품 조립" \
  -F "task_name=기판 납땜"
```

파라미터:
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `file` | File | ✅ | 비디오 파일 (mp4, avi, mov, mkv) |
| `process_name` | string | ❌ | 공정 이름 (기본값: "공정") |
| `task_name` | string | ❌ | 작업 이름 (기본값: "작업절차 분석") |

응답 (200):
```json
{
  "id": "a1b2c3d4",
  "procedureName": "기판 납땜",
  "processName": "전자제품 조립",
  "duration": "0:01:30",
  "confidence": 85,
  "steps": [
    "기판을 고정한다",
    "납땜 인두를 준비한다",
    "..."
  ],
  "descriptions": [
    "작업자가 기판을 PCB 홀더에 고정하고 있습니다.",
    "..."
  ],
  "detectedTools": [
    "납땜 인두",
    "납땜 실",
    "..."
  ]
}
```

### 2. 분석 결과 조회

**GET `/api/analyze/{analysis_id}`**

요청:
```bash
curl "http://localhost:8000/api/analyze/a1b2c3d4"
```

응답: 위와 동일

### 3. 헬스 체크

**GET `/health`**

```bash
curl "http://localhost:8000/health"
```

응답:
```json
{
  "status": "ok",
  "service": "sopify-video-analysis"
}
```

---

## 🔧 주요 기능

### 1. 영상 처리 (routers/analyze.py)
- 멀티파트 파일 업로드 처리
- 지원 포맷: MP4, AVI, MOV, MKV
- 임시 파일 자동 관리

### 2. AI 분석 (services/ai_service.py)
- **프레임 추출:** 2초 간격으로 최대 10개 프레임 추출
- **이미지 리사이즈:** 640x480 JPEG (85% 품질)
- **Gemini API 호출:** 프레임 기반 분석
- **JSON 응답 파싱:** 단계별 설명 추출

### 3. CORS 설정 (main.py)
- 모든 `localhost:*` 포트 허용
- 개발 환경에 최적화

---

## 📦 의존성

| 패키지 | 버전 | 용도 |
|--------|------|------|
| fastapi | 0.104.1 | 웹 프레임워크 |
| uvicorn | 0.24.0 | ASGI 서버 |
| python-multipart | 0.0.6 | 파일 업로드 처리 |
| google-genai | ≥1.0.0 | Gemini API 클라이언트 |
| opencv-python | 4.8.1.78 | 영상 처리 |
| python-dotenv | 1.0.0 | .env 파일 로딩 |

---

## 🧪 테스트

### Swagger UI에서 테스트
1. http://localhost:8000/docs 접속
2. `POST /api/analyze/video` 클릭
3. "Try it out" 버튼 클릭
4. 파일 선택 후 실행

### cURL 테스트
```bash
curl -X POST "http://localhost:8000/api/analyze/video" \
  -H "accept: application/json" \
  -F "file=@/path/to/video.mp4"
```

---

## ⚠️ 주의사항

### Google Gemini API 할당량
- **Free Tier:** 분당 15 요청 (RPM)
- **429 오류:** 할당량 초과 시 발생
- **대응:** 1분 대기 후 재시도

### 파일 크기 제한
- 대용량 영상은 프레임 추출 시간 증가
- 권장: 5분 이내 영상

### 메모리 관리
- 현재: 메모리 내 결과 저장 (임시)
- 프로덕션: 데이터베이스 필요

---

## 🐛 문제 해결

### ImportError: No module named 'google'
```bash
pip install google-genai
```

### GOOGLE_API_KEY not found
1. `.env` 파일 생성 확인
2. API 키 설정 확인: `echo $GOOGLE_API_KEY`

### 파일 업로드 실패 (400 Bad Request)
- 지원하지 않는 파일 형식 확인
- 지원 형식: MP4, AVI, MOV, MKV

### CORS 에러
- 백엔드 포트 확인: 8000
- 프론트엔드 origin 확인
- CORS 설정: `allow_origin_regex=r"http://localhost:.*"`

---

## 🚢 배포

### 프로덕션 서버 실행
```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Gunicorn + Uvicorn
```bash
pip install gunicorn
gunicorn -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000
```

### Docker (선택)
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 🔗 관련 문서

- 프로젝트 루트: [../README.md](../README.md)
- 프론트엔드: [../aims/README.md](../aims/README.md)

---

## 📝 로그

서버 시작 시 출력:
```
INFO:     Will watch for changes in these directories: ['/path/to/aims-backend']
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
🚀 AIMS Backend started
INFO:     Application startup complete.
```

---

## 💡 팁

### 자동 재로드 활성화
```bash
python -m uvicorn main:app --reload
```
→ 파일 변경 시 자동으로 서버 재시작

### 로그 레벨 변경
```bash
python -m uvicorn main:app --log-level debug
```

### 특정 포트에서 실행
```bash
python -m uvicorn main:app --port 8001
```
