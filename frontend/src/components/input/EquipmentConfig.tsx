import { Card, Slider } from '../common';
import type { EquipmentConfig as EquipmentConfigType } from '../../types';
import { formatNumber } from '../../utils/formatters';

interface Props {
  config: EquipmentConfigType;
  onChange: (config: EquipmentConfigType) => void;
}

export default function EquipmentConfig({ config, onChange }: Props) {
  const update = (key: keyof EquipmentConfigType, value: number) => {
    onChange({ ...config, [key]: value });
  };

  // 수소 생산 단가 자동 계산
  const calculatedSpecificConsumption = (100 / config.electrolyzerEfficiency) * 33.33;

  return (
    <Card title="설비 사양" description="전해조 기본 사양을 설정합니다">
      <div className="space-y-6">
        <Slider
          label="전해조 용량"
          value={config.electrolyzerCapacity}
          onChange={(v) => update('electrolyzerCapacity', v)}
          min={1}
          max={100}
          step={1}
          unit="MW"
          helpText="설치할 전해조의 총 용량"
        />

        <Slider
          label="전해조 효율"
          value={config.electrolyzerEfficiency}
          onChange={(v) => update('electrolyzerEfficiency', v)}
          min={50}
          max={85}
          step={0.5}
          unit="%"
          helpText="전기 에너지의 수소 전환 효율"
        />

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">수소 생산 단가 (자동계산)</span>
            <span className="text-sm font-semibold text-primary-600">
              {formatNumber(calculatedSpecificConsumption, 1)} kWh/kg H2
            </span>
          </div>
        </div>

        <Slider
          label="연간 가동률"
          value={config.annualAvailability}
          onChange={(v) => update('annualAvailability', v)}
          min={50}
          max={99}
          step={1}
          unit="%"
          helpText="유지보수 등을 고려한 실제 가동 가능 비율"
        />

        <Slider
          label="효율 저하율"
          value={config.degradationRate}
          onChange={(v) => update('degradationRate', v)}
          min={0}
          max={3}
          step={0.1}
          unit="%/년"
          helpText="연간 효율 저하 비율"
        />

        <Slider
          label="스택 수명"
          value={config.stackLifetime}
          onChange={(v) => update('stackLifetime', v)}
          min={40000}
          max={120000}
          step={5000}
          unit="시간"
          formatValue={(v) => formatNumber(v)}
          helpText="스택 교체가 필요한 총 운영 시간"
        />
      </div>
    </Card>
  );
}
