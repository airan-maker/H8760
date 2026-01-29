"""
설정 관리 모듈
"""
from typing import List, Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """애플리케이션 설정"""

    # API 설정
    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "Hydrogen Platform"

    # CORS 설정 (Railway 배포 및 로컬 개발 환경 지원)
    # 환경변수로 CORS_ORIGINS를 설정하거나, 기본값 사용
    # Railway에서는 CORS_ORIGINS 환경변수에 프론트엔드 URL 설정 필요
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
    ]

    # Railway 배포 시 모든 origin 허용 (프로덕션에서는 구체적인 URL 설정 권장)
    CORS_ALLOW_ALL: bool = True

    # 데이터베이스 설정
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/hydrogen"

    # Redis 설정
    REDIS_URL: str = "redis://localhost:6379"

    # Firebase 설정
    FIREBASE_PROJECT_ID: Optional[str] = None
    FIREBASE_SERVICE_ACCOUNT_JSON: Optional[str] = None  # JSON 문자열로 서비스 계정 키

    # 시뮬레이션 기본값
    DEFAULT_MONTE_CARLO_ITERATIONS: int = 10000
    DEFAULT_PROJECT_LIFETIME: int = 20
    DEFAULT_DISCOUNT_RATE: float = 8.0

    # Claude API 설정
    ANTHROPIC_API_KEY: Optional[str] = None
    CLAUDE_MODEL: str = "claude-sonnet-4-20250514"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
