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
class IncentivesConfig:
    """인센티브 설정 (Bankability 3순위)"""

    # 세액공제
    itc_enabled: bool = False  # 투자세액공제(ITC) 활성화
    itc_rate: float = 10.0  # 투자세액공제율 (% of CAPEX)
    ptc_enabled: bool = False  # 생산세액공제(PTC) 활성화
    ptc_amount: float = 700.0  # 생산세액공제액 (원/kg H2)
    ptc_duration: int = 10  # 생산세액공제 적용기간 (년)

    # 보조금
    capex_subsidy: float = 0.0  # 설비투자 보조금 (원)
    capex_subsidy_rate: float = 0.0  # 설비투자 보조금율 (% of CAPEX)
    operating_subsidy: float = 0.0  # 운영 보조금 (원/kg H2)
    operating_subsidy_duration: int = 5  # 운영 보조금 적용기간 (년)

    # 기타 인센티브
    carbon_credit_enabled: bool = False  # 탄소배출권 수익 활성화
    carbon_credit_price: float = 1000.0  # 탄소배출권 가격 (원/kg H2)
    clean_h2_certification_enabled: bool = False  # 청정수소 인증 활성화
    clean_h2_premium: float = 500.0  # 청정수소 인증 프리미엄 (원/kg H2)


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
    # Bankability 추가 필드 (1순위)
    construction_period: int = 1  # 건설 기간 (년)
    grace_period: int = 1  # 대출 거치 기간 (년)
    tax_config: Optional[TaxConfig] = None  # 세금 설정
    # 2순위: CAPEX 분할, 상환방식, 운전자본
    capex_schedule: Optional[List[float]] = None  # CAPEX 분할 비율 (기본: [0.3, 0.4, 0.3])
    repayment_method: str = "equal_payment"  # 상환방식: equal_payment(원리금균등), equal_principal(원금균등)
    working_capital_months: int = 2  # 운전자본 개월수
    include_idc: bool = True  # 건설기간 이자(IDC) 포함 여부
    # 3순위: 인센티브
    incentives_config: Optional[IncentivesConfig] = None  # 인센티브 설정


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
    # Bankability 추가 지표 (1순위)
    npv_after_tax: float = 0.0  # 세후 NPV
    equity_irr: float = 0.0  # 자기자본 IRR
    llcr: float = 0.0  # Loan Life Coverage Ratio
    plcr: float = 0.0  # Project Life Coverage Ratio
    # 2순위: 추가 정보
    total_capex_with_idc: float = 0.0  # IDC 포함 총 투자비
    idc_amount: float = 0.0  # 건설기간 이자 (IDC)
    working_capital: float = 0.0  # 초기 운전자본
    salvage_value: float = 0.0  # 프로젝트 종료시 잔존가치


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


def calculate_capex_schedule_with_idc(
    capex: float,
    construction_period: int,
    capex_schedule: Optional[List[float]],
    debt_ratio: float,
    interest_rate: float,
    include_idc: bool = True,
) -> Tuple[List[float], float, float]:
    """
    CAPEX 분할 투입 및 건설기간 이자(IDC) 계산

    IDC (Interest During Construction):
    건설기간 동안 발생하는 이자를 자본화하여 총 투자비에 포함

    Args:
        capex: 기본 CAPEX (원)
        construction_period: 건설 기간 (년)
        capex_schedule: CAPEX 분할 비율 (예: [0.3, 0.4, 0.3])
        debt_ratio: 부채 비율 (%)
        interest_rate: 대출 이자율 (%)
        include_idc: IDC 포함 여부

    Returns:
        Tuple[List[float], float, float]:
            - 연도별 CAPEX 투입액
            - IDC 금액
            - IDC 포함 총 CAPEX
    """
    if construction_period <= 0:
        return [capex], 0.0, capex

    # 기본 분할 비율 설정
    if capex_schedule is None or len(capex_schedule) == 0:
        # 건설기간에 맞게 균등 분할
        capex_schedule = [1.0 / construction_period] * construction_period

    # 분할 비율 정규화 (합계 1.0)
    schedule_sum = sum(capex_schedule)
    if schedule_sum != 1.0:
        capex_schedule = [s / schedule_sum for s in capex_schedule]

    # 건설기간에 맞게 스케줄 조정
    if len(capex_schedule) < construction_period:
        # 부족한 기간은 0으로 채움
        capex_schedule = capex_schedule + [0.0] * (construction_period - len(capex_schedule))
    elif len(capex_schedule) > construction_period:
        # 초과 기간은 마지막에 합침
        excess = sum(capex_schedule[construction_period:])
        capex_schedule = capex_schedule[:construction_period]
        capex_schedule[-1] += excess

    # 연도별 CAPEX 투입액
    yearly_capex = [capex * ratio for ratio in capex_schedule]

    # IDC 계산
    idc = 0.0
    if include_idc and interest_rate > 0:
        r = interest_rate / 100
        debt_portion = debt_ratio / 100

        # 각 투입분에 대해 건설 완료까지 발생하는 이자 계산
        for year_idx, year_capex in enumerate(yearly_capex):
            # 해당 연도 투입분의 부채 금액
            debt_amount = year_capex * debt_portion

            # 건설 완료까지 남은 기간 (연도 중간 투입 가정: 0.5년 차감)
            remaining_years = construction_period - year_idx - 0.5

            if remaining_years > 0:
                # 복리 이자 계산
                idc += debt_amount * ((1 + r) ** remaining_years - 1)

    total_capex_with_idc = capex + idc

    return yearly_capex, idc, total_capex_with_idc


