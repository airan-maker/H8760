/**
 * 시나리오 비교 컴포넌트
 *
 * 낙관/기준/비관 시나리오를 비교하여 보여줍니다.
 */
import { Card } from '../common';

export interface ScenarioData {
  name: string;
  type: 'optimistic' | 'base' | 'pessimistic';
  description: string;
  assumptions: {
    label: string;
    value: string;
    change?: string; // 기준 대비 변화 (예: "+10%")
  }[];
  kpis: {
    npv: number;
    irr: number;
    paybackPeriod: number;
    lcoh: number;
    dscr: number;
  };
}

interface Props {
  scenarios: ScenarioData[];
  baseScenarioName?: string;
}

const SCENARIO_STYLES = {
  optimistic: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    headerBg: 'bg-emerald-500',
    icon: '🌟',
    label: '낙관적',
  },
  base: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    headerBg: 'bg-slate-600',
    icon: '📊',
    label: '기준',
  },
  pessimistic: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    headerBg: 'bg-rose-500',
    icon: '⚠️',
    label: '비관적',
  },
};

export default function ScenarioComparison({ scenarios, baseScenarioName = '기준 시나리오' }: Props) {
  // 시나리오를 낙관 -> 기준 -> 비관 순으로 정렬
  const sortedScenarios = [...scenarios].sort((a, b) => {
    const order = { optimistic: 0, base: 1, pessimistic: 2 };
    return order[a.type] - order[b.type];
  });

  const baseScenario = scenarios.find((s) => s.type === 'base');

  // NPV 변화율 계산
  const getNpvChange = (npv: number): { value: string; color: string } => {
    if (!baseScenario) return { value: '-', color: 'text-dark-500' };
    const baseNpv = baseScenario.kpis.npv;
    if (baseNpv === 0) return { value: '-', color: 'text-dark-500' };

    const change = ((npv - baseNpv) / Math.abs(baseNpv)) * 100;
    if (change > 0) return { value: `+${change.toFixed(0)}%`, color: 'text-emerald-600' };
    if (change < 0) return { value: `${change.toFixed(0)}%`, color: 'text-rose-600' };
    return { value: '0%', color: 'text-dark-500' };
  };

  // 포맷 함수
  const formatNpv = (v: number) => `${(v / 1e8).toFixed(0)}억`;
  const formatIrr = (v: number) => `${v.toFixed(1)}%`;
  const formatPayback = (v: number) => `${v.toFixed(1)}년`;
  const formatLcoh = (v: number) => `${v.toLocaleString()}원`;
  const formatDscr = (v: number) => v.toFixed(2);

  return (
    <Card title="시나리오 비교" description="낙관/기준/비관 시나리오별 주요 KPI 비교">
      <div className="space-y-6">
        {/* 시나리오 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sortedScenarios.map((scenario) => {
            const style = SCENARIO_STYLES[scenario.type];
            const npvChange = getNpvChange(scenario.kpis.npv);

            return (
              <div
                key={scenario.name}
                className={`rounded-xl border-2 overflow-hidden ${style.border} ${style.bg}`}
              >
                {/* 헤더 */}
                <div className={`${style.headerBg} text-white px-4 py-3`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{style.icon}</span>
                    <div>
                      <div className="font-bold">{style.label} 시나리오</div>
                      <div className="text-xs opacity-80">{scenario.description}</div>
                    </div>
                  </div>
                </div>

                {/* 가정 */}
                <div className="px-4 py-3 border-b border-dark-100">
                  <div className="text-xs font-medium text-dark-500 mb-2">주요 가정</div>
                  <div className="space-y-1">
                    {scenario.assumptions.slice(0, 4).map((assumption, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-dark-500">{assumption.label}</span>
                        <span className="font-medium text-dark-700">
                          {assumption.value}
                          {assumption.change && (
                            <span className={`ml-1 text-xs ${
                              assumption.change.startsWith('+') ? 'text-emerald-600' :
                              assumption.change.startsWith('-') ? 'text-rose-600' : 'text-dark-400'
                            }`}>
                              ({assumption.change})
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* KPI */}
                <div className="px-4 py-3 space-y-2">
                  {/* NPV - 강조 */}
                  <div className="p-3 bg-white rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-dark-500">NPV</span>
                      <div className="text-right">
                        <span className={`text-lg font-bold ${
                          scenario.kpis.npv >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {formatNpv(scenario.kpis.npv)}
                        </span>
                        {scenario.type !== 'base' && (
                          <span className={`ml-2 text-sm ${npvChange.color}`}>
                            {npvChange.value}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 기타 KPI */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-dark-400">IRR</span>
                      <span className={`font-medium ${
                        scenario.kpis.irr >= 8 ? 'text-emerald-600' :
                        scenario.kpis.irr >= 0 ? 'text-amber-600' : 'text-rose-600'
                      }`}>
                        {formatIrr(scenario.kpis.irr)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dark-400">회수기간</span>
                      <span className="font-medium text-dark-700">
                        {formatPayback(scenario.kpis.paybackPeriod)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dark-400">LCOH</span>
                      <span className="font-medium text-dark-700">
                        {formatLcoh(scenario.kpis.lcoh)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dark-400">DSCR</span>
                      <span className={`font-medium ${
                        scenario.kpis.dscr >= 1.3 ? 'text-emerald-600' :
                        scenario.kpis.dscr >= 1.1 ? 'text-amber-600' : 'text-rose-600'
                      }`}>
                        {formatDscr(scenario.kpis.dscr)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* NPV 비교 바 차트 */}
        <div className="p-4 bg-dark-50 rounded-xl">
          <div className="text-sm font-medium text-dark-600 mb-3">NPV 범위</div>
          <div className="relative h-12">
            {/* 배경 바 */}
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-6 bg-dark-200 rounded-full overflow-hidden relative">
                {/* 0 라인 */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-dark-400 z-10"
                  style={{
                    left: (() => {
                      const allNpvs = scenarios.map(s => s.kpis.npv);
                      const min = Math.min(...allNpvs);
                      const max = Math.max(...allNpvs);
                      if (min >= 0) return '0%';
                      if (max <= 0) return '100%';
                      return `${(-min / (max - min)) * 100}%`;
                    })(),
                  }}
                />

                {/* 시나리오 점들 */}
                {sortedScenarios.map((scenario) => {
                  const allNpvs = scenarios.map(s => s.kpis.npv);
                  const min = Math.min(...allNpvs) * 1.1;
                  const max = Math.max(...allNpvs) * 1.1;
                  const range = max - min || 1;
                  const position = ((scenario.kpis.npv - min) / range) * 100;

                  const style = SCENARIO_STYLES[scenario.type];
                  return (
                    <div
                      key={scenario.name}
                      className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white shadow-md z-20 ${style.headerBg}`}
                      style={{ left: `calc(${position}% - 10px)` }}
                      title={`${style.label}: ${formatNpv(scenario.kpis.npv)}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex justify-between text-xs text-dark-500 mt-2">
            <span>{formatNpv(Math.min(...scenarios.map(s => s.kpis.npv)))}</span>
            <span>{formatNpv(Math.max(...scenarios.map(s => s.kpis.npv)))}</span>
          </div>
        </div>

        {/* 시나리오 설명 */}
        <div className="text-xs text-dark-400 space-y-1">
          <p><span className="font-medium text-emerald-600">낙관적 시나리오:</span> 유리한 시장 조건, 높은 효율성, 인센티브 적용</p>
          <p><span className="font-medium text-slate-600">기준 시나리오:</span> 현재 입력 값 기준</p>
          <p><span className="font-medium text-rose-600">비관적 시나리오:</span> 불리한 시장 조건, 예상 미달 성과</p>
        </div>
      </div>
    </Card>
  );
}
