"""
재무 분석 엔진

NPV, IRR, DSCR, LCOH, Equity IRR, LLCR, PLCR 등 재무 지표를 계산합니다.

Bankability 평가를 위한 프로젝트 파이낸스 표준 계산 로직 포함:
- 세금 및 감가상각 반영
- Equity IRR (자기자본 수익률)
- LLCR/PLCR (커버리지 비율)

주요 수식 및 상수:
- LHV (Lower Heating Value): 33.33 kWh/kg (수소의 저위발열량)
- 스택 교체 비용: PEM 약 11% of CAPEX, Alkaline 약 15% of CAPEX (문헌 기반)
- 스택 수명: PEM 45,000~80,000시간, Alkaline 60,000~90,000시간
- OPEX: CAPEX의 2~5%/년 (업계 표준)
- 한국 법인세: 10~25% 누진 (2억 이하 10%, 200억 이하 20%, 200억 초과 22%, 3000억 초과 25%)
"""
import numpy as np
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

# 상수 정의
HYDROGEN_LHV_KWH_KG = 33.33  # 수소 저위발열량 (kWh/kg)
HYDROGEN_HHV_KWH_KG = 39.44  # 수소 고위발열량 (kWh/kg)
DEFAULT_STACK_REPLACEMENT_PEM_RATIO = 0.11  # PEM 스택 교체 비용 비율 (CAPEX 대비)
DEFAULT_STACK_REPLACEMENT_ALK_RATIO = 0.15  # Alkaline 스택 교체 비용 비율 (CAPEX 대비)


@dataclass
class TaxConfig:
    """세금 및 감가상각 설정"""

    corporate_tax_rate: float = 22.0  # 법인세율 (%)
    local_tax_rate: float = 2.2  # 지방소득세율 (%)
    depreciation_method: str = "straight_line"  # 감가상각 방법
    electrolyzer_useful_life: int = 10  # 전해조 감가상각 내용연수 (년)
    building_useful_life: int = 40  # 건물 감가상각 내용연수 (년)
    building_ratio: float = 10.0  # 건물 비율 (% of CAPEX)
    salvage_value_rate: float = 5.0  # 잔존가치율 (% of CAPEX)


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
    # Bankability 추가 필드
    construction_period: int = 1  # 건설 기간 (년)
    grace_period: int = 1  # 대출 거치 기간 (년)
    tax_config: Optional[TaxConfig] = None  # 세금 설정


@dataclass
class YearlyCashflow:
    """연간 현금흐름 (프로젝트 파이낸스 표준 형식)"""

    year: int
    revenue: float
    opex: float
    stack_replacement: float
    debt_service: float
    net_cashflow: float
    cumulative_cashflow: float
    dscr: float
    # Bankability 추가 필드
    depreciation: float = 0.0  # 감가상각비
    ebitda: float = 0.0  # EBITDA
    ebit: float = 0.0  # EBIT (영업이익)
    interest_expense: float = 0.0  # 이자비용
    principal_repayment: float = 0.0  # 원금상환
    tax: float = 0.0  # 법인세
    net_cashflow_after_tax: float = 0.0  # 세후 순현금흐름


@dataclass
class FinancialResult:
    """재무 분석 결과"""

    # 기존 지표
    npv: float  # 세전 NPV
    irr: float  # Project IRR
    payback_period: float
    lcoh: float  # 수소 균등화 비용 (원/kg)
    dscr_min: float
    dscr_avg: float
    yearly_cashflows: List[YearlyCashflow]
    # Bankability 추가 지표
    npv_after_tax: float = 0.0  # 세후 NPV
    equity_irr: float = 0.0  # 자기자본 IRR
    llcr: float = 0.0  # Loan Life Coverage Ratio
    plcr: float = 0.0  # Project Life Coverage Ratio


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


