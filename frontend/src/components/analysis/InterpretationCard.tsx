/**
 * Bankability 분석 결과 카드 컴포넌트
 */
import { useState } from 'react';
import {
  type InterpretResponse,
  BANKABILITY_GRADE_COLORS,
  PRIORITY_COLORS,
  SEVERITY_COLORS,
} from '../../types/analysis';

interface InterpretationCardProps {
  interpretation: InterpretResponse | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

type TabType = 'overview' | 'risks' | 'improvements' | 'financing';

export function InterpretationCard({
  interpretation,
  loading,
  error,
  onRefresh,
}: InterpretationCardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-card border border-dark-100 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-hydrogen-100 rounded-full"></div>
              <div className="w-12 h-12 border-4 border-hydrogen-500 rounded-full animate-spin border-t-transparent absolute top-0 left-0"></div>
            </div>
            <p className="text-dark-500 animate-pulse">Bankability 분석 중...</p>
            <p className="text-dark-400 text-sm">DSCR, Covenant, 리스크 평가를 수행합니다</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-card border border-dark-100 p-6">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-dark-600 mb-4">{error}</p>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-hydrogen-500 text-white rounded-lg hover:bg-hydrogen-600 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (!interpretation) {
    return (
      <div className="bg-white rounded-2xl shadow-card border border-dark-100 p-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-hydrogen-100 to-primary-100 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-hydrogen-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-dark-700 mb-2">Bankability 분석</h3>
          <p className="text-dark-400 mb-6 max-w-sm">
            프로젝트 파이낸스 관점에서 금융조달 가능성을 분석합니다.
            DSCR, Covenant, 리스크 평가 및 구조 개선 방안을 제시합니다.
          </p>
          <button
            onClick={onRefresh}
            className="px-6 py-3 bg-gradient-to-r from-hydrogen-500 to-primary-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-hydrogen-500/25 transition-all"
          >
            Bankability 분석 시작
          </button>
        </div>
      </div>
    );
  }

  const gradeStyle = BANKABILITY_GRADE_COLORS[interpretation.bankability_score.grade] || BANKABILITY_GRADE_COLORS['C'];

  return (
    <div className="bg-white rounded-2xl shadow-card border border-dark-100 overflow-hidden">
      {/* 헤더 - Bankability Score */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">Bankability Assessment</h3>
              <p className="text-white/60 text-sm">Project Finance Perspective</p>
            </div>
          </div>
          <div className={`px-4 py-3 rounded-xl ${gradeStyle.bg} ${gradeStyle.border} border`}>
            <div className="flex items-center gap-3">
              <span className={`text-3xl font-bold ${gradeStyle.text}`}>
                {interpretation.bankability_score.grade}
              </span>
              <div className="text-right">
                <div className={`text-sm font-medium ${gradeStyle.text}`}>
                  {interpretation.bankability_score.score}/100
                </div>
                <div className={`text-xs ${gradeStyle.text}`}>
                  {gradeStyle.label}
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="text-white/80 text-sm mt-4 leading-relaxed">
          {interpretation.bankability_score.summary}
        </p>
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-dark-100 px-6">
        <div className="flex gap-1 -mb-px">
          {[
            { key: 'overview', label: '개요', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
            { key: 'risks', label: '리스크', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
            { key: 'improvements', label: '개선방안', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
            { key: 'financing', label: '금융구조', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-hydrogen-500 text-hydrogen-600'
                  : 'border-transparent text-dark-400 hover:text-dark-600'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Executive Summary */}
            <div>
              <h4 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-3">
                Executive Summary
              </h4>
              <p className="text-dark-700 leading-relaxed bg-dark-50 p-4 rounded-xl">
                {interpretation.executive_summary}
              </p>
            </div>

            {/* DSCR Analysis */}
            <div>
              <h4 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-3">
                DSCR 분석
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-dark-50 p-4 rounded-xl">
                  <div className="text-xs text-dark-400 mb-1">평가</div>
                  <div className="text-dark-700 text-sm">{interpretation.dscr_analysis.assessment}</div>
                </div>
                <div className="bg-dark-50 p-4 rounded-xl">
                  <div className="text-xs text-dark-400 mb-1">Covenant 여유도</div>
                  <div className="text-dark-700 text-sm">{interpretation.dscr_analysis.covenant_headroom}</div>
                </div>
                <div className="bg-dark-50 p-4 rounded-xl">
                  <div className="text-xs text-dark-400 mb-1">스트레스 대응력</div>
                  <div className="text-dark-700 text-sm">{interpretation.dscr_analysis.stress_resilience}</div>
                </div>
              </div>
            </div>

            {/* Lender Concerns */}
            <div>
              <h4 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-3">
                대출기관 주요 우려사항
              </h4>
              <ul className="space-y-2">
                {interpretation.lender_concerns.map((concern, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-dark-600">{concern}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Investment Readiness */}
            <div className="bg-hydrogen-50 border border-hydrogen-100 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-hydrogen-700 mb-2">투자유치 준비도</h4>
              <p className="text-hydrogen-800 text-sm">{interpretation.investment_readiness}</p>
            </div>
          </div>
        )}

        {activeTab === 'risks' && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-3">
              핵심 리스크 및 완화 방안
            </h4>
            {interpretation.key_risks.map((risk, index) => {
              const severityStyle = SEVERITY_COLORS[risk.severity] || SEVERITY_COLORS['중간'];
              return (
                <div key={index} className="border border-dark-100 rounded-xl overflow-hidden">
                  <div className="bg-dark-50 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${severityStyle.bg} ${severityStyle.text}`}>
                        {risk.severity}
                      </span>
                      <span className="font-medium text-dark-700">{risk.risk}</span>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <div className="text-xs text-dark-400 mb-1">영향</div>
                      <div className="text-sm text-dark-600">{risk.impact}</div>
                    </div>
                    <div>
                      <div className="text-xs text-dark-400 mb-1">완화 방안</div>
                      <div className="text-sm text-dark-700 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                        {risk.mitigation}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'improvements' && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-3">
              Bankability 개선 방안
            </h4>
            {interpretation.bankability_improvements.map((improvement, index) => {
              const priorityStyle = PRIORITY_COLORS[improvement.priority] || PRIORITY_COLORS['권장'];
              return (
                <div key={index} className="border border-dark-100 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h5 className="font-medium text-dark-700">{improvement.action}</h5>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${priorityStyle.bg} ${priorityStyle.text}`}>
                      {improvement.priority}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-dark-400 mb-1">예상 효과</div>
                      <div className="text-sm text-emerald-700 bg-emerald-50 p-2 rounded">
                        {improvement.expected_impact}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-dark-400 mb-1">실행 방법</div>
                      <div className="text-sm text-dark-600">{improvement.implementation}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'financing' && (
          <div className="space-y-6">
            <h4 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-3">
              금융 구조 권고사항
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-dark-50 p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-hydrogen-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                  <span className="text-sm font-medium text-dark-600">최적 부채비율</span>
                </div>
                <p className="text-dark-700">{interpretation.financing_recommendations.optimal_leverage}</p>
              </div>
              <div className="bg-dark-50 p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-hydrogen-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-medium text-dark-600">권장 대출기간</span>
                </div>
                <p className="text-dark-700">{interpretation.financing_recommendations.recommended_tenor}</p>
              </div>
              <div className="bg-dark-50 p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-hydrogen-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-sm font-medium text-dark-600">필요 적립금</span>
                </div>
                <p className="text-dark-700">{interpretation.financing_recommendations.required_reserves}</p>
              </div>
              <div className="bg-dark-50 p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-hydrogen-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-sm font-medium text-dark-600">Covenant 구조</span>
                </div>
                <p className="text-dark-700">{interpretation.financing_recommendations.covenant_structure}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 푸터 */}
      <div className="px-6 py-4 border-t border-dark-100 flex items-center justify-between">
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 text-dark-500 hover:text-hydrogen-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-sm">다시 분석</span>
        </button>
        <p className="text-xs text-dark-400">
          Claude AI 기반 Bankability 분석 | 참고용
        </p>
      </div>
    </div>
  );
}

export default InterpretationCard;
