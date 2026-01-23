"""
Hydrogen - 수소 전해조 최적화 플랫폼
FastAPI 백엔드 메인 엔트리포인트
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import projects, simulation, reports, data
from app.core.config import settings

app = FastAPI(
    title="Hydrogen Platform API",
    description="수소 전해조 최적화 시뮬레이션 플랫폼",
    version="1.0.0",
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 라우터 등록
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(simulation.router, prefix="/api/simulation", tags=["simulation"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(data.router, prefix="/api/data", tags=["data"])


@app.get("/")
async def root():
    return {"message": "Hydrogen Platform API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
