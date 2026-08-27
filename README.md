# AIMS — AI 기반 다국어 작업지시서(SOP) 생성 시스템

> 제조 현장의 **조립 작업 영상**을 분석하여 **표준 작업지시서(SOP)** 를 자동 생성하고,
> 외국인 근로자를 위한 **다국어 작업 안내**를 제공하는 캡스톤 프로젝트입니다.

- **관리자 웹**: 작업 영상 업로드 → AI 분석 → 작업지시서 검수 → 승인/게시
- **근로자 앱**: 게시된 작업지시서를 단계별로 열람 (다국어 · 모바일)
- **핵심 기술**: Qwen2.5-VL(로컬 MLX) + **표준 작업 그래프 매핑**

---

## 📌 현재 구현 상태

| 기능 | 상태 |
|------|------|
| 6개 조립 작업 SOP (데모 시드) | ✅ 완료 — 바퀴/상판/나사/소형부품 |
| 관리자 검수 → 승인/게시 워크플로 | ✅ |
| 근로자 다국어 열람 (6개 언어) | ✅ |
| 영상 업로드 → 실시간 Qwen 분석 | ✅ (Apple Silicon 맥) |
| clone → 원클릭 실행 | ✅ |

> 데모 시드 SOP는 **Qwen 없이도** 어느 맥에서나 바로 뜹니다.
> 실시간 업로드 분석만 로컬 VLM(Apple Silicon)이 필요합니다.

---

## 🚀 다운로드부터 사용까지 (처음부터 끝까지)

미리 만들어둔 6개 작업지시서를 보여주는 데모입니다.
**어떤 맥이든**(모델·인터넷 불필요) 아래 순서대로만 하면 됩니다.

### 0단계. 준비물 확인 (Python)

터미널(응용프로그램 → 유틸리티 → 터미널)을 열고 아래를 입력하세요.

```bash
python3 --version
```

- `Python 3.9.x` 이상이 나오면 OK → 1단계로.
- "command not found"가 나오면 Python 설치 필요:
  ```bash
  # Homebrew가 있으면
  brew install python
  # 없으면 https://www.python.org/downloads/ 에서 macOS 설치본 다운로드
  ```

> Node.js·인터넷·GPU·모델 전부 **필요 없습니다.** Python 하나면 됩니다.

### 1단계. 프로젝트 다운로드

**방법 A — git (권장)**
```bash
cd ~/Desktop
git clone https://github.com/LimTheo/cap_2026.git
cd cap_2026
```

**방법 B — ZIP 다운로드 (git 없을 때)**
1. https://github.com/LimTheo/cap_2026 접속
2. 초록색 **Code** 버튼 → **Download ZIP**
3. 압축을 풀고, 터미널에서 그 폴더로 이동:
   ```bash
   cd ~/Downloads/cap_2026-main
   ```

### 2단계. 실행 (한 줄)

```bash
bash run-demo.sh
```

이 명령이 자동으로:
1. 백엔드 의존성 설치 (수십 초, 최초 1회만 오래 걸림)
2. 데모 데이터 생성 (6개 작업지시서 + 썸네일 + 근로자 계정)
3. 서버 시작

아래처럼 나오면 성공입니다:
```
[3/3] 서버 시작...
  → 브라우저에서 http://localhost:8000 접속
```
> 이 터미널 창은 **켜둔 채로** 두세요. 닫으면 서버가 꺼집니다.

### 3단계. 브라우저 접속

브라우저 주소창에 입력:
```
http://localhost:8000
```
> ⚠️ **5173이 아니라 8000**입니다.

### 4단계. 관리자 화면 시연

1. 로그인 화면에서 **관리자** 선택 → 이메일/비번은 **아무거나** 입력 → 로그인
2. 왼쪽 메뉴 **작업 절차** → 6개 작업지시서 목록 (모두 **초안** 상태)
3. **"바퀴 결합"** 클릭 → 단계별 내용 확인:
   - 작업 설명 · **주의사항** · **위험요소** · 사용 **부품/공구** · 영상
4. 상단 **게시** 버튼 클릭 → 근로자에게 공개됨

### 5단계. 근로자 화면 시연

1. (다른 탭 또는 로그아웃 후) 로그인 → **근로자** 선택 → 로그인
2. 홈에 방금 **게시한 작업지시서**가 썸네일과 함께 표시됨
3. 클릭 → 단계별 작업 안내 열람 → 작업 확인/제출
4. 우측 상단 **언어 전환** (한국어 / English / 日本語 / 中文 / Tiếng Việt / Filipino)

> **처음엔 근로자 홈이 비어 있는 게 정상입니다.**
> 관리자가 **게시**한 절차만 근로자에게 보입니다. (AI 생성 → 사람 검수 → 배포 흐름)

### 종료 / 재실행

- **종료**: 서버 터미널에서 `Ctrl + C`
- **다시 실행**: 같은 폴더에서 `bash run-demo.sh` (데이터는 자동 재생성, 항상 동일)

---

## 📋 포함된 작업지시서 (6개)

스마트 RC카 섀시 조립 공정 전체를 담았습니다.

| 작업지시서 | 단계 | 내용 |
|-----------|------|------|
| 바퀴 결합 | 6단계 | 모터 축에 바퀴 4개 압입 |
| 바퀴 결합 (2차) | 8단계 | 재확인·재장착 포함 |
| 상판 결합 | 3단계 | 상판 올리고 T자나사·O형너트 고정 |
| 상판 결합 (2차) | 2단계 | 좌측 상단 나사 |
| 상판 나사 고정 | 13단계 | 4모서리 나사 전체 고정 (약 3분) |
| 소형 결합 부품 조립 | 5단계 | 장너트+원통+나사 조립 |

