import os
import uuid
import asyncio
import subprocess
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from sqlalchemy.orm import Session
from database import get_db
from models import SOP
from typing import Optional

router = APIRouter()

# Qwen2.5-VL(MLX) 파이프라인 경로 — 웹 서버와 분리된 .venv-vlm에서 실행
_HERE = os.path.dirname(os.path.abspath(__file__))
_BACKEND = os.path.dirname(_HERE)                       # aims-backend
_ROOT = os.path.dirname(_BACKEND)                       # 프로젝트 루트
VENV_PY = os.path.join(_ROOT, ".venv-vlm", "bin", "python")
PRECOMPUTE = os.path.join(_BACKEND, "vlm", "precompute_sop.py")
WORK_GRAPH = os.path.join(_BACKEND, "vlm", "work_graph_smartcar.json")

# In-memory storage for analysis results (backward compatibility)
analysis_results = {}


@router.post("/analyze/video")
async def analyze_video(
    file: UploadFile = File(...),
    process_name: Optional[str] = Form(None),
    task_name: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """
    영상 업로드 및 분석 (Qwen2.5-VL 로컬 + 표준 작업 그래프).

    웹 서버와 분리된 .venv-vlm 에서 precompute_sop.py 를 실행하여
    영상 → 프레임 → Qwen 단계 매핑 → SOP를 DB에 저장한다.
    """
    print(f"📥 업로드 수신: {file.filename} / 공정={process_name} / 작업={task_name}")

    if not file.filename.lower().endswith(('.mp4', '.avi', '.mov', '.mkv', '.webm')):
        raise HTTPException(status_code=400, detail="지원하지 않는 영상 형식입니다")

    if not os.path.exists(VENV_PY):
        raise HTTPException(
            status_code=500,
            detail="Qwen 분석 환경(.venv-vlm)이 없습니다. setup 스크립트를 먼저 실행하세요.",
        )

    analysis_id = str(uuid.uuid4())[:8]
    uploads_dir = os.path.join(_BACKEND, "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    ext = os.path.splitext(file.filename)[1].lower() or ".mp4"
    video_path = os.path.join(uploads_dir, f"{analysis_id}{ext}")

    content = await file.read()
    with open(video_path, "wb") as f:
        f.write(content)
    print(f"📹 저장: {video_path} ({len(content)/1024/1024:.1f} MB)")

    # Qwen 파이프라인 실행 (별도 프로세스, 이벤트 루프 비블로킹)
    cmd = [
        VENV_PY, PRECOMPUTE,
        "--video", video_path,
        "--graph", WORK_GRAPH,
        "--analysis-id", analysis_id,
        "--process-name", process_name or "조립 공정",
        "--task-name", task_name or "작업",
        "--frames", "20",
    ]
    try:
        proc = await asyncio.to_thread(
            subprocess.run, cmd, capture_output=True, text=True, timeout=600
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Qwen 분석 시간 초과 (영상이 너무 길 수 있음)")

    if proc.returncode != 0:
        tail = (proc.stderr or proc.stdout or "")[-800:]
        print(f"[ERROR] Qwen 파이프라인 실패:\n{tail}")
        raise HTTPException(status_code=500, detail=f"Qwen 분석 실패: {tail[-300:]}")

    # DB에서 생성된 SOP 로드 (다른 프로세스가 커밋했으므로 스냅샷 갱신)
    sop_id = f"sop_{analysis_id}"
    db.rollback()
    sop = db.query(SOP).filter(SOP.id == sop_id).first()
    if not sop:
        raise HTTPException(status_code=500, detail="분석은 됐지만 SOP를 찾지 못했습니다")

    result = {
        "id": analysis_id,
        "sopId": sop_id,
        "procedureName": sop.task_name,
        "processName": sop.process_name,
        "duration": sop.duration,
        "confidence": sop.confidence,
        "videoUrl": sop.video_url,
        "steps": [
            {
                "stepNumber": s.step_number,
                "name": s.name,
                "timeRange": f"{int(s.time_start)//60}:{int(s.time_start)%60:02d} - {int(s.time_end)//60}:{int(s.time_end)%60:02d}",
                "description": s.description,
                "confidence": s.confidence,
                "thumbnailUrl": s.thumbnail_url,
            }
            for s in sorted(sop.steps, key=lambda x: x.step_number)
        ],
        "detectedTools": [
            {
                "name": t.name,
                "icon": t.icon,
                "confidence": t.confidence,
                "steps": t.steps_involved,
            }
            for t in sop.detected_tools
        ],
    }
    analysis_results[analysis_id] = result
    print(f"📤 반환: {sop_id} (단계 {len(result['steps'])}, 부품·공구 {len(result['detectedTools'])})")
    return result


@router.get("/analyze/{analysis_id}")
async def get_analysis(analysis_id: str):
    """저장된 분석 결과 조회"""
    if analysis_id not in analysis_results:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis_results[analysis_id]
