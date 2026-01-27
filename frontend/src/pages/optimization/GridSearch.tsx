/**
 * Grid Search 최적화 페이지
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlayIcon,
  StopIcon,
  ArrowPathIcon,
  TableCellsIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { useSimulationContext } from '../../contexts/SimulationContext';
import { optimizationApi } from '../../services/optimizationApi';
import VariableRangeSelector from '../../components/optimization/VariableRangeSelector';
import GridHeatmap from '../../components/optimization/GridHeatmap';
import ResultsTable from '../../components/optimization/ResultsTable';
import type {
  VariableRange,
  GridSearchResponse,
  GridSearchResultItem,
  TargetKPI,
} from '../../types/optimization';
import { TARGET_KPI_LABELS } from '../../types/optimization';

export default function GridSearch() {
  const navigate = useNavigate();
  const { currentInput, setCurrentInput } = useSimulationContext();

  // 상태
  const [variableRanges, setVariableRanges] = useState<VariableRange[]>([]);
  const [targetKpi, setTargetKpi] = useState<TargetKPI>('npv_p50');
  const [monteCarloIterations, setMonteCarloIterations] = useState(1000);
  const [maxCombinations, setMaxCombinations] = useState(1000);

  // 실행 상태
  const [isRunning, setIsRunning] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [response, setResponse] = useState<GridSearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 뷰 모드
  const [viewMode, setViewMode] = useState<'table' | 'heatmap'>('table');

  // 조합 수 계산
  const calculateCombinations = (): number => {
    if (variableRanges.length === 0) return 0;
    return variableRanges.reduce((total, range) => {
      const steps = Math.floor((range.maxValue - range.minValue) / range.step) + 1;
      return total * Math.max(1, steps);
    }, 1);
  };

  // Grid Search 실행
  const handleStart = async () => {
    if (variableRanges.length === 0) {
      setError('탐색할 변수를 선택해주세요.');
      return;
    }

    const combinations = calculateCombinations();
    if (combinations > maxCombinations) {
      setError(
        `조합 수(${combinations.toLocaleString()})가 최대 허용(${maxCombinations.toLocaleString()})을 초과합니다.`
      );
      return;
    }

    setIsRunning(true);
    setError(null);
    setResponse(null);

    try {
      const result = await optimizationApi.startGridSearch(
        currentInput,
        variableRanges,
        targetKpi,
        monteCarloIterations,
        maxCombinations
      );
      setJobId(result.jobId);
      setResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '실행 중 오류가 발생했습니다.');
      setIsRunning(false);
    }
  };

  // 상태 폴링
  useEffect(() => {
    if (!jobId || !isRunning) return;

    const pollInterval = setInterval(async () => {
      try {
        const status = await optimizationApi.getGridSearchStatus(jobId);
        setResponse(status);

        if (status.status === 'completed' || status.status === 'failed') {
          setIsRunning(false);
          if (status.status === 'failed') {
            setError(status.errorMessage || '작업이 실패했습니다.');
          }
        }
      } catch (err) {
        console.error('Status poll error:', err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [jobId, isRunning]);

  // 작업 취소
  const handleCancel = async () => {
    if (!jobId) return;

    try {
      await optimizationApi.cancelGridSearch(jobId);
      setIsRunning(false);
      setError('작업이 취소되었습니다.');
    } catch (err) {
      console.error('Cancel error:', err);
    }
  };

  // 결과 적용
  const handleApplyResult = useCallback(
    (result: GridSearchResultItem) => {
      const newInput = { ...currentInput };

      // 조합 값 적용
      for (const [key, value] of Object.entries(result.combination)) {
        // camelCase 변환된 키로 적용
        if (key === 'electrolyzerCapacity') {
          newInput.equipment = { ...newInput.equipment, electrolyzerCapacity: value };
        } else if (key === 'electrolyzerEfficiency') {
          newInput.equipment = { ...newInput.equipment, electrolyzerEfficiency: value };
        } else if (key === 'ppaPrice') {
          newInput.cost = { ...newInput.cost, ppaPrice: value };
        } else if (key === 'h2Price') {
          newInput.market = { ...newInput.market, h2Price: value };
        } else if (key === 'capex') {
          newInput.cost = { ...newInput.cost, capex: value };
        } else if (key === 'discountRate') {
          newInput.financial = { ...newInput.financial, discountRate: value };
        } else if (key === 'debtRatio') {
          newInput.financial = { ...newInput.financial, debtRatio: value };
        } else if (key === 'annualAvailability') {
          newInput.equipment = { ...newInput.equipment, annualAvailability: value };
        }
      }

      setCurrentInput(newInput);
    },
    [currentInput, setCurrentInput]
  );

  // 설정 페이지로 이동
  const handleGoToConfig = () => {
    navigate('/config');
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-900">Grid Search 최적화</h1>
          <p className="text-dark-500 mt-1">
            선택한 변수 범위의 모든 조합을 탐색하여 최적 파라미터를 찾습니다
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌측: 설정 패널 */}
        <div className="lg:col-span-1 space-y-6">
          {/* 변수 범위 선택 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-dark-800 mb-4">
              탐색 변수 선택
            </h2>
            <VariableRangeSelector
              selectedRanges={variableRanges}
              onChange={setVariableRanges}
              maxVariables={3}
            />
          </div>

          {/* 실행 옵션 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-dark-800 mb-4">실행 옵션</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-600 mb-1">
                  최적화 대상 KPI
                </label>
                <select
                  value={targetKpi}
                  onChange={(e) => setTargetKpi(e.target.value as TargetKPI)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-hydrogen-500"
                >
                  {Object.entries(TARGET_KPI_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-600 mb-1">
                  몬테카를로 반복 횟수
                </label>
                <input
                  type="number"
                  value={monteCarloIterations}
                  onChange={(e) =>
                    setMonteCarloIterations(
                      Math.max(100, Math.min(5000, parseInt(e.target.value) || 1000))
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-hydrogen-500"
                />
                <p className="text-xs text-dark-400 mt-1">
                  값이 작을수록 빠르지만 정확도가 낮아집니다 (기본: 1000)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-600 mb-1">
                  최대 조합 수
                </label>
                <input
                  type="number"
                  value={maxCombinations}
                  onChange={(e) =>
                    setMaxCombinations(
                      Math.max(10, Math.min(5000, parseInt(e.target.value) || 1000))
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-hydrogen-500"
                />
              </div>
            </div>
          </div>

          {/* 실행 버튼 */}
          <div className="space-y-3">
            {isRunning ? (
              <button
                onClick={handleCancel}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
              >
                <StopIcon className="w-5 h-5" />
                중지
              </button>
            ) : (
              <button
                onClick={handleStart}
                disabled={variableRanges.length === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-hydrogen-500 to-primary-600 text-white rounded-xl hover:from-hydrogen-600 hover:to-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PlayIcon className="w-5 h-5" />
                Grid Search 실행
              </button>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* 우측: 결과 패널 */}
        <div className="lg:col-span-2">
          {/* 진행률 */}
          {isRunning && response && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-dark-600">진행률</span>
                <span className="text-sm text-dark-500">
                  {response.completedCombinations.toLocaleString()} /{' '}
                  {response.totalCombinations.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-hydrogen-500 to-primary-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${response.progress}%` }}
                />
              </div>
              <div className="flex items-center justify-center mt-3 text-sm text-dark-500">
                <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                탐색 중... ({response.progress.toFixed(1)}%)
              </div>
            </div>
          )}

          {/* 결과 표시 */}
          {response?.status === 'completed' && response.results.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              {/* 뷰 모드 전환 */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-dark-800">
                  탐색 결과
                  {response.bestResult && (
                    <span className="ml-2 text-sm font-normal text-hydrogen-600">
                      최적: NPV {(response.bestResult.npvP50 / 1e8).toFixed(1)}억원
                    </span>
                  )}
                </h2>

                <div className="flex items-center gap-2">
                  {response.heatmapData && (
                    <div className="flex bg-dark-100 rounded-lg p-1">
                      <button
                        onClick={() => setViewMode('table')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          viewMode === 'table'
                            ? 'bg-white text-dark-700 shadow-sm'
                            : 'text-dark-500 hover:text-dark-700'
                        }`}
                      >
                        <TableCellsIcon className="w-4 h-4" />
                        테이블
                      </button>
                      <button
                        onClick={() => setViewMode('heatmap')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          viewMode === 'heatmap'
                            ? 'bg-white text-dark-700 shadow-sm'
                            : 'text-dark-500 hover:text-dark-700'
                        }`}
                      >
                        <ChartBarIcon className="w-4 h-4" />
                        히트맵
                      </button>
                    </div>
                  )}

                  <button
                    onClick={handleGoToConfig}
                    className="px-3 py-1.5 text-sm font-medium text-hydrogen-600 hover:bg-hydrogen-50 rounded-lg transition-colors"
                  >
                    설정으로 이동
                  </button>
                </div>
              </div>

              {/* 결과 내용 */}
              {viewMode === 'table' ? (
                <ResultsTable
                  results={response.results}
                  onApply={handleApplyResult}
                />
              ) : response.heatmapData ? (
                <GridHeatmap
                  data={response.heatmapData}
                  onCellClick={(x, y, value) => {
                    // 해당 셀의 조합 찾기
                    const xVal = response.heatmapData!.xValues[x];
                    const yVal = response.heatmapData!.yValues[y];
                    const result = response.results.find(
                      (r) =>
                        r.combination[response.heatmapData!.xVariable] === xVal &&
                        r.combination[response.heatmapData!.yVariable] === yVal
                    );
                    if (result) {
                      handleApplyResult(result);
                    }
                  }}
                />
              ) : (
                <div className="text-center py-8 text-dark-400">
                  히트맵은 2개 변수를 선택했을 때만 표시됩니다.
                </div>
              )}
            </div>
          )}

          {/* 빈 상태 */}
          {!isRunning && !response && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <TableCellsIcon className="w-16 h-16 mx-auto text-dark-200 mb-4" />
              <h3 className="text-lg font-semibold text-dark-700 mb-2">
                Grid Search 대기 중
              </h3>
              <p className="text-dark-400 max-w-md mx-auto">
                왼쪽에서 탐색할 변수를 선택하고 실행 버튼을 클릭하면
                모든 조합을 탐색하여 최적 파라미터를 찾습니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
