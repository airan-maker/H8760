"""
시뮬레이션 입력 스키마

기본값은 2024-2025년 한국 시장 기준 리서치 결과를 반영합니다.

주요 참고 수치:
- 수소 LHV: 33.33 kWh/kg
- 현재 전해조 효율: 약 67% (실제 소비량 ~50 kWh/kg)
- PEM 스택 수명: 45,000~80,000시간
- Alkaline 스택 수명: 60,000~90,000시간
- PEM 저하율: ~0.5%/년, Alkaline 저하율: ~0.3%/년
- 스택 교체 비용: PEM ~11% of CAPEX, Alkaline ~15% of CAPEX
"""
from typing import Literal, Optional
from pydantic import BaseModel, Field


class EquipmentConfig(BaseModel):
    """설비 사양 설정"""

    electrolyzer_capacity: float = Field(
        default=10.0, ge=0.1, le=1000, description="전해조 용량 (MW)"
    )
    electrolyzer_efficiency: float = Field(
        default=67.0, ge=50, le=85, description="전해조 효율 (%) - 현재 기술 기준 약 67%"
    )
    specific_consumption: float = Field(
        default=50.0, ge=40, le=70, description="수소 생산 단가 (kWh/kg H2) - LHV/효율로 자동 계산"
    )
    degradation_rate: float = Field(
        default=0.5, ge=0, le=3, description="연간 효율 저하율 (%/year) - PEM:0.5%, Alkaline:0.3%"
    )
    stack_lifetime: int = Field(
        default=80000, ge=40000, le=120000, description="스택 수명 (hours) - PEM:80000, Alkaline:90000"
    )
    annual_availability: float = Field(
        default=85.0, ge=50, le=99, description="연간 가동률 (%)"
    )


class RenewableConfig(BaseModel):
    """재생에너지 연계 설정"""

    enabled: bool = Field(
        default=False, description="재생에너지 연계 사용 여부"
    )
    source_type: Literal["solar", "wind", "hybrid"] = Field(
        default="solar", description="재생에너지 유형"
    )
    capacity_mw: float = Field(
        default=15.0, ge=0, le=1000, description="재생에너지 설비 용량 (MW)"
    )
    capacity_factor: float = Field(
        default=15.0, ge=5, le=60, description="설비이용률 (%) - 태양광:15%, 풍력:25%"
    )
    profile_type: Literal["typical", "custom"] = Field(
        default="typical", description="출력 프로파일 유형"
    )
    # custom_profile은 8760개 값이 필요하나 API 간소화를 위해 typical 프로파일 사용


class CostConfig(BaseModel):
    """비용 구조 설정"""

    capex: float = Field(
        default=50_000_000_000, ge=0, description="CAPEX (원) - 10MW 기준 약 150만원/kW"
    )
    opex_ratio: float = Field(
        default=2.5, ge=0, le=10, description="OPEX 비율 (% of CAPEX) - 업계 표준 2~5%"
    )
    stack_replacement_cost: float = Field(
        default=5_500_000_000, ge=0, description="스택 교체 비용 (원) - PEM:CAPEX의 11%, Alkaline:15%"
    )
    electricity_source: Literal["PPA", "GRID", "HYBRID", "RENEWABLE"] = Field(
        default="PPA", description="전력 구매 방식 - RENEWABLE: 재생에너지 직접 연계"
    )
    ppa_price: Optional[float] = Field(
        default=100.0, ge=0, le=500, description="PPA 가격 (원/kWh) - 한국 산업용 평균 약 100원"
    )


class MarketConfig(BaseModel):
    """시장 조건 설정"""

    h2_price: float = Field(
        default=6000, ge=1000, le=20000, description="수소 판매가 (원/kg)"
    )
    h2_price_escalation: float = Field(
        default=0.0, ge=-5, le=10, description="수소 가격 상승률 (%/year)"
    )
    electricity_price_scenario: str = Field(
        default="base", description="전력 가격 시나리오"
    )


class FinancialConfig(BaseModel):
    """재무 조건 설정"""

    discount_rate: float = Field(
        default=8.0, ge=0, le=30, description="할인율 (%)"
    )
    project_lifetime: int = Field(
        default=20, ge=5, le=40, description="프로젝트 기간 (년)"
    )
    debt_ratio: float = Field(
        default=70.0, ge=0, le=100, description="부채 비율 (%)"
    )
    interest_rate: float = Field(
        default=5.0, ge=0, le=20, description="대출 이자율 (%)"
    )
    loan_tenor: int = Field(
        default=15, ge=1, le=30, description="대출 기간 (년)"
    )


class RiskWeightsConfig(BaseModel):
    """리스크 가중치 설정"""

    weather_variability: bool = Field(
        default=True, description="기상 변동성 반영 여부"
    )
    price_volatility: bool = Field(
        default=True, description="전력 가격 변동성 반영 여부"
    )
    confidence_level: Literal["P50", "P90", "P99"] = Field(
        default="P50", description="신뢰 수준"
    )


class MonteCarloConfig(BaseModel):
    """몬테카를로 시뮬레이션 설정"""

    iterations: int = Field(
        default=10000, ge=100, le=100000, description="시뮬레이션 반복 횟수"
    )
    weather_sigma: float = Field(
        default=0.1, ge=0, le=0.5, description="기상 변동성 표준편차"
    )
    price_sigma: float = Field(
        default=0.15, ge=0, le=0.5, description="가격 변동성 표준편차"
    )


class SimulationInput(BaseModel):
    """전체 시뮬레이션 입력"""

    equipment: EquipmentConfig = Field(default_factory=EquipmentConfig)
    cost: CostConfig = Field(default_factory=CostConfig)
    market: MarketConfig = Field(default_factory=MarketConfig)
    financial: FinancialConfig = Field(default_factory=FinancialConfig)
    risk_weights: RiskWeightsConfig = Field(default_factory=RiskWeightsConfig)
    monte_carlo: MonteCarloConfig = Field(default_factory=MonteCarloConfig)
    renewable: RenewableConfig = Field(default_factory=RenewableConfig)


class SimulationConfig(BaseModel):
    """시뮬레이션 실행 요청"""

    project_id: Optional[str] = Field(None, description="프로젝트 ID")
    input: SimulationInput = Field(default_factory=SimulationInput)
    save_result: bool = Field(default=True, description="결과 저장 여부")
