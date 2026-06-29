from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(String(50), primary_key=True, index=True)
    sop_id = Column(String(50), ForeignKey("sops.id"), nullable=True, index=True)

    # AI 분석 결과 메타데이터
    palm_boundary_count = Column(Integer, default=0)
    hand_detection_rate = Column(Integer, default=0)  # %
    total_frames_sampled = Column(Integer, default=0)
    detection_method = Column(String(50), default="palm_flip")  # palm_flip, fallback

    # 원본 분석 결과 (참고용)
    debug_info = Column(JSON, nullable=True)
    raw_response = Column(JSON, nullable=True)

    # 메타데이터
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # 관계
    sop = relationship("SOP", back_populates="analyses")

    def __repr__(self):
        return f"<Analysis {self.id}>"
