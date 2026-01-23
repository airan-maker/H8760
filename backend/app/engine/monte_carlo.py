"""
몬테카를로 시뮬레이션 엔진

불확실성을 반영한 확률적 분석을 수행합니다.
"""
import numpy as np
from dataclasses import dataclass
from typing import List, Tuple
from app.engine.energy_8760 import Energy8760Config, calculate_8760


@dataclass
class MonteCarloConfig:
    """몬테카를로 시뮬레이션 설정"""

    iterations: int = 10000
    weather_sigma: float = 0.1  # 기상 변동성 표준편차
    price_sigma: float = 0.15  # 전력 가격 변동성 표준편차
    h2_price_sigma: float = 0.1  # 수소 가격 변동성 표준편차
    efficiency_sigma: float = 0.02  # 효율 변동성 표준편차


@dataclass
class MonteCarloResult:
    """몬테카를로 시뮬레이션 결과"""

    npv_distribution: np.ndarray
    irr_distribution: np.ndarray
    revenue_distribution: np.ndarray
    h2_production_distribution: np.ndarray

    # 백분위수 값
    npv_p50: float
    npv_p90: float
    npv_p99: float
    irr_p50: float
    irr_p90: float
    irr_p99: float

    # VaR
    var_95: float
    var_99: float


def run_monte_carlo(
    energy_config: Energy8760Config,
    mc_config: MonteCarloConfig,
    base_electricity_prices: np.ndarray,
    base_h2_price: float,
    capex: float,
    opex_annual: float,
    discount_rate: float,
    project_lifetime: int,
    weather_variability: bool = True,
    price_volatility: bool = True,
) -> MonteCarloResult:
    """
    몬테카를로 시뮬레이션 실행

    Args:
        energy_config: 에너지 계산 설정
        mc_config: 몬테카를로 설정
        base_electricity_prices: 기준 전력 가격 (8760개)
        base_h2_price: 기준 수소 가격
        capex: 초기 투자비
        opex_annual: 연간 운영비
        discount_rate: 할인율 (%)
        project_lifetime: 프로젝트 기간
        weather_variability: 기상 변동성 반영 여부
        price_volatility: 가격 변동성 반영 여부

    Returns:
        MonteCarloResult: 시뮬레이션 결과
    """
    npv_results = []
    irr_results = []
    revenue_results = []
    h2_production_results = []

    np.random.seed(42)

    for i in range(mc_config.iterations):
        # 변동성 적용
        if price_volatility:
            price_factor = np.random.lognormal(0, mc_config.price_sigma)
            electricity_prices = base_electricity_prices * price_factor
            h2_price = base_h2_price * np.random.lognormal(0, mc_config.h2_price_sigma)
        else:
            electricity_prices = base_electricity_prices
            h2_price = base_h2_price

        if weather_variability:
            efficiency_factor = np.random.normal(1, mc_config.efficiency_sigma)
            modified_config = Energy8760Config(
                electrolyzer_capacity_mw=energy_config.electrolyzer_capacity_mw,
                electrolyzer_efficiency=energy_config.electrolyzer_efficiency
                * efficiency_factor,
                specific_consumption=energy_config.specific_consumption,
                degradation_rate=energy_config.degradation_rate,
                annual_availability=energy_config.annual_availability
                * np.random.normal(1, mc_config.weather_sigma),
                price_threshold=energy_config.price_threshold,
            )
        else:
            modified_config = energy_config

        # 다년간 현금흐름 계산
        cashflows = [-capex]
        total_revenue = 0
        total_h2 = 0

        for year in range(1, project_lifetime + 1):
            result = calculate_8760(
                config=modified_config,
                electricity_prices=electricity_prices,
                h2_price=h2_price,
                year=year,
            )

            year_revenue = np.sum(result.hourly_revenue) - np.sum(result.hourly_cost)
            net_cashflow = year_revenue - opex_annual
            cashflows.append(net_cashflow)

            total_revenue += year_revenue
            total_h2 += result.total_h2_production

        # NPV 계산
        npv = calculate_npv(cashflows, discount_rate / 100)
        npv_results.append(npv)

        # IRR 계산
        irr = calculate_irr(cashflows)
        irr_results.append(irr if irr is not None else 0)

        revenue_results.append(total_revenue / project_lifetime)
        h2_production_results.append(total_h2 / project_lifetime / 1000)  # 톤 단위

    # 결과 배열로 변환
    npv_dist = np.array(npv_results)
    irr_dist = np.array(irr_results)
    revenue_dist = np.array(revenue_results)
    h2_dist = np.array(h2_production_results)

    return MonteCarloResult(
        npv_distribution=npv_dist,
        irr_distribution=irr_dist,
        revenue_distribution=revenue_dist,
        h2_production_distribution=h2_dist,
        npv_p50=float(np.percentile(npv_dist, 50)),
        npv_p90=float(np.percentile(npv_dist, 10)),  # P90은 하위 10%
        npv_p99=float(np.percentile(npv_dist, 1)),  # P99는 하위 1%
        irr_p50=float(np.percentile(irr_dist, 50)),
        irr_p90=float(np.percentile(irr_dist, 10)),
        irr_p99=float(np.percentile(irr_dist, 1)),
        var_95=float(np.percentile(npv_dist, 5)),
        var_99=float(np.percentile(npv_dist, 1)),
    )


def calculate_npv(cashflows: List[float], discount_rate: float) -> float:
    """
    순현재가치(NPV) 계산

    Args:
        cashflows: 현금흐름 목록 (첫 번째는 초기 투자)
        discount_rate: 할인율

    Returns:
        float: NPV
    """
    npv = 0
    for t, cf in enumerate(cashflows):
        npv += cf / ((1 + discount_rate) ** t)
    return npv


def calculate_irr(
    cashflows: List[float], max_iterations: int = 1000, tolerance: float = 1e-6
) -> float:
    """
    내부수익률(IRR) 계산 (Newton-Raphson 방법)

    Args:
        cashflows: 현금흐름 목록
        max_iterations: 최대 반복 횟수
        tolerance: 허용 오차

    Returns:
        float: IRR (%) 또는 None (수렴 실패시)
    """
    # 초기 추정값
    rate = 0.1

    for _ in range(max_iterations):
        npv = calculate_npv(cashflows, rate)

        # NPV의 도함수 계산
        npv_derivative = 0
        for t, cf in enumerate(cashflows):
            if t > 0:
                npv_derivative -= t * cf / ((1 + rate) ** (t + 1))

        if abs(npv_derivative) < 1e-10:
            break

        # Newton-Raphson 업데이트
        new_rate = rate - npv / npv_derivative

        if abs(new_rate - rate) < tolerance:
            return new_rate * 100  # 백분율로 반환

        rate = new_rate

    return rate * 100 if abs(calculate_npv(cashflows, rate)) < 1e6 else None


def create_histogram(
    data: np.ndarray, num_bins: int = 50
) -> List[Tuple[float, int]]:
    """
    히스토그램 데이터 생성

    Args:
        data: 데이터 배열
        num_bins: 빈 개수

    Returns:
        List[Tuple[float, int]]: (빈 중앙값, 빈도) 목록
    """
    counts, bin_edges = np.histogram(data, bins=num_bins)
    bin_centers = (bin_edges[:-1] + bin_edges[1:]) / 2

    return [(float(center), int(count)) for center, count in zip(bin_centers, counts)]
