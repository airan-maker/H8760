"""
최적화 API 라우터
Grid Search, AI 최적화, 민감도 기반 탐색 엔드포인트
"""
import uuid
import logging
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, BackgroundTasks

from app.schemas.optimization import (
    GridSearchRequest,
    GridSearchResponse,
    AIOptimizeRequest,
    AIOptimizeResponse,
    SensitivityExploreRequest,
    SensitivityExploreResponse,
    JobStatus,
    OptimizableVariable,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# 작업 상태 저장소 (실제 환경에서는 Redis 등 사용)
jobs_store: Dict[str, Dict[str, Any]] = {}


# =============================================================================
# 최적화 가능 변수 목록
# =============================================================================

OPTIMIZABLE_VARIABLES = [
    OptimizableVariable(
        name="electrolyzer_capacity",
        display_name="전해조 용량",
        category="equipment",
        min_value=1.0,
        max_value=100.0,
        default_value=10.0,
        unit="MW",
        step=1.0
    ),
    OptimizableVariable(
        name="electrolyzer_efficiency",
        display_name="전해조 효율",
        category="equipment",
        min_value=50.0,
        max_value=85.0,
        default_value=67.0,
        unit="%",
        step=1.0
    ),
    OptimizableVariable(
        name="ppa_price",
        display_name="PPA 전력가격",
        category="cost",
        min_value=50.0,
        max_value=200.0,
        default_value=100.0,
        unit="원/kWh",
        step=5.0
    ),
    OptimizableVariable(
        name="h2_price",
        display_name="수소 판매가격",
        category="market",
        min_value=3000.0,
        max_value=15000.0,
        default_value=6000.0,
        unit="원/kg",
        step=500.0
    ),
    OptimizableVariable(
        name="capex",
        display_name="CAPEX",
        category="cost",
        min_value=10_000_000_000,
        max_value=200_000_000_000,
        default_value=50_000_000_000,
        unit="원",
        step=5_000_000_000
    ),
    OptimizableVariable(
        name="discount_rate",
        display_name="할인율",
        category="financial",
        min_value=5.0,
        max_value=15.0,
        default_value=8.0,
        unit="%",
        step=0.5
    ),
    OptimizableVariable(
        name="debt_ratio",
        display_name="부채비율",
        category="financial",
        min_value=0.0,
        max_value=90.0,
        default_value=70.0,
        unit="%",
        step=5.0
    ),
    OptimizableVariable(
        name="annual_availability",
        display_name="연간 가동률",
        category="equipment",
        min_value=70.0,
        max_value=98.0,
        default_value=85.0,
        unit="%",
        step=1.0
    ),
]


@router.get("/variables", response_model=list[OptimizableVariable])
async def get_optimizable_variables():
    """최적화 가능한 변수 목록 조회"""
    return OPTIMIZABLE_VARIABLES


# =============================================================================
# Grid Search API
# =============================================================================

@router.post("/grid-search", response_model=GridSearchResponse)
async def start_grid_search(
    request: GridSearchRequest,
    background_tasks: BackgroundTasks
):
    """
    Grid Search 최적화 시작

    - 지정된 변수 범위 조합을 전수 탐색
    - 최대 3개 변수, 1000개 조합 제한
    - 백그라운드에서 실행, job_id로 상태 조회
    """
    # 조합 수 계산
    total_combinations = 1
    for var_range in request.variable_ranges:
        steps = int((var_range.max_value - var_range.min_value) / var_range.step) + 1
        total_combinations *= steps

    if total_combinations > request.max_combinations:
        raise HTTPException(
            status_code=400,
            detail=f"조합 수({total_combinations})가 최대 허용({request.max_combinations})을 초과합니다. 범위를 조정해주세요."
        )

    # 작업 ID 생성
    job_id = str(uuid.uuid4())

    # 초기 상태 저장
    jobs_store[job_id] = {
        "status": "pending",
        "progress": 0.0,
        "total_combinations": total_combinations,
        "completed_combinations": 0,
        "results": [],
        "best_result": None,
        "heatmap_data": None,
        "error_message": None,
    }

    # 백그라운드 작업 등록
    from app.engine.grid_search import run_grid_search_job
    background_tasks.add_task(
        run_grid_search_job,
        job_id,
        request,
        jobs_store
    )

    return GridSearchResponse(
        job_id=job_id,
        status="pending",
        progress=0.0,
        total_combinations=total_combinations,
        completed_combinations=0,
    )


@router.get("/grid-search/{job_id}/status", response_model=GridSearchResponse)
async def get_grid_search_status(job_id: str):
    """Grid Search 작업 상태 조회"""
    if job_id not in jobs_store:
        raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다.")

    job = jobs_store[job_id]
    return GridSearchResponse(
        job_id=job_id,
        status=job["status"],
        progress=job["progress"],
        total_combinations=job["total_combinations"],
        completed_combinations=job["completed_combinations"],
        results=job.get("results", []),
        best_result=job.get("best_result"),
        heatmap_data=job.get("heatmap_data"),
        error_message=job.get("error_message"),
    )


@router.delete("/grid-search/{job_id}")
async def cancel_grid_search(job_id: str):
    """Grid Search 작업 취소"""
    if job_id not in jobs_store:
        raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다.")

    jobs_store[job_id]["status"] = "failed"
    jobs_store[job_id]["error_message"] = "사용자에 의해 취소됨"
    return {"message": "작업이 취소되었습니다."}


# =============================================================================
# AI 최적화 API
# =============================================================================

@router.post("/ai-optimize", response_model=AIOptimizeResponse)
async def run_ai_optimization(request: AIOptimizeRequest):
    """
    AI 기반 최적화

    - Claude가 민감도 분석과 제약 조건을 기반으로 최적 파라미터 추천
    - 점진적 탐색으로 목표 KPI 달성
    """
    from app.engine.ai_optimizer import AIOptimizer

    optimizer = AIOptimizer()

    try:
        result = await optimizer.optimize(request)
        return result
    except Exception as e:
        logger.error(f"AI 최적화 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# 민감도 기반 탐색 API
# =============================================================================

@router.post("/sensitivity-explore", response_model=SensitivityExploreResponse)
async def run_sensitivity_exploration(request: SensitivityExploreRequest):
    """
    민감도 기반 탐색

    - 영향력 높은 변수를 식별
    - 선택된 변수로 등고선 분석 수행
    - 최적 영역 탐색
    """
    from app.engine.sensitivity_explorer import SensitivityExplorer

    explorer = SensitivityExplorer()

    try:
        result = explorer.explore(request)
        return result
    except Exception as e:
        logger.error(f"민감도 탐색 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# 공통 유틸리티
# =============================================================================

@router.get("/jobs/{job_id}", response_model=JobStatus)
async def get_job_status(job_id: str):
    """범용 작업 상태 조회"""
    if job_id not in jobs_store:
        raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다.")

    job = jobs_store[job_id]
    return JobStatus(
        job_id=job_id,
        status=job["status"],
        progress=job.get("progress", 0.0),
        message=job.get("error_message"),
        result=job.get("results") if job["status"] == "completed" else None,
    )
