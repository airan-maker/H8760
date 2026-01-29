import { Card } from '../common';
import type { RiskWeightsConfig, MonteCarloConfig } from '../../types';

interface Props {
  riskConfig: RiskWeightsConfig;
  mcConfig: MonteCarloConfig;
  onRiskChange: (config: RiskWeightsConfig) => void;
  onMcChange: (config: MonteCarloConfig) => void;
}

export default function RiskWeightConfig({
  riskConfig,
  mcConfig,
  onRiskChange,
  onMcChange,
}: Props) {
  return (
    <Card title="분석 설정" description="현금흐름 분석 설정">
      <div className="space-y-6">
        {/* 단일 시나리오 분석 안내 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-blue-800">단일 시나리오 분석 모드</h4>
              <p className="text-sm text-blue-600 mt-1">
                현재 기본 현금흐름 추정에 집중하여 분석합니다.
                연도별 상세 현금흐름과 Bankability 지표를 확인할 수 있습니다.
              </p>
            </div>
          </div>
        </div>

        {/* 분석 항목 안내 */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">분석 항목</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg">
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-emerald-700">연도별 현금흐름</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg">
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-emerald-700">NPV / IRR 계산</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg">
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-emerald-700">DSCR / LLCR 분석</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg">
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-emerald-700">Bankability 평가</span>
            </div>
          </div>
        </div>

        {/* 몬테카를로 시뮬레이션 (비활성화) */}
        <div className="border-t border-gray-200 pt-4 opacity-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-500">몬테카를로 시뮬레이션</h4>
            <span className="text-xs bg-gray-200 text-gray-500 px-2 py-1 rounded">비활성화</span>
          </div>
          <p className="text-xs text-gray-400">
            확률 기반 리스크 분석은 추후 지원 예정입니다.
            (NPV 분포, 민감도 분석, VaR 등)
          </p>
        </div>
      </div>
    </Card>
  );
}
