"""
8760 시간별 에너지 생산 계산 엔진

매 시간별 전력 가용량, 전해조 가동 결정, 수소 생산량을 계산합니다.
"""
import numpy as np
from dataclasses import dataclass
from typing import Optional


@dataclass
class Energy8760Config:
    """8760 엔진 설정"""

    electrolyzer_capacity_mw: float  # MW
    electrolyzer_efficiency: float  # % (0-100)
    specific_consumption: float  # kWh/kg H2
    degradation_rate: float  # %/year
    annual_availability: float  # % (0-100)
    price_threshold: float  # 원/kWh - 이 가격 이하일 때만 가동


@dataclass
class Energy8760Result:
    """8760 엔진 결과"""

    h2_production: np.ndarray  # 시간별 수소 생산량 (kg)
    operating_power: np.ndarray  # 시간별 사용 전력 (MW)
    hourly_revenue: np.ndarray  # 시간별 수익 (원)
    hourly_cost: np.ndarray  # 시간별 전력 비용 (원)
    operating_hours: np.ndarray  # 가동 시간 (0/1)
    total_h2_production: float  # 연간 총 수소 생산량 (kg)
    total_operating_hours: int  # 연간 총 가동 시간
    capacity_factor: float  # 설비 이용률 (%)


def calculate_8760(
    config: Energy8760Config,
    electricity_prices: np.ndarray,  # 8760개 전력 가격 (원/kWh)
    renewable_output: Optional[np.ndarray] = None,  # 8760개 재생에너지 출력 (MW)
    h2_price: float = 6000,  # 수소 판매가 (원/kg)
    year: int = 1,  # 운영 연차 (효율 저하 계산용)
) -> Energy8760Result:
    """
    8760 시간별 계산 수행

    Args:
        config: 엔진 설정
        electricity_prices: 시간별 전력 가격 (8760개)
        renewable_output: 시간별 재생에너지 출력 (8760개), None이면 계통 전력 사용
        h2_price: 수소 판매 가격
        year: 운영 연차

    Returns:
        Energy8760Result: 시간별 계산 결과
    """
    hours = 8760

    # 입력 배열 길이 검증
    if len(electricity_prices) != hours:
        raise ValueError(f"electricity_prices must have {hours} values, got {len(electricity_prices)}")
    if renewable_output is not None and len(renewable_output) != hours:
        raise ValueError(f"renewable_output must have {hours} values, got {len(renewable_output)}")

    # 효율 저하 반영
    # 연간 저하율: PEM 약 0.5%/년, Alkaline 약 0.3%/년 (문헌 기반)
    # year=1일 때 저하 없음 (year-1=0이므로 factor=1)
    degradation_factor = (1 - config.degradation_rate / 100) ** (year - 1)
    effective_efficiency = config.electrolyzer_efficiency * degradation_factor / 100

    # 가동 가능 시간 마스크 (랜덤하게 가동률 반영)
    # 주의: np.random.seed()를 여기서 호출하면 Monte Carlo 시뮬레이션의 난수 상태를 초기화하므로
    # 별도의 RandomState 객체를 사용하여 격리된 난수 생성
    rng = np.random.RandomState(42 + year)  # 격리된 난수 생성기
    availability_mask = rng.random(hours) < (config.annual_availability / 100)

    # 결과 배열 초기화
    h2_production = np.zeros(hours)
    operating_power = np.zeros(hours)
    hourly_revenue = np.zeros(hours)
    hourly_cost = np.zeros(hours)
    operating_hours = np.zeros(hours, dtype=int)

    # 전해조 용량 (kW로 변환)
    capacity_kw = config.electrolyzer_capacity_mw * 1000

    for hour in range(hours):
        # 가동 가능 여부 확인
        if not availability_mask[hour]:
            continue

        # 전력 가용량 결정
        if renewable_output is not None:
            available_power_mw = renewable_output[hour]
        else:
            # 계통 전력 사용 시 전해조 용량만큼 가용
            available_power_mw = config.electrolyzer_capacity_mw

        # 전력 가격 기반 가동 결정
        if electricity_prices[hour] <= config.price_threshold:
            # 가동 전력 결정 (가용량과 용량 중 작은 값)
            op_power_mw = min(available_power_mw, config.electrolyzer_capacity_mw)
            op_power_kw = op_power_mw * 1000

            # 수소 생산량 계산
            h2_kg = (op_power_kw * effective_efficiency) / config.specific_consumption

            # 수익 및 비용 계산
            revenue = h2_kg * h2_price
            cost = op_power_kw * electricity_prices[hour]

            # 결과 저장
            h2_production[hour] = h2_kg
            operating_power[hour] = op_power_mw
            hourly_revenue[hour] = revenue
            hourly_cost[hour] = cost
            operating_hours[hour] = 1

    # 집계 결과
    total_h2 = np.sum(h2_production)
    total_hours = np.sum(operating_hours)
    capacity_factor = (total_hours / hours) * 100

    return Energy8760Result(
        h2_production=h2_production,
        operating_power=operating_power,
        hourly_revenue=hourly_revenue,
        hourly_cost=hourly_cost,
        operating_hours=operating_hours,
        total_h2_production=total_h2,
        total_operating_hours=total_hours,
        capacity_factor=capacity_factor,
    )


def aggregate_yearly_results(
    config: Energy8760Config,
    electricity_prices: np.ndarray,
    h2_price: float,
    project_lifetime: int,
    h2_price_escalation: float = 0.0,
) -> dict:
    """
    다년간 8760 결과 집계

    Args:
        config: 엔진 설정
        electricity_prices: 기준 전력 가격
        h2_price: 기준 수소 가격
        project_lifetime: 프로젝트 기간 (년)
        h2_price_escalation: 연간 수소 가격 상승률 (%)

    Returns:
        dict: 연도별 집계 결과
    """
    yearly_results = []

    for year in range(1, project_lifetime + 1):
        # 수소 가격 상승 반영
        year_h2_price = h2_price * ((1 + h2_price_escalation / 100) ** (year - 1))

        result = calculate_8760(
            config=config,
            electricity_prices=electricity_prices,
            h2_price=year_h2_price,
            year=year,
        )

        yearly_results.append(
            {
                "year": year,
                "h2_production_kg": result.total_h2_production,
                "h2_production_ton": result.total_h2_production / 1000,
                "total_revenue": np.sum(result.hourly_revenue),
                "total_electricity_cost": np.sum(result.hourly_cost),
                "net_revenue": np.sum(result.hourly_revenue) - np.sum(result.hourly_cost),
                "operating_hours": result.total_operating_hours,
                "capacity_factor": result.capacity_factor,
            }
        )

    return {"yearly_results": yearly_results}
