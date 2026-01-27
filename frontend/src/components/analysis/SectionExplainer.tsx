/**
 * 섹션별 AI 설명 컴포넌트
 *
 * 각 차트/섹션에 대한 전문가 수준의 설명을 제공
 */
import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import type { SimulationContext, ExplainResponse, SectionType } from '../../types/analysis';
import { analysisApi } from '../../services/analysisApi';

interface SectionExplainerProps {
  section: SectionType;
  context: SimulationContext | null;
  className?: string;
}

export function SectionExplainer({ section, context, className = '' }: SectionExplainerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [explanation, setExplanation] = useState<ExplainResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExplanation = useCallback(async () => {
    if (!context) {
      setError('시뮬레이션 결과가 없습니다.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await analysisApi.explainSection(section, context);
      setExplanation(result);
    } catch (err) {
      console.error('설명 가져오기 실패:', err);
      setError('설명을 가져오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [section, context]);

  const handleToggle = () => {
    if (!isOpen && !explanation && !loading) {
      fetchExplanation();
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className={`${className}`}>
      {/* AI 설명 버튼 */}
      <button
        onClick={handleToggle}
        disabled={!context}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
          isOpen
            ? 'bg-hydrogen-50 text-hydrogen-700 border-hydrogen-200'
            : 'bg-white text-dark-500 border-dark-200 hover:bg-hydrogen-50 hover:text-hydrogen-600 hover:border-hydrogen-200'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title="AI가 이 차트를 설명합니다"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        <span>AI에게 이 분석 결과 설명 요청하기</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 설명 패널 */}
      {isOpen && (
        <div className="mt-3 p-5 bg-white rounded-xl border border-hydrogen-200 shadow-lg animate-fade-in">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-hydrogen-200 rounded-full border-t-hydrogen-500 animate-spin"></div>
                <span className="text-dark-500 text-sm">AI가 분석 중입니다...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-red-600 py-4">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm">{error}</span>
              <button
                onClick={fetchExplanation}
                className="ml-auto text-sm text-hydrogen-600 hover:text-hydrogen-700 underline"
              >
                다시 시도
              </button>
            </div>
          ) : explanation ? (
            <div className="space-y-4">
              {/* 헤더 */}
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-dark-700 flex items-center gap-2">
                    <span className="w-6 h-6 bg-hydrogen-500 rounded-lg flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </span>
                    {explanation.title}
                  </h4>
                  <p className="text-sm text-dark-500 mt-1">{explanation.summary}</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-dark-400 hover:text-dark-600 p-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 상세 설명 */}
              <div className="prose prose-sm max-w-none prose-headings:text-dark-700 prose-headings:font-semibold prose-p:text-dark-600 prose-p:leading-relaxed prose-ul:text-dark-600 prose-li:marker:text-hydrogen-500 prose-strong:text-dark-700">
                <ReactMarkdown>{explanation.explanation}</ReactMarkdown>
              </div>

              {/* 핵심 인사이트 */}
              {explanation.key_insights && explanation.key_insights.length > 0 && (
                <div className="pt-3 border-t border-hydrogen-100">
                  <h5 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2">
                    핵심 인사이트
                  </h5>
                  <ul className="space-y-2">
                    {explanation.key_insights.map((insight, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-dark-600">
                        <span className="w-5 h-5 bg-hydrogen-100 text-hydrogen-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 새로고침 버튼 */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={fetchExplanation}
                  disabled={loading}
                  className="text-xs text-dark-400 hover:text-hydrogen-600 flex items-center gap-1 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  다시 분석
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default SectionExplainer;
