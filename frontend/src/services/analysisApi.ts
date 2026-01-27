/**
 * AI 분석 API 클라이언트
 */
import axios from 'axios';
import type {
  SimulationContext,
  InterpretResponse,
  ChatResponse,
  CompareResponse,
  ExplainResponse,
  SectionType,
} from '../types/analysis';
import { auth } from '../config/firebase';

const api = axios.create({
  baseURL: '/api/analysis',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 인증 헤더 인터셉터
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    } catch (error) {
      console.error('토큰 가져오기 실패:', error);
    }
  }
  return config;
});

/**
 * 시뮬레이션 결과 해석 요청
 */
export async function interpretResults(
  context: SimulationContext,
  language: string = 'ko'
): Promise<InterpretResponse> {
  const response = await api.post('/interpret', {
    context,
    language,
  });
  return response.data;
}

/**
 * 채팅 요청
 */
export async function sendChatMessage(
  context: SimulationContext,
  messages: Array<{ role: string; content: string }>,
  language: string = 'ko'
): Promise<ChatResponse> {
  const response = await api.post('/chat', {
    context,
    messages,
    language,
  });
  return response.data;
}

/**
 * 시나리오 비교 분석 요청
 */
export async function compareScenarios(
  scenarios: Array<{
    name: string;
    input_summary: Record<string, unknown>;
    kpi_summary: Record<string, unknown>;
  }>,
  language: string = 'ko'
): Promise<CompareResponse> {
  const response = await api.post('/compare', {
    scenarios,
    language,
  });
  return response.data;
}

/**
 * 섹션별 AI 설명 요청
 */
export async function explainSection(
  section: SectionType,
  context: SimulationContext,
  language: string = 'ko'
): Promise<ExplainResponse> {
  const response = await api.post('/explain', {
    section,
    context,
    language,
  });
  return response.data;
}

/**
 * AI 분석 서비스 상태 확인
 */
export async function checkAnalysisHealth(): Promise<{
  status: string;
  api_configured: boolean;
  model: string;
}> {
  const response = await api.get('/health');
  return response.data;
}

export const analysisApi = {
  interpretResults,
  sendChatMessage,
  compareScenarios,
  explainSection,
  checkAnalysisHealth,
};

export default analysisApi;
