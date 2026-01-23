import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/common';
import {
  PresetSelector,
  EquipmentConfig,
  CostConfig,
  MarketConfig,
  FinancialConfig,
  RiskWeightConfig,
} from '../components/input';
import { simulationApi } from '../services/api';
import type { SimulationInput } from '../types';
import { defaultSimulationInput } from '../types';

export default function SimulationConfig() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [input, setInput] = useState<SimulationInput>(defaultSimulationInput);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'preset' | 'equipment' | 'cost' | 'market' | 'financial' | 'risk'>('preset');

  const handlePresetSelect = (presetInput: Partial<SimulationInput>) => {
    setInput((prev) => ({
      ...prev,
      ...presetInput,
      equipment: { ...prev.equipment, ...presetInput.equipment },
      cost: { ...prev.cost, ...presetInput.cost },
    }));
    setActiveTab('equipment');
  };

  const handleRunSimulation = async () => {
    setLoading(true);
    try {
      const result = await simulationApi.run(input, projectId);
      // 결과를 localStorage에 저장 (데모용)
      localStorage.setItem('lastSimulationResult', JSON.stringify(result));
      localStorage.setItem('lastSimulationInput', JSON.stringify(input));
      navigate(`/dashboard/${result.simulationId}`);
    } catch (error) {
      console.error('Simulation failed:', error);
      // 에러 시에도 대시보드로 이동 (데모 데이터 사용)
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'preset', label: '프리셋' },
    { id: 'equipment', label: '설비' },
    { id: 'cost', label: '비용' },
    { id: 'market', label: '시장' },
    { id: 'financial', label: '재무' },
    { id: 'risk', label: '리스크' },
  ];

  const tabIcons = {
    preset: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
    equipment: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    cost: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    market: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    financial: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    risk: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-hydrogen-500 to-primary-500 rounded-xl shadow-lg shadow-hydrogen-500/20">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-dark-800">시뮬레이션 설정</h1>
            <p className="text-dark-500 text-sm">전해조 설비, 비용, 시장 조건을 설정하고 시뮬레이션을 실행하세요</p>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="mb-6">
        <div className="flex items-center gap-1 p-1.5 bg-dark-50 rounded-2xl overflow-x-auto">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`
                relative flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm whitespace-nowrap
                transition-all duration-300
                ${
                  activeTab === tab.id
                    ? 'bg-white text-hydrogen-700 shadow-md'
                    : 'text-dark-500 hover:text-dark-700 hover:bg-white/50'
                }
              `}
            >
              <span className={activeTab === tab.id ? 'text-hydrogen-600' : 'text-dark-400'}>
                {tabIcons[tab.id as keyof typeof tabIcons]}
              </span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {activeTab === 'preset' && (
            <PresetSelector
              onSelect={handlePresetSelect}
              onCustomSelect={() => setActiveTab('equipment')}
            />
          )}
          {activeTab === 'equipment' && (
            <EquipmentConfig
              config={input.equipment}
              onChange={(equipment) => setInput({ ...input, equipment })}
            />
          )}
          {activeTab === 'cost' && (
            <CostConfig
              config={input.cost}
              onChange={(cost) => setInput({ ...input, cost })}
            />
          )}
          {activeTab === 'market' && (
            <MarketConfig
              config={input.market}
              onChange={(market) => setInput({ ...input, market })}
            />
          )}
          {activeTab === 'financial' && (
            <FinancialConfig
              config={input.financial}
              onChange={(financial) => setInput({ ...input, financial })}
            />
          )}
          {activeTab === 'risk' && (
            <RiskWeightConfig
              riskConfig={input.riskWeights}
              mcConfig={input.monteCarlo}
              onRiskChange={(riskWeights) => setInput({ ...input, riskWeights })}
              onMcChange={(monteCarlo) => setInput({ ...input, monteCarlo })}
            />
          )}
        </div>

        {/* 요약 사이드바 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-card border border-dark-100 p-5 sticky top-20">
            <div className="flex items-center gap-2 mb-5">
              <div className="p-1.5 bg-gradient-to-br from-hydrogen-100 to-primary-100 rounded-lg">
                <svg className="w-4 h-4 text-hydrogen-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-dark-800">설정 요약</h3>
            </div>

            <div className="space-y-4 text-sm">
              {/* 설비 섹션 */}
              <div className="p-3 bg-gradient-to-br from-hydrogen-50/50 to-transparent rounded-xl">
                <h4 className="font-semibold text-dark-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-hydrogen-500"></span>
                  설비
                </h4>
                <div className="space-y-2 text-dark-500">
                  <div className="flex justify-between items-center">
                    <span>전해조 용량</span>
                    <span className="font-semibold text-dark-700 bg-white px-2 py-0.5 rounded">{input.equipment.electrolyzerCapacity} MW</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>효율</span>
                    <span className="font-semibold text-dark-700 bg-white px-2 py-0.5 rounded">{input.equipment.electrolyzerEfficiency}%</span>
                  </div>
                </div>
              </div>

              {/* 비용 섹션 */}
              <div className="p-3 bg-gradient-to-br from-primary-50/50 to-transparent rounded-xl">
                <h4 className="font-semibold text-dark-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
                  비용
                </h4>
                <div className="space-y-2 text-dark-500">
                  <div className="flex justify-between items-center">
                    <span>CAPEX</span>
                    <span className="font-semibold text-dark-700 bg-white px-2 py-0.5 rounded">
                      {(input.cost.capex / 100000000).toFixed(0)}억원
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>전력 구매</span>
                    <span className="font-semibold text-dark-700 bg-white px-2 py-0.5 rounded">{input.cost.electricitySource}</span>
                  </div>
                </div>
              </div>

              {/* 시장 섹션 */}
              <div className="p-3 bg-gradient-to-br from-emerald-50/50 to-transparent rounded-xl">
                <h4 className="font-semibold text-dark-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  시장
                </h4>
                <div className="space-y-2 text-dark-500">
                  <div className="flex justify-between items-center">
                    <span>수소 판매가</span>
                    <span className="font-semibold text-dark-700 bg-white px-2 py-0.5 rounded">{input.market.h2Price.toLocaleString()}원/kg</span>
                  </div>
                </div>
              </div>

              {/* 재무 섹션 */}
              <div className="p-3 bg-gradient-to-br from-violet-50/50 to-transparent rounded-xl">
                <h4 className="font-semibold text-dark-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
                  재무
                </h4>
                <div className="space-y-2 text-dark-500">
                  <div className="flex justify-between items-center">
                    <span>할인율</span>
                    <span className="font-semibold text-dark-700 bg-white px-2 py-0.5 rounded">{input.financial.discountRate}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>기간</span>
                    <span className="font-semibold text-dark-700 bg-white px-2 py-0.5 rounded">{input.financial.projectLifetime}년</span>
                  </div>
                </div>
              </div>

              {/* 리스크 섹션 */}
              <div className="p-3 bg-gradient-to-br from-amber-50/50 to-transparent rounded-xl">
                <h4 className="font-semibold text-dark-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  리스크
                </h4>
                <div className="space-y-2 text-dark-500">
                  <div className="flex justify-between items-center">
                    <span>신뢰 수준</span>
                    <span className="font-semibold text-dark-700 bg-white px-2 py-0.5 rounded">{input.riskWeights.confidenceLevel}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>시뮬레이션</span>
                    <span className="font-semibold text-dark-700 bg-white px-2 py-0.5 rounded">
                      {input.monteCarlo.iterations.toLocaleString()}회
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Button
                onClick={handleRunSimulation}
                variant="gradient"
                fullWidth
                loading={loading}
                size="lg"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              >
                시뮬레이션 실행
              </Button>
              <Button variant="outline" fullWidth icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              }>
                시나리오 저장
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