def calculate_debt_service_equal_principal(
    principal: float,
    interest_rate: float,
    tenor: int,
    grace_period: int = 0,
    project_lifetime: int = 20,
) -> Tuple[List[float], List[float], List[float]]:
    """
    원금균등상환 계산

    원금균등상환: 매년 동일한 원금을 상환하고, 이자는 잔액에 비례하여 감소

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

    # 원금균등상환: 매년 상환할 원금
    if repayment_tenor > 0:
        annual_principal = principal / repayment_tenor
    else:
        annual_principal = 0

    for year in range(1, project_lifetime + 1):
        if year <= grace_period:
            # 거치기간: 이자만 납부
            interest = remaining_principal * r
            principal_payment = 0
            ds = interest
        elif year <= tenor:
            # 상환기간: 원금균등 + 잔액 기준 이자
            interest = remaining_principal * r
            principal_payment = annual_principal
            remaining_principal -= principal_payment
            ds = interest + principal_payment
        else:
            # 상환 완료
            interest = 0
            principal_payment = 0
            ds = 0

        total_ds.append(ds)
        interest_payments.append(interest)
        principal_payments.append(principal_payment)

    return total_ds, interest_payments, principal_payments


def calculate_working_capital(
    annual_opex: float,
    working_capital_months: int,
) -> float:
    """
    초기 운전자본 계산

    운전자본: 프로젝트 시작 시 필요한 운영자금 (보통 2~3개월 OPEX)

    Args:
        annual_opex: 연간 OPEX
        working_capital_months: 운전자본 개월수

    Returns:
        float: 초기 운전자본 금액
    """
    if working_capital_months <= 0:
        return 0.0

    monthly_opex = annual_opex / 12
    return monthly_opex * working_capital_months


def calculate_salvage_value(
    capex: float,
    salvage_value_rate: float,
    project_lifetime: int,
    discount_rate: float,
) -> Tuple[float, float]:
    """
    프로젝트 종료시 잔존가치 계산

    Args:
        capex: 총 CAPEX
        salvage_value_rate: 잔존가치율 (%)
        project_lifetime: 프로젝트 기간
        discount_rate: 할인율 (%)

    Returns:
        Tuple[float, float]:
            - 명목 잔존가치
            - 현재가치 (할인된 잔존가치)
    """
    salvage_value = capex * (salvage_value_rate / 100)

    # 현재가치로 할인
    r = discount_rate / 100
    salvage_value_pv = salvage_value / ((1 + r) ** project_lifetime)

    return salvage_value, salvage_value_pv


def calculate_debt_service_detailed(
    principal: float,
    interest_rate: float,
    tenor: int,
    grace_period: int = 0,
    project_lifetime: int = 20,
    repayment_method: str = "equal_payment",
) -> Tuple[List[float], List[float], List[float]]:
    """
    거치기간을 포함한 상세 부채 상환 계산

    상환방식:
    - equal_payment (원리금균등): 매년 동일한 금액(원금+이자) 상환
    - equal_principal (원금균등): 매년 동일한 원금 상환, 이자는 감소

    Args:
        principal: 대출 원금
        interest_rate: 연 이자율 (%)
        tenor: 대출 기간 (년) - 거치기간 포함
        grace_period: 거치 기간 (년)
        project_lifetime: 프로젝트 기간 (년)
        repayment_method: 상환방식 (equal_payment/equal_principal)

    Returns:
        Tuple[List[float], List[float], List[float]]:
            - 연도별 총 부채상환액
            - 연도별 이자비용
            - 연도별 원금상환액
    """
    # 원금균등상환인 경우 별도 함수 사용
    if repayment_method == "equal_principal":
        return calculate_debt_service_equal_principal(
            principal, interest_rate, tenor, grace_period, project_lifetime
        )

    # 원리금균등상환 (기본)
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
    감가상각비 계산 (정액법 또는 정률법)

    전해조/설비와 건물을 분리하여 각각의 내용연수에 따라 계산

    정액법 (straight_line):
        연간 감가상각비 = (취득가액 - 잔존가치) / 내용연수

    정률법 (declining_balance):
        연간 감가상각비 = 장부가액 × 상각률
        상각률 = 1 - (잔존가치/취득가액)^(1/내용연수)
        한국 세법: 정률법 상각률 = 1 - (0.05)^(1/내용연수) (잔존가치 5% 가정)

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

    is_declining = tax_config.depreciation_method == "declining_balance"

    depreciation = []

    if is_declining:
        # 정률법: 장부가액에 일정 비율 적용 (감소하는 장부가액)
        # 한국 세법 정률법 상각률 = 1 - (잔존가치율)^(1/내용연수)
        salvage_rate = tax_config.salvage_value_rate / 100
        if salvage_rate <= 0:
            salvage_rate = 0.05  # 최소 5% 잔존가치 가정

        # 정률법 상각률 계산
        building_rate = 1 - (salvage_rate ** (1 / tax_config.building_useful_life)) if tax_config.building_useful_life > 0 else 0
        equipment_rate = 1 - (salvage_rate ** (1 / tax_config.electrolyzer_useful_life)) if tax_config.electrolyzer_useful_life > 0 else 0

        # 장부가액 추적
        building_book_value = building_capex
        equipment_book_value = equipment_capex

        for year in range(1, project_lifetime + 1):
            year_depreciation = 0.0

            # 건물 감가상각 (정률법)
            if year <= tax_config.building_useful_life and building_book_value > building_salvage:
                building_dep = building_book_value * building_rate
                # 잔존가치 이하로 감가상각하지 않음
                building_dep = min(building_dep, building_book_value - building_salvage)
                year_depreciation += building_dep
                building_book_value -= building_dep

            # 전해조/설비 감가상각 (정률법)
            if year <= tax_config.electrolyzer_useful_life and equipment_book_value > equipment_salvage:
                equipment_dep = equipment_book_value * equipment_rate
                # 잔존가치 이하로 감가상각하지 않음
                equipment_dep = min(equipment_dep, equipment_book_value - equipment_salvage)
                year_depreciation += equipment_dep
                equipment_book_value -= equipment_dep

            depreciation.append(year_depreciation)
    else:
        # 정액법: 매년 동일한 금액 감가상각
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
    use_progressive: bool = True,
) -> float:
    """
    법인세 계산 (한국 누진세율 적용)

    한국 법인세 구간 (2024년 기준):
    - 2억원 이하: 10%
    - 2억원 초과 ~ 200억원: 20%
    - 200억원 초과 ~ 3000억원: 22%
    - 3000억원 초과: 25%

    지방소득세: 법인세의 10% (별도 부과)

    Args:
        taxable_income: 과세소득 (원)
        tax_config: 세금 설정
        use_progressive: 누진세율 사용 여부 (False면 설정된 단일 세율 사용)

    Returns:
        float: 법인세액 + 지방소득세 (원)
    """
    if taxable_income <= 0:
        return 0.0

    if not use_progressive:
        # 단순화된 계산: 설정된 단일 세율 사용
        total_tax_rate = tax_config.corporate_tax_rate + tax_config.local_tax_rate
        return taxable_income * (total_tax_rate / 100)

    # 한국 법인세 누진세율 구간 (2024년 기준)
    # 구간: (상한, 세율%)
    BRACKETS = [
        (200_000_000, 10),          # 2억원 이하: 10%
        (20_000_000_000, 20),       # 2억원 초과 ~ 200억원: 20%
        (300_000_000_000, 22),      # 200억원 초과 ~ 3000억원: 22%
        (float('inf'), 25),         # 3000억원 초과: 25%
    ]

    corporate_tax = 0.0
    remaining_income = taxable_income
    prev_limit = 0

    for limit, rate in BRACKETS:
        if remaining_income <= 0:
            break

        # 현재 구간에서 과세할 금액
        bracket_amount = min(remaining_income, limit - prev_limit)
        corporate_tax += bracket_amount * (rate / 100)

        remaining_income -= bracket_amount
        prev_limit = limit

    # 지방소득세 (법인세의 10%)
    local_tax = corporate_tax * 0.10

    return corporate_tax + local_tax


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

    # 인센티브 설정 (3순위)
    incentives = config.incentives_config if config.incentives_config else IncentivesConfig()

    # CAPEX 보조금 계산 (3순위)
    capex_subsidy_total = incentives.capex_subsidy + config.capex * (incentives.capex_subsidy_rate / 100)
    net_capex = config.capex - capex_subsidy_total  # 보조금 차감 후 CAPEX

    # CAPEX 분할 및 IDC 계산 (2순위) - 보조금 차감 후 CAPEX 기준
    yearly_capex, idc_amount, total_capex_with_idc = calculate_capex_schedule_with_idc(
        capex=net_capex,  # 보조금 차감 후 CAPEX 사용
        construction_period=config.construction_period,
        capex_schedule=config.capex_schedule,
        debt_ratio=config.debt_ratio,
        interest_rate=config.interest_rate,
        include_idc=config.include_idc,
    )

    # 실제 투자비 (IDC 포함, 보조금 차감 후)
    effective_capex = total_capex_with_idc

    # 투자세액공제 (ITC) 계산 - 원래 CAPEX 기준
    itc_amount = config.capex * (incentives.itc_rate / 100) if incentives.itc_enabled else 0

    # 부채 계산 (IDC 포함 CAPEX 기준)
    debt_amount = effective_capex * (config.debt_ratio / 100)
    equity_amount = effective_capex - debt_amount

    # OPEX 계산 (운전자본 계산에 필요)
    annual_opex = config.capex * (config.opex_ratio / 100)  # 원래 CAPEX 기준

    # 운전자본 계산 (2순위)
    working_capital = calculate_working_capital(annual_opex, config.working_capital_months)

    # 잔존가치 계산 (2순위)
    salvage_value, salvage_value_pv = calculate_salvage_value(
        config.capex,
        tax_config.salvage_value_rate,
        config.project_lifetime,
        config.discount_rate,
    )

    # 상세 부채 상환 계산 (거치기간 및 상환방식 포함)
    debt_service_total, interest_payments, principal_payments = calculate_debt_service_detailed(
        debt_amount,
        config.interest_rate,
        config.loan_tenor,
        config.grace_period,
        config.project_lifetime,
        config.repayment_method,
    )

    # 감가상각 계산 (원래 CAPEX 기준, IDC 제외)
    depreciation_schedule = calculate_depreciation(
        config.capex,
        tax_config,
        config.project_lifetime,
    )

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
    # Project IRR용: 초기 투자 = 총 CAPEX + 운전자본 (프로젝트 전체 관점)
    # Equity IRR용: 초기 투자 = 자기자본 + 운전자본 (투자자 관점)
    initial_project_investment = effective_capex + working_capital  # Project IRR용
    initial_equity_investment = equity_amount + working_capital  # Equity IRR용

    # Project cashflows: 총 투자비 기준, 부채상환 제외 (프로젝트 자체 수익성)
    cashflows_project = [-initial_project_investment]
    # Equity cashflows: 자기자본 기준, 부채상환 포함 (투자자 수익)
    cashflows_before_tax = [-initial_equity_investment]
    cashflows_after_tax = [-initial_equity_investment]
    yearly_cashflows = []
    cumulative = -initial_equity_investment
    dscr_values = []

    for year in range(1, config.project_lifetime + 1):
        idx = year - 1

        revenue = yearly_revenues[idx] if idx < len(yearly_revenues) else 0
        elec_cost = (
            yearly_electricity_costs[idx]
            if idx < len(yearly_electricity_costs)
            else 0
        )
        h2_production = yearly_h2_production[idx] if idx < len(yearly_h2_production) else 0

        # === 3순위: 생산 기반 인센티브 계산 ===
        # 운영 보조금 (적용기간 내)
        operating_subsidy = 0.0
        if incentives.operating_subsidy > 0 and year <= incentives.operating_subsidy_duration:
            operating_subsidy = h2_production * incentives.operating_subsidy

        # 탄소배출권 수익
        carbon_credit_revenue = 0.0
        if incentives.carbon_credit_enabled:
            carbon_credit_revenue = h2_production * incentives.carbon_credit_price

        # 청정수소 프리미엄
        clean_h2_premium_revenue = 0.0
        if incentives.clean_h2_certification_enabled:
            clean_h2_premium_revenue = h2_production * incentives.clean_h2_premium

        # 인센티브로 인한 추가 수익
        incentive_revenue = operating_subsidy + carbon_credit_revenue + clean_h2_premium_revenue
        total_revenue = revenue + incentive_revenue

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

        # EBITDA 계산 (인센티브 수익 포함)
        total_opex = annual_opex + elec_cost + stack_cost
        ebitda = total_revenue - total_opex

        # EBIT 계산 (영업이익)
        ebit = ebitda - depreciation

        # 세전 이익 (EBT)
        ebt = ebit - interest

        # === 3순위: 세액공제 계산 ===
        # 생산세액공제 (PTC) - 적용기간 내
        ptc_credit = 0.0
        if incentives.ptc_enabled and year <= incentives.ptc_duration:
            ptc_credit = h2_production * incentives.ptc_amount

        # 투자세액공제 (ITC) - 1년차에만 적용
        itc_credit = itc_amount if year == 1 else 0

        # 법인세 계산 (세액공제 적용)
        gross_tax = calculate_corporate_tax(ebt, tax_config) if ebt > 0 else 0
        tax = max(0, gross_tax - ptc_credit - itc_credit)  # 세액공제 적용 후 세금 (음수 방지)

        # 순이익
        net_income = ebt - tax

        # Project 순현금흐름 (부채상환 제외 - 프로젝트 자체 수익성 평가용)
        # Project IRR 계산에 사용: 프로젝트 자체의 수익성을 금융구조와 무관하게 평가
        net_cf_project = ebitda

        # Equity 세전 순현금흐름 (부채상환 포함 - 기존 방식 유지)
        net_cf_before_tax = ebitda - ds

        # 세후 순현금흐름
        # = 순이익 + 감가상각비 - 원금상환
        # (감가상각비는 비현금 비용이므로 다시 더함)
        net_cf_after_tax = net_income + depreciation - principal

        # 마지막 연도: 잔존가치 및 운전자본 회수 반영
        terminal_value = 0.0
        if year == config.project_lifetime:
            terminal_value = salvage_value + working_capital
            net_cf_project += terminal_value
            net_cf_before_tax += terminal_value
            net_cf_after_tax += terminal_value

        cashflows_project.append(net_cf_project)
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
                revenue=total_revenue,  # 인센티브 수익 포함
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

    # NPV 계산 (세전) - Project 관점 (총 투자비 기준, 부채상환 제외)
    npv_before_tax = 0
    r = config.discount_rate / 100
    for t, cf in enumerate(cashflows_project):
        npv_before_tax += cf / ((1 + r) ** t)

    # NPV 계산 (세후) - Equity 관점
    npv_after_tax = 0
    for t, cf in enumerate(cashflows_after_tax):
        npv_after_tax += cf / ((1 + r) ** t)

    # Project IRR 계산 (세전) - 총 투자비 기준, 부채상환 제외
    # 프로젝트 자체의 수익성을 금융구조와 무관하게 평가
    project_irr = _calculate_irr(cashflows_project)

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
        # Bankability 추가 지표 (1순위)
        npv_after_tax=npv_after_tax,
        equity_irr=equity_irr if equity_irr else 0,
        llcr=llcr,
        plcr=plcr,
        # 2순위 추가 정보
        total_capex_with_idc=total_capex_with_idc,
        idc_amount=idc_amount,
        working_capital=working_capital,
        salvage_value=salvage_value,
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
