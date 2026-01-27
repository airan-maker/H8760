"""
User 모델
"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text

from app.core.database import Base


class User(Base):
    """사용자 모델"""
    __tablename__ = "users"

    id = Column(String(36), primary_key=True)  # Firebase UID
    email = Column(String(255), unique=True, nullable=False, index=True)
    display_name = Column(String(255), nullable=True)
    photo_url = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email})>"
