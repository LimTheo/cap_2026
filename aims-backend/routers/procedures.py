"""
SOP (표준작업절차) 관리 API

엔드포인트:
- GET    /api/procedures              - 모든 SOP 목록 조회
- GET    /api/procedures/{id}         - SOP 상세 조회
- PUT    /api/procedures/{id}         - SOP 수정
- DELETE /api/procedures/{id}         - SOP 삭제
- POST   /api/procedures/{id}/publish - SOP 게시
- POST   /api/procedures/{id}/archive - SOP 보관
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from models import SOP, Step, DetectedTool, SOPStatus
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
import cv2
import os
import uuid

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

router = APIRouter()


def _extract_first_frame_thumbnail(video_url: str, sop_id: str) -> Optional[str]:
    """동영상의 첫 프레임을 추출하여 썸네일로 저장"""
    try:
        if not video_url:
            return None

        # video_url에서 파일 경로 추출 (/uploads/xxx.mp4 → uploads/xxx.mp4)
        video_path = video_url.lstrip('/')

        if not os.path.exists(video_path):
            return None

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return None

        # 첫 프레임 추출
        ret, frame = cap.read()
        cap.release()

        if not ret or frame is None:
            return None

        # 썸네일 저장
        os.makedirs("uploads", exist_ok=True)
        thumb_filename = f"thumb_{sop_id}_first.jpg"
        thumb_path = os.path.join("uploads", thumb_filename)

        cv2.imwrite(thumb_path, frame)
        return f"{BACKEND_URL}/uploads/{thumb_filename}"

    except Exception as e:
        print(f"Error extracting thumbnail: {e}")
        return None


# Pydantic 스키마
class StepSchema(BaseModel):
    step_number: int
    name: str
    time_start: float
    time_end: float
    description: Optional[str] = None
    confidence: int = 0

    class Config:
        from_attributes = True


class DetectedToolSchema(BaseModel):
    name: str
    icon: Optional[str] = None
    confidence: int = 0
    steps_involved: List[int]

    class Config:
        from_attributes = True


class SOPSchema(BaseModel):
    process_name: str
    task_name: str
    duration: Optional[str] = None
    confidence: int = 0
    transcript_text: Optional[str] = None

    class Config:
        from_attributes = True


class SOPDetailSchema(SOPSchema):
    id: str
    status: str
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime] = None
    steps: List[StepSchema] = []
    detected_tools: List[DetectedToolSchema] = []

    class Config:
        from_attributes = True


@router.get("/procedures")
async def list_procedures(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """
    SOP 목록 조회

    Query Parameters:
    - status: published, draft, archived (생략하면 모두)
    - skip: 건너뛸 항목 수
    - limit: 반환할 최대 항목 수
    """
    query = db.query(SOP)

    if status:
        try:
            status_enum = SOPStatus(status)
            query = query.filter(SOP.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

    total = query.count()
    sops = query.offset(skip).limit(limit).all()

    data = []
    for sop in sops:
        # 첫 번째 스텝의 썸네일 가져오기
        thumbnail_url = None
        if sop.steps:
            first_step = sorted(sop.steps, key=lambda s: s.step_number)[0]
            thumbnail_url = first_step.thumbnail_url

        # 썸네일이 없으면 동영상에서 첫 프레임 추출
        if not thumbnail_url and sop.video_url:
            thumbnail_url = _extract_first_frame_thumbnail(sop.video_url, sop.id)

        # 상대 경로를 완전한 URL로 변환
        if thumbnail_url and not thumbnail_url.startswith("http"):
            thumbnail_url = f"{BACKEND_URL}{thumbnail_url}"

        data.append({
            "id": sop.id,
            "process_name": sop.process_name,
            "task_name": sop.task_name,
            "status": sop.status.value,
            "confidence": sop.confidence,
            "duration": sop.duration,
            "step_count": len(sop.steps),
            "tool_count": len(sop.detected_tools),
            "thumbnail_url": thumbnail_url,
            "created_at": sop.created_at.isoformat(),
            "published_at": sop.published_at.isoformat() if sop.published_at else None,
        })

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "data": data,
    }


@router.get("/procedures/{sop_id}")
async def get_procedure(sop_id: str, db: Session = Depends(get_db)):
    """SOP 상세 조회"""
    sop = db.query(SOP).filter(SOP.id == sop_id).first()

    if not sop:
        raise HTTPException(status_code=404, detail="SOP not found")

    return {
        "id": sop.id,
        "process_name": sop.process_name,
        "task_name": sop.task_name,
        "status": sop.status.value,
        "duration": sop.duration,
        "confidence": sop.confidence,
        "video_url": sop.video_url,
        "transcript": {
            "text": sop.transcript_text,
            "language": sop.transcript_language,
            "segments": sop.transcript_segments,
        },
        "steps": [
            {
                "step_number": step.step_number,
                "name": step.name,
                "time_start": step.time_start,
                "time_end": step.time_end,
                "description": step.description,
                "confidence": step.confidence,
                "thumbnail_url": step.thumbnail_url,
            }
            for step in sorted(sop.steps, key=lambda s: s.step_number)
        ],
        "detected_tools": [
            {
                "name": tool.name,
                "icon": tool.icon,
                "confidence": tool.confidence,
                "steps_involved": tool.steps_involved,
                "preview_url": tool.preview_url,
            }
            for tool in sop.detected_tools
        ],
        "created_at": sop.created_at.isoformat(),
        "updated_at": sop.updated_at.isoformat(),
        "published_at": sop.published_at.isoformat() if sop.published_at else None,
    }


@router.put("/procedures/{sop_id}")
async def update_procedure(
    sop_id: str,
    data: SOPSchema,
    db: Session = Depends(get_db),
):
    """SOP 수정 (게시되지 않은 상태만 가능)"""
    sop = db.query(SOP).filter(SOP.id == sop_id).first()

    if not sop:
        raise HTTPException(status_code=404, detail="SOP not found")

    if sop.status != SOPStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Can only edit draft SOPs")

    sop.process_name = data.process_name
    sop.task_name = data.task_name
    if data.duration:
        sop.duration = data.duration
    if data.confidence:
        sop.confidence = data.confidence
    if data.transcript_text:
        sop.transcript_text = data.transcript_text
    sop.updated_at = datetime.utcnow()

    db.commit()

    return {
        "message": "SOP updated successfully",
        "sop_id": sop.id,
        "status": sop.status.value,
    }


@router.post("/procedures/{sop_id}/publish")
async def publish_procedure(sop_id: str, db: Session = Depends(get_db)):
    """SOP 게시 (draft → published)"""
    sop = db.query(SOP).filter(SOP.id == sop_id).first()

    if not sop:
        raise HTTPException(status_code=404, detail="SOP not found")

    if sop.status != SOPStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Only draft SOPs can be published")

    if not sop.steps:
        raise HTTPException(status_code=400, detail="Cannot publish SOP without steps")

    sop.status = SOPStatus.PUBLISHED
    sop.published_at = datetime.utcnow()
    sop.updated_at = datetime.utcnow()
    db.commit()

    return {
        "message": "SOP published successfully",
        "sop_id": sop.id,
        "status": sop.status.value,
        "published_at": sop.published_at.isoformat(),
    }


@router.post("/procedures/{sop_id}/archive")
async def archive_procedure(sop_id: str, db: Session = Depends(get_db)):
    """SOP 보관 (published → archived)"""
    sop = db.query(SOP).filter(SOP.id == sop_id).first()

    if not sop:
        raise HTTPException(status_code=404, detail="SOP not found")

    if sop.status == SOPStatus.ARCHIVED:
        raise HTTPException(status_code=400, detail="SOP is already archived")

    sop.status = SOPStatus.ARCHIVED
    sop.updated_at = datetime.utcnow()
    db.commit()

    return {
        "message": "SOP archived successfully",
        "sop_id": sop.id,
        "status": sop.status.value,
    }


@router.delete("/procedures/{sop_id}")
async def delete_procedure(sop_id: str, db: Session = Depends(get_db)):
    """SOP 삭제 (모든 상태에서 가능)"""
    sop = db.query(SOP).filter(SOP.id == sop_id).first()

    if not sop:
        raise HTTPException(status_code=404, detail="SOP not found")

    db.delete(sop)
    db.commit()

    return {
        "message": "SOP deleted successfully",
        "sop_id": sop.id,
    }
