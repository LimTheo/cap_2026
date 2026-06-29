from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, Enum, func
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import enum


class FeedbackType(str, enum.Enum):
    UNCLEAR = "unclear"              # 이해하기 어려움
    MISSING_STEP = "missing_step"    # 단계 누락
    INCORRECT_TOOL = "incorrect_tool"  # 잘못된 공구
    TIMING_ISSUE = "timing_issue"    # 시간 문제
    OTHER = "other"                  # 기타


class WorkerFeedback(Base):
    __tablename__ = "worker_feedbacks"

    id = Column(String(50), primary_key=True, index=True)
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    sop_id = Column(String(50), ForeignKey("sops.id"), nullable=False)

    # 피드백 내용
    feedback_type = Column(Enum(FeedbackType), nullable=False)
    step_number = Column(Integer, nullable=True)  # 특정 단계에 대한 피드백 (nullable = 전체)
    message = Column(Text, nullable=False)
    rating = Column(Integer, nullable=True)  # 1-5 별점

    # 메타데이터
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_resolved = Column(Integer, default=0)  # 0=미해결, 1=해결
    resolved_at = Column(DateTime, nullable=True)

    # 관계
    user = relationship("User", back_populates="worker_feedbacks")
    sop = relationship("SOP", back_populates="worker_feedbacks")

    def __repr__(self):
        return f"<WorkerFeedback {self.id}: {self.feedback_type.value}>"
