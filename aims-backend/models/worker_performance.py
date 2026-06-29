from sqlalchemy import Column, String, Integer, Float, Text, DateTime, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import enum


class PerformanceStatus(str, enum.Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    PAUSED = "paused"


class WorkerPerformance(Base):
    __tablename__ = "worker_performances"

    id = Column(String(50), primary_key=True, index=True)
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    sop_id = Column(String(50), ForeignKey("sops.id"), nullable=False)

    # 수행 상태
    status = Column(Enum(PerformanceStatus), default=PerformanceStatus.IN_PROGRESS)

    # 수행 결과
    completed_steps = Column(JSON, nullable=True)  # [1, 2, 3] 형식: 완료한 단계 번호들
    total_duration = Column(Float, nullable=True)  # 초 단위
    step_durations = Column(JSON, nullable=True)  # {1: 15.5, 2: 20.3} 형식
    accuracy_score = Column(Float, nullable=True)  # 0-100

    # 이슈 추적
    errors_encountered = Column(JSON, nullable=True)  # 에러 기록
    notes = Column(Text, nullable=True)
    manager_feedback = Column(Text, nullable=True)

    # 영상 기록
    video_url = Column(String(500), nullable=True)
    thumbnail_url = Column(String(500), nullable=True)

    # 메타데이터
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(String(50), nullable=True)  # 검토자 ID

    # 관계
    user = relationship("User", back_populates="worker_performances")
    sop = relationship("SOP", back_populates="worker_performances")

    def __repr__(self):
        return f"<WorkerPerformance {self.id}: {self.status.value}>"
