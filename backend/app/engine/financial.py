"""
재무 분석 엔진

NPV, IRR, DSCR, LCOH 등 재무 지표를 계산합니다.

주요 수식 및 상수:
- LHV (Lower Heating Value): 33.33 kWh/kg (수소의 저위발열량)
- 스택 교체 비용: PEM 약 11% of CAPEX, Alkaline 약 15% of CAPEX (문헌 기반)
- 스택 수명: PEM 45,000~80,000시간, Alkaline 60,000~90,000시간
- OPEX: CAPEX의 2~5%/년 (업계 표준)
"""
import numpy as np
from dataclasses import dataclass
from typing import List, Optional

# 상수 정의
HYDROGEN_LHV_KWH_KG = 33.33  # 수소 저위발열량 (kWh/kg)
HYDROGEN_HHV_KWH_KG = 39.44  # 수소 고위발열량 (kWh/kg)
DEFAULT_STACK_REPLACEMENT_PEM_RATIO = 0.11  # PEM 스택 교체 비용 비율 (CAPEX 대비)
DEFAULT_STACK_REPLACEMENT_ALK_RATIO = 0.15  # Alkaline 스택 교체 비용 비율 (CAPEX 대비)


@dataclass
class FinancialConfig:
    """재무 분석 설정"""

    capex: float  # 초기 투자비 (원)
    opex_ratio: float  # OPEX 비율 (% of CAPEX)
    stack_replacement_cost: float  # 스택 교체 비용 (원)
    stack_lifetime_hours: int  # 스택 수명 (시간)
    discount_rate: float  # 할인율 (%)
    project_lifetime: int  # 프로젝트 기간 (년)
    debt_ratio: float  # 부채 비율 (%)
    interest_rate: float  # 대출 이자율 (%)
    loan_tenor: int  # 대출 기간 (년)


@dataclass
class YearlyCashflow:
    """연간 현금흐름"""

    year: int
    revenue: float
    opex: float
    stack_replacement: float
    debt_service: float
    net_cashflow: float
    cumulative_cashflow: float
    dscr: float


@dataclass
class FinancialResult:
    """재무 분석 결과"""

    npv: float
    irr: float
    payback_period: float
    lcoh: float  # 수소 균등화 비용 (원/kg)
    dscr_min: float
    dscr_avg: float
    yearly_cashflows: List[YearlyCashflow]


def calculate_debt_service(
    principal: float, interest_rate: float, tenor: int
) -> List[float]:
    """
    원리금 균등상환 계산

    Args:
        principal: 대출 원금
        interest_rate: 연 이자율 (%)
        tenor: 대출 기간 (년)

    Returns:
        List[float]: 연도별 원리금 상환액
    """
    if principal <= 0 or tenor <= 0:
        return [0.0] * tenor

    r = interest_rate / 100
    if r == 0:
        return [principal / tenor] * tenor

    # PMT 공식
    pmt = principal * (r * (1 + r) ** tenor) / ((1 + r) ** tenor - 1)

    return [pmt] * tenor


def calculate_lcoh(
    total_capex: float,
    annual_opex: float,
    annual_h2_production: float,
    discount_rate: float,
    project_lifetime: int,
    annual_electricity_cost: float,
) -> float:
    """
    수소 균등화 비용(LCOH) 계산 - 단순 버전 (평균값 사용)

    LCOH = (총 비용의 현재가치) / (총 수소 생산량의 현재가치)

    Args:
        total_capex: 총 CAPEX
        annual_opex: 연간 OPEX
        annual_h2_production: 연간 수소 생산량 (kg)
        discount_rate: 할인율 (%)
        project_lifetime: 프로젝트 기간
        annual_electricity_cost: 연간 전력 비용

    Returns:
        float: LCOH (원/kg)
    """
    r = discount_rate / 100

    # 총 비용의 현재가치
    total_cost_pv = total_capex

    for year in range(1, project_lifetime + 1):
        year_cost = annual_opex + annual_electricity_cost
        total_cost_pv += year_cost / ((1 + r) ** year)

    # 총 수소 생산량의 현재가치
    total_h2_pv = 0
    for year in range(1, project_lifetime + 1):
        total_h2_pv += annual_h2_production / ((1 + r) ** year)

    if total_h2_pv <= 0:
        return 0

    return total_cost_pv / total_h2_pv


