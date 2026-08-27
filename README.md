# AIMS — AI 기반 다국어 작업지시서(SOP) 생성 시스템

제조 현장의 조립 작업 영상을 분석하여 **표준 작업지시서(SOP)**를 자동 생성하고,
외국인 근로자를 위한 다국어 작업 안내를 제공하는 시스템입니다.

- **관리자 웹**: 영상 업로드 → AI 분석 → 작업지시서 검수/게시
- **근로자 앱**: 게시된 작업지시서를 단계별로 열람 (다국어)
- **핵심 기술**: Qwen2.5-VL(로컬 MLX) + 표준 작업 그래프 매핑

---

## 🚀 데모 실행 (제일 간단 — Qwen 불필요)

미리 만들어둔 작업지시서(시드)를 그대로 보여주는 방식.
**어떤 맥이든**(모델·인터넷 불필요) 아래 한 줄이면 됩니다.

```bash
git clone https://github.com/LimTheo/cap_2026.git
cd cap_2026
bash run-demo.sh
```

→ 브라우저에서 **http://localhost:8000** 접속

- 사전 요구: **Python 3.9+** (Node 불필요 — 프론트엔드 빌드본 포함)
- `run-demo.sh`가 자동으로: 의존성 설치 → 데모 데이터 생성 → 서버 시작

### 화면 둘러보기
- 로그인 화면에서 **관리자** 또는 **근로자** 선택 (이메일/비번 아무거나)
- 관리자 → 절차 목록 → "바퀴 결합" → 6단계 작업지시서
- 근로자 → 홈 → "바퀴 결합" → 단계별 안내

---

## 🔬 라이브 업로드 (선택 — 애플 실리콘 맥 전용)

영상을 실제로 업로드해 **실시간 Qwen 분석**까지 하려면 로컬 VLM 환경이 필요합니다.
(MLX는 **Apple Silicon 맥(M1/M2/M3)** 에서만 동작)

```bash
# 1) VLM 전용 가상환경 + mlx-vlm 설치
python3.11 -m venv .venv-vlm
.venv-vlm/bin/pip install mlx-vlm jinja2 sqlalchemy python-dotenv

# 2) Qwen2.5-VL-3B 모델 미리 받기(최초 1회, ~3GB) — 검증 스크립트로 워밍업
cd aims-backend/vlm
../../.venv-vlm/bin/python test_qwen.py
```

이후 관리자 → 업로드에서 영상을 올리면 Qwen이 분석(~60초) → 작업지시서 생성.
> 참고: 자동 분석은 단계 경계가 거칠어 2~3단계로 나옵니다(세밀 6단계는 시드/타임라인 방식).

---

## 📂 구조

```
cap_2026/
├── aims/                     # React + Vite 프론트엔드 (dist 빌드본 포함)
├── aims-backend/             # FastAPI 백엔드
│   ├── main.py               # 진입점 (API + 프론트 통합 서빙)
│   ├── routers/              # analyze / procedures / worker API
│   ├── models/               # SQLAlchemy 7개 테이블
│   ├── seed/                 # 데모 시드 (Qwen 불필요)
│   │   ├── videos/           #   720p 압축 영상
│   │   ├── timelines/        #   작업지시서 타임라인 JSON
│   │   └── seed_sops.py      #   시드 생성 스크립트
│   └── vlm/                  # Qwen2.5-VL 파이프라인 (라이브용)
│       ├── work_graph_*.json #   표준 작업 그래프(정답지)
│       ├── precompute_sop.py #   영상 → Qwen 자동 매핑
│       └── timeline_to_sop.py#   타임라인 → 세밀 SOP
└── run-demo.sh               # 데모 원클릭 실행
```

---

## 🧠 동작 원리 (표준 작업 그래프 + VLM)

VLM 단독으로 영상을 자유 서술하면 부정확·환각이 생깁니다. 대신:

1. **사람이 표준 작업 그래프(정답지)를 정의** — 단계·부품·공구·주의사항
2. **VLM은 영상을 그 그래프에 매핑** — "어느 단계인가"만 판단 (근거 포함)

→ 정확도·근거·선후관계가 그래프로 보장됩니다. (파인튜닝보다 안정적)

---

## 개발 참고

- 프론트 재빌드: `cd aims && npm install && npm run build`
- DB 초기화 후 재시드: `cd aims-backend && python3 seed/seed_sops.py`
- API 문서: http://localhost:8000/docs
