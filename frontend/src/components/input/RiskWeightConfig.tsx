import { Card, Toggle, Select } from '../common';
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
    <Card title="리스크 가중치" description="리스크 분석 설정을 조정합니다">
      <div className="space-y-6">
        {/* 리스크 허용도 슬라이더 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            리스크 허용도
          </label>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">보수적</span>
            <input
              type="range"
              min={0}
              max={2}
              step={1}
              value={
                riskConfig.confidenceLevel === 'P99'
                  ? 0
                  : riskConfig.confidenceLevel === 'P90'
                  ? 1
                  : 2
              }
              onChange={(e) => {
                const val = Number(e.target.value);
                const level = val === 0 ? 'P99' : val === 1 ? 'P90' : 'P50';
                onRiskChange({ ...riskConfig, confidenceLevel: level });
              }}
              className="flex-1"
            />
            <span className="text-sm text-gray-500">공격적</span>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            현재: {riskConfig.confidenceLevel} 기준
          </p>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-4">변동성 반영</h4>
          <div className="space-y-4">
            <Toggle
              label="기상 변동성 반영"
              checked={riskConfig.weatherVariability}
              onChange={(checked) =>
                onRiskChange({ ...riskConfig, weatherVariability: checked })
              }
              description="연간 기상 패턴 변동을 시뮬레이션에 반영"
            />

            <Toggle
              label="전력가격 변동성 반영"
              checked={riskConfig.priceVolatility}
              onChange={(checked) =>
                onRiskChange({ ...riskConfig, priceVolatility: checked })
              }
              description="전력 시장 가격 변동을 시뮬레이션에 반영"
            />
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-4">몬테카를로 설정</h4>
          <div className="space-y-4">
            <Select
              label="시뮬레이션 반복 횟수"
              value={String(mcConfig.iterations)}
              onChange={(v) => onMcChange({ ...mcConfig, iterations: Number(v) })}
              options={[
                { value: '1000', label: '1,000회 (빠름)' },
                { value: '5000', label: '5,000회' },
                { value: '10000', label: '10,000회 (권장)' },
                { value: '50000', label: '50,000회 (정밀)' },
              ]}
            />

            {riskConfig.weatherVariability && (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600 w-32">기상 변동성</span>
                <input
                  type="range"
                  min={0.05}
                  max={0.3}
                  step={0.05}
                  value={mcConfig.weatherSigma}
                  onChange={(e) =>
                    onMcChange({ ...mcConfig, weatherSigma: Number(e.target.value) })
                  }
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12">
                  {(mcConfig.weatherSigma * 100).toFixed(0)}%
                </span>
              </div>
            )}

            {riskConfig.priceVolatility && (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600 w-32">가격 변동성</span>
                <input
                  type="range"
                  min={0.05}
                  max={0.4}
                  step={0.05}
                  value={mcConfig.priceSigma}
                  onChange={(e) =>
                    onMcChange({ ...mcConfig, priceSigma: Number(e.target.value) })
                  }
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12">
                  {(mcConfig.priceSigma * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
