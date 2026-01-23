"""
설정 관리 모듈
"""
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """애플리케이션 설정"""

    # API 설정
    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "Hydrogen Platform"

    # CORS 설정
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    # 데이터베이스 설정
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/hydrogen"

    # Redis 설정
    REDIS_URL: str = "redis://localhost:6379"

    # 시뮬레이션 기본값
    DEFAULT_MONTE_CARLO_ITERATIONS: int = 10000
    DEFAULT_PROJECT_LIFETIME: int = 20
    DEFAULT_DISCOUNT_RATE: float = 8.0

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
