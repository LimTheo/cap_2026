#!/bin/bash
# AIMS 데모 실행 — clone 후 이 스크립트 하나면 끝.
# Qwen 불필요(시드 SOP), 어떤 맥에서든 동작.
set -e
cd "$(dirname "$0")"

echo "======================================"
echo "  AIMS 데모 실행"
echo "======================================"

# 1. 백엔드 의존성 (가벼움 — 수십 초)
echo ""
echo "[1/3] 백엔드 의존성 설치 중..."
pip3 install -q -r aims-backend/requirements.txt

# 2. 시드 데이터 생성 (SOP + 썸네일 + 데모 근로자)
echo "[2/3] 데모 데이터 생성 중..."
cd aims-backend
python3 seed/seed_sops.py

# 3. 서버 시작 (프론트+API 통합, http://localhost:8000)
echo ""
echo "[3/3] 서버 시작..."
echo "  → 브라우저에서 http://localhost:8000 접속"
echo "  (종료: Ctrl+C)"
echo ""
lsof -ti :8000 2>/dev/null | xargs kill -9 2>/dev/null || true
python3 -m uvicorn main:app --port 8000 --host 127.0.0.1
