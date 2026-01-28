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

    # 백분위수 값 (세전)
    npv_p50: float
    npv_p90: float
    npv_p99: float
    irr_p50: float
    irr_p90: float
    irr_p99: float

    # VaR
    var_95: float
    var_99: float

    # 세후 NPV 분포 (Bankability 3순위)
    npv_after_tax_distribution: np.ndarray = None
    npv_after_tax_p50: float = 0.0
    npv_after_tax_p90: float = 0.0
    npv_after_tax_p99: float = 0.0

    # Equity IRR 분포 (Bankability 3순위)
    equity_irr_distribution: np.ndarray = None
    equity_irr_p50: float = 0.0
    equity_irr_p90: float = 0.0
    equity_irr_p99: float = 0.0


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
    # Bankability 3순위: 세후 계산용 파라미터
    debt_ratio: float = 70.0,
    interest_rate: float = 5.0,
    loan_tenor: int = 15,
    tax_rate: float = 24.2,  # 법인세 + 지방소득세 (기본값)
    depreciation_years: int = 10,
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
        debt_ratio: 부채 비율 (%)
        interest_rate: 대출 이자율 (%)
        loan_tenor: 대출 기간 (년)
        tax_rate: 법인세율 + 지방소득세율 (%)
        depreciation_years: 감가상각 내용연수 (년)

    Returns:
        MonteCarloResult: 시뮬레이션 결과
    """
    npv_results = []
    irr_results = []
    revenue_results = []
    h2_production_results = []

    # Bankability 3순위: 세후 결과
    npv_after_tax_results = []
    equity_irr_results = []

    # 부채/자기자본 계산
    debt_amount = capex * (debt_ratio / 100)
    equity_amount = capex - debt_amount

    # 연간 원리금 상환액 (원리금균등)
    if debt_amount > 0 and interest_rate > 0 and loan_tenor > 0:
        r = interest_rate / 100
        annual_debt_service = debt_amount * (r * (1 + r) ** loan_tenor) / ((1 + r) ** loan_tenor - 1)
    else:
        annual_debt_service = 0

    # 연간 감가상각비 (정액법, 잔존가치 5% 가정)
    annual_depreciation = (capex * 0.95) / depreciation_years if depreciation_years > 0 else 0

    # 시드 설정 - 재현성을 위해 시뮬레이션 시작 시 한 번만 설정
    # 각 반복은 다른 난수 사용
    np.random.seed(42)

    for i in range(mc_config.iterations):
        # 각 반복마다 다른 시드 사용하지 않음 - np.random이 순차적으로 다른 값 생성
        # 변동성 적용
        if price_volatility:
            price_factor = np.random.lognormal(0, mc_config.price_sigma)
            electricity_prices = base_electricity_prices * price_factor
            h2_price = base_h2_price * np.random.lognormal(0, mc_config.h2_price_sigma)
        else:
            electricity_prices = base_electricity_prices
            h2_price = base_h2_price

        if weather_variability:
            # 효율 변동성 - 음수 방지를 위해 클리핑 적용
            efficiency_factor = np.clip(
                np.random.normal(1, mc_config.efficiency_sigma),
                0.8,  # 최소 80% 효율
                1.2   # 최대 120% 효율
            )
            # 가용성 변동성 - 0~100% 범위로 클리핑
            availability_factor = np.clip(
                np.random.normal(1, mc_config.weather_sigma),
                0.7,  # 최소 70%
                1.1   # 최대 110%
            )
            modified_availability = np.clip(
                energy_config.annual_availability * availability_factor,
                0.0,
                99.0  # 최대 가용률 99%
            )
            modified_config = Energy8760Config(
                electrolyzer_capacity_mw=energy_config.electrolyzer_capacity_mw,
                electrolyzer_efficiency=energy_config.electrolyzer_efficiency
                * efficiency_factor,
                specific_consumption=energy_config.specific_consumption,
                degradation_rate=energy_config.degradation_rate,
                annual_availability=modified_availability,
                price_threshold=energy_config.price_threshold,
            )
        else:
            modified_config = energy_config

        # 다년간 현금흐름 계산
        cashflows = [-capex]
        cashflows_after_tax = [-equity_amount]  # 자기자본 기준
        total_revenue = 0
        total_h2 = 0

        # 대출 잔액 추적 (이자 계산용)
        remaining_debt = debt_amount

        for year in range(1, project_lifetime + 1):
            result = calculate_8760(
                config=modified_config,
                electricity_prices=electricity_prices,
                h2_price=h2_price,
                year=year,
            )

            year_revenue = np.sum(result.hourly_revenue) - np.sum(result.hourly_cost)

            # 세전 순현금흐름 (기존)
            net_cashflow = year_revenue - opex_annual
            cashflows.append(net_cashflow)

            # === Bankability 3순위: 세후 현금흐름 계산 ===
            # EBITDA
            ebitda = year_revenue - opex_annual

            # 감가상각비 (내용연수 내에서만)
            depreciation = annual_depreciation if year <= depreciation_years else 0

            # EBIT (영업이익)
            ebit = ebitda - depreciation

            # 이자비용 (잔액 기준)
            if year <= loan_tenor and remaining_debt > 0:
                interest_expense = remaining_debt * (interest_rate / 100)
                # 원금 상환액
                principal_payment = annual_debt_service - interest_expense if annual_debt_service > interest_expense else 0
                remaining_debt = max(0, remaining_debt - principal_payment)
            else:
                interest_expense = 0
                principal_payment = 0

            # 세전 이익 (EBT)
            ebt = ebit - interest_expense

            # 법인세 (양수일 때만)
            tax = ebt * (tax_rate / 100) if ebt > 0 else 0

            # 순이익
            net_income = ebt - tax

            # 세후 자기자본 현금흐름 = 순이익 + 감가상각 - 원금상환
            equity_cashflow = net_income + depreciation - principal_payment
            cashflows_after_tax.append(equity_cashflow)

            total_revenue += year_revenue
            total_h2 += result.total_h2_production

        # NPV 계산 (세전)
        npv = calculate_npv(cashflows, discount_rate / 100)
        npv_results.append(npv)

        # NPV 계산 (세후)
        npv_after_tax = calculate_npv(cashflows_after_tax, discount_rate / 100)
        npv_after_tax_results.append(npv_after_tax)

        # IRR 계산 (세전 - Project IRR)
        irr = calculate_irr(cashflows)
        irr_results.append(irr if irr is not None else 0)

        # Equity IRR 계산 (세후 자기자본 기준)
        equity_irr = calculate_irr(cashflows_after_tax)
        equity_irr_results.append(equity_irr if equity_irr is not None else 0)

        revenue_results.append(total_revenue / project_lifetime)
        h2_production_results.append(total_h2 / project_lifetime / 1000)  # 톤 단위

    # 결과 배열로 변환
    npv_dist = np.array(npv_results)
    irr_dist = np.array(irr_results)
    revenue_dist = np.array(revenue_results)
    h2_dist = np.array(h2_production_results)

    # Bankability 3순위: 세후 결과
    npv_after_tax_dist = np.array(npv_after_tax_results)
    equity_irr_dist = np.array(equity_irr_results)

    return MonteCarloResult(
        npv_distribution=npv_dist,
        irr_distribution=irr_dist,
        revenue_distribution=revenue_dist,
        h2_production_distribution=h2_dist,
        # 백분위수 계산
        # P50: 중앙값 (50 백분위수)
        # P90, P99: 보수적 추정 (downside risk) - 하위 10%, 1%
        # 이는 "90% 신뢰수준에서 이 값 이상의 NPV 달성" 의미
        npv_p50=float(np.percentile(npv_dist, 50)),
        npv_p90=float(np.percentile(npv_dist, 10)),  # 하위 10% (보수적 P90)
        npv_p99=float(np.percentile(npv_dist, 1)),   # 하위 1% (보수적 P99)
        irr_p50=float(np.percentile(irr_dist, 50)),
        irr_p90=float(np.percentile(irr_dist, 10)),
        irr_p99=float(np.percentile(irr_dist, 1)),
        # VaR (Value at Risk) - 손실 리스크
        var_95=float(np.percentile(npv_dist, 5)),    # 95% VaR
        var_99=float(np.percentile(npv_dist, 1)),    # 99% VaR
        # Bankability 3순위: 세후 NPV 분포
        npv_after_tax_distribution=npv_after_tax_dist,
        npv_after_tax_p50=float(np.percentile(npv_after_tax_dist, 50)),
        npv_after_tax_p90=float(np.percentile(npv_after_tax_dist, 10)),
        npv_after_tax_p99=float(np.percentile(npv_after_tax_dist, 1)),
        # Bankability 3순위: Equity IRR 분포
        equity_irr_distribution=equity_irr_dist,
        equity_irr_p50=float(np.percentile(equity_irr_dist, 50)),
        equity_irr_p90=float(np.percentile(equity_irr_dist, 10)),
        equity_irr_p99=float(np.percentile(equity_irr_dist, 1)),
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

    # 현금흐름 검증 - 부호 변화가 있어야 IRR 계산 가능
    positive_cf = sum(1 for cf in cashflows if cf > 0)
    negative_cf = sum(1 for cf in cashflows if cf < 0)
    if positive_cf == 0 or negative_cf == 0:
        return None  # IRR 계산 불가

    for _ in range(max_iterations):
        try:
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

            # 발산 방지
            if new_rate < -0.99:
                new_rate = -0.99
            elif new_rate > 10:  # 1000% 초과 방지
                return None

            if abs(new_rate - rate) < tolerance:
                return new_rate * 100  # 백분율로 반환

            rate = new_rate

        except (OverflowError, FloatingPointError):
            return None

    final_npv = calculate_npv(cashflows, rate)
    return rate * 100 if abs(final_npv) < 1e6 else None


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
