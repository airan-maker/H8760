"""
Grid Search 최적화 엔진

변수 조합 전수 탐색을 위한 병렬 처리 엔진
"""
import itertools
import logging
import time
from typing import Dict, List, Any, Callable
from concurrent.futures import ProcessPoolExecutor, as_completed
import numpy as np

from app.schemas.simulation import SimulationInput
from app.schemas.optimization import GridSearchRequest, GridSearchResultItem

logger = logging.getLogger(__name__)


def generate_combinations(variable_ranges: List[Dict[str, Any]]) -> List[Dict[str, float]]:
    """
    변수 범위에서 모든 조합 생성

    Args:
        variable_ranges: 변수 범위 정의 리스트

    Returns:
        모든 조합의 리스트
    """
    # 각 변수의 값 리스트 생성
    var_values = {}
    for var_range in variable_ranges:
        name = var_range["name"]
        min_val = var_range["min_value"]
        max_val = var_range["max_value"]
        step = var_range["step"]

        # 값 범위 생성
        values = []
        current = min_val
        while current <= max_val + step * 0.001:  # 부동소수점 오차 보정
            values.append(round(current, 6))
            current += step
        var_values[name] = values

    # 모든 조합 생성
    var_names = list(var_values.keys())
    all_values = [var_values[name] for name in var_names]

    combinations = []
    for combo in itertools.product(*all_values):
        combination = {name: value for name, value in zip(var_names, combo)}
        combinations.append(combination)

    return combinations


def apply_combination_to_input(
    base_input: SimulationInput,
    combination: Dict[str, float]
) -> SimulationInput:
    """
    변수 조합을 시뮬레이션 입력에 적용

    Args:
        base_input: 기본 입력
        combination: 적용할 변수 조합

    Returns:
        수정된 SimulationInput
    """
    # 깊은 복사를 위해 dict로 변환 후 다시 생성
    input_dict = base_input.model_dump()

    # 변수 매핑 (스네이크 케이스)
    variable_mapping = {
        "electrolyzer_capacity": ("equipment", "electrolyzer_capacity"),
        "electrolyzer_efficiency": ("equipment", "electrolyzer_efficiency"),
        "ppa_price": ("cost", "ppa_price"),
        "h2_price": ("market", "h2_price"),
        "capex": ("cost", "capex"),
        "discount_rate": ("financial", "discount_rate"),
        "debt_ratio": ("financial", "debt_ratio"),
        "annual_availability": ("equipment", "annual_availability"),
    }

    for var_name, value in combination.items():
        if var_name in variable_mapping:
            category, field = variable_mapping[var_name]
            input_dict[category][field] = value

    return SimulationInput(**input_dict)


