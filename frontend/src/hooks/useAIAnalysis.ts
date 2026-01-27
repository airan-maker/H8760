/**
 * AI 분석 커스텀 훅
 */
import { useState, useCallback, useMemo } from 'react';
import type { SimulationInput, SimulationResult } from '../types';
import type {
  SimulationContext,
  InterpretResponse,
  ChatMessage,
} from '../types/analysis';
import { analysisApi } from '../services/analysisApi';

/**
 * 시뮬레이션 데이터를 API 컨텍스트 형식으로 변환
 */
function buildContext(
  input: SimulationInput,
  result: SimulationResult
): SimulationContext {
  // 입력 설정 요약
  const input_summary = {
    capacity_mw: input.equipment.electrolyzerCapacity,
    efficiency: input.equipment.electrolyzerEfficiency,
    capex_billion: Math.round(input.cost.capex / 100000000),
    electricity_source: input.cost.electricitySource,
    h2_price: input.market.h2Price,
    discount_rate: input.financial.discountRate,
    project_lifetime: input.financial.projectLifetime,
    debt_ratio: input.financial.debtRatio,
    interest_rate: input.financial.interestRate,
    loan_tenor: input.financial.loanTenor,
  };

  // KPI 요약
  const kpi_summary = {
    npv: {
      p50_billion: Math.round(result.kpis.npv.p50 / 100000000),
      p90_billion: Math.round(result.kpis.npv.p90 / 100000000),
      p99_billion: Math.round(result.kpis.npv.p99 / 100000000),
    },
    irr: {
      p50: Math.round(result.kpis.irr.p50 * 10) / 10,
      p90: Math.round(result.kpis.irr.p90 * 10) / 10,
      p99: Math.round(result.kpis.irr.p99 * 10) / 10,
    },
    dscr: {
      min: Math.round(result.kpis.dscr.min * 100) / 100,
      avg: Math.round(result.kpis.dscr.avg * 100) / 100,
    },
    payback_years: Math.round(result.kpis.paybackPeriod * 10) / 10,
    var95_billion: Math.round(result.kpis.var95 / 100000000),
    lcoh: result.kpis.lcoh,
    annual_h2_production: Math.round(result.kpis.annualH2Production.p50),
  };

  // 민감도 분석 요약
  const sensitivity_summary = result.sensitivity.map((item) => ({
    variable: item.variable,
    low_change_pct: item.lowChangePct,
    high_change_pct: item.highChangePct,
  }));

  // 리스크 폭포수 요약
  const risk_waterfall_summary = result.riskWaterfall.map((item) => ({
    factor: item.factor,
    impact_billion: Math.round(item.impact / 100000000),
  }));

  // 현금흐름 요약
  const cashflow = result.yearlyCashflow;
  const totalRevenue = cashflow.reduce((sum, y) => sum + y.revenue, 0);
  const totalOpex = cashflow.reduce((sum, y) => sum + y.opex, 0);
  const debtPayoffYear = cashflow.findIndex((y) => y.debtService === 0);

  const cashflow_summary = {
    total_investment_billion: Math.round(input.cost.capex / 100000000),
    avg_annual_revenue_billion: Math.round(totalRevenue / cashflow.length / 100000000),
    avg_annual_opex_billion: Math.round(totalOpex / cashflow.length / 100000000),
    debt_payoff_year: debtPayoffYear > 0 ? debtPayoffYear : input.financial.loanTenor,
  };

  // 재무 구조 요약 (Bankability 분석용)
  const debtAmount = input.cost.capex * input.financial.debtRatio / 100;
  const annualDebtService = cashflow.length > 0 ? cashflow[0].debtService : 0;

  const financing_summary = {
    debt_ratio: input.financial.debtRatio,
    interest_rate: input.financial.interestRate,
    loan_tenor: input.financial.loanTenor,
    annual_debt_service_billion: Math.round(annualDebtService / 100000000),
  };

  return {
    input_summary,
    kpi_summary,
    financing_summary,
    sensitivity_summary,
    risk_waterfall_summary,
    cashflow_summary,
  };
}

/**
 * AI 분석 훅
 */
export function useAIAnalysis(input: SimulationInput | null, result: SimulationResult | null) {
  const [interpretation, setInterpretation] = useState<InterpretResponse | null>(null);
  const [interpretLoading, setInterpretLoading] = useState(false);
  const [interpretError, setInterpretError] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // 컨텍스트 메모이제이션
  const context = useMemo(() => {
    if (!input || !result) return null;
    return buildContext(input, result);
  }, [input, result]);

  /**
   * 결과 해석 요청
   */
  const fetchInterpretation = useCallback(async () => {
    if (!context) {
      setInterpretError('시뮬레이션 결과가 없습니다.');
      return;
    }

    setInterpretLoading(true);
    setInterpretError(null);

    try {
      const response = await analysisApi.interpretResults(context);
      setInterpretation(response);
    } catch (error) {
      console.error('해석 요청 실패:', error);
      setInterpretError(
        error instanceof Error
          ? error.message
          : 'AI 분석 중 오류가 발생했습니다.'
      );
    } finally {
      setInterpretLoading(false);
    }
  }, [context]);

  /**
   * 채팅 메시지 전송
   */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!context) {
        setChatError('시뮬레이션 결과가 없습니다.');
        return;
      }

      // 사용자 메시지 추가
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, userMessage]);
      setChatLoading(true);
      setChatError(null);

      try {
        // API 호출용 메시지 형식
        const apiMessages = [...chatMessages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await analysisApi.sendChatMessage(context, apiMessages);

        // AI 응답 추가
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.message,
          timestamp: new Date(),
          toolResults: response.tool_results || undefined,
        };
        setChatMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        console.error('채팅 요청 실패:', error);
        setChatError(
          error instanceof Error
            ? error.message
            : '메시지 전송 중 오류가 발생했습니다.'
        );
      } finally {
        setChatLoading(false);
      }
    },
    [context, chatMessages]
  );

  /**
   * 채팅 기록 초기화
   */
  const clearChat = useCallback(() => {
    setChatMessages([]);
    setChatError(null);
  }, []);

  return {
    // 컨텍스트
    context,
    hasContext: context !== null,

    // 결과 해석
    interpretation,
    interpretLoading,
    interpretError,
    fetchInterpretation,

    // 채팅
    chatMessages,
    chatLoading,
    chatError,
    sendMessage,
    clearChat,
  };
}

export default useAIAnalysis;
