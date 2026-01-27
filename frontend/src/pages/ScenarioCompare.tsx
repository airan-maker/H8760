import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button } from '../components/common';
import { formatCurrency, formatPercent, formatNumber } from '../utils/formatters';
import { useSimulationContext, SavedScenario } from '../contexts/SimulationContext';

// 정렬 옵션 타입
type SortField = 'createdAt' | 'npv' | 'irr' | 'lcoh' | 'h2Production';
type SortOrder = 'asc' | 'desc';

// 비교용 시나리오 뷰 타입
interface ScenarioView {
  id: string;
  name: string;
  description: string;
  npv: number;
  irr: number;
  lcoh: number;
  h2Production: number;
  createdAt?: string;
  isDemo?: boolean;
}

// 데모용 시나리오 (저장된 시나리오가 없을 때 표시)
const demoScenarios: ScenarioView[] = [
  {
    id: 'demo_1',
    name: '기준 시나리오 (예시)',
    description: '10 MW PEM, PPA 80원/kWh',
    npv: 12500000000,
    irr: 12.3,
    lcoh: 5200,
    h2Production: 2500,
    isDemo: true,
  },
  {
    id: 'demo_2',
    name: '대규모 ALK (예시)',
    description: '50 MW ALK, PPA 70원/kWh',
    npv: 35000000000,
    irr: 14.5,
    lcoh: 4800,
    h2Production: 12000,
    isDemo: true,
  },
  {
    id: 'demo_3',
    name: '보수적 시나리오 (예시)',
    description: '10 MW PEM, 계통 전력',
    npv: 5000000000,
    irr: 8.5,
    lcoh: 6500,
    h2Production: 2200,
    isDemo: true,
  },
];

// SavedScenario를 ScenarioView로 변환
const convertToView = (scenario: SavedScenario): ScenarioView => ({
  id: scenario.id,
  name: scenario.name,
  description: scenario.description,
  npv: scenario.result.kpis.npv.p50,
  irr: scenario.result.kpis.irr.p50,
  lcoh: scenario.result.kpis.lcoh,
  h2Production: scenario.result.kpis.annualH2Production.p50,
  createdAt: scenario.createdAt,
  isDemo: false,
});

// 정렬 옵션
const sortOptions: { value: SortField; label: string }[] = [
  { value: 'createdAt', label: '생성일' },
  { value: 'npv', label: 'NPV' },
  { value: 'irr', label: 'IRR' },
  { value: 'lcoh', label: 'LCOH' },
  { value: 'h2Production', label: '생산량' },
];

