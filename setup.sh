#!/bin/bash
echo "======================================"
echo "  AIMS 프로젝트 초기 설정"
echo "======================================"

# 1. Python 패키지 설치
echo ""
echo "[1/4] Python 패키지 설치 중..."
pip3 install -r aims-backend/requirements.txt
echo "✅ Python 패키지 설치 완료"

# 2. Node 패키지 설치
echo ""
echo "[2/4] Node.js 패키지 설치 중..."
cd aims && npm install && cd ..
echo "✅ Node.js 패키지 설치 완료"

# 3. 더미 데이터 생성 (DB + 이미지)
echo ""
echo "[3/4] 더미 데이터 생성 중..."
cd aims-backend
python3 generate_dummy_data.py
python3 generate_realistic_images.py
python3 generate_worker_data.py
cd ..
echo "✅ 더미 데이터 생성 완료"

# 4. 프론트엔드 빌드
echo ""
echo "[4/4] 프론트엔드 빌드 중..."
cd aims && npm run build && cd ..
echo "✅ 프론트엔드 빌드 완료"

echo ""
echo "======================================"
echo "  설정 완료! 이제 서버를 시작하세요:"
echo "  bash start-server.sh"
echo "======================================"