def run_single_simulation(
    input_config: SimulationInput,
    monte_carlo_iterations: int = 1000,
) -> Dict[str, float]:
    """
    단일 시뮬레이션 실행 (Grid Search용 최적화 버전)

    Args:
        input_config: 시뮬레이션 입력
        monte_carlo_iterations: 몬테카를로 반복 횟수 (속도 최적화)

    Returns:
        KPI 결과 딕셔너리
    """
    # 지연 임포트 (멀티프로세싱 호환성)
    from app.engine.simulation_runner import (
        _generate_electricity_prices,
        _generate_renewable_profile,
    )
    from app.engine.energy_8760 import Energy8760Config, calculate_8760, aggregate_yearly_results
    from app.engine.monte_carlo import MonteCarloConfig, run_monte_carlo
    from app.engine.financial import FinancialConfig, run_financial_analysis

    equip = input_config.equipment
    cost = input_config.cost
    market = input_config.market
    financial = input_config.financial
    risk = input_config.risk_weights
    renewable = input_config.renewable

    # 전력 가격 생성
    base_electricity_prices = _generate_electricity_prices(
        cost.ppa_price or 100.0, market.electricity_price_scenario
    )

    # 재생에너지 프로파일 (옵션)
    renewable_output = None
    if renewable.enabled and cost.electricity_source == "RENEWABLE":
        renewable_output = _generate_renewable_profile(
            source_type=renewable.source_type,
            capacity_mw=renewable.capacity_mw,
            capacity_factor=renewable.capacity_factor,
        )
        base_electricity_prices = np.zeros(8760)

    # 가격 임계값
    if renewable.enabled and cost.electricity_source == "RENEWABLE":
        price_threshold = float('inf')
    else:
        price_threshold = (cost.ppa_price or 100.0) * 1.2

    # 에너지 설정
    energy_config = Energy8760Config(
        electrolyzer_capacity_mw=equip.electrolyzer_capacity,
        electrolyzer_efficiency=equip.electrolyzer_efficiency,
        specific_consumption=equip.specific_consumption,
        degradation_rate=equip.degradation_rate,
        annual_availability=equip.annual_availability,
        price_threshold=price_threshold,
    )

    # 다년간 결과 집계
    yearly_data = aggregate_yearly_results(
        config=energy_config,
        electricity_prices=base_electricity_prices,
        h2_price=market.h2_price,
        project_lifetime=financial.project_lifetime,
        h2_price_escalation=market.h2_price_escalation,
    )

    yearly_revenues = [y["total_revenue"] for y in yearly_data["yearly_results"]]
    yearly_elec_costs = [y["total_electricity_cost"] for y in yearly_data["yearly_results"]]
    yearly_h2_prod = [y["h2_production_kg"] for y in yearly_data["yearly_results"]]

    # 재무 분석
    financial_config = FinancialConfig(
        capex=cost.capex,
        opex_ratio=cost.opex_ratio,
        stack_replacement_cost=cost.stack_replacement_cost,
        stack_lifetime_hours=equip.stack_lifetime,
        discount_rate=financial.discount_rate,
        project_lifetime=financial.project_lifetime,
        debt_ratio=financial.debt_ratio,
        interest_rate=financial.interest_rate,
        loan_tenor=financial.loan_tenor,
    )

    fin_result = run_financial_analysis(
        config=financial_config,
        yearly_revenues=yearly_revenues,
        yearly_electricity_costs=yearly_elec_costs,
        yearly_h2_production=yearly_h2_prod,
    )

    # 몬테카를로 시뮬레이션 (축소된 반복)
    mc_config = MonteCarloConfig(
        iterations=monte_carlo_iterations,
        weather_sigma=0.1,
        price_sigma=0.15,
    )

    annual_opex = cost.capex * (cost.opex_ratio / 100)

    mc_result = run_monte_carlo(
        energy_config=energy_config,
        mc_config=mc_config,
        base_electricity_prices=base_electricity_prices,
        base_h2_price=market.h2_price,
        capex=cost.capex,
        opex_annual=annual_opex,
        discount_rate=financial.discount_rate,
        project_lifetime=financial.project_lifetime,
        weather_variability=risk.weather_variability,
        price_volatility=risk.price_volatility,
    )

    return {
        "npv_p50": mc_result.npv_p50,
        "npv_p90": mc_result.npv_p90,
        "irr_p50": mc_result.irr_p50,
        "lcoh": fin_result.lcoh,
        "dscr_min": fin_result.dscr_min,
        "annual_h2_production": yearly_h2_prod[0] / 1000,  # kg -> 톤
    }


def run_grid_search_job(
    job_id: str,
    request: GridSearchRequest,
    jobs_store: Dict[str, Any],
) -> None:
    """
    Grid Search 백그라운드 작업 실행

    Args:
        job_id: 작업 ID
        request: Grid Search 요청
        jobs_store: 작업 상태 저장소
    """
    start_time = time.time()

    try:
        # 상태 업데이트
        jobs_store[job_id]["status"] = "running"

        # 조합 생성
        variable_ranges = [
            {
                "name": v.name,
                "min_value": v.min_value,
                "max_value": v.max_value,
                "step": v.step,
            }
            for v in request.variable_ranges
        ]
        combinations = generate_combinations(variable_ranges)
        total = len(combinations)

        logger.info(f"[GridSearch {job_id[:8]}] 총 {total}개 조합 탐색 시작")

        results: List[GridSearchResultItem] = []
        completed = 0

        # 병렬 처리 (ProcessPoolExecutor 사용시 pickle 문제로 순차 처리)
        # 실제 프로덕션에서는 Celery 등 태스크 큐 사용 권장
        for combo in combinations:
            if jobs_store[job_id]["status"] == "failed":
                # 취소됨
                break

            # 조합 적용
            modified_input = apply_combination_to_input(request.base_input, combo)

            # 시뮬레이션 실행
            try:
                kpi_result = run_single_simulation(
                    modified_input,
                    request.monte_carlo_iterations,
                )

                result_item = GridSearchResultItem(
                    combination=combo,
                    npv_p50=kpi_result["npv_p50"],
                    npv_p90=kpi_result["npv_p90"],
                    irr_p50=kpi_result["irr_p50"],
                    lcoh=kpi_result["lcoh"],
                    dscr_min=kpi_result["dscr_min"],
                    annual_h2_production=kpi_result["annual_h2_production"],
                )
                results.append(result_item)
            except Exception as e:
                logger.warning(f"조합 {combo} 실행 실패: {e}")
                continue

            completed += 1
            jobs_store[job_id]["completed_combinations"] = completed
            jobs_store[job_id]["progress"] = (completed / total) * 100

            if completed % 10 == 0:
                logger.info(f"[GridSearch {job_id[:8]}] 진행: {completed}/{total}")

        # 결과 정렬
        if request.target_kpi == "npv_p50":
            results.sort(key=lambda x: x.npv_p50, reverse=True)
        elif request.target_kpi == "irr_p50":
            results.sort(key=lambda x: x.irr_p50, reverse=True)
        elif request.target_kpi == "lcoh":
            results.sort(key=lambda x: x.lcoh, reverse=False)

        # 순위 부여
        for i, result in enumerate(results):
            result.rank = i + 1

        # 히트맵 데이터 생성 (2개 변수인 경우)
        heatmap_data = None
        if len(request.variable_ranges) == 2:
            heatmap_data = generate_heatmap_data(
                results,
                request.variable_ranges[0].name,
                request.variable_ranges[1].name,
                request.target_kpi,
            )

        # 결과 저장
        jobs_store[job_id]["status"] = "completed"
        jobs_store[job_id]["progress"] = 100.0
        jobs_store[job_id]["results"] = [r.model_dump() for r in results[:100]]  # 상위 100개만
        jobs_store[job_id]["best_result"] = results[0].model_dump() if results else None
        jobs_store[job_id]["heatmap_data"] = heatmap_data

        elapsed = time.time() - start_time
        logger.info(f"[GridSearch {job_id[:8]}] 완료: {completed}개 조합, {elapsed:.1f}초")

    except Exception as e:
        logger.error(f"[GridSearch {job_id[:8]}] 실패: {e}")
        jobs_store[job_id]["status"] = "failed"
        jobs_store[job_id]["error_message"] = str(e)


