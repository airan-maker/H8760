/**
 * AI 분석 관련 타입 정의 - Bankability 중심
 */

// 시뮬레이션 컨텍스트 - API에 전달
export interface SimulationContext {
  input_summary: {
    capacity_mw: number;
    efficiency: number;
    capex_billion: number;
    electricity_source: string;
    h2_price: number;
    discount_rate: number;
    project_lifetime: number;
    debt_ratio?: number;
    interest_rate?: number;
    loan_tenor?: number;
  };
  kpi_summary: {
    npv: {
      p50_billion: number;
      p90_billion: number;
      p99_billion: number;
    };
    irr: {
      p50: number;
      p90: number;
      p99: number;
    };
    dscr: {
      min: number;
      avg: number;
    };
    payback_years: number;
    var95_billion: number;
    lcoh: number;
    annual_h2_production: number;
  };
  financing_summary?: {
    debt_ratio: number;
    interest_rate: number;
    loan_tenor: number;
    annual_debt_service_billion: number;
  };
  sensitivity_summary?: Array<{
    variable: string;
    low_change_pct: number;
    high_change_pct: number;
  }>;
  risk_waterfall_summary?: Array<{
    factor: string;
    impact_billion: number;
  }>;
  cashflow_summary?: {
    total_investment_billion: number;
    avg_annual_revenue_billion: number;
    avg_annual_opex_billion: number;
    debt_payoff_year: number;
  };
  incentives_summary?: {
    itc_enabled: boolean;
    itc_rate: number;
    itc_amount_billion: number;
    ptc_enabled: boolean;
    ptc_amount_per_kg: number;
    ptc_duration_years: number;
    capex_subsidy_billion: number;
    operating_subsidy_per_kg: number;
    operating_subsidy_duration_years: number;
    carbon_credit_enabled: boolean;
    carbon_credit_price: number;
    clean_h2_certification_enabled: boolean;
    clean_h2_premium: number;
    total_capex_reduction_billion: number;
    effective_capex_billion: number;
  };
}

// Bankability 점수
export interface BankabilityScore {
  grade: 'A' | 'B' | 'C' | 'D';
  score: number;
  summary: string;
}

// DSCR 분석
export interface DSCRAnalysis {
  assessment: string;
  covenant_headroom: string;
  stress_resilience: string;
}

// 핵심 리스크
export interface KeyRisk {
  risk: string;
  severity: '높음' | '중간' | '낮음';
  impact: string;
  mitigation: string;
}

// Bankability 개선 항목
export interface BankabilityImprovement {
  action: string;
  expected_impact: string;
  priority: '필수' | '권장' | '선택';
  implementation: string;
}

// 금융 권고사항
export interface FinancingRecommendations {
  optimal_leverage: string;
  recommended_tenor: string;
  required_reserves: string;
  covenant_structure: string;
}

// 결과 해석 응답 - Bankability 중심
export interface InterpretResponse {
  executive_summary: string;
  bankability_score: BankabilityScore;
  dscr_analysis: DSCRAnalysis;
  key_risks: KeyRisk[];
  bankability_improvements: BankabilityImprovement[];
  financing_recommendations: FinancingRecommendations;
  lender_concerns: string[];
  investment_readiness: string;
}

// 채팅 메시지
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolResults?: ToolResult[];
}

// Tool 실행 결과
export interface ToolResult {
  tool: string;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
}

// 채팅 응답
export interface ChatResponse {
  message: string;
  tool_results?: ToolResult[];
}

// 시나리오 비교 응답
export interface CompareResponse {
  comparison_summary: string;
  bankability_ranking: Array<{
    rank: number;
    scenario: string;
    dscr_p90: string;
    bankability_grade: string;
    key_strength: string;
    key_weakness: string;
  }>;
  sensitivity_comparison: string;
  optimal_structure: string;
  recommendation: string;
}

// 섹션별 설명 응답
export interface ExplainResponse {
  section: string;
  title: string;
  summary: string;
  explanation: string;
  key_insights: string[];
}

// 섹션 타입
export type SectionType = 'kpi' | 'npv_distribution' | 'sensitivity' | 'waterfall' | 'cashflow' | 'heatmap';

// 추천 질문
export interface SuggestedQuestion {
  id: string;
  text: string;
  category: 'dscr' | 'leverage' | 'risk' | 'structure' | 'incentives';
}

// Bankability 등급 색상 매핑
export const BANKABILITY_GRADE_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  'A': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Investment Grade' },
  'B': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Acceptable' },
  'C': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Marginal' },
  'D': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Sub-investment' },
};

// 우선순위 색상 매핑
export const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  '필수': { bg: 'bg-red-100', text: 'text-red-700' },
  '권장': { bg: 'bg-amber-100', text: 'text-amber-700' },
  '선택': { bg: 'bg-gray-100', text: 'text-gray-600' },
};

// 심각도 색상 매핑
export const SEVERITY_COLORS: Record<string, { bg: string; text: string }> = {
  '높음': { bg: 'bg-red-100', text: 'text-red-700' },
  '중간': { bg: 'bg-amber-100', text: 'text-amber-700' },
  '낮음': { bg: 'bg-green-100', text: 'text-green-700' },
};

// Bankability 관점 추천 질문 목록
export const SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  {
    id: 'q1',
    text: 'DSCR을 1.30 이상으로 높이려면 어떤 조치가 필요한가요?',
    category: 'dscr',
  },
  {
    id: 'q2',
    text: '현재 구조에서 최적의 부채비율은 얼마인가요?',
    category: 'leverage',
  },
  {
    id: 'q3',
    text: '전력가격이 20% 상승하면 Covenant 위반 가능성이 있나요?',
    category: 'risk',
  },
  {
    id: 'q4',
    text: '대출기관이 가장 우려할 리스크는 무엇이고 어떻게 완화할 수 있나요?',
    category: 'risk',
  },
  {
    id: 'q5',
    text: '오프테이크 계약 구조를 어떻게 개선해야 금리를 낮출 수 있나요?',
    category: 'structure',
  },
  {
    id: 'q6',
    text: 'DSRA와 MRA 적립금은 얼마나 필요한가요?',
    category: 'structure',
  },
  {
    id: 'q7',
    text: '현재 적용 가능한 세액공제와 보조금 혜택을 분석해 주세요.',
    category: 'incentives',
  },
  {
    id: 'q8',
    text: '청정수소 인증을 받으면 수익성이 얼마나 개선되나요?',
    category: 'incentives',
  },
];
