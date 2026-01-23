"""프로젝트 스키마"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ProjectBase(BaseModel):
    """프로젝트 기본 스키마"""

    name: str = Field(..., description="프로젝트 이름")
    description: Optional[str] = Field(None, description="프로젝트 설명")
    location: Optional[str] = Field(None, description="프로젝트 위치")


class ProjectCreate(ProjectBase):
    """프로젝트 생성 스키마"""

    pass


class ProjectUpdate(BaseModel):
    """프로젝트 수정 스키마"""

    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None


class Project(ProjectBase):
    """프로젝트 응답 스키마"""

    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
