import { Card, Slider } from '../common';
import type { FinancialConfig as FinancialConfigType } from '../../types';

interface Props {
  config: FinancialConfigType;
  onChange: (config: FinancialConfigType) => void;
}

export default function FinancialConfig({ config, onChange }: Props) {
  const update = (key: keyof FinancialConfigType, value: number) => {
    onChange({ ...config, [key]: value });
  };

  // 자기자본/부채 비율 표시
  const equityRatio = 100 - config.debtRatio;

  return (
    <Card title="재무 조건" description="금융 및 투자 조건을 설정합니다">
      <div className="space-y-6">
        <Slider
          label="할인율"
          value={config.discountRate}
          onChange={(v) => update('discountRate', v)}
          min={3}
          max={20}
          step={0.5}
          unit="%"
          helpText="현금흐름 할인에 사용되는 비율"
        />

        <Slider
          label="프로젝트 기간"
          value={config.projectLifetime}
          onChange={(v) => update('projectLifetime', v)}
          min={10}
          max={30}
          step={1}
          unit="년"
          helpText="프로젝트 분석 기간"
        />

        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-4">자금 조달</h4>

          <Slider
            label="부채 비율"
            value={config.debtRatio}
            onChange={(v) => update('debtRatio', v)}
            min={0}
            max={90}
            step={5}
            unit="%"
            helpText={`자기자본 ${equityRatio}% : 부채 ${config.debtRatio}%`}
          />

          {/* 자금 조달 구조 시각화 */}
          <div className="mt-3 h-4 rounded-full overflow-hidden flex">
            <div
              className="bg-primary-500 transition-all duration-300"
              style={{ width: `${equityRatio}%` }}
            />
            <div
              className="bg-amber-500 transition-all duration-300"
              style={{ width: `${config.debtRatio}%` }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-primary-600">자기자본 {equityRatio}%</span>
            <span className="text-amber-600">부채 {config.debtRatio}%</span>
          </div>
        </div>

        {config.debtRatio > 0 && (
          <>
            <Slider
              label="대출 이자율"
              value={config.interestRate}
              onChange={(v) => update('interestRate', v)}
              min={2}
              max={12}
              step={0.25}
              unit="%"
              helpText="연간 대출 이자율"
            />

            <Slider
              label="대출 기간"
              value={config.loanTenor}
              onChange={(v) => update('loanTenor', v)}
              min={5}
              max={25}
              step={1}
              unit="년"
              helpText="원리금 상환 기간"
            />
          </>
        )}
      </div>
    </Card>
  );
}
