import { Card, Slider } from '../common';
import type { FinancialConfig as FinancialConfigType } from '../../types';

interface Props {
  config: FinancialConfigType;
  onChange: (config: FinancialConfigType) => void;
}

export default function FinancialConfig({ config, onChange }: Props) {
  const update = <K extends keyof FinancialConfigType>(key: K, value: FinancialConfigType[K]) => {
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
          helpText="건설 + 운영 기간 합계"
        />

        <Slider
          label="건설 기간"
          value={config.constructionPeriod}
          onChange={(v) => update('constructionPeriod', v)}
          min={0}
          max={5}
          step={1}
          unit="년"
          helpText={`건설 중 매출 없음 (운영 기간: ${config.projectLifetime - config.constructionPeriod}년)`}
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
              helpText="원리금 상환 기간 (거치기간 포함)"
            />

            <Slider
              label="거치 기간"
              value={config.gracePeriod}
              onChange={(v) => update('gracePeriod', v)}
              min={0}
              max={3}
              step={1}
              unit="년"
              helpText="이자만 납부하는 기간 (건설기간 포함)"
            />

            {/* 상환방식 선택 */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                상환 방식
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="repaymentMethod"
                    value="equal_payment"
                    checked={config.repaymentMethod === 'equal_payment'}
                    onChange={() => update('repaymentMethod', 'equal_payment')}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">원리금균등</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="repaymentMethod"
                    value="equal_principal"
                    checked={config.repaymentMethod === 'equal_principal'}
                    onChange={() => update('repaymentMethod', 'equal_principal')}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">원금균등</span>
                </label>
              </div>
              <p className="text-xs text-gray-500">
                {config.repaymentMethod === 'equal_payment'
                  ? '매년 동일한 원리금 상환 (초기 이자 비중 높음)'
                  : '매년 동일한 원금 상환 (초기 상환액 높음, 점점 감소)'}
              </p>
            </div>

            {/* IDC 포함 여부 */}
            <div className="flex items-center justify-between py-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  건설기간 이자 (IDC) 포함
                </label>
                <p className="text-xs text-gray-500">
                  건설기간 동안 발생하는 이자를 총 투자비에 포함
                </p>
              </div>
              <button
                type="button"
                onClick={() => update('includeIdc', !config.includeIdc)}
                className={`
                  relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
                  transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                  ${config.includeIdc ? 'bg-primary-600' : 'bg-gray-200'}
                `}
              >
                <span
                  className={`
                    pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
                    transition duration-200 ease-in-out
                    ${config.includeIdc ? 'translate-x-5' : 'translate-x-0'}
                  `}
                />
              </button>
            </div>
          </>
        )}

        {/* 운전자본 설정 */}
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-4">운전자본</h4>
          <Slider
            label="운전자본 개월수"
            value={config.workingCapitalMonths}
            onChange={(v) => update('workingCapitalMonths', v)}
            min={0}
            max={6}
            step={1}
            unit="개월"
            helpText="초기 운영자금 (OPEX 기준, 프로젝트 종료시 회수)"
          />
        </div>
      </div>
    </Card>
  );
}
