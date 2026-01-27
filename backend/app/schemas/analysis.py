"""
AI 분석 관련 스키마 정의 - Bankability 중심
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class SimulationContext(BaseModel):
    """시뮬레이션 컨텍스트 - Claude에 전달할 구조화된 데이터"""

    # 입력 설정 요약
    input_summary: Dict[str, Any] = Field(description="입력 설정 요약")

    # KPI 요약
    kpi_summary: Dict[str, Any] = Field(description="핵심 지표 요약")

    # 재무 구조 요약 (선택)
    financing_summary: Optional[Dict[str, Any]] = Field(
        default=None, description="재무 구조 요약"
    )

    # 민감도 분석 요약 (선택)
    sensitivity_summary: Optional[List[Dict[str, Any]]] = Field(
        default=None, description="민감도 분석 요약"
    )

    # 리스크 폭포수 요약 (선택)
    risk_waterfall_summary: Optional[List[Dict[str, Any]]] = Field(
        default=None, description="리스크 폭포수 요약"
    )

    # 현금흐름 요약 (선택)
    cashflow_summary: Optional[Dict[str, Any]] = Field(
        default=None, description="현금흐름 요약"
    )


class InterpretRequest(BaseModel):
    """결과 해석 요청"""
    context: SimulationContext = Field(description="시뮬레이션 컨텍스트")
    language: str = Field(default="ko", description="응답 언어 (ko/en)")


# Bankability 점수
class BankabilityScore(BaseModel):
    """Bankability 점수"""
    grade: str = Field(description="등급 (A/B/C/D)")
    score: int = Field(description="점수 (0-100)")
    summary: str = Field(description="등급 판단 근거")


# DSCR 분석
class DSCRAnalysis(BaseModel):
    """DSCR 분석 결과"""
    assessment: str = Field(description="DSCR 분석 결과")
    covenant_headroom: str = Field(description="Covenant 여유도 분석")
    stress_resilience: str = Field(description="스트레스 시나리오 대응력")


# 리스크 항목
class KeyRisk(BaseModel):
    """핵심 리스크 항목"""
    risk: str = Field(description="리스크명")
    severity: str = Field(description="심각도 (높음/중간/낮음)")
    impact: str = Field(description="영향")
    mitigation: str = Field(description="완화 방안")


# Bankability 개선 항목
class BankabilityImprovement(BaseModel):
    """Bankability 개선 항목"""
    action: str = Field(description="개선 조치")
    expected_impact: str = Field(description="예상 효과")
    priority: str = Field(description="우선순위 (필수/권장/선택)")
    implementation: str = Field(description="실행 방법")


# 금융 권고사항
class FinancingRecommendations(BaseModel):
    """금융 구조 권고사항"""
    optimal_leverage: str = Field(description="권장 부채비율")
    recommended_tenor: str = Field(description="권장 대출기간")
    required_reserves: str = Field(description="필요 적립금 규모")
    covenant_structure: str = Field(description="권장 Covenant 구조")


class InterpretResponse(BaseModel):
    """결과 해석 응답 - Bankability 중심"""
    executive_summary: str = Field(description="Bankability 관점의 핵심 결론")
    bankability_score: BankabilityScore = Field(description="Bankability 점수")
    dscr_analysis: DSCRAnalysis = Field(description="DSCR 분석")
    key_risks: List[KeyRisk] = Field(description="핵심 리스크")
    bankability_improvements: List[BankabilityImprovement] = Field(
        description="Bankability 개선 방안"
    )
    financing_recommendations: FinancingRecommendations = Field(
        description="금융 구조 권고사항"
    )
    lender_concerns: List[str] = Field(description="대출기관 우려사항")
    investment_readiness: str = Field(description="투자유치 준비도")


class ChatMessage(BaseModel):
    """채팅 메시지"""
    role: str = Field(description="메시지 역할 (user/assistant)")
    content: str = Field(description="메시지 내용")


class ChatRequest(BaseModel):
    """채팅 요청"""
    context: SimulationContext = Field(description="시뮬레이션 컨텍스트")
    messages: List[ChatMessage] = Field(description="대화 이력")
    language: str = Field(default="ko", description="응답 언어")


class ChatResponse(BaseModel):
    """채팅 응답"""
    message: str = Field(description="AI 응답 메시지")
    tool_results: Optional[List[Dict[str, Any]]] = Field(
        default=None, description="Tool 실행 결과 (있는 경우)"
    )


# 시나리오 비교 관련
class ScenarioRanking(BaseModel):
    """시나리오 순위"""
    rank: int = Field(description="순위")
    scenario: str = Field(description="시나리오명")
    dscr_p90: str = Field(description="P90 DSCR")
    bankability_grade: str = Field(description="Bankability 등급")
    key_strength: str = Field(description="핵심 강점")
    key_weakness: str = Field(description="핵심 약점")


class CompareRequest(BaseModel):
    """시나리오 비교 요청"""
    scenarios: List[Dict[str, Any]] = Field(description="비교할 시나리오 목록")
    language: str = Field(default="ko", description="응답 언어")


class CompareResponse(BaseModel):
    """시나리오 비교 응답 - Bankability 관점"""
    comparison_summary: str = Field(description="Bankability 관점 비교 요약")
    bankability_ranking: List[ScenarioRanking] = Field(description="Bankability 순위")
    sensitivity_comparison: str = Field(description="시나리오별 리스크 민감도 비교")
    optimal_structure: str = Field(description="최적의 구조 조합 제안")
    recommendation: str = Field(description="최종 권고사항")


# 섹션별 설명 요청/응답
class ExplainRequest(BaseModel):
    """섹션별 설명 요청"""
    section: str = Field(description="설명할 섹션 (kpi/npv_distribution/sensitivity/waterfall/cashflow/heatmap)")
    context: SimulationContext = Field(description="시뮬레이션 컨텍스트")
    language: str = Field(default="ko", description="응답 언어")


class ExplainResponse(BaseModel):
    """섹션별 설명 응답"""
    section: str = Field(description="섹션명")
    title: str = Field(description="설명 제목")
    summary: str = Field(description="핵심 요약 (1-2문장)")
    explanation: str = Field(description="상세 설명 (마크다운)")
    key_insights: List[str] = Field(description="주요 인사이트 (3-5개)")
