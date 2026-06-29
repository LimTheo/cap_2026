"""
Worker (작업자) 관련 API

엔드포인트:
- GET    /api/worker/{user_id}/procedures     - 게시된 SOP 목록
- POST   /api/worker/{user_id}/performance    - 작업 수행 기록
- GET    /api/worker/{user_id}/performance/{id} - 수행 기록 상세 조회
- GET    /api/worker/{user_id}/history        - 작업 이력
- POST   /api/worker/{user_id}/feedback       - 피드백 제출
- GET    /api/worker/{user_id}/feedback       - 제출한 피드백 목록
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import (
    User, SOP, WorkerFeedback, WorkerPerformance,
    UserRole, SOPStatus, PerformanceStatus, FeedbackType
)
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

router = APIRouter()


# Pydantic 스키마
class FeedbackSchema(BaseModel):
    sop_id: str
    feedback_type: str  # unclear, missing_step, incorrect_tool, timing_issue, other
    step_number: Optional[int] = None
    message: str
    rating: Optional[int] = None  # 1-5

    class Config:
        from_attributes = True


class PerformanceSchema(BaseModel):
    sop_id: str
    completed_steps: List[int]
    total_duration: float
    step_durations: dict
    accuracy_score: Optional[float] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True


@router.get("/worker/{user_id}/procedures")
async def get_worker_procedures(user_id: str, db: Session = Depends(get_db)):
    """
    Worker가 접근 가능한 게시된 SOP 목록 조회
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role != UserRole.WORKER:
        raise HTTPException(status_code=403, detail="Only workers can access this endpoint")

    sops = db.query(SOP).filter(SOP.status == SOPStatus.PUBLISHED).all()

    return {
        "user_id": user_id,
        "language": user.language,
        "procedures": [
            {
                "id": sop.id,
                "process_name": sop.process_name,
                "task_name": sop.task_name,
                "duration": sop.duration,
                "confidence": sop.confidence,
                "step_count": len(sop.steps),
                "created_at": sop.created_at.isoformat(),
                "published_at": sop.published_at.isoformat() if sop.published_at else None,
            }
            for sop in sops
        ],
    }


@router.post("/worker/{user_id}/performance")
async def record_performance(
    user_id: str,
    data: PerformanceSchema,
    db: Session = Depends(get_db),
):
    """
    작업 수행 기록 생성

    Body:
    {
        "sop_id": "sop_001",
        "completed_steps": [1, 2, 3],
        "total_duration": 150.5,
        "step_durations": {"1": 30.2, "2": 59.8, "3": 60.5},
        "accuracy_score": 87.5,
        "notes": "작업 완료"
    }
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    sop = db.query(SOP).filter(SOP.id == data.sop_id).first()
    if not sop:
        raise HTTPException(status_code=404, detail="SOP not found")

    performance = WorkerPerformance(
        id=f"perf_{user_id}_{data.sop_id}_{datetime.utcnow().timestamp()}",
        user_id=user_id,
        sop_id=data.sop_id,
        status=PerformanceStatus.COMPLETED,
        completed_steps=data.completed_steps,
        total_duration=data.total_duration,
        step_durations=data.step_durations,
        accuracy_score=data.accuracy_score,
        notes=data.notes,
        completed_at=datetime.utcnow(),
    )
    db.add(performance)
    db.commit()

    return {
        "message": "Performance recorded successfully",
        "performance_id": performance.id,
        "status": performance.status.value,
        "completed_at": performance.completed_at.isoformat(),
    }


@router.get("/worker/{user_id}/performance/{performance_id}")
async def get_performance(
    user_id: str,
    performance_id: str,
    db: Session = Depends(get_db),
):
    """수행 기록 상세 조회"""
    performance = db.query(WorkerPerformance).filter(
        WorkerPerformance.id == performance_id,
        WorkerPerformance.user_id == user_id,
    ).first()

    if not performance:
        raise HTTPException(status_code=404, detail="Performance record not found")

    sop = db.query(SOP).filter(SOP.id == performance.sop_id).first()

    return {
        "id": performance.id,
        "sop_id": performance.sop_id,
        "task_name": sop.task_name if sop else None,
        "status": performance.status.value,
        "completed_steps": performance.completed_steps,
        "total_duration": performance.total_duration,
        "step_durations": performance.step_durations,
        "accuracy_score": performance.accuracy_score,
        "notes": performance.notes,
        "started_at": performance.started_at.isoformat(),
        "completed_at": performance.completed_at.isoformat() if performance.completed_at else None,
        "manager_feedback": performance.manager_feedback,
    }


@router.get("/worker/{user_id}/history")
async def get_worker_history(
    user_id: str,
    sop_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """
    작업 이력 조회

    Query Parameters:
    - sop_id: 특정 SOP의 이력만 조회 (생략하면 모두)
    - skip: 건너뛸 항목 수
    - limit: 반환할 최대 항목 수
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    query = db.query(WorkerPerformance).filter(WorkerPerformance.user_id == user_id)

    if sop_id:
        query = query.filter(WorkerPerformance.sop_id == sop_id)

    total = query.count()
    performances = query.order_by(WorkerPerformance.started_at.desc()).offset(skip).limit(limit).all()

    return {
        "user_id": user_id,
        "total": total,
        "skip": skip,
        "limit": limit,
        "data": [
            {
                "id": p.id,
                "sop_id": p.sop_id,
                "task_name": db.query(SOP).filter(SOP.id == p.sop_id).first().task_name if p.sop_id else None,
                "status": p.status.value,
                "accuracy_score": p.accuracy_score,
                "total_duration": p.total_duration,
                "started_at": p.started_at.isoformat(),
                "completed_at": p.completed_at.isoformat() if p.completed_at else None,
            }
            for p in performances
        ],
    }