def generate_heatmap_data(
    results: List[GridSearchResultItem],
    x_variable: str,
    y_variable: str,
    z_variable: str,
) -> Dict[str, Any]:
    """
    히트맵 시각화 데이터 생성

    Args:
        results: Grid Search 결과 목록
        x_variable: X축 변수명
        y_variable: Y축 변수명
        z_variable: Z값 변수 (target_kpi)

    Returns:
        히트맵 데이터 딕셔너리
    """
    # X, Y 값 추출
    x_values = sorted(set(r.combination[x_variable] for r in results))
    y_values = sorted(set(r.combination[y_variable] for r in results))

    # Z 매트릭스 생성
    z_matrix = [[None for _ in x_values] for _ in y_values]

    for result in results:
        x_idx = x_values.index(result.combination[x_variable])
        y_idx = y_values.index(result.combination[y_variable])

        if z_variable == "npv_p50":
            z_value = result.npv_p50
        elif z_variable == "irr_p50":
            z_value = result.irr_p50
        elif z_variable == "lcoh":
            z_value = result.lcoh
        else:
            z_value = result.npv_p50

        z_matrix[y_idx][x_idx] = z_value

    return {
        "x_variable": x_variable,
        "y_variable": y_variable,
        "x_values": x_values,
        "y_values": y_values,
        "z_matrix": z_matrix,
        "z_variable": z_variable,
    }


class GridSearchOptimizer:
    """Grid Search 최적화기 (클래스 인터페이스)"""

    def __init__(self, base_input: SimulationInput):
        self.base_input = base_input

    def generate_combinations(
        self,
        variable_ranges: List[Dict[str, Any]]
    ) -> List[Dict[str, float]]:
        """조합 생성"""
        return generate_combinations(variable_ranges)

    def run_batch(
        self,
        combinations: List[Dict[str, float]],
        target_kpi: str = "npv_p50",
        monte_carlo_iterations: int = 1000,
        callback: Callable[[int, int], None] = None,
    ) -> List[GridSearchResultItem]:
        """배치 실행"""
        results = []

        for i, combo in enumerate(combinations):
            modified_input = apply_combination_to_input(self.base_input, combo)

            try:
                kpi_result = run_single_simulation(
                    modified_input,
                    monte_carlo_iterations,
                )

                result_item = GridSearchResultItem(
                    combination=combo,
                    npv_p50=kpi_result["npv_p50"],
                    npv_p90=kpi_result["npv_p90"],
                    irr_p50=kpi_result["irr_p50"],
                    lcoh=kpi_result["lcoh"],
                    dscr_min=kpi_result["dscr_min"],
                    annual_h2_production=kpi_result["annual_h2_production"],
                )
                results.append(result_item)
            except Exception as e:
                logger.warning(f"조합 {combo} 실행 실패: {e}")

            if callback:
                callback(i + 1, len(combinations))

        # 정렬
        if target_kpi == "npv_p50":
            results.sort(key=lambda x: x.npv_p50, reverse=True)
        elif target_kpi == "irr_p50":
            results.sort(key=lambda x: x.irr_p50, reverse=True)
        elif target_kpi == "lcoh":
            results.sort(key=lambda x: x.lcoh, reverse=False)

        for i, result in enumerate(results):
            result.rank = i + 1

        return results
