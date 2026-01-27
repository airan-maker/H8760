"""
User 스키마
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    """사용자 기본 스키마"""
    email: EmailStr
    display_name: Optional[str] = None
    photo_url: Optional[str] = None


class UserCreate(UserBase):
    """사용자 생성 스키마"""
    id: str  # Firebase UID


class UserUpdate(BaseModel):
    """사용자 수정 스키마"""
    display_name: Optional[str] = None
    photo_url: Optional[str] = None


class UserResponse(UserBase):
    """사용자 응답 스키마"""
    id: str
    created_at: datetime
    last_login: datetime

    class Config:
        from_attributes = True


class UserInToken(BaseModel):
    """토큰에서 추출한 사용자 정보"""
    uid: str
    email: Optional[str] = None
    name: Optional[str] = None
    picture: Optional[str] = None
    email_verified: bool = False
