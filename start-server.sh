#!/bin/bash

BACKEND_DIR="$(dirname "$0")/aims-backend"
LOG="/tmp/aims-tunnel.log"

echo "🚀 AIMS 서버 시작..."

# 기존 프로세스 정리
lsof -ti :8000 | xargs kill -9 2>/dev/null
pkill -f "ssh.*localhost.run" 2>/dev/null
sleep 2

# 백엔드 시작
cd "$BACKEND_DIR"
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
echo "✅ 백엔드 PID: $BACKEND_PID"
sleep 4

# 슬립 방지 (caffeinate: Mac이 슬립 안 하도록)
caffeinate -i &
CAFE_PID=$!
echo "☕ 슬립 방지 활성화 (PID: $CAFE_PID)"

# 터널 자동 재연결 루프
echo "🌐 터널 시작 (끊기면 자동 재연결)..."
while true; do
    ssh -o StrictHostKeyChecking=no \
        -o ServerAliveInterval=30 \
        -o ServerAliveCountMax=3 \
        -R 80:localhost:8000 localhost.run 2>&1 | tee "$LOG" | grep --line-buffered "lhr.life" | while read line; do
        URL=$(echo "$line" | grep -o 'https://[a-z0-9.-]*\.lhr\.life')
        if [ -n "$URL" ]; then
            echo ""
            echo "======================================"
            echo "  접속 URL: $URL"
            echo "======================================"
        fi
    done
    echo "⚠️  터널 끊김. 5초 후 재연결..."
    sleep 5
done
