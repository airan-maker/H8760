"""시뮬레이션 결과 스키마"""
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.core.case_converter import snake_to_camel


# CamelCase 별칭 자동 생성을 위한 기본 설정
class CamelCaseModel(BaseModel):
    """camelCase 별칭을 자동 생성하는 기본 모델"""

    model_config = ConfigDict(
        alias_generator=snake_to_camel,
        populate_by_name=True,  # snake_case와 camelCase 모두 허용
    )


class PercentileValue(CamelCaseModel):
    """백분위수 값"""

    p50: float
    p90: float
    p99: float


class DSCRMetrics(CamelCaseModel):
    """DSCR 지표"""

    min: float
    avg: float


class KPIs(CamelCaseModel):
    """핵심 성과 지표"""

    npv: PercentileValue = Field(description="순현재가치 (원)")
    irr: PercentileValue = Field(description="내부수익률 (%)")
    dscr: DSCRMetrics = Field(description="부채상환비율")
    payback_period: float = Field(description="투자회수기간 (년)")
    var_95: float = Field(description="95% VaR (원)")
    annual_h2_production: PercentileValue = Field(description="연간 수소 생산량 (톤)")
    lcoh: float = Field(description="수소 균등화 비용 (원/kg)")


class HistogramBin(CamelCaseModel):
    """히스토그램 빈"""

    bin: float
    count: int


class HourlyData(CamelCaseModel):
    """시간별 데이터"""

    production: List[float] = Field(description="시간별 수소 생산량 (kg)")
    revenue: List[float] = Field(description="시간별 수익 (원)")
    electricity_cost: List[float] = Field(description="시간별 전력 비용 (원)")
    operating_hours: List[int] = Field(description="가동 여부 (0/1)")


class Distributions(CamelCaseModel):
    """확률 분포"""

    npv_histogram: List[HistogramBin] = Field(description="NPV 히스토그램")
    revenue_histogram: List[HistogramBin] = Field(description="수익 히스토그램")


class SensitivityItem(CamelCaseModel):
    """민감도 분석 항목"""

    variable: str = Field(description="변수명")
    base_case: float = Field(description="기준 케이스")
    low_case: float = Field(description="하위 케이스")
    high_case: float = Field(description="상위 케이스")
    low_change_pct: float = Field(description="하위 변동 비율 (%)")
    high_change_pct: float = Field(description="상위 변동 비율 (%)")


class RiskWaterfallItem(CamelCaseModel):
    """리스크 폭포수 항목"""

    factor: str = Field(description="리스크 요인")
    impact: float = Field(description="NPV 영향 (원)")


class YearlyCashflow(CamelCaseModel):
    """연간 현금흐름"""

    year: int
    revenue: float
    opex: float
    debt_service: float
    net_cashflow: float
    cumulative_cashflow: float


class SimulationResult(CamelCaseModel):
    """전체 시뮬레이션 결과"""

    simulation_id: str = Field(description="시뮬레이션 ID")
    status: str = Field(description="시뮬레이션 상태")
    kpis: KPIs = Field(description="핵심 성과 지표")
    hourly_data: Optional[HourlyData] = Field(None, description="시간별 데이터")
    distributions: Distributions = Field(description="확률 분포")
    sensitivity: List[SensitivityItem] = Field(description="민감도 분석")
    risk_waterfall: List[RiskWaterfallItem] = Field(description="리스크 폭포수")
    yearly_cashflow: List[YearlyCashflow] = Field(description="연간 현금흐름")


class SimulationStatus(CamelCaseModel):
    """시뮬레이션 상태"""

    simulation_id: str
    status: str  # "pending", "running", "completed", "failed"
    progress: float  # 0-100
    message: Optional[str] = None


class ScenarioComparison(CamelCaseModel):
    """시나리오 비교 결과"""

    scenarios: List[str]
    kpis_comparison: dict
    distributions_comparison: dict
