"""
Hydrogen - 수소 전해조 최적화 플랫폼
FastAPI 백엔드 메인 엔트리포인트
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import projects, simulation, reports, data, auth, scenarios, analysis, optimization
from app.core.config import settings
from app.core.database import create_tables


@asynccontextmanager
async def lifespan(app: FastAPI):
    """애플리케이션 라이프사이클 관리"""
    # 시작 시 테이블 생성
    create_tables()
    yield
    # 종료 시 정리 작업 (필요한 경우)


app = FastAPI(
    title="Hydrogen Platform API",
    description="수소 전해조 최적화 시뮬레이션 플랫폼",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS 설정 (Railway 배포 지원)
# CORS_ALLOW_ALL이 True면 모든 origin 허용, 아니면 설정된 origins만 허용
cors_origins = ["*"] if settings.CORS_ALLOW_ALL else settings.CORS_ORIGINS
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 라우터 등록
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(simulation.router, prefix="/api/simulation", tags=["simulation"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(data.router, prefix="/api/data", tags=["data"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(scenarios.router, prefix="/api/scenarios", tags=["scenarios"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["analysis"])
app.include_router(optimization.router, prefix="/api/optimization", tags=["optimization"])


@app.get("/")
async def root():
    return {"message": "Hydrogen Platform API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
