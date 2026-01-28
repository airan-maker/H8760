import { Card, Slider } from '../common';
import type { TaxConfig as TaxConfigType } from '../../types';

interface Props {
  config: TaxConfigType;
  onChange: (config: TaxConfigType) => void;
}

export default function TaxConfig({ config, onChange }: Props) {
  const update = (key: keyof TaxConfigType, value: number | string) => {
    onChange({ ...config, [key]: value });
  };

  // 총 세율 계산
  const totalTaxRate = config.corporateTaxRate + config.localTaxRate;

  return (
    <Card
      title="세금 및 감가상각"
      description="법인세 및 감가상각 설정 (Bankability 평가 필수)"
    >
      <div className="space-y-6">
        {/* 법인세 섹션 */}
        <div className="border-b border-gray-200 pb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-4">법인세</h4>

          <Slider
            label="법인세율"
            value={config.corporateTaxRate}
            onChange={(v) => update('corporateTaxRate', v)}
            min={10}
            max={30}
            step={1}
            unit="%"
            helpText="한국: 10~25% 누진세율 (대부분 22% 적용)"
          />

          <div className="mt-4">
            <Slider
              label="지방소득세율"
              value={config.localTaxRate}
              onChange={(v) => update('localTaxRate', v)}
              min={0}
              max={5}
              step={0.1}
              unit="%"
              helpText="법인세의 10% (기본 2.2%)"
            />
          </div>

          {/* 총 세율 표시 */}
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">총 실효세율</span>
              <span className="font-semibold text-gray-900">{totalTaxRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* 감가상각 섹션 */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-4">감가상각</h4>

          {/* 감가상각 방법 선택 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              감가상각 방법
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => update('depreciationMethod', 'straight_line')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  config.depreciationMethod === 'straight_line'
                    ? 'bg-primary-100 text-primary-700 border-2 border-primary-500'
                    : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                }`}
              >
                정액법
              </button>
              <button
                type="button"
                onClick={() => update('depreciationMethod', 'declining_balance')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  config.depreciationMethod === 'declining_balance'
                    ? 'bg-primary-100 text-primary-700 border-2 border-primary-500'
                    : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                }`}
              >
                정률법
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {config.depreciationMethod === 'straight_line'
                ? '매년 동일한 금액을 감가상각 (일반적)'
                : '초기에 더 많은 금액을 감가상각'}
            </p>
          </div>

          <Slider
            label="전해조 내용연수"
            value={config.electrolyzerUsefulLife}
            onChange={(v) => update('electrolyzerUsefulLife', v)}
            min={5}
            max={20}
            step={1}
            unit="년"
            helpText="전해조/설비 감가상각 기간"
          />

          <div className="mt-4">
            <Slider
              label="건물 내용연수"
              value={config.buildingUsefulLife}
              onChange={(v) => update('buildingUsefulLife', v)}
              min={20}
              max={50}
              step={5}
              unit="년"
              helpText="건물/구축물 감가상각 기간"
            />
          </div>

          <div className="mt-4">
            <Slider
              label="건물 비율"
              value={config.buildingRatio}
              onChange={(v) => update('buildingRatio', v)}
              min={0}
              max={30}
              step={1}
              unit="%"
              helpText="CAPEX 중 건물/구축물 비율"
            />
          </div>

          <div className="mt-4">
            <Slider
              label="잔존가치율"
              value={config.salvageValueRate}
              onChange={(v) => update('salvageValueRate', v)}
              min={0}
              max={20}
              step={1}
              unit="%"
              helpText="내용연수 종료 시 자산 잔존가치"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
