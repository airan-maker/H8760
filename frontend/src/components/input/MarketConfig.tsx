import { Card, Slider, Select } from '../common';
import type { MarketConfig as MarketConfigType } from '../../types';

interface Props {
  config: MarketConfigType;
  onChange: (config: MarketConfigType) => void;
}

const priceScenarioOptions = [
  { value: 'low', label: '낙관적 (전력가격 하락)' },
  { value: 'base', label: '기준 시나리오' },
  { value: 'high', label: '보수적 (전력가격 상승)' },
];

export default function MarketConfig({ config, onChange }: Props) {
  const update = <K extends keyof MarketConfigType>(key: K, value: MarketConfigType[K]) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <Card title="시장 조건" description="수소 및 전력 시장 조건을 설정합니다">
      <div className="space-y-6">
        <Slider
          label="수소 판매가"
          value={config.h2Price}
          onChange={(v) => update('h2Price', v)}
          min={2000}
          max={15000}
          step={100}
          unit="원/kg"
          helpText="수소 판매 단가"
        />

        <Slider
          label="수소 가격 상승률"
          value={config.h2PriceEscalation}
          onChange={(v) => update('h2PriceEscalation', v)}
          min={-3}
          max={5}
          step={0.5}
          unit="%/년"
          helpText="연간 수소 가격 상승률 전망"
        />

        <Select
          label="전력 가격 시나리오"
          value={config.electricityPriceScenario}
          onChange={(v) => update('electricityPriceScenario', v)}
          options={priceScenarioOptions}
          helpText="장기 전력 가격 전망 시나리오"
        />

        {/* 가격 전망 시각화 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">20년간 수소 가격 전망</h4>
          <div className="flex items-end space-x-1 h-20">
            {Array.from({ length: 20 }, (_, i) => {
              const price = config.h2Price * Math.pow(1 + config.h2PriceEscalation / 100, i);
              const maxPrice = config.h2Price * Math.pow(1 + 5 / 100, 19);
              const height = (price / maxPrice) * 100;
              return (
                <div
                  key={i}
                  className="flex-1 bg-primary-400 rounded-t"
                  style={{ height: `${height}%` }}
                  title={`${i + 1}년차: ${Math.round(price).toLocaleString()}원/kg`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>1년차</span>
            <span>20년차</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