export default function ScenarioCompare() {
  const { savedScenarios, deleteScenario, loadScenario } = useSimulationContext();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // 저장된 시나리오를 뷰 형식으로 변환
  const userScenarios: ScenarioView[] = savedScenarios.map(convertToView);

  // 정렬된 시나리오
  const sortedUserScenarios = useMemo(() => {
    const sorted = [...userScenarios].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'createdAt':
          comparison = (a.createdAt || '').localeCompare(b.createdAt || '');
          break;
        case 'npv':
          comparison = a.npv - b.npv;
          break;
        case 'irr':
          comparison = a.irr - b.irr;
          break;
        case 'lcoh':
          comparison = a.lcoh - b.lcoh;
          break;
        case 'h2Production':
          comparison = a.h2Production - b.h2Production;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [userScenarios, sortField, sortOrder]);

  // 저장된 시나리오가 없으면 데모 시나리오 표시
  const scenarios = sortedUserScenarios.length > 0 ? sortedUserScenarios : demoScenarios;
  const isShowingDemo = userScenarios.length === 0;

  const selectedScenarios = scenarios.filter((s) => selectedIds.includes(s.id));

  const toggleScenario = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else if (selectedIds.length < 6) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // 정렬 토글
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteScenario(id);
      setSelectedIds(selectedIds.filter(i => i !== id));
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('시나리오 삭제 실패:', error);
    }
  };

  const bestNpv = selectedScenarios.length > 0 ? Math.max(...selectedScenarios.map((s) => s.npv)) : 0;
  const bestIrr = selectedScenarios.length > 0 ? Math.max(...selectedScenarios.map((s) => s.irr)) : 0;
  const bestLcoh = selectedScenarios.length > 0 ? Math.min(...selectedScenarios.map((s) => s.lcoh)) : 0;

  return (
    <div className="max-w-7xl mx-auto">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-hydrogen-500 to-primary-500 rounded-xl shadow-lg shadow-hydrogen-500/20">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-dark-800">시나리오 비교</h1>
            <p className="text-dark-500 text-sm">
              {isShowingDemo
                ? '저장된 시나리오가 없습니다. 데모 데이터를 표시합니다.'
                : `${savedScenarios.length}개의 시나리오를 비교할 수 있습니다`
              }
            </p>
          </div>
        </div>

        {/* 액션 탭 */}
        <div className="flex items-center gap-1 p-1.5 bg-dark-50 rounded-2xl">
          <Link
            to="/config"
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm text-dark-500 hover:text-dark-700 hover:bg-white/50 transition-all duration-300"
          >
            <svg className="w-4 h-4 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            새 시나리오
          </Link>
          <Link
            to="/dashboard"
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm text-dark-500 hover:text-dark-700 hover:bg-white/50 transition-all duration-300"
          >
            <svg className="w-4 h-4 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            대시보드
          </Link>
        </div>
      </div>

      <div className="space-y-8">

      {/* 안내 메시지 (저장된 시나리오가 없을 때) */}
      {isShowingDemo && (
        <div className="bg-gradient-to-r from-hydrogen-50 to-primary-50 border border-hydrogen-200 rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-hydrogen-100 rounded-xl">
              <svg className="w-6 h-6 text-hydrogen-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-dark-800 mb-1">시나리오를 저장해보세요</h3>
              <p className="text-sm text-dark-600 mb-3">
                설정 페이지에서 시뮬레이션을 실행하고, 대시보드에서 '시나리오 저장' 버튼을 클릭하면
                다양한 조건의 시나리오를 비교할 수 있습니다.
              </p>
              <div className="flex gap-2">
                <Link to="/config">
                  <Button size="sm" variant="outline">설정으로 이동</Button>
                </Link>
                <Link to="/dashboard">
                  <Button size="sm" variant="outline">대시보드로 이동</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 시나리오 선택 */}
      <Card
        variant="gradient"
        title="시나리오 선택"
        description={`비교할 시나리오를 선택하세요 (최대 6개) · 총 ${savedScenarios.length}개 저장됨`}
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        }
        action={
          !isShowingDemo && (
            <div className="flex items-center gap-2">
              {/* 정렬 기준 선택 */}
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="text-sm border border-dark-200 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-hydrogen-500/20 focus:border-hydrogen-500"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {/* 정렬 방향 버튼 */}
              <button
                onClick={toggleSortOrder}
                className="p-1.5 border border-dark-200 rounded-lg hover:bg-dark-50 transition-colors"
                title={sortOrder === 'asc' ? '오름차순' : '내림차순'}
              >
                {sortOrder === 'asc' ? (
                  <svg className="w-5 h-5 text-dark-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-dark-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                  </svg>
                )}
              </button>
            </div>
          )
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map((scenario, index) => (
            <div
              key={scenario.id}
              className={`
                group relative text-left p-5 rounded-2xl border-2 transition-all duration-300
                ${
                  selectedIds.includes(scenario.id)
                    ? 'border-hydrogen-500 bg-gradient-to-br from-hydrogen-50 to-primary-50 shadow-lg shadow-hydrogen-500/10'
                    : 'border-dark-100 hover:border-dark-200 hover:shadow-md'
                }
                ${scenario.isDemo ? 'opacity-75' : ''}
              `}
            >
              {/* Selection checkbox */}
              <button
                onClick={() => toggleScenario(scenario.id)}
                className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  selectedIds.includes(scenario.id)
                    ? 'bg-gradient-to-br from-hydrogen-500 to-primary-500 text-white shadow-md'
                    : 'bg-dark-100 text-dark-400 group-hover:bg-dark-200'
                }`}
              >
                {selectedIds.includes(scenario.id) ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </button>

              {/* 삭제 버튼 (사용자 시나리오만) */}
              {!scenario.isDemo && (
                <button
                  onClick={() => setShowDeleteConfirm(scenario.id)}
                  className="absolute top-3 right-12 w-7 h-7 rounded-full flex items-center justify-center text-dark-400 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}

              <div className="pr-20" onClick={() => toggleScenario(scenario.id)}>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-dark-800">{scenario.name}</h4>
                  {scenario.isDemo && (
                    <span className="text-xs px-2 py-0.5 bg-dark-100 text-dark-500 rounded-full">데모</span>
                  )}
                </div>
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
                  <div className="bg-white/70 rounded-lg p-2">
                    <span className="text-dark-400">LCOH</span>
                    <p className="font-semibold text-dark-700">{formatNumber(scenario.lcoh)}원/kg</p>
                  </div>
                  <div className="bg-white/70 rounded-lg p-2">
                    <span className="text-dark-400">생산량</span>
                    <p className="font-semibold text-dark-700">{formatNumber(scenario.h2Production)}톤/년</p>
                  </div>
                </div>
              </div>
            </div>
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
                    <span className="w-24 text-sm text-dark-600 truncate flex-shrink-0">{s.name}</span>
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
                    <span className="w-24 text-sm text-dark-600 truncate flex-shrink-0">{s.name}</span>
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

            {/* LCOH 비교 */}
            <div className="bg-gradient-to-br from-dark-50 to-transparent rounded-2xl p-5">
              <h4 className="text-sm font-semibold text-dark-700 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                LCOH 비교 (낮을수록 좋음)
              </h4>
              <div className="space-y-3">
                {selectedScenarios.map((s, index) => {
                  const maxLcoh = Math.max(...selectedScenarios.map(sc => sc.lcoh));
                  return (
                    <div key={s.id} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-gradient-to-br from-hydrogen-500 to-primary-500 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                        {index + 1}
                      </span>
                      <span className="w-24 text-sm text-dark-600 truncate flex-shrink-0">{s.name}</span>
                      <div className="flex-1 bg-dark-100 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            s.lcoh === bestLcoh
                              ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                              : 'bg-gradient-to-r from-amber-400 to-amber-500'
                          }`}
                          style={{ width: `${(s.lcoh / maxLcoh) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-dark-700 w-24 text-right flex-shrink-0">
                        {formatNumber(s.lcoh)}원/kg
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 생산량 비교 */}
            <div className="bg-gradient-to-br from-dark-50 to-transparent rounded-2xl p-5">
              <h4 className="text-sm font-semibold text-dark-700 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-500"></span>
                연간 생산량 비교
              </h4>
              <div className="space-y-3">
                {selectedScenarios.map((s, index) => {
                  const maxProd = Math.max(...selectedScenarios.map(sc => sc.h2Production));
                  return (
                    <div key={s.id} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-gradient-to-br from-hydrogen-500 to-primary-500 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                        {index + 1}
                      </span>
                      <span className="w-24 text-sm text-dark-600 truncate flex-shrink-0">{s.name}</span>
                      <div className="flex-1 bg-dark-100 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-violet-400 to-violet-500"
                          style={{ width: `${(s.h2Production / maxProd) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-dark-700 w-20 text-right flex-shrink-0">
                        {formatNumber(s.h2Production)}톤
                      </span>
                    </div>
                  );
                })}
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
            <p className="text-sm text-dark-400">위에서 최대 6개의 시나리오를 선택할 수 있습니다</p>
          </div>
        </Card>
      )}
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-rose-100 rounded-xl">
                <svg className="w-6 h-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-dark-800">시나리오 삭제</h3>
            </div>
            <p className="text-dark-600 mb-6">
              이 시나리오를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                fullWidth
                onClick={() => setShowDeleteConfirm(null)}
              >
                취소
              </Button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-xl transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