def calculate_debt_service_detailed(
    principal: float,
    interest_rate: float,
    tenor: int,
    grace_period: int = 0,
    project_lifetime: int = 20,
) -> Tuple[List[float], List[float], List[float]]:
    """
    거치기간을 포함한 상세 부채 상환 계산

    거치기간 동안은 이자만 납부하고, 이후 원리금 균등상환

    Args:
        principal: 대출 원금
        interest_rate: 연 이자율 (%)
        tenor: 대출 기간 (년) - 거치기간 포함
        grace_period: 거치 기간 (년)
        project_lifetime: 프로젝트 기간 (년)

    Returns:
        Tuple[List[float], List[float], List[float]]:
            - 연도별 총 부채상환액
            - 연도별 이자비용
            - 연도별 원금상환액
    """
    if principal <= 0 or tenor <= 0:
        return (
            [0.0] * project_lifetime,
            [0.0] * project_lifetime,
            [0.0] * project_lifetime,
        )

    r = interest_rate / 100
    total_ds = []
    interest_payments = []
    principal_payments = []

    remaining_principal = principal
    repayment_tenor = tenor - grace_period  # 실제 상환 기간

    # 거치기간 후 원리금 균등상환 PMT 계산
    if repayment_tenor > 0 and r > 0:
        pmt = principal * (r * (1 + r) ** repayment_tenor) / ((1 + r) ** repayment_tenor - 1)
    elif repayment_tenor > 0:
        pmt = principal / repayment_tenor
    else:
        pmt = 0

    for year in range(1, project_lifetime + 1):
        if year <= grace_period:
            # 거치기간: 이자만 납부
            interest = remaining_principal * r
            principal_payment = 0
            ds = interest
        elif year <= tenor:
            # 상환기간: 원리금 균등상환
            interest = remaining_principal * r
            principal_payment = pmt - interest
            remaining_principal -= principal_payment
            ds = pmt
        else:
            # 상환 완료
            interest = 0
            principal_payment = 0
            ds = 0

        total_ds.append(ds)
        interest_payments.append(interest)
        principal_payments.append(principal_payment)

    return total_ds, interest_payments, principal_payments


def calculate_depreciation(
    capex: float,
    tax_config: TaxConfig,
    project_lifetime: int,
) -> List[float]:
    """
    감가상각비 계산 (정액법)

    전해조/설비와 건물을 분리하여 각각의 내용연수에 따라 계산

    Args:
        capex: 총 CAPEX
        tax_config: 세금 설정
        project_lifetime: 프로젝트 기간

    Returns:
        List[float]: 연도별 감가상각비
    """
    # 자산 분류
    building_capex = capex * (tax_config.building_ratio / 100)
    equipment_capex = capex - building_capex

    # 잔존가치 계산
    building_salvage = building_capex * (tax_config.salvage_value_rate / 100)
    equipment_salvage = equipment_capex * (tax_config.salvage_value_rate / 100)

    # 감가상각 대상 금액
    building_depreciable = building_capex - building_salvage
    equipment_depreciable = equipment_capex - equipment_salvage

    depreciation = []

    for year in range(1, project_lifetime + 1):
        year_depreciation = 0.0

        # 건물 감가상각 (정액법)
        if year <= tax_config.building_useful_life:
            year_depreciation += building_depreciable / tax_config.building_useful_life

        # 전해조/설비 감가상각 (정액법)
        if year <= tax_config.electrolyzer_useful_life:
            year_depreciation += equipment_depreciable / tax_config.electrolyzer_useful_life

        depreciation.append(year_depreciation)

    return depreciation


def calculate_corporate_tax(
    taxable_income: float,
    tax_config: TaxConfig,
) -> float:
    """
    법인세 계산 (한국 누진세율 적용)

    한국 법인세 구간 (2024년 기준):
    - 2억원 이하: 10%
    - 2억원 초과 ~ 200억원: 20%
    - 200억원 초과 ~ 3000억원: 22%
    - 3000억원 초과: 25%

    Args:
        taxable_income: 과세소득 (원)
        tax_config: 세금 설정

    Returns:
        float: 법인세액 (원)
    """
    if taxable_income <= 0:
        return 0.0

    # 단순화된 계산: 설정된 세율 사용
    # 실제로는 누진세율을 적용해야 하지만, 대규모 프로젝트는 보통 최고세율 적용
    total_tax_rate = tax_config.corporate_tax_rate + tax_config.local_tax_rate
    corporate_tax = taxable_income * (total_tax_rate / 100)

    return corporate_tax