def calculate_lcoh_accurate(
    total_capex: float,
    annual_opex: float,
    yearly_h2_production: List[float],
    yearly_electricity_costs: List[float],
    discount_rate: float,
    project_lifetime: int,
    stack_replacement_years: Optional[List[int]] = None,
    stack_replacement_cost: float = 0,
) -> float:
    """
    수소 균등화 비용(LCOH) 계산 - 정확한 버전 (연도별 데이터 사용)

    LCOH 공식 (NREL/European Hydrogen Observatory 기준):
    LCOH = Σ(연도별 비용의 현재가치) / Σ(연도별 수소 생산량의 현재가치)

    Args:
        total_capex: 총 CAPEX
        annual_opex: 연간 OPEX (CAPEX의 일정 비율)
        yearly_h2_production: 연도별 수소 생산량 (kg)
        yearly_electricity_costs: 연도별 전력 비용
        discount_rate: 할인율 (%)
        project_lifetime: 프로젝트 기간
        stack_replacement_years: 스택 교체 연도 목록
        stack_replacement_cost: 스택 교체 비용

    Returns:
        float: LCOH (원/kg)
    """
    r = discount_rate / 100

    # 총 비용의 현재가치 (CAPEX는 0년차에 발생)
    total_cost_pv = total_capex

    for year in range(1, project_lifetime + 1):
        idx = year - 1

        # 연도별 전력 비용
        elec_cost = yearly_electricity_costs[idx] if idx < len(yearly_electricity_costs) else 0

        # 스택 교체 비용
        stack_cost = 0
        if stack_replacement_years and year in stack_replacement_years:
            stack_cost = stack_replacement_cost

        # 연도별 총 비용
        year_cost = annual_opex + elec_cost + stack_cost
        total_cost_pv += year_cost / ((1 + r) ** year)

    # 총 수소 생산량의 현재가치
    total_h2_pv = 0
    for year in range(1, project_lifetime + 1):
        idx = year - 1
        h2_prod = yearly_h2_production[idx] if idx < len(yearly_h2_production) else 0
        total_h2_pv += h2_prod / ((1 + r) ** year)

    if total_h2_pv <= 0:
        return 0

    return total_cost_pv / total_h2_pv


