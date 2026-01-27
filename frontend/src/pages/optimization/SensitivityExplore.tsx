/**
 * 민감도 기반 탐색 페이지
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlayIcon,
  ChartBarSquareIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';
import { useSimulationContext } from '../../contexts/SimulationContext';
import { optimizationApi } from '../../services/optimizationApi';
import SensitivityRanking from '../../components/optimization/SensitivityRanking';
import ContourChart from '../../components/charts/ContourChart';
import type {
  SensitivityExploreResponse,
  TargetKPI,
} from '../../types/optimization';
import { TARGET_KPI_LABELS } from '../../types/optimization';

export default function SensitivityExplore() {
  const navigate = useNavigate();
  const { currentInput, setCurrentInput } = useSimulationContext();

  // 상태
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  const [targetKpi, setTargetKpi] = useState<TargetKPI>('npv_p50');
  const [resolution, setResolution] = useState(10); // 해상도 낮춤 for 속도
  const [isRunning, setIsRunning] = useState(false);
  const [response, setResponse] = useState<SensitivityExploreResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 변수 선택 토글
  const handleSelectVariable = (variable: string) => {
    setSelectedVariables((prev) => {
      if (prev.includes(variable)) {
        return prev.filter((v) => v !== variable);
      }
      if (prev.length < 2) {
        return [...prev, variable];
      }
      return prev;
    });
  };

  // 탐색 실행
  const handleRun = async () => {
    setIsRunning(true);
    setError(null);

    try {
      const result = await optimizationApi.runSensitivityExplore(
        currentInput,
        selectedVariables.length > 0 ? selectedVariables : null,
        resolution,
        targetKpi
      );
      setResponse(result);

      // 선택된 변수가 없으면 응답에서 가져옴
      if (selectedVariables.length === 0 && result.selectedVariables.length > 0) {
        setSelectedVariables(result.selectedVariables);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '탐색 중 오류가 발생했습니다.');
    } finally {
      setIsRunning(false);
    }
  };

  // 최적점 적용
  const handleApplyOptimal = () => {
    if (!response?.contourData?.optimalPoint) return;

    const { optimalPoint, xVariable, yVariable } = response.contourData;
    const newInput = { ...currentInput };

    // 변수 적용
    const applyValue = (variable: string, value: number) => {
      if (variable === 'electrolyzerCapacity') {
        newInput.equipment = { ...newInput.equipment, electrolyzerCapacity: value };
      } else if (variable === 'electrolyzerEfficiency') {
        newInput.equipment = { ...newInput.equipment, electrolyzerEfficiency: value };
      } else if (variable === 'ppaPrice') {
        newInput.cost = { ...newInput.cost, ppaPrice: value };
      } else if (variable === 'h2Price') {
        newInput.market = { ...newInput.market, h2Price: value };
      } else if (variable === 'capex') {
        newInput.cost = { ...newInput.cost, capex: value };
      } else if (variable === 'discountRate') {
        newInput.financial = { ...newInput.financial, discountRate: value };
      } else if (variable === 'debtRatio') {
        newInput.financial = { ...newInput.financial, debtRatio: value };
      } else if (variable === 'annualAvailability') {
        newInput.equipment = { ...newInput.equipment, annualAvailability: value };
      }
    };

    applyValue(xVariable, optimalPoint.x);
    applyValue(yVariable, optimalPoint.y);

    setCurrentInput(newInput);
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-900">민감도 기반 탐색</h1>
          <p className="text-dark-500 mt-1">
            영향력이 큰 변수를 식별하고 최적 영역을 탐색합니다
          </p>
        </div>
      </div>

      {/* 사용 가이드 */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-100 p-5">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-white rounded-xl shadow-sm">
            <ChartBarSquareIcon className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-semibold text-dark-800">민감도 탐색이란?</h3>
              <p className="text-sm text-dark-600 mt-1">
                프로젝트 수익성에 <strong>가장 큰 영향을 미치는 변수</strong>를 먼저 파악한 후,
                해당 변수들의 조합에서 최적 영역을 등고선 차트로 시각화합니다.
                "어디에 집중해야 할까?"에 대한 답을 제공합니다.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-white/60 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-700 mb-2">Step 1: 민감도 순위 확인</p>
                <p className="text-sm text-dark-600">
                  1위: <span className="font-medium">수소가격</span> (영향도 35%)<br/>
                  2위: <span className="font-medium">전력가격</span> (영향도 28%)<br/>
                  3위: <span className="font-medium">CAPEX</span> (영향도 18%)
                </p>
                <p className="text-xs text-dark-500 mt-2">
                  "어떤 변수가 NPV에 가장 큰 영향을 줄까?"
                </p>
              </div>

              <div className="bg-white/60 rounded-xl p-3">
                <p className="text-xs font-semibold text-orange-700 mb-2">Step 2: 등고선 탐색</p>
                <p className="text-sm text-dark-600">
                  <span className="font-medium">수소가격</span> × <span className="font-medium">전력가격</span> 조합에서<br/>
                  NPV가 가장 높은 영역 = 빨간색 구간
                </p>
                <p className="text-xs text-dark-500 mt-2">
                  "두 변수의 조합에서 최적 구간은 어디인가?"
                </p>
              </div>
            </div>

            <div className="text-xs text-dark-500 pt-1 border-t border-amber-100">
              <strong>Tip:</strong> 변수를 선택하지 않고 실행하면 자동으로 영향력이 가장 큰 2개 변수를 선택합니다.
              Grid Search보다 적은 계산으로 핵심 변수의 최적 영역을 빠르게 파악할 수 있습니다.
            </div>
          </div>
        </div>
      </div>

      {/* 기준 시나리오 요약 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-dark-700">기준 시나리오 설정</h3>
          <span className="text-xs text-dark-400">이 값을 기준으로 민감도를 분석합니다</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-sm">
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-dark-400">전해조 용량</div>
            <div className="font-semibold text-dark-700">{currentInput.equipment.electrolyzerCapacity} MW</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-dark-400">효율</div>
            <div className="font-semibold text-dark-700">{currentInput.equipment.electrolyzerEfficiency}%</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-dark-400">CAPEX</div>
            <div className="font-semibold text-dark-700">{(currentInput.cost.capex / 1e8).toFixed(0)}억원</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-dark-400">전력가격</div>
            <div className="font-semibold text-dark-700">{currentInput.cost.ppaPrice || 100}원/kWh</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-dark-400">수소가격</div>
            <div className="font-semibold text-dark-700">{currentInput.market.h2Price.toLocaleString()}원/kg</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-dark-400">할인율</div>
            <div className="font-semibold text-dark-700">{currentInput.financial.discountRate}%</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌측: 설정 및 민감도 순위 */}
        <div className="lg:col-span-1 space-y-6">
          {/* 실행 옵션 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-dark-800 mb-4">탐색 옵션</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-600 mb-1">
                  분석 대상 KPI
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
                  등고선 해상도
                </label>
                <div className="relative py-2">
                  <div className="absolute top-1/2 left-0 right-0 h-2 -translate-y-1/2 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full" />
                  <input
                    type="range"
                    min={5}
                    max={25}
                    value={resolution}
                    onChange={(e) => setResolution(parseInt(e.target.value))}
                    className="relative w-full z-10"
                  />
                </div>
                <div className="flex justify-between text-xs text-dark-400 mt-1">
                  <span>빠름 (5x5)</span>
                  <span className="font-medium text-dark-600">
                    {resolution}x{resolution}
                  </span>
                  <span>정밀 (25x25)</span>
                </div>
              </div>

              <button
                onClick={handleRun}
                disabled={isRunning}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-hydrogen-500 to-primary-600 text-white rounded-xl hover:from-hydrogen-600 hover:to-primary-700 transition-colors disabled:opacity-50"
              >
                {isRunning ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    탐색 중...
                  </>
                ) : (
                  <>
                    <PlayIcon className="w-5 h-5" />
                    민감도 탐색 실행
                  </>
                )}
              </button>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* 민감도 순위 */}
          {response?.sensitivityRanking && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-dark-800 mb-4">
                민감도 순위
              </h2>
              <SensitivityRanking
                ranking={response.sensitivityRanking}
                selectedVariables={selectedVariables}
                onSelectVariable={handleSelectVariable}
                maxSelect={2}
              />

              {selectedVariables.length === 2 && (
                <button
                  onClick={handleRun}
                  disabled={isRunning}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-hydrogen-50 text-hydrogen-600 rounded-lg hover:bg-hydrogen-100 transition-colors"
                >
                  <ChartBarSquareIcon className="w-4 h-4" />
                  선택 변수로 등고선 분석
                </button>
              )}
            </div>
          )}
        </div>

        {/* 우측: 결과 표시 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 등고선 차트 */}
          {response?.contourData && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-dark-800">
                  등고선 분석
                </h2>
                {response.contourData.optimalPoint && (
                  <button
                    onClick={handleApplyOptimal}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-gradient-to-r from-hydrogen-500 to-primary-600 text-white rounded-lg hover:from-hydrogen-600 hover:to-primary-700 transition-colors"
                  >
                    최적점 적용
                  </button>
                )}
              </div>

              <ContourChart data={response.contourData} targetKpi={targetKpi} />
            </div>
          )}

          {/* 추천 사항 */}
          {response?.recommendations && response.recommendations.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-dark-800 mb-4 flex items-center gap-2">
                <LightBulbIcon className="w-5 h-5 text-yellow-500" />
                인사이트 및 추천
              </h2>

              <div className="space-y-3">
                {response.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-yellow-50/50 rounded-lg"
                  >
                    <div className="w-6 h-6 rounded-full bg-yellow-400 text-yellow-900 flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-dark-700">{rec}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate('/config')}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-dark-600 hover:bg-gray-50 transition-colors"
              >
                설정 페이지로 이동하여 값 조정
              </button>
            </div>
          )}

          {/* 빈 상태 */}
          {!isRunning && !response && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <ChartBarSquareIcon className="w-16 h-16 mx-auto text-dark-200 mb-4" />
              <h3 className="text-lg font-semibold text-dark-700 mb-2">
                민감도 탐색 대기 중
              </h3>
              <p className="text-dark-400 max-w-md mx-auto">
                "민감도 탐색 실행" 버튼을 클릭하면 각 변수가 NPV에 미치는 영향을
                분석하고, 선택한 변수 조합의 등고선을 생성합니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