@router.post("/worker/{user_id}/feedback")
async def submit_feedback(
    user_id: str,
    data: FeedbackSchema,
    db: Session = Depends(get_db),
):
    """
    피드백 제출

    Body:
    {
        "feedback_type": "unclear",
        "sop_id": "sop_001",
        "step_number": 2,
        "message": "2번 단계의 납땜 온도가 명확하지 않습니다.",
        "rating": 3
    }
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    sop = db.query(SOP).filter(SOP.id == data.sop_id).first()
    if not sop:
        raise HTTPException(status_code=404, detail="SOP not found")

    try:
        feedback_type = FeedbackType(data.feedback_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid feedback_type: {data.feedback_type}")

    feedback = WorkerFeedback(
        id=f"fb_{user_id}_{datetime.utcnow().timestamp()}",
        user_id=user_id,
        sop_id=data.sop_id,
        feedback_type=feedback_type,
        step_number=data.step_number,
        message=data.message,
        rating=data.rating,
    )
    db.add(feedback)
    db.commit()

    return {
        "message": "Feedback submitted successfully",
        "feedback_id": feedback.id,
        "created_at": feedback.created_at.isoformat(),
    }


@router.get("/worker/{user_id}/feedback")
async def get_worker_feedback(
    user_id: str,
    is_resolved: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """
    작업자가 제출한 피드백 목록

    Query Parameters:
    - is_resolved: 0=미해결, 1=해결 (생략하면 모두)
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    query = db.query(WorkerFeedback).filter(WorkerFeedback.user_id == user_id)

    if is_resolved is not None:
        query = query.filter(WorkerFeedback.is_resolved == is_resolved)

    total = query.count()
    feedbacks = query.order_by(WorkerFeedback.created_at.desc()).offset(skip).limit(limit).all()

    return {
        "user_id": user_id,
        "total": total,
        "skip": skip,
        "limit": limit,
        "data": [
            {
                "id": fb.id,
                "sop_id": fb.sop_id,
                "feedback_type": fb.feedback_type.value,
                "step_number": fb.step_number,
                "message": fb.message,
                "rating": fb.rating,
                "is_resolved": fb.is_resolved,
                "created_at": fb.created_at.isoformat(),
            }
            for fb in feedbacks
        ],
    }


@router.get("/worker/list")
async def list_workers(db: Session = Depends(get_db)):
    """근로자 목록 조회 (관리자용)"""
    workers = db.query(User).filter(User.role == UserRole.WORKER).all()

    # 완료된 수행 기록 계산
    completed_performances = db.query(WorkerPerformance).filter(
        WorkerPerformance.status == PerformanceStatus.COMPLETED
    ).count()
    total_performances = db.query(WorkerPerformance).count()

    return {
        "workers": [
            {
                "id": worker.id,
                "username": worker.username,
                "name": worker.name,
                "email": worker.email,
                "language": worker.language,
                "created_at": worker.created_at.isoformat(),
                "updated_at": worker.updated_at.isoformat(),
            }
            for worker in workers
        ],
        "completedPerformances": completed_performances,
        "totalPerformances": total_performances,
    }
