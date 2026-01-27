"""
Scenario 모델
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class Scenario(Base):
    """시나리오 모델"""
    __tablename__ = "scenarios"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    input_config = Column(JSON, nullable=False)  # 시뮬레이션 입력 설정
    result = Column(JSON, nullable=True)  # 시뮬레이션 결과
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 관계
    user = relationship("User", backref="scenarios")

    def __repr__(self):
        return f"<Scenario(id={self.id}, name={self.name})>"
