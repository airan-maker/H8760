/**
 * AI 인사이트 패널 - 메인 컴포넌트
 */
import { useState, useEffect, useRef } from 'react';
import type { SimulationInput, SimulationResult } from '../../types';
import { useAIAnalysis } from '../../hooks/useAIAnalysis';
import { InterpretationCard } from './InterpretationCard';
import { ChatInterface } from './ChatInterface';
import { checkAnalysisHealth } from '../../services/analysisApi';

interface AIInsightsPanelProps {
  input: SimulationInput;
  result: SimulationResult;
}

type TabType = 'insights' | 'chat';

export function AIInsightsPanel({ input, result }: AIInsightsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('insights');
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);
  const analysisTriggeredRef = useRef(false);

  const {
    hasContext,
    interpretation,
    interpretLoading,
    interpretError,
    fetchInterpretation,
    chatMessages,
    chatLoading,
    chatError,
    sendMessage,
    clearChat,
  } = useAIAnalysis(input, result);

  // API 상태 확인
  useEffect(() => {
    const checkApi = async () => {
      try {
        const health = await checkAnalysisHealth();
        setApiAvailable(health.api_configured);
      } catch {
        setApiAvailable(false);
      }
    };
    checkApi();
  }, []);

  // 자동 분석 시작 - API 사용 가능하고 분석 결과가 없을 때 (1회만 실행)
  useEffect(() => {
    // 이미 트리거되었거나, 조건이 맞지 않으면 스킵
    if (analysisTriggeredRef.current) return;
    if (!apiAvailable || !hasContext) return;
    if (interpretation || interpretLoading || interpretError) return;

    // 분석 시작
    analysisTriggeredRef.current = true;
    fetchInterpretation();
  }, [apiAvailable, hasContext, interpretation, interpretLoading, interpretError, fetchInterpretation]);

  // result가 변경되면 다시 분석할 수 있도록 ref 리셋
  useEffect(() => {
    analysisTriggeredRef.current = false;
  }, [result.simulationId]);

  // API 미설정 상태
  if (apiAvailable === false) {
    return (
      <div className="bg-white rounded-2xl shadow-card border border-dark-100 p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-dark-700 mb-2">AI 분석 서비스 미설정</h3>
          <p className="text-dark-400 max-w-md">
            AI 분석 기능을 사용하려면 서버의 <code className="bg-dark-100 px-1.5 py-0.5 rounded text-sm">ANTHROPIC_API_KEY</code>를 설정해주세요.
          </p>
        </div>
      </div>
    );
  }

  // 로딩 중
  if (apiAvailable === null) {
    return (
      <div className="bg-white rounded-2xl shadow-card border border-dark-100 p-8">
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-hydrogen-100 rounded-full border-t-hydrogen-500 animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 탭 네비게이션 */}
      <div className="flex items-center gap-2 bg-dark-50 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('insights')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === 'insights'
              ? 'bg-white text-hydrogen-700 shadow-sm'
              : 'text-dark-500 hover:text-dark-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Bankability 분석
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === 'chat'
              ? 'bg-white text-hydrogen-700 shadow-sm'
              : 'text-dark-500 hover:text-dark-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          금융 자문
          {chatMessages.length > 0 && (
            <span className="bg-hydrogen-100 text-hydrogen-600 text-xs px-1.5 py-0.5 rounded-full">
              {chatMessages.length}
            </span>
          )}
        </button>
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'insights' ? (
        <InterpretationCard
          interpretation={interpretation}
          loading={interpretLoading}
          error={interpretError}
          onRefresh={fetchInterpretation}
        />
      ) : (
        <ChatInterface
          messages={chatMessages}
          loading={chatLoading}
          error={chatError}
          onSendMessage={sendMessage}
          onClearChat={clearChat}
          disabled={!hasContext}
        />
      )}

      {/* 면책 조항 */}
      <p className="text-xs text-dark-400 text-center">
        Bankability 분석은 참고용이며, 실제 금융조달 결정은 금융기관 및 법률/재무 자문사와 협의하시기 바랍니다.
      </p>
    </div>
  );
}

export default AIInsightsPanel;
