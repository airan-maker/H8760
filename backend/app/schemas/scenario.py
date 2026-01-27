"""
Scenario 스키마
"""
from datetime import datetime
from typing import Optional, Any, Dict
from pydantic import BaseModel


class ScenarioBase(BaseModel):
    """시나리오 기본 스키마"""
    name: str
    description: Optional[str] = None


class ScenarioCreate(ScenarioBase):
    """시나리오 생성 스키마"""
    input_config: Dict[str, Any]
    result: Optional[Dict[str, Any]] = None


class ScenarioUpdate(BaseModel):
    """시나리오 수정 스키마"""
    name: Optional[str] = None
    description: Optional[str] = None
    input_config: Optional[Dict[str, Any]] = None
    result: Optional[Dict[str, Any]] = None


class ScenarioResponse(ScenarioBase):
    """시나리오 응답 스키마"""
    id: str
    user_id: str
    input_config: Dict[str, Any]
    result: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ScenarioListResponse(BaseModel):
    """시나리오 목록 응답 스키마"""
    id: str
    name: str
    description: Optional[str] = None
    input_config: Dict[str, Any]
    result: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
