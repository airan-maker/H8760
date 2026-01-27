/**
 * AI 기반 최적화 페이지
 */
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SparklesIcon,
  PlayIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';
import { useSimulationContext } from '../../contexts/SimulationContext';
import { optimizationApi } from '../../services/optimizationApi';
import TargetSelector from '../../components/optimization/TargetSelector';
import RecommendationCard from '../../components/optimization/RecommendationCard';
import type {
  KPITarget,
  VariableConstraint,
  AIOptimizeResponse,
  AIRecommendation,
} from '../../types/optimization';

export default function AIOptimize() {
  const navigate = useNavigate();
  const { currentInput, currentResult, setCurrentInput } = useSimulationContext();

  // 상태
  const [targets, setTargets] = useState<KPITarget[]>([
    { kpi: 'npv', condition: '>=', value: 100, priority: 1 },
  ]);
  const [constraints, setConstraints] = useState<VariableConstraint[]>([]);
  const [useSensitivity, setUseSensitivity] = useState(true);
  const [maxIterations, setMaxIterations] = useState(5);

  // 실행 상태
  const [isRunning, setIsRunning] = useState(false);
  const [response, setResponse] = useState<AIOptimizeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRank, setSelectedRank] = useState<number | null>(null);

  // 기준 KPI (현재 결과에서)
  const baseKpis = currentResult
    ? {
        npv_p50: currentResult.kpis.npv.p50,
        irr_p50: currentResult.kpis.irr.p50,
        lcoh: currentResult.kpis.lcoh,
        dscr_min: currentResult.kpis.dscr.min,
      }
    : undefined;

  // AI 최적화 실행
  const handleRun = async () => {
    if (targets.length === 0) {
      setError('최소 1개의 목표를 설정해주세요.');
      return;
    }

    setIsRunning(true);
    setError(null);
    setResponse(null);
    setSelectedRank(null);

    try {
      const result = await optimizationApi.runAIOptimization(
        currentInput,
        targets,
        constraints,
        useSensitivity,
        maxIterations
      );
      setResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 최적화 중 오류가 발생했습니다.');
    } finally {
      setIsRunning(false);
    }
  };

  // 추천 적용
  const handleApplyRecommendation = useCallback(
    (recommendation: AIRecommendation) => {
      const newInput = { ...currentInput };
      const values = recommendation.recommendedInput;

      // 변수 적용
      for (const [key, value] of Object.entries(values)) {
        const numValue = Number(value);
        if (key === 'electrolyzerCapacity' || key === 'electrolyzer_capacity') {
          newInput.equipment = { ...newInput.equipment, electrolyzerCapacity: numValue };
        } else if (key === 'electrolyzerEfficiency' || key === 'electrolyzer_efficiency') {
          newInput.equipment = { ...newInput.equipment, electrolyzerEfficiency: numValue };
        } else if (key === 'ppaPrice' || key === 'ppa_price') {
          newInput.cost = { ...newInput.cost, ppaPrice: numValue };
        } else if (key === 'h2Price' || key === 'h2_price') {
          newInput.market = { ...newInput.market, h2Price: numValue };
        } else if (key === 'capex') {
          newInput.cost = { ...newInput.cost, capex: numValue };
        } else if (key === 'discountRate' || key === 'discount_rate') {
          newInput.financial = { ...newInput.financial, discountRate: numValue };
        } else if (key === 'debtRatio' || key === 'debt_ratio') {
          newInput.financial = { ...newInput.financial, debtRatio: numValue };
        } else if (key === 'annualAvailability' || key === 'annual_availability') {
          newInput.equipment = { ...newInput.equipment, annualAvailability: numValue };
        }
      }

      setCurrentInput(newInput);
      setSelectedRank(recommendation.rank);
    },
    [currentInput, setCurrentInput]
  );

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 flex items-center gap-2">
            <SparklesIcon className="w-7 h-7 text-hydrogen-500" />
            AI 기반 최적화
          </h1>
          <p className="text-dark-500 mt-1">
            Claude AI가 목표 KPI를 달성할 수 있는 최적의 파라미터 조합을 추천합니다
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌측: 설정 패널 */}
        <div className="lg:col-span-1 space-y-6">
          {/* 목표 설정 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-dark-800 mb-4">
              목표 KPI 설정
            </h2>
            <TargetSelector targets={targets} onChange={setTargets} maxTargets={4} />

            {/* 현재 KPI 참조 */}
            {baseKpis && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-dark-400 mb-2">현재 시뮬레이션 결과</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-dark-500">NPV:</span>{' '}
                    <span className="font-medium">
                      {(baseKpis.npv_p50 / 1e8).toFixed(1)}억
                    </span>
                  </div>
                  <div>
                    <span className="text-dark-500">IRR:</span>{' '}
                    <span className="font-medium">{baseKpis.irr_p50.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-dark-500">LCOH:</span>{' '}
                    <span className="font-medium">
                      {baseKpis.lcoh.toLocaleString()}원
                    </span>
                  </div>
                  <div>
                    <span className="text-dark-500">DSCR:</span>{' '}
                    <span className="font-medium">{baseKpis.dscr_min.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 추가 옵션 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-dark-800 mb-4">추가 옵션</h2>

            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={useSensitivity}
                  onChange={(e) => setUseSensitivity(e.target.checked)}
                  className="w-4 h-4 rounded text-hydrogen-500 focus:ring-hydrogen-500"
                />
                <div>
                  <div className="text-sm font-medium text-dark-700">
                    민감도 분석 참조
                  </div>
                  <div className="text-xs text-dark-400">
                    영향력 큰 변수를 우선 조정합니다
                  </div>
                </div>
              </label>

              <div>
                <label className="block text-sm font-medium text-dark-600 mb-1">
                  최대 추천 수
                </label>
                <input
                  type="number"
                  value={maxIterations}
                  onChange={(e) =>
                    setMaxIterations(Math.max(1, Math.min(10, parseInt(e.target.value) || 3)))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-hydrogen-500"
                  min={1}
                  max={10}
                />
              </div>
            </div>
          </div>

          {/* 실행 버튼 */}
          <button
            onClick={handleRun}
            disabled={isRunning || targets.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-gradient-to-r from-hydrogen-500 to-primary-600 text-white rounded-xl hover:from-hydrogen-600 hover:to-primary-700 transition-colors disabled:opacity-50 shadow-lg shadow-hydrogen-500/30"
          >
            {isRunning ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                AI 분석 중...
              </>
            ) : (
              <>
                <SparklesIcon className="w-5 h-5" />
                AI 최적화 실행
              </>
            )}
          </button>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* 우측: 결과 패널 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 분석 요약 */}
          {response?.analysisSummary && (
            <div className="bg-gradient-to-r from-hydrogen-50 to-primary-50 rounded-2xl p-6 border border-hydrogen-200">
              <div className="flex items-start gap-3">
                <LightBulbIcon className="w-6 h-6 text-hydrogen-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-dark-800 mb-1">AI 분석 요약</h3>
                  <p className="text-dark-600">{response.analysisSummary}</p>
                </div>
              </div>
            </div>
          )}

          {/* 추천 결과 */}
          {response?.recommendations && response.recommendations.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-dark-800">
                  AI 추천 결과
                </h2>
                <button
                  onClick={() => navigate('/config')}
                  className="text-sm text-hydrogen-600 hover:text-hydrogen-700"
                >
                  설정 페이지로 이동 →
                </button>
              </div>

              {response.recommendations.map((rec) => (
                <RecommendationCard
                  key={rec.rank}
                  recommendation={rec}
                  baseKpis={baseKpis}
                  isSelected={selectedRank === rec.rank}
                  onApply={() => handleApplyRecommendation(rec)}
                />
              ))}
            </div>
          )}

          {/* 빈 상태 */}
          {!isRunning && !response && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <SparklesIcon className="w-16 h-16 mx-auto text-hydrogen-200 mb-4" />
              <h3 className="text-lg font-semibold text-dark-700 mb-2">
                AI 최적화 대기 중
              </h3>
              <p className="text-dark-400 max-w-md mx-auto">
                왼쪽에서 달성하고 싶은 목표 KPI를 설정하고 "AI 최적화 실행" 버튼을
                클릭하면 Claude AI가 최적의 파라미터 조합을 추천합니다.
              </p>

              {!currentResult && (
                <div className="mt-6 p-4 bg-amber-50 rounded-lg">
                  <p className="text-sm text-amber-700">
                    💡 더 정확한 분석을 위해{' '}
                    <button
                      onClick={() => navigate('/config')}
                      className="text-amber-800 font-medium underline"
                    >
                      설정 페이지
                    </button>
                    에서 먼저 시뮬레이션을 실행해주세요.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 로딩 상태 */}
          {isRunning && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 border-4 border-hydrogen-200 rounded-full" />
                <div className="absolute inset-0 border-4 border-hydrogen-500 rounded-full border-t-transparent animate-spin" />
                <SparklesIcon className="absolute inset-0 m-auto w-8 h-8 text-hydrogen-500" />
              </div>
              <h3 className="text-lg font-semibold text-dark-700 mb-2">
                AI가 분석 중입니다
              </h3>
              <p className="text-dark-400">
                민감도 분석 및 최적 파라미터 탐색 중...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
