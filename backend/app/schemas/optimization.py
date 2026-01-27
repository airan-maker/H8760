"""
최적화 관련 스키마 정의
Grid Search, AI 최적화, 민감도 탐색용 요청/응답 스키마
"""
from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field

from app.schemas.simulation import SimulationInput


# =============================================================================
# 공통 스키마
# =============================================================================

class VariableRange(BaseModel):
    """변수 범위 설정"""
    name: str = Field(..., description="변수 이름 (예: electrolyzer_capacity)")
    display_name: str = Field(..., description="표시 이름 (예: 전해조 용량)")
    min_value: float = Field(..., description="최소값")
    max_value: float = Field(..., description="최대값")
    step: float = Field(..., description="스텝 크기")
    unit: str = Field(default="", description="단위 (예: MW, %)")


class OptimizableVariable(BaseModel):
    """최적화 가능한 변수 정의"""
    name: str = Field(..., description="변수 키")
    display_name: str = Field(..., description="표시 이름")
    category: str = Field(..., description="카테고리 (equipment, cost, market, financial)")
    min_value: float = Field(..., description="허용 최소값")
    max_value: float = Field(..., description="허용 최대값")
    default_value: float = Field(..., description="기본값")
    unit: str = Field(default="", description="단위")
    step: float = Field(default=1.0, description="권장 스텝 크기")


# =============================================================================
# Grid Search 스키마
# =============================================================================

class GridSearchRequest(BaseModel):
    """Grid Search 요청"""
    base_input: SimulationInput = Field(..., description="기본 시뮬레이션 입력")
    variable_ranges: List[VariableRange] = Field(
        ...,
        min_length=1,
        max_length=3,
        description="탐색할 변수 범위 (최대 3개)"
    )
    target_kpi: str = Field(
        default="npv_p50",
        description="최적화 대상 KPI (npv_p50, irr_p50, lcoh)"
    )
    monte_carlo_iterations: int = Field(
        default=1000,
        ge=100,
        le=5000,
        description="몬테카를로 반복 횟수 (속도 최적화)"
    )
    max_combinations: int = Field(
        default=1000,
        ge=10,
        le=5000,
        description="최대 조합 수 제한"
    )


class GridSearchResultItem(BaseModel):
    """Grid Search 개별 결과"""
    combination: Dict[str, float] = Field(..., description="변수 조합")
    npv_p50: float = Field(..., description="NPV P50 (원)")
    npv_p90: float = Field(..., description="NPV P90 (원)")
    irr_p50: float = Field(..., description="IRR P50 (%)")
    lcoh: float = Field(..., description="LCOH (원/kg)")
    dscr_min: float = Field(..., description="최소 DSCR")
    annual_h2_production: float = Field(..., description="연간 수소 생산량 (톤)")
    rank: int = Field(default=0, description="순위")


class GridSearchResponse(BaseModel):
    """Grid Search 응답"""
    job_id: str = Field(..., description="작업 ID")
    status: Literal["pending", "running", "completed", "failed"] = Field(
        default="pending",
        description="작업 상태"
    )
    progress: float = Field(default=0.0, ge=0, le=100, description="진행률 (%)")
    total_combinations: int = Field(default=0, description="총 조합 수")
    completed_combinations: int = Field(default=0, description="완료된 조합 수")
    results: List[GridSearchResultItem] = Field(
        default_factory=list,
        description="결과 목록 (target_kpi 기준 정렬)"
    )
    best_result: Optional[GridSearchResultItem] = Field(
        default=None,
        description="최적 결과"
    )
    heatmap_data: Optional[Dict[str, Any]] = Field(
        default=None,
        description="히트맵 시각화 데이터"
    )
    error_message: Optional[str] = Field(default=None, description="에러 메시지")


# =============================================================================
# AI 최적화 스키마
# =============================================================================

class KPITarget(BaseModel):
    """KPI 목표 설정"""
    kpi: str = Field(..., description="KPI 이름 (npv, irr, lcoh, dscr)")
    condition: Literal[">=", "<=", "=="] = Field(..., description="조건")
    value: float = Field(..., description="목표값")
    priority: int = Field(default=1, ge=1, le=5, description="우선순위 (1=최고)")


class VariableConstraint(BaseModel):
    """변수 제약 조건"""
    name: str = Field(..., description="변수 이름")
    min_value: Optional[float] = Field(default=None, description="최소값")
    max_value: Optional[float] = Field(default=None, description="최대값")
    fixed_value: Optional[float] = Field(default=None, description="고정값")


