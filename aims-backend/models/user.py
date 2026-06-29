from sqlalchemy import Column, String, Enum, DateTime, func
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import enum


class UserRole(str, enum.Enum):
    MANAGER = "manager"
    WORKER = "worker"


class User(Base):
    __tablename__ = "users"

    id = Column(String(50), primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.WORKER, nullable=False)
    language = Column(String(10), default="ko")  # 언어 (ko, en, zh, vi 등)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 관계
    worker_feedbacks = relationship("WorkerFeedback", back_populates="user")
    worker_performances = relationship("WorkerPerformance", back_populates="user")

    def __repr__(self):
        return f"<User {self.username} ({self.role.value})>"
