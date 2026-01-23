"""시뮬레이션 데이터베이스 모델"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class SimulationRecord(Base):
    """시뮬레이션 기록 모델"""

    __tablename__ = "simulations"

    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=True)
    input_config = Column(JSON, nullable=False)
    result = Column(JSON, nullable=True)
    status = Column(String(50), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