각 단계에는 **작업 설명 · 주의사항 · 위험요소 · 사용 부품/공구 · 영상 구간**이 포함됩니다.

---

## 🔬 실시간 영상 업로드 (선택 — Apple Silicon 맥 전용)

영상을 직접 업로드해 **실시간 Qwen 분석**까지 하려면 로컬 VLM 환경이 필요합니다.
(MLX는 **Apple Silicon 맥(M1/M2/M3)** 에서만 동작합니다.)

```bash
# 1) VLM 전용 가상환경 + mlx-vlm 설치
python3.11 -m venv .venv-vlm
.venv-vlm/bin/pip install mlx-vlm jinja2 sqlalchemy python-dotenv

# 2) Qwen2.5-VL-3B 모델 미리 받기 (최초 1회, ~3GB)
cd aims-backend/vlm
../../.venv-vlm/bin/python test_qwen.py
```

이후 서버를 켜고 관리자 → **업로드**에서 영상을 올리면 Qwen이 분석(~60초) → 작업지시서 자동 생성.

> 자동 분석은 VLM이 세밀한 단계를 스스로 나누기 어려워 2~3단계로 나옵니다.
> **세밀한 다단계 SOP**(예: 바퀴 6단계, 나사 13단계)는 시드/타임라인 방식으로 생성합니다(아래 참고).

---

## 🧠 동작 원리 — 표준 작업 그래프 + VLM

VLM 단독으로 영상을 자유 서술하면 부정확·환각이 생깁니다. 대신:

1. **사람이 표준 작업 그래프(정답지)를 정의** — 단계·부품·공구·주의사항
2. **VLM은 영상을 그 그래프에 매핑** — "지금 어느 단계인가"만 판단 (근거 포함)

→ 정확도·근거·선후관계가 그래프로 보장됩니다. (파인튜닝보다 안정적이며, 향후 GraphRAG로 확장 가능)

### 세밀 SOP 생성 방식 (타임라인)
작업자가 영상의 시간대별 작업을 정의하면(정답), Qwen이 각 구간을 묘사(근거)하여
정확한 다단계 작업지시서를 만듭니다. 시드 SOP가 이 방식으로 제작되었습니다.

---

## 📂 프로젝트 구조

```
cap_2026/
├── run-demo.sh               # 데모 원클릭 실행 스크립트
├── aims/                     # React + Vite 프론트엔드 (dist 빌드본 포함)
│   └── src/                  #   관리자/근로자 페이지, i18n(6개 언어)
├── aims-backend/             # FastAPI 백엔드
│   ├── main.py               #   진입점 (API + 프론트 통합 서빙)
│   ├── routers/              #   analyze / procedures / worker API
│   ├── models/               #   SQLAlchemy 7개 테이블
│   ├── requirements.txt      #   백엔드 의존성 (가벼움)
│   ├── seed/                 #   데모 시드 (Qwen 불필요)
│   │   ├── videos/           #     720p 압축 영상 (~37MB)
│   │   ├── timelines/        #     작업지시서 타임라인 JSON (6개)
│   │   └── seed_sops.py      #     시드 생성 스크립트
│   └── vlm/                  #   Qwen2.5-VL 파이프라인 (실시간 업로드용)
│       ├── work_graph_*.json #     표준 작업 그래프(정답지)
│       ├── precompute_sop.py #     영상 → Qwen 자동 매핑
│       ├── timeline_to_sop.py#     타임라인 → 세밀 SOP
│       └── test_qwen.py      #     로컬 VLM 동작 검증
└── README.md
```

---

## ➕ 새 작업지시서 추가하기

1. 작업 영상을 720p로 압축 → `aims-backend/seed/videos/<이름>.mp4`
   ```bash
   ffmpeg -i 원본.mp4 -vf scale=-2:720 -c:v libx264 -crf 28 -c:a aac -b:a 96k seed/videos/새작업.mp4
   ```
2. `aims-backend/seed/timelines/<이름>.json` 작성 — 시간대별 단계·부품·공구
   (기존 `wheel.json` 등을 참고)
3. 시드 재생성
   ```bash
   cd aims-backend && python3 seed/seed_sops.py
   ```

---

## 🛠 개발 참고

```bash
# 프론트엔드 재빌드 (UI 수정 후)
cd aims && npm install && npm run build

# DB 초기화 후 재시드
cd aims-backend && python3 seed/seed_sops.py

# API 문서
http://localhost:8000/docs
```

### 문제 해결
- **웹 화면이 안 뜸** → `aims/dist`가 있는지 확인 (없으면 `cd aims && npm run build`)
- **근로자 홈이 비어 있음** → 정상입니다. 관리자에서 절차를 **게시**하세요
- **포트 충돌** → `lsof -ti :8000 | xargs kill -9` 후 재실행
- **업로드 시 "Qwen 환경 없음"** → 실시간 업로드는 Apple Silicon + `.venv-vlm` 설치 필요

---

## 🧩 기술 스택

**백엔드**: FastAPI · SQLAlchemy · SQLite · OpenCV
**프론트엔드**: React 19 · Vite · TailwindCSS · i18next(6개 언어)
**AI**: Qwen2.5-VL (mlx-vlm, 로컬 · Apple Silicon) + 표준 작업 그래프
**영상**: ffmpeg (720p 압축)