def run_financial_analysis(
    config: FinancialConfig,
    yearly_revenues: List[float],
    yearly_electricity_costs: List[float],
    yearly_h2_production: List[float],
    stack_replacement_years: Optional[List[int]] = None,
    actual_operating_hours_per_year: Optional[float] = None,
) -> FinancialResult:
    """
    재무 분석 실행

    Args:
        config: 재무 분석 설정
        yearly_revenues: 연도별 수익
        yearly_electricity_costs: 연도별 전력 비용
        yearly_h2_production: 연도별 수소 생산량 (kg)
        stack_replacement_years: 스택 교체 연도 목록
        actual_operating_hours_per_year: 실제 연간 가동시간 (None이면 85% 가정)

    Returns:
        FinancialResult: 재무 분석 결과
    """
    # 입력 검증
    if config.debt_ratio < 0 or config.debt_ratio > 100:
        raise ValueError(f"debt_ratio must be 0-100%, got {config.debt_ratio}%")
    if config.discount_rate < 0:
        raise ValueError(f"discount_rate must be non-negative, got {config.discount_rate}%")
    if config.project_lifetime <= 0:
        raise ValueError(f"project_lifetime must be positive, got {config.project_lifetime}")

    # 부채 계산
    debt_amount = config.capex * (config.debt_ratio / 100)
    equity_amount = config.capex - debt_amount

    debt_service = calculate_debt_service(
        debt_amount, config.interest_rate, config.loan_tenor
    )

    # OPEX
    annual_opex = config.capex * (config.opex_ratio / 100)

    # 스택 교체 연도 결정 (운전 시간 기반)
    if stack_replacement_years is None:
        # 연간 가동 시간 추정
        # 실제 가동 시간이 제공되면 사용, 아니면 85% 가동률 가정
        if actual_operating_hours_per_year is not None:
            annual_hours = actual_operating_hours_per_year
        else:
            annual_hours = 8760 * 0.85  # 기본 가정: 85% 가동률

        if annual_hours > 0 and config.stack_lifetime_hours > 0:
            years_per_stack = config.stack_lifetime_hours / annual_hours
            stack_replacement_years = []
            cumulative_years = years_per_stack
            while cumulative_years < config.project_lifetime:
                stack_replacement_years.append(int(cumulative_years))
                cumulative_years += years_per_stack
        else:
            stack_replacement_years = []

    # 현금흐름 계산
    cashflows = [-equity_amount]  # 초기 자기자본 투자
    yearly_cashflows = []
    cumulative = -equity_amount
    dscr_values = []

    for year in range(1, config.project_lifetime + 1):
        idx = year - 1

        revenue = yearly_revenues[idx] if idx < len(yearly_revenues) else 0
        elec_cost = (
            yearly_electricity_costs[idx]
            if idx < len(yearly_electricity_costs)
            else 0
        )

        # 스택 교체 비용
        stack_cost = (
            config.stack_replacement_cost
            if year in stack_replacement_years
            else 0
        )

        # 부채 상환
        ds = debt_service[year - 1] if year <= len(debt_service) else 0

        # 순현금흐름
        gross_margin = revenue - elec_cost
        operating_income = gross_margin - annual_opex - stack_cost
        net_cf = operating_income - ds

        cashflows.append(net_cf)
        cumulative += net_cf

        # DSCR 계산
        dscr = operating_income / ds if ds > 0 else float("inf")
        if ds > 0:
            dscr_values.append(dscr)

        yearly_cashflows.append(
            YearlyCashflow(
                year=year,
                revenue=revenue,
                opex=annual_opex + elec_cost,
                stack_replacement=stack_cost,
                debt_service=ds,
                net_cashflow=net_cf,
                cumulative_cashflow=cumulative,
                dscr=dscr,
            )
        )

    # NPV 계산
    npv = 0
    r = config.discount_rate / 100
    for t, cf in enumerate(cashflows):
        npv += cf / ((1 + r) ** t)

    # IRR 계산
    irr = _calculate_irr(cashflows)

    # 투자회수기간 계산
    payback = _calculate_payback(yearly_cashflows)

    # LCOH 계산 (연도별 현재가치 기반으로 정확하게 계산)
    lcoh = calculate_lcoh_accurate(
        config.capex,
        annual_opex,
        yearly_h2_production,
        yearly_electricity_costs,
        config.discount_rate,
        config.project_lifetime,
        stack_replacement_years,
        config.stack_replacement_cost,
    )

    # DSCR 집계
    dscr_min = min(dscr_values) if dscr_values else 0
    dscr_avg = sum(dscr_values) / len(dscr_values) if dscr_values else 0

    return FinancialResult(
        npv=npv,
        irr=irr if irr else 0,
        payback_period=payback,
        lcoh=lcoh,
        dscr_min=dscr_min,
        dscr_avg=dscr_avg,
        yearly_cashflows=yearly_cashflows,
    )


def _calculate_irr(
    cashflows: List[float], max_iterations: int = 1000, tolerance: float = 1e-6
) -> Optional[float]:
    """
    IRR 계산 (Newton-Raphson + Bisection 대체)

    IRR(Internal Rate of Return)은 NPV = 0이 되는 할인율입니다.
    Newton-Raphson이 실패하면 Bisection으로 대체합니다.

    Args:
        cashflows: 현금흐름 리스트 (0번째 = 초기 투자, 음수)
        max_iterations: 최대 반복 횟수
        tolerance: 수렴 허용오차

    Returns:
        IRR (%), 계산 불가 시 None
    """
    # 현금흐름 검증
    if not cashflows or len(cashflows) < 2:
        return None

    # 부호 변환 횟수 확인 (IRR이 존재하려면 최소 1회 부호 변환 필요)
    sign_changes = 0
    for i in range(1, len(cashflows)):
        if cashflows[i-1] * cashflows[i] < 0:
            sign_changes += 1

    if sign_changes == 0:
        # 부호 변환이 없으면 IRR이 존재하지 않음
        return None

    # 1차 시도: Newton-Raphson
    irr = _irr_newton_raphson(cashflows, max_iterations, tolerance)
    if irr is not None:
        return irr

    # 2차 시도: Bisection (Newton-Raphson 실패 시)
    irr = _irr_bisection(cashflows, max_iterations, tolerance)
    return irr


