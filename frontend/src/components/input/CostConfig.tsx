import { Card, NumberInput, Slider, Select } from '../common';
import CapexGuide from './CapexGuide';
import type { CostConfig as CostConfigType } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface Props {
  config: CostConfigType;
  onChange: (config: CostConfigType) => void;
  capacityMw?: number; // CAPEX 가이드를 위한 용량 (MW)
}

const electricitySourceOptions = [
  { value: 'PPA', label: 'PPA (전력구매계약)' },
  { value: 'GRID', label: '계통 전력' },
  { value: 'HYBRID', label: '하이브리드' },
];

export default function CostConfig({ config, onChange, capacityMw = 10 }: Props) {
  const update = <K extends keyof CostConfigType>(key: K, value: CostConfigType[K]) => {
    onChange({ ...config, [key]: value });
  };

  // OPEX 자동 계산
  const annualOpex = config.capex * (config.opexRatio / 100);

  // CAPEX 가이드에서 값 적용 핸들러
  const handleApplyCapex = (adjustedCapex: number) => {
    update('capex', adjustedCapex);
    // 스택 교체 비용도 연동 (CAPEX의 11%)
    update('stackReplacementCost', adjustedCapex * 0.11);
  };

  return (
    <Card title="비용 구조" description="투자비 및 운영비를 설정합니다">
      <div className="space-y-6">
        <NumberInput
          label="CAPEX (초기 투자비)"
          value={config.capex}
          onChange={(v) => update('capex', v)}
          unit="원"
          helpText={`약 ${formatCurrency(config.capex, true)}`}
        />

        {/* CAPEX 변동 가이드 */}
        <CapexGuide
          capacityMw={capacityMw}
          currentCapex={config.capex}
          onApplyCapex={handleApplyCapex}
        />

        <Slider
          label="OPEX 비율"
          value={config.opexRatio}
          onChange={(v) => update('opexRatio', v)}
          min={0.5}
          max={5}
          step={0.1}
          unit="% of CAPEX"
          helpText={`연간 운영비: ${formatCurrency(annualOpex, true)}`}
        />

        <NumberInput
          label="스택 교체 비용"
          value={config.stackReplacementCost}
          onChange={(v) => update('stackReplacementCost', v)}
          unit="원"
          helpText={`약 ${formatCurrency(config.stackReplacementCost, true)}`}
        />

        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-4">전력 구매</h4>

          <Select
            label="전력 구매 방식"
            value={config.electricitySource}
            onChange={(v) => update('electricitySource', v as CostConfigType['electricitySource'])}
            options={electricitySourceOptions}
          />

          {(config.electricitySource === 'PPA' ||
            config.electricitySource === 'HYBRID') && (
            <div className="mt-4">
              <Slider
                label="PPA 가격"
                value={config.ppaPrice || 80}
                onChange={(v) => update('ppaPrice', v)}
                min={30}
                max={200}
                step={5}
                unit="원/kWh"
                helpText="재생에너지 전력구매계약 가격"
              />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
