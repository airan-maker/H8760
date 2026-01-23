import { useState } from 'react';
import { Card } from '../components/common';
import { formatCurrency, formatPercent, formatNumber } from '../utils/formatters';

interface Scenario {
  id: string;
  name: string;
  description: string;
  npv: number;
  irr: number;
  lcoh: number;
  h2Production: number;
}

// 데모용 시나리오
const demoScenarios: Scenario[] = [
  {
    id: '1',
    name: '기준 시나리오',
    description: '10 MW PEM, PPA 80원/kWh',
    npv: 12500000000,
    irr: 12.3,
    lcoh: 5200,
    h2Production: 2500,
  },
  {
    id: '2',
    name: '대규모 ALK',
    description: '50 MW ALK, PPA 70원/kWh',
    npv: 35000000000,
    irr: 14.5,
    lcoh: 4800,
    h2Production: 12000,
  },
  {
    id: '3',
    name: '보수적 시나리오',
    description: '10 MW PEM, 계통 전력',
    npv: 5000000000,
    irr: 8.5,
    lcoh: 6500,
    h2Production: 2200,
  },
];

export default function ScenarioCompare() {
  const [scenarios] = useState<Scenario[]>(demoScenarios);
  const [selectedIds, setSelectedIds] = useState<string[]>(['1', '2']);

  const selectedScenarios = scenarios.filter((s) => selectedIds.includes(s.id));

  const toggleScenario = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else if (selectedIds.length < 4) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const bestNpv = Math.max(...selectedScenarios.map((s) => s.npv));
  const bestIrr = Math.max(...selectedScenarios.map((s) => s.irr));
  const bestLcoh = Math.min(...selectedScenarios.map((s) => s.lcoh));

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-hydrogen-500 to-primary-500 rounded-xl shadow-lg shadow-hydrogen-500/20">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-dark-800">시나리오 비교</h1>
          <p className="text-dark-500 text-sm">여러 시나리오의 결과를 비교 분석하세요</p>
        </div>
      </div>

      {/* 시나리오 선택 */}
      <Card
        variant="gradient"
        title="시나리오 선택"
        description="비교할 시나리오를 선택하세요 (최대 4개)"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {scenarios.map((scenario, index) => (
            <button
              key={scenario.id}
              onClick={() => toggleScenario(scenario.id)}
              className={`
                group relative text-left p-5 rounded-2xl border-2 transition-all duration-300
                ${
                  selectedIds.includes(scenario.id)
                    ? 'border-hydrogen-500 bg-gradient-to-br from-hydrogen-50 to-primary-50 shadow-lg shadow-hydrogen-500/10'
                    : 'border-dark-100 hover:border-dark-200 hover:shadow-md'
                }
              `}
            >
              {/* Selection indicator */}
              <div className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                selectedIds.includes(scenario.id)
                  ? 'bg-gradient-to-br from-hydrogen-500 to-primary-500 text-white shadow-md'
                  : 'bg-dark-100 text-dark-400 group-hover:bg-dark-200'
              }`}>
                {selectedIds.includes(scenario.id) ? selectedIds.indexOf(scenario.id) + 1 : index + 1}
              </div>

              <div className="pr-10">
                <h4 className="font-semibold text-dark-800 mb-1">{scenario.name}</h4>
                <p className="text-sm text-dark-500 mb-4">{scenario.description}</p>

                {/* Quick stats */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white/70 rounded-lg p-2">
                    <span className="text-dark-400">NPV</span>
                    <p className="font-semibold text-dark-700">{formatCurrency(scenario.npv, true)}</p>
                  </div>
                  <div className="bg-white/70 rounded-lg p-2">
                    <span className="text-dark-400">IRR</span>
                    <p className="font-semibold text-dark-700">{formatPercent(scenario.irr)}</p>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* 비교 테이블 */}
      {selectedScenarios.length > 0 && (
        <Card
          variant="default"
          title="비교 결과"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          }
        >
          <div className="overflow-x-auto rounded-xl border border-dark-100">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-dark-50 to-dark-100">
                <tr>
                  <th className="text-left py-4 px-5 font-semibold text-dark-600 text-sm uppercase tracking-wider">지표</th>
                  {selectedScenarios.map((s, index) => (
                    <th key={s.id} className="text-right py-4 px-5">
                      <div className="flex items-center justify-end gap-2">
                        <span className="w-6 h-6 rounded-full bg-gradient-to-br from-hydrogen-500 to-primary-500 text-white text-xs flex items-center justify-center font-bold">
                          {index + 1}
                        </span>
                        <span className="font-semibold text-dark-800">{s.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100">
                <tr className="hover:bg-dark-50/50 transition-colors">
                  <td className="py-4 px-5 text-dark-600 font-medium">NPV</td>
                  {selectedScenarios.map((s) => (
                    <td key={s.id} className="py-4 px-5 text-right">
                      <span className={`font-bold text-lg ${s.npv === bestNpv ? 'text-emerald-600' : 'text-dark-800'}`}>
                        {formatCurrency(s.npv, true)}
                      </span>
                      {s.npv === bestNpv && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                          최고
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-dark-50/50 transition-colors">
                  <td className="py-4 px-5 text-dark-600 font-medium">IRR</td>
                  {selectedScenarios.map((s) => (
                    <td key={s.id} className="py-4 px-5 text-right">
                      <span className={`font-bold text-lg ${s.irr === bestIrr ? 'text-emerald-600' : 'text-dark-800'}`}>
                        {formatPercent(s.irr)}
                      </span>
                      {s.irr === bestIrr && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                          최고
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-dark-50/50 transition-colors">
                  <td className="py-4 px-5 text-dark-600 font-medium">LCOH</td>
                  {selectedScenarios.map((s) => (
                    <td key={s.id} className="py-4 px-5 text-right">
                      <span className={`font-bold text-lg ${s.lcoh === bestLcoh ? 'text-emerald-600' : 'text-dark-800'}`}>
                        {formatNumber(s.lcoh)} 원/kg
                      </span>
                      {s.lcoh === bestLcoh && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                          최저
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-dark-50/50 transition-colors">
                  <td className="py-4 px-5 text-dark-600 font-medium">연간 생산량</td>
                  {selectedScenarios.map((s) => (
                    <td key={s.id} className="py-4 px-5 text-right">
                      <span className="font-bold text-lg text-dark-800">{formatNumber(s.h2Production)} 톤</span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* 비교 차트 */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* NPV 비교 */}
            <div className="bg-gradient-to-br from-dark-50 to-transparent rounded-2xl p-5">
              <h4 className="text-sm font-semibold text-dark-700 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-hydrogen-500"></span>
                NPV 비교
              </h4>
              <div className="space-y-3">
                {selectedScenarios.map((s, index) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-gradient-to-br from-hydrogen-500 to-primary-500 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                      {index + 1}
                    </span>
                    <span className="w-20 text-sm text-dark-600 truncate flex-shrink-0">{s.name}</span>
                    <div className="flex-1 bg-dark-100 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          s.npv === bestNpv
                            ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                            : 'bg-gradient-to-r from-primary-400 to-primary-500'
                        }`}
                        style={{ width: `${(s.npv / bestNpv) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-dark-700 w-20 text-right flex-shrink-0">
                      {formatCurrency(s.npv, true)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* IRR 비교 */}
            <div className="bg-gradient-to-br from-dark-50 to-transparent rounded-2xl p-5">
              <h4 className="text-sm font-semibold text-dark-700 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                IRR 비교
              </h4>
              <div className="space-y-3">
                {selectedScenarios.map((s, index) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-gradient-to-br from-hydrogen-500 to-primary-500 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                      {index + 1}
                    </span>
                    <span className="w-20 text-sm text-dark-600 truncate flex-shrink-0">{s.name}</span>
                    <div className="flex-1 bg-dark-100 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          s.irr === bestIrr
                            ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                            : 'bg-gradient-to-r from-violet-400 to-violet-500'
                        }`}
                        style={{ width: `${(s.irr / bestIrr) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-dark-700 w-16 text-right flex-shrink-0">
                      {formatPercent(s.irr)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {selectedScenarios.length === 0 && (
        <Card variant="bordered">
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-dark-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-dark-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-dark-600 font-medium mb-1">비교할 시나리오를 선택하세요</p>
            <p className="text-sm text-dark-400">위에서 최대 4개의 시나리오를 선택할 수 있습니다</p>
          </div>
        </Card>
      )}
    </div>
  );
}