class AIOptimizeRequest(BaseModel):
    """AI 최적화 요청"""
    base_input: SimulationInput = Field(..., description="기본 시뮬레이션 입력")
    targets: List[KPITarget] = Field(
        ...,
        min_length=1,
        max_length=4,
        description="KPI 목표 (최대 4개)"
    )
    constraints: List[VariableConstraint] = Field(
        default_factory=list,
        description="변수 제약 조건"
    )
    use_sensitivity: bool = Field(
        default=True,
        description="민감도 분석 결과 참조 여부"
    )
    max_iterations: int = Field(
        default=5,
        ge=1,
        le=10,
        description="최대 반복 횟수"
    )


class AIRecommendation(BaseModel):
    """AI 추천 결과"""
    rank: int = Field(..., description="추천 순위")
    recommended_input: Dict[str, Any] = Field(..., description="추천 변수값")
    expected_kpis: Dict[str, float] = Field(..., description="예상 KPI")
    reasoning: str = Field(..., description="추천 근거")
    confidence: float = Field(default=0.0, ge=0, le=1, description="신뢰도")
    trade_offs: List[str] = Field(default_factory=list, description="트레이드오프")


class AIOptimizeResponse(BaseModel):
    """AI 최적화 응답"""
    status: str = Field(default="completed", description="상태")
    recommendations: List[AIRecommendation] = Field(
        default_factory=list,
        description="추천 결과 목록"
    )
    analysis_summary: str = Field(default="", description="분석 요약")
    sensitivity_reference: Optional[Dict[str, Any]] = Field(
        default=None,
        description="참조한 민감도 분석 결과"
    )
    iterations_used: int = Field(default=0, description="사용된 반복 횟수")


# =============================================================================
# 민감도 기반 탐색 스키마
# =============================================================================

class SensitivityRank(BaseModel):
    """민감도 순위"""
    variable: str = Field(..., description="변수 이름")
    display_name: str = Field(..., description="표시 이름")
    impact_score: float = Field(..., description="영향도 점수")
    npv_swing: float = Field(..., description="NPV 변동폭 (원)")
    low_case_pct: float = Field(..., description="Low case 변화율 (%)")
    high_case_pct: float = Field(..., description="High case 변화율 (%)")


class SensitivityExploreRequest(BaseModel):
    """민감도 기반 탐색 요청"""
    base_input: SimulationInput = Field(..., description="기본 시뮬레이션 입력")
    selected_variables: Optional[List[str]] = Field(
        default=None,
        description="탐색할 변수 (None이면 상위 2개 자동 선택)"
    )
    resolution: int = Field(
        default=20,
        ge=5,
        le=50,
        description="등고선 해상도 (축당 포인트 수)"
    )
    target_kpi: str = Field(
        default="npv_p50",
        description="분석 대상 KPI"
    )


class ContourPoint(BaseModel):
    """등고선 데이터 포인트"""
    x: float = Field(..., description="X축 값")
    y: float = Field(..., description="Y축 값")
    z: float = Field(..., description="KPI 값")


class ContourData(BaseModel):
    """등고선 차트 데이터"""
    x_variable: str = Field(..., description="X축 변수명")
    y_variable: str = Field(..., description="Y축 변수명")
    x_values: List[float] = Field(..., description="X축 값 배열")
    y_values: List[float] = Field(..., description="Y축 값 배열")
    z_matrix: List[List[float]] = Field(..., description="Z값 행렬")
    optimal_point: Optional[Dict[str, float]] = Field(
        default=None,
        description="최적점 좌표"
    )
    contour_levels: List[float] = Field(
        default_factory=list,
        description="등고선 레벨"
    )


class SensitivityExploreResponse(BaseModel):
    """민감도 기반 탐색 응답"""
    status: str = Field(default="completed", description="상태")
    sensitivity_ranking: List[SensitivityRank] = Field(
        default_factory=list,
        description="민감도 순위"
    )
    selected_variables: List[str] = Field(
        default_factory=list,
        description="선택된 변수"
    )
    contour_data: Optional[ContourData] = Field(
        default=None,
        description="등고선 데이터"
    )
    optimal_region: Optional[Dict[str, Any]] = Field(
        default=None,
        description="최적 영역 정보"
    )
    recommendations: List[str] = Field(
        default_factory=list,
        description="탐색 결과 기반 추천"
    )


# =============================================================================
# 작업 상태 스키마
# =============================================================================

class JobStatus(BaseModel):
    """작업 상태 조회"""
    job_id: str = Field(..., description="작업 ID")
    status: Literal["pending", "running", "completed", "failed"] = Field(
        ..., description="상태"
    )
    progress: float = Field(default=0.0, description="진행률 (%)")
    message: Optional[str] = Field(default=None, description="상태 메시지")
    result: Optional[Dict[str, Any]] = Field(default=None, description="결과 (완료 시)")