def _irr_newton_raphson(
    cashflows: List[float], max_iterations: int = 1000, tolerance: float = 1e-6
) -> Optional[float]:
    """Newton-Raphson 방법으로 IRR 계산"""
    rate = 0.1  # 초기 추정값 10%

    for iteration in range(max_iterations):
        try:
            npv = sum(cf / ((1 + rate) ** t) for t, cf in enumerate(cashflows))

            npv_derivative = sum(
                -t * cf / ((1 + rate) ** (t + 1)) for t, cf in enumerate(cashflows) if t > 0
            )

            if abs(npv_derivative) < 1e-10:
                break

            new_rate = rate - npv / npv_derivative

            if abs(new_rate - rate) < tolerance:
                # 유효 범위 확인 (-99% ~ 1000%)
                if -0.99 <= new_rate <= 10:
                    return new_rate * 100
                else:
                    return None

            rate = new_rate

            # 발산 방지
            if rate < -0.99 or rate > 10:
                return None

        except (OverflowError, FloatingPointError, ZeroDivisionError):
            return None

    # 수렴했으나 tolerance 미달
    if -0.99 <= rate <= 10:
        return rate * 100
    return None


def _irr_bisection(
    cashflows: List[float],
    max_iterations: int = 1000,
    tolerance: float = 1e-6,
    low: float = -0.99,
    high: float = 5.0,
) -> Optional[float]:
    """
    이분법(Bisection)으로 IRR 계산

    Newton-Raphson이 수렴하지 않을 때 대체 방법으로 사용.
    더 느리지만 수렴이 보장됩니다.

    Args:
        cashflows: 현금흐름 리스트
        max_iterations: 최대 반복 횟수
        tolerance: 수렴 허용오차
        low: 탐색 하한 (-99%)
        high: 탐색 상한 (500%)

    Returns:
        IRR (%), 계산 불가 시 None
    """
    def npv_at_rate(rate: float) -> float:
        """주어진 할인율에서 NPV 계산"""
        try:
            return sum(cf / ((1 + rate) ** t) for t, cf in enumerate(cashflows))
        except (OverflowError, FloatingPointError):
            return float('inf') if rate < 0 else float('-inf')

    # 초기 경계에서 NPV 계산
    npv_low = npv_at_rate(low)
    npv_high = npv_at_rate(high)

    # 부호가 같으면 IRR이 범위 밖에 있음
    if npv_low * npv_high > 0:
        # 범위 확장 시도
        if npv_low > 0 and npv_high > 0:
            # 둘 다 양수 → 더 높은 할인율 필요
            high = 10.0
            npv_high = npv_at_rate(high)
        elif npv_low < 0 and npv_high < 0:
            # 둘 다 음수 → 더 낮은 할인율 필요 (투자 손실)
            return None

        # 여전히 부호가 같으면 IRR 없음
        if npv_low * npv_high > 0:
            return None

    # 이분법 실행
    for iteration in range(max_iterations):
        mid = (low + high) / 2
        npv_mid = npv_at_rate(mid)

        # 수렴 확인
        if abs(npv_mid) < tolerance or abs(high - low) < tolerance:
            return mid * 100

        # 범위 축소
        if npv_low * npv_mid < 0:
            high = mid
            npv_high = npv_mid
        else:
            low = mid
            npv_low = npv_mid

    # 최대 반복 후 중간값 반환
    return ((low + high) / 2) * 100


def _calculate_payback(yearly_cashflows: List[YearlyCashflow]) -> float:
    """투자회수기간 계산"""
    for i, cf in enumerate(yearly_cashflows):
        if cf.cumulative_cashflow >= 0:
            if i == 0:
                return 1.0

            prev_cumulative = yearly_cashflows[i - 1].cumulative_cashflow
            fraction = -prev_cumulative / cf.net_cashflow
            return i + fraction

    return float(len(yearly_cashflows))
