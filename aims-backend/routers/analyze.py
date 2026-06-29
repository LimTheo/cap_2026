import os
import uuid
import asyncio
import cv2
import json
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from sqlalchemy.orm import Session
from database import get_db
from models import SOP, Step, DetectedTool, Analysis, SOPStatus
from services.tool_detection import detect_tools_from_video
from services.step_segmentation import segment_steps_from_video
from services.ai_service import analyze_video_with_ai, QuotaExceededError
from services.whisper_stt import transcribe_video
from typing import Optional

router = APIRouter()

# In-memory storage for analysis results (temporarily for backward compatibility)
analysis_results = {}

def _save_analysis_to_db(
    db: Session,
    analysis_id: str,
    analysis_result: dict,
) -> str:
    """분석 결과를 데이터베이스에 저장하고 SOP ID를 반환합니다."""
    try:
        sop_id = f"sop_{analysis_id}"

        sop = SOP(
            id=sop_id,
            process_name=analysis_result.get("processName", "공정"),
            task_name=analysis_result.get("procedureName", "작업절차"),
            status=SOPStatus.DRAFT,
            duration=analysis_result.get("duration"),
            confidence=analysis_result.get("confidence", 0),
            video_url=analysis_result.get("videoUrl"),
            transcript_text=analysis_result.get("transcript", {}).get("text"),
            transcript_language=analysis_result.get("transcript", {}).get("language"),
            transcript_segments=analysis_result.get("transcript", {}).get("segments"),
        )
        db.add(sop)
        db.flush()

        for step_data in analysis_result.get("steps", []):
            time_range = step_data.get("timeRange", "0:00 - 0:00")
            time_parts = time_range.split(" - ")
            time_start = _parse_time(time_parts[0]) if len(time_parts) > 0 else 0.0
            time_end = _parse_time(time_parts[1]) if len(time_parts) > 1 else 0.0

            step = Step(
                id=f"step_{analysis_id}_{step_data.get('stepNumber', 1)}",
                sop_id=sop_id,
                step_number=step_data.get("stepNumber", 1),
                name=step_data.get("name", ""),
                time_start=time_start,
                time_end=time_end,
                description=None,
                confidence=step_data.get("confidence", 0),
                thumbnail_url=step_data.get("thumbnailUrl"),
            )
            db.add(step)

        for tool_data in analysis_result.get("detectedTools", []):
            tool = DetectedTool(
                id=f"tool_{analysis_id}_{tool_data.get('name', 'unknown')}",
                sop_id=sop_id,
                name=tool_data.get("name", ""),
                icon=tool_data.get("icon"),
                confidence=tool_data.get("confidence", 0),
                steps_involved=tool_data.get("steps", []),
                preview_url=tool_data.get("previewUrl"),
            )
            db.add(tool)

        analysis = Analysis(
            id=f"analysis_{analysis_id}",
            sop_id=sop_id,
            palm_boundary_count=analysis_result.get("debugInfo", {}).get("palmBoundaryCount", 0),
            hand_detection_rate=int(analysis_result.get("debugInfo", {}).get("handDetectionRate", 0)),
            total_frames_sampled=analysis_result.get("debugInfo", {}).get("totalFramesSampled", 0),
            detection_method=analysis_result.get("debugInfo", {}).get("detectionMethod", "unknown"),
            debug_info=analysis_result.get("debugInfo"),
            raw_response=analysis_result,
        )
        db.add(analysis)

        db.commit()
        print(f"✅ Saved to database: {sop_id}")
        print(f"   - process_name: {sop.process_name}")
        print(f"   - task_name: {sop.task_name}")
        return sop_id

    except Exception as e:
        db.rollback()
        print(f"⚠️ Failed to save to database: {str(e)}")
        return None


def _parse_time(time_str: str) -> float:
    """'0:15' 형식의 시간을 초 단위로 변환"""
    try:
        parts = time_str.strip().split(":")
        if len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
        return 0.0
    except Exception:
        return 0.0