def calculate_equity_cashflows(
    config: FinancialConfig,
    yearly_cashflows: List[YearlyCashflow],
) -> List[float]:
    """
    자기자본 관점의 현금흐름 계산

    Equity Cashflow = 세후 순현금흐름 - 원금상환

    Args:
        config: 재무 설정
        yearly_cashflows: 연간 현금흐름

    Returns:
        List[float]: 자기자본 현금흐름
    """
    # 초기 자기자본 투자
    equity_amount = config.capex * (1 - config.debt_ratio / 100)

    equity_cashflows = [-equity_amount]  # Year 0

    for cf in yearly_cashflows:
        # 세후 영업현금흐름에서 부채상환(원금+이자)을 제외
        # 세후 현금흐름이 이미 이자비용을 반영했으므로 원금상환만 차감
        equity_cf = cf.net_cashflow_after_tax
        equity_cashflows.append(equity_cf)

    return equity_cashflows


def calculate_llcr_plcr(
    config: FinancialConfig,
    yearly_cashflows: List[YearlyCashflow],
) -> Tuple[float, float]:
    """
    LLCR과 PLCR 계산

    LLCR (Loan Life Coverage Ratio):
        = 대출기간 내 CFADS의 현재가치 / 대출잔액
        - CFADS = Cash Flow Available for Debt Service

    PLCR (Project Life Coverage Ratio):
        = 프로젝트 전기간 CFADS의 현재가치 / 대출잔액

    금융기관 일반 요구사항:
        - LLCR >= 1.1 (최소)
        - PLCR >= 1.2 (최소)

    Args:
        config: 재무 설정
        yearly_cashflows: 연간 현금흐름

    Returns:
        Tuple[float, float]: (LLCR, PLCR)
    """
    debt_amount = config.capex * (config.debt_ratio / 100)

    if debt_amount <= 0:
        return float("inf"), float("inf")

    r = config.discount_rate / 100

    # CFADS 계산 (Cash Flow Available for Debt Service)
    # = EBITDA - 세금 - 운전자본 변동 (운전자본은 생략)
    cfads_loan_life_pv = 0.0
    cfads_project_life_pv = 0.0

    for i, cf in enumerate(yearly_cashflows):
        year = i + 1
        # CFADS = EBITDA - Tax
        cfads = cf.ebitda - cf.tax

        # 현재가치로 할인
        pv_factor = 1 / ((1 + r) ** year)
        cfads_pv = cfads * pv_factor

        # 프로젝트 전기간
        cfads_project_life_pv += cfads_pv

        # 대출 기간 내
        if year <= config.loan_tenor:
            cfads_loan_life_pv += cfads_pv

    # LLCR & PLCR 계산
    llcr = cfads_loan_life_pv / debt_amount if debt_amount > 0 else float("inf")
    plcr = cfads_project_life_pv / debt_amount if debt_amount > 0 else float("inf")

    return llcr, plcr


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
    재무 분석 실행 (Bankability 평가 포함)

    프로젝트 파이낸스 표준에 따른 재무 분석:
    - 세전/세후 NPV
    - Project IRR / Equity IRR
    - DSCR, LLCR, PLCR
    - 감가상각 반영

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

    # 세금 설정 (기본값 사용)
    tax_config = config.tax_config if config.tax_config else TaxConfig()

    # 부채 계산
    debt_amount = config.capex * (config.debt_ratio / 100)
    equity_amount = config.capex - debt_amount

    # 상세 부채 상환 계산 (거치기간 포함)
    debt_service_total, interest_payments, principal_payments = calculate_debt_service_detailed(
        debt_amount,
        config.interest_rate,
        config.loan_tenor,
        config.grace_period,
        config.project_lifetime,
    )

    # 감가상각 계산
    depreciation_schedule = calculate_depreciation(
        config.capex,
        tax_config,
        config.project_lifetime,
    )

    # OPEX
    annual_opex = config.capex * (config.opex_ratio / 100)

    # 스택 교체 연도 결정 (운전 시간 기반)
    if stack_replacement_years is None:
        if actual_operating_hours_per_year is not None:
            annual_hours = actual_operating_hours_per_year
        else:
            annual_hours = 8760 * 0.85

        if annual_hours > 0 and config.stack_lifetime_hours > 0:
            years_per_stack = config.stack_lifetime_hours / annual_hours
            stack_replacement_years = []
            cumulative_years = years_per_stack
            while cumulative_years < config.project_lifetime:
                stack_replacement_years.append(int(cumulative_years))
                cumulative_years += years_per_stack
        else:
            stack_replacement_years = []

    # 현금흐름 계산 (세전/세후)
    cashflows_before_tax = [-equity_amount]
    cashflows_after_tax = [-equity_amount]
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

        # 감가상각비
        depreciation = depreciation_schedule[idx] if idx < len(depreciation_schedule) else 0

        # 부채 관련
        ds = debt_service_total[idx] if idx < len(debt_service_total) else 0
        interest = interest_payments[idx] if idx < len(interest_payments) else 0
        principal = principal_payments[idx] if idx < len(principal_payments) else 0

        # EBITDA 계산
        total_opex = annual_opex + elec_cost + stack_cost
        ebitda = revenue - total_opex

        # EBIT 계산 (영업이익)
        ebit = ebitda - depreciation

        # 세전 이익 (EBT)
        ebt = ebit - interest

        # 법인세 계산
        tax = calculate_corporate_tax(ebt, tax_config) if ebt > 0 else 0

        # 순이익
        net_income = ebt - tax

        # 세전 순현금흐름 (기존 방식 유지 - 호환성)
        net_cf_before_tax = ebitda - ds

        # 세후 순현금흐름
        # = 순이익 + 감가상각비 - 원금상환
        # (감가상각비는 비현금 비용이므로 다시 더함)
        net_cf_after_tax = net_income + depreciation - principal

        cashflows_before_tax.append(net_cf_before_tax)
        cashflows_after_tax.append(net_cf_after_tax)
        cumulative += net_cf_before_tax

        # DSCR 계산 (EBITDA / Debt Service)
        dscr = ebitda / ds if ds > 0 else float("inf")
        if ds > 0:
            dscr_values.append(dscr)

        yearly_cashflows.append(
            YearlyCashflow(
                year=year,
                revenue=revenue,
                opex=total_opex,
                stack_replacement=stack_cost,
                debt_service=ds,
                net_cashflow=net_cf_before_tax,
                cumulative_cashflow=cumulative,
                dscr=dscr,
                # Bankability 추가 필드
                depreciation=depreciation,
                ebitda=ebitda,
                ebit=ebit,
                interest_expense=interest,
                principal_repayment=principal,
                tax=tax,
                net_cashflow_after_tax=net_cf_after_tax,
            )
        )

    # NPV 계산 (세전)
    npv_before_tax = 0
    r = config.discount_rate / 100
    for t, cf in enumerate(cashflows_before_tax):
        npv_before_tax += cf / ((1 + r) ** t)

    # NPV 계산 (세후)
    npv_after_tax = 0
    for t, cf in enumerate(cashflows_after_tax):
        npv_after_tax += cf / ((1 + r) ** t)

    # Project IRR 계산 (세전)
    project_irr = _calculate_irr(cashflows_before_tax)

    # Equity IRR 계산 (세후 자기자본 현금흐름 기준)
    equity_cashflows = calculate_equity_cashflows(config, yearly_cashflows)
    equity_irr = _calculate_irr(equity_cashflows)

    # LLCR / PLCR 계산
    llcr, plcr = calculate_llcr_plcr(config, yearly_cashflows)

    # 투자회수기간 계산
    payback = _calculate_payback(yearly_cashflows)

    # LCOH 계산
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
        npv=npv_before_tax,
        irr=project_irr if project_irr else 0,
        payback_period=payback,
        lcoh=lcoh,
        dscr_min=dscr_min,
        dscr_avg=dscr_avg,
        yearly_cashflows=yearly_cashflows,
        # Bankability 추가 지표
        npv_after_tax=npv_after_tax,
        equity_irr=equity_irr if equity_irr else 0,
        llcr=llcr,
        plcr=plcr,
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
