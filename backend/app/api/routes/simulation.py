"""시뮬레이션 실행 API 라우트"""
from typing import List
import uuid

from fastapi import APIRouter, HTTPException, BackgroundTasks

from app.schemas.simulation import SimulationConfig, SimulationInput
from app.schemas.result import SimulationResult, SimulationStatus, ScenarioComparison
from app.engine import run_full_simulation

router = APIRouter()

# 임시 저장소
simulations_db: dict[str, dict] = {}


@router.post("/run", response_model=SimulationResult)
async def run_simulation(config: SimulationConfig) -> SimulationResult:
    """시뮬레이션 실행"""
    simulation_id = str(uuid.uuid4())

    # 시뮬레이션 엔진 실행
    result = run_full_simulation(
        simulation_id=simulation_id,
        input_config=config.input,
    )

    # 결과 저장
    if config.save_result:
        simulations_db[simulation_id] = {
            "config": config.model_dump(),
            "result": result.model_dump(),
        }

    return result


@router.get("/{simulation_id}/status", response_model=SimulationStatus)
async def get_simulation_status(simulation_id: str) -> SimulationStatus:
    """시뮬레이션 상태 조회"""
    if simulation_id not in simulations_db:
        raise HTTPException(status_code=404, detail="Simulation not found")

    return SimulationStatus(
        simulation_id=simulation_id,
        status="completed",
        progress=100.0,
        message="Simulation completed successfully",
    )


@router.get("/{simulation_id}/result", response_model=SimulationResult)
async def get_simulation_result(simulation_id: str) -> SimulationResult:
    """시뮬레이션 결과 조회"""
    if simulation_id not in simulations_db:
        raise HTTPException(status_code=404, detail="Simulation not found")

    return SimulationResult(**simulations_db[simulation_id]["result"])


@router.post("/compare", response_model=ScenarioComparison)
async def compare_scenarios(simulation_ids: List[str]) -> ScenarioComparison:
    """시나리오 비교"""
    results = []
    for sim_id in simulation_ids:
        if sim_id not in simulations_db:
            raise HTTPException(
                status_code=404, detail=f"Simulation {sim_id} not found"
            )
        results.append(simulations_db[sim_id]["result"])

    # 비교 데이터 생성
    kpis_comparison = {}
    for i, result in enumerate(results):
        kpis_comparison[simulation_ids[i]] = result["kpis"]

    return ScenarioComparison(
        scenarios=simulation_ids,
        kpis_comparison=kpis_comparison,
        distributions_comparison={},
    )