@router.post("/analyze/video")
async def analyze_video(
    file: UploadFile = File(...),
    process_name: Optional[str] = Form(None),
    task_name: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """
    영상 업로드 및 분석.
    1. MediaPipe 손바닥 뒤집기 → 단계 분할
    2. YOLO 공구 감지 (실제 단계 경계 사용)
    3. Gemini Vision → 동작 설명 생성
    4. Whisper STT → 음성 전사
    """

    # Debug: 수신한 데이터 확인
    print(f"📥 Received from frontend:")
    print(f"  - File: {file.filename}")
    print(f"  - Process Name (수신): {process_name}")
    print(f"  - Task Name (수신): {task_name}")

    if not file.filename.lower().endswith(('.mp4', '.avi', '.mov', '.mkv', '.webm')):
        raise HTTPException(status_code=400, detail="Unsupported video format")

    analysis_id = str(uuid.uuid4())[:8]

    try:
        os.makedirs("uploads", exist_ok=True)
        # 원본 파일 확장자 유지 (webm, mp4 등)
        file_ext = os.path.splitext(file.filename)[1].lower()
        if not file_ext:
            file_ext = '.mp4'
        video_filename = f"{analysis_id}{file_ext}"
        video_path = os.path.join("uploads", video_filename)

        content = await file.read()
        with open(video_path, "wb") as f:
            f.write(content)

        print(f"📹 Video saved: {video_filename} (size: {len(content) / 1024 / 1024:.2f} MB)")

        # Phase 1: MediaPipe 손바닥 뒤집기 → 단계 분할
        segmentation_result = segment_steps_from_video(video_path, analysis_id)
        steps = segmentation_result.get("steps", [])
        debug_info = segmentation_result.get("debugInfo", {})
        step_boundaries = segmentation_result.get("stepBoundaries", [])

        # Phase 2: YOLO 공구 감지 (실제 단계 경계 전달)
        detected_tools = detect_tools_from_video(video_path, analysis_id, step_boundaries=step_boundaries)

        # Phase 3: Gemini Vision → 동작 설명 생성
        descriptions = []
        try:
            descriptions = await analyze_video_with_ai(
                video_path, analysis_id, process_name, task_name
            )
        except QuotaExceededError as e:
            # API 키 없거나 할당량 초과 시 빈 배열로 처리 (분석 자체는 계속)
            print(f"Gemini API 오류 (descriptions 생략): {e}")
            descriptions = []

        # Phase 4: Whisper STT (동기 함수를 별도 스레드에서 실행)
        transcript = {}
        try:
            print(f"[STT] Whisper 전사 시작: {video_path}")
            transcript = await asyncio.to_thread(transcribe_video, video_path)
            print(f"[STT] 완료 - text: {transcript.get('text', '')[:100]}")
            if transcript.get("error"):
                print(f"[STT] 경고: {transcript.get('error')}")
        except Exception as e:
            print(f"[STT] 예외 발생: {str(e)}")
            transcript = {"text": "", "language": "", "segments": [], "error": str(e)}

        # 비디오 길이 계산
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration_sec = total_frames / fps
        cap.release()

        duration_mmss = f"{int(duration_sec) // 60}:{int(duration_sec) % 60:02d}"

        avg_confidence = int(sum(s["confidence"] for s in steps) / len(steps)) if steps else 75

        analysis_result = {
            "id": analysis_id,
            "procedureName": task_name or "작업절차 분석",
            "processName": process_name or "공정",
            "duration": duration_mmss,
            "confidence": avg_confidence,
            "videoUrl": f"/uploads/{video_filename}",
            "steps": steps,
            "descriptions": descriptions,
            "detectedTools": detected_tools,
            "debugInfo": debug_info,
            "transcript": transcript,
        }

        # 데이터베이스에 저장
        sop_id = _save_analysis_to_db(db, analysis_id, analysis_result)
        if sop_id:
            analysis_result["sopId"] = sop_id

        # 메모리 캐시에도 저장 (backward compatibility)
        analysis_results[analysis_id] = analysis_result

        print(f"📤 Returning to frontend:")
        print(f"  - Analysis ID: {analysis_id}")
        print(f"  - SOP ID: {sop_id}")
        print(f"  - procedureName: {analysis_result.get('procedureName')}")
        print(f"  - processName: {analysis_result.get('processName')}")

        return analysis_result

    except Exception as e:
        print(f"[ERROR] 분석 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/analyze/{analysis_id}")
async def get_analysis(analysis_id: str):
    """Retrieve stored analysis result"""
    if analysis_id not in analysis_results:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis_results[analysis_id]
