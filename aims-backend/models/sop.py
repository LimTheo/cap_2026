from sqlalchemy import Column, String, Integer, Float, Text, DateTime, ForeignKey, JSON, Enum, func
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import enum


class SOPStatus(str, enum.Enum):
    DRAFT = "draft"           # 임시저장
    PUBLISHED = "published"   # 게시됨
    ARCHIVED = "archived"     # 보관됨


class SOP(Base):
    __tablename__ = "sops"

    id = Column(String(50), primary_key=True, index=True)
    process_name = Column(String(200), nullable=False)
    task_name = Column(String(200), nullable=False)
    status = Column(Enum(SOPStatus), default=SOPStatus.DRAFT, nullable=False)

    # 분석 기본정보
    duration = Column(String(10), nullable=True)  # mm:ss 형식
    confidence = Column(Integer, default=0)  # 평균 신뢰도 (%)

    # 분석 결과
    video_url = Column(String(500), nullable=True)
    transcript_text = Column(Text, nullable=True)  # 음성 전사 텍스트
    transcript_language = Column(String(10), nullable=True)  # 음성 언어
    transcript_segments = Column(JSON, nullable=True)  # 타임스탬프별 세그먼트

    # 참고: steps와 detected_tools는 relationship으로 관리

    # 메타데이터
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    published_at = Column(DateTime, nullable=True)

    # 관계
    steps = relationship("Step", back_populates="sop", cascade="all, delete-orphan")
    detected_tools = relationship("DetectedTool", back_populates="sop", cascade="all, delete-orphan")
    analyses = relationship("Analysis", back_populates="sop", cascade="all, delete-orphan")
    worker_feedbacks = relationship("WorkerFeedback", back_populates="sop", cascade="all, delete-orphan")
    worker_performances = relationship("WorkerPerformance", back_populates="sop", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<SOP {self.id}: {self.task_name} ({self.status.value})>"


class Step(Base):
    __tablename__ = "steps"

    id = Column(String(50), primary_key=True, index=True)
    sop_id = Column(String(50), ForeignKey("sops.id"), nullable=False)

    step_number = Column(Integer, nullable=False)
    name = Column(String(200), nullable=False)
    time_start = Column(Float, nullable=False)  # 초 단위
    time_end = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    confidence = Column(Integer, default=0)
    thumbnail_url = Column(String(500), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # 관계
    sop = relationship("SOP", back_populates="steps")

    def __repr__(self):
        return f"<Step {self.step_number}: {self.name}>"


class DetectedTool(Base):
    __tablename__ = "detected_tools"

    id = Column(String(50), primary_key=True, index=True)
    sop_id = Column(String(50), ForeignKey("sops.id"), nullable=False)

    name = Column(String(100), nullable=False)
    icon = Column(String(10), nullable=True)
    confidence = Column(Integer, default=0)
    steps_involved = Column(JSON, nullable=False)  # [1, 2, 3] 형식
    preview_url = Column(String(500), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # 관계
    sop = relationship("SOP", back_populates="detected_tools")

    def __repr__(self):
        return f"<DetectedTool {self.name} (steps: {self.steps_involved})>"
