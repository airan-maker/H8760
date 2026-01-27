import { Card, Slider } from '../common';
import type { IncentivesConfig as IncentivesConfigType, CostConfig } from '../../types';

interface Props {
  config: IncentivesConfigType;
  costConfig: CostConfig;
  onChange: (config: IncentivesConfigType) => void;
}

export default function IncentivesConfig({ config, costConfig, onChange }: Props) {
  const update = <K extends keyof IncentivesConfigType>(key: K, value: IncentivesConfigType[K]) => {
    onChange({ ...config, [key]: value });
  };

  // 계산된 값들
  const itcAmount = config.itcEnabled ? (costConfig.capex * config.itcRate / 100) : 0;
  const totalCapexSubsidy = config.capexSubsidy + (costConfig.capex * config.capexSubsidyRate / 100);
  const netCapex = costConfig.capex - itcAmount - totalCapexSubsidy;

  return (
    <Card title="인센티브 설정" description="세액공제, 보조금 등 정부 지원 정책을 설정합니다">
      <div className="space-y-6">
        {/* 세액공제 섹션 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            세액공제
          </h4>

          {/* 투자세액공제 (ITC) */}
          <div className="p-4 bg-gray-50 rounded-xl mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h5 className="text-sm font-medium text-gray-900">투자세액공제 (ITC)</h5>
                <p className="text-xs text-gray-500">설비 투자비용의 일정 비율을 세금에서 공제</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.itcEnabled}
                  onChange={(e) => update('itcEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
            {config.itcEnabled && (
              <>
                <Slider
                  label="공제율"
                  value={config.itcRate}
                  onChange={(v) => update('itcRate', v)}
                  min={0}
                  max={30}
                  step={1}
                  unit="%"
                  helpText="수소법 기준 최대 10%, 특별법 적용 시 최대 30%"
                />
                <div className="mt-2 p-2 bg-emerald-50 rounded-lg text-xs text-emerald-700">
                  예상 공제액: <span className="font-semibold">{(itcAmount / 100000000).toFixed(1)}억원</span>
                </div>
              </>
            )}
          </div>

          {/* 생산세액공제 (PTC) */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h5 className="text-sm font-medium text-gray-900">생산세액공제 (PTC)</h5>
                <p className="text-xs text-gray-500">수소 생산량에 따라 세금 공제</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.ptcEnabled}
                  onChange={(e) => update('ptcEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
            {config.ptcEnabled && (
              <div className="space-y-4">
                <Slider
                  label="공제액"
                  value={config.ptcAmount}
                  onChange={(v) => update('ptcAmount', v)}
                  min={0}
                  max={3000}
                  step={100}
                  unit="원/kg"
                  helpText="수소 1kg 생산당 세액 공제액"
                />
                <Slider
                  label="적용 기간"
                  value={config.ptcDuration}
                  onChange={(v) => update('ptcDuration', v)}
                  min={1}
                  max={15}
                  step={1}
                  unit="년"
                  helpText="생산세액공제 적용 기간"
                />
              </div>
            )}
          </div>
        </div>

        {/* 구분선 */}
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary-500"></span>
            정부 보조금
          </h4>

          {/* CAPEX 보조금 */}
          <div className="p-4 bg-gray-50 rounded-xl mb-4">
            <h5 className="text-sm font-medium text-gray-900 mb-3">설비투자 보조금</h5>
            <div className="space-y-4">
              <Slider
                label="보조금 비율"
                value={config.capexSubsidyRate}
                onChange={(v) => update('capexSubsidyRate', v)}
                min={0}
                max={50}
                step={1}
                unit="%"
                helpText="CAPEX의 일정 비율을 보조금으로 지원"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  고정 보조금액 (억원)
                </label>
                <input
                  type="number"
                  value={config.capexSubsidy / 100000000}
                  onChange={(e) => update('capexSubsidy', parseFloat(e.target.value || '0') * 100000000)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  min={0}
                  step={1}
                />
                <p className="text-xs text-gray-500 mt-1">정액 보조금 (비율과 별도)</p>
              </div>
              {(config.capexSubsidyRate > 0 || config.capexSubsidy > 0) && (
                <div className="p-2 bg-primary-50 rounded-lg text-xs text-primary-700">
                  총 보조금: <span className="font-semibold">{(totalCapexSubsidy / 100000000).toFixed(1)}억원</span>
                </div>
              )}
            </div>
          </div>

          {/* 운영 보조금 */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <h5 className="text-sm font-medium text-gray-900 mb-3">운영 보조금</h5>
            <div className="space-y-4">
              <Slider
                label="보조금액"
                value={config.operatingSubsidy}
                onChange={(v) => update('operatingSubsidy', v)}
                min={0}
                max={2000}
                step={50}
                unit="원/kg"
                helpText="수소 1kg 생산당 운영 보조금"
              />
              {config.operatingSubsidy > 0 && (
                <Slider
                  label="적용 기간"
                  value={config.operatingSubsidyDuration}
                  onChange={(v) => update('operatingSubsidyDuration', v)}
                  min={1}
                  max={15}
                  step={1}
                  unit="년"
                  helpText="운영 보조금 적용 기간"
                />
              )}
            </div>
          </div>
        </div>

        {/* 기타 인센티브 */}
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            기타 인센티브
          </h4>

          {/* 탄소배출권 */}
          <div className="p-4 bg-gray-50 rounded-xl mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h5 className="text-sm font-medium text-gray-900">탄소배출권 수익</h5>
                <p className="text-xs text-gray-500">그린수소 생산에 따른 탄소배출권 판매 수익</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.carbonCreditEnabled}
                  onChange={(e) => update('carbonCreditEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
            {config.carbonCreditEnabled && (
              <Slider
                label="탄소배출권 가격"
                value={config.carbonCreditPrice}
                onChange={(v) => update('carbonCreditPrice', v)}
                min={0}
                max={5000}
                step={100}
                unit="원/kg H₂"
                helpText="수소 1kg 생산당 탄소배출권 환산 가치"
              />
            )}
          </div>

          {/* 청정수소 인증 */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h5 className="text-sm font-medium text-gray-900">청정수소 인증 프리미엄</h5>
                <p className="text-xs text-gray-500">청정수소 인증에 따른 판매가 프리미엄</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.cleanH2CertificationEnabled}
                  onChange={(e) => update('cleanH2CertificationEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
            {config.cleanH2CertificationEnabled && (
              <Slider
                label="인증 프리미엄"
                value={config.cleanH2Premium}
                onChange={(v) => update('cleanH2Premium', v)}
                min={0}
                max={2000}
                step={50}
                unit="원/kg"
                helpText="청정수소 인증에 따른 추가 판매가"
              />
            )}
          </div>
        </div>

        {/* 인센티브 요약 */}
        <div className="mt-6 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">인센티브 효과 요약</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">원래 CAPEX</span>
              <span className="font-medium">{(costConfig.capex / 100000000).toFixed(0)}억원</span>
            </div>
            {(config.itcEnabled || totalCapexSubsidy > 0) && (
              <>
                {config.itcEnabled && (
                  <div className="flex justify-between text-emerald-600">
                    <span>(-) 투자세액공제</span>
                    <span>-{(itcAmount / 100000000).toFixed(1)}억원</span>
                  </div>
                )}
                {totalCapexSubsidy > 0 && (
                  <div className="flex justify-between text-primary-600">
                    <span>(-) 설비투자 보조금</span>
                    <span>-{(totalCapexSubsidy / 100000000).toFixed(1)}억원</span>
                  </div>
                )}
                <div className="border-t border-gray-300 pt-2 flex justify-between font-semibold">
                  <span className="text-gray-900">실질 CAPEX</span>
                  <span className="text-primary-700">{(netCapex / 100000000).toFixed(0)}억원</span>
                </div>
              </>
            )}

            {/* 운영 인센티브 */}
            {(config.ptcEnabled || config.operatingSubsidy > 0 || config.carbonCreditEnabled || config.cleanH2CertificationEnabled) && (
              <div className="border-t border-gray-200 mt-3 pt-3">
                <p className="text-xs text-gray-500 mb-2">수소 1kg당 추가 수익</p>
                {config.ptcEnabled && (
                  <div className="flex justify-between text-emerald-600">
                    <span>생산세액공제 ({config.ptcDuration}년)</span>
                    <span>+{config.ptcAmount.toLocaleString()}원</span>
                  </div>
                )}
                {config.operatingSubsidy > 0 && (
                  <div className="flex justify-between text-primary-600">
                    <span>운영보조금 ({config.operatingSubsidyDuration}년)</span>
                    <span>+{config.operatingSubsidy.toLocaleString()}원</span>
                  </div>
                )}
                {config.carbonCreditEnabled && (
                  <div className="flex justify-between text-amber-600">
                    <span>탄소배출권</span>
                    <span>+{config.carbonCreditPrice.toLocaleString()}원</span>
                  </div>
                )}
                {config.cleanH2CertificationEnabled && (
                  <div className="flex justify-between text-amber-600">
                    <span>청정수소 프리미엄</span>
                    <span>+{config.cleanH2Premium.toLocaleString()}원</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 정책 정보 */}
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 space-y-1">
          <p className="font-semibold mb-2 text-gray-600">수소 관련 주요 지원 정책</p>
          <p>• 수소법: 청정수소 발전 의무화 (CHPS), 청정수소 인증제</p>
          <p>• 조세특례제한법: 수소생산시설 투자세액공제 (최대 10%)</p>
          <p>• 한국형 IRA: 청정수소 생산세액공제 검토 중 (2025~)</p>
          <p>• K-ETS: 탄소배출권거래제 (수소 생산 탄소저감 인정)</p>
          <p className="mt-2 text-gray-400">* 실제 적용 가능 여부는 사업 조건에 따라 달라질 수 있습니다</p>
        </div>
      </div>
    </Card>
  );
}
