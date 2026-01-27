import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/common';
import {
  PresetSelector,
  EquipmentConfig,
  CostConfig,
  MarketConfig,
  FinancialConfig,
  IncentivesConfig,
  RiskWeightConfig,
} from '../components/input';
import { simulationApi } from '../services/api';
import type { SimulationInput, SimulationResult } from '../types';
import { useSimulationContext } from '../contexts/SimulationContext';

export default function SimulationConfig() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { currentInput, setCurrentInput, setCurrentResult, saveScenario, currentProject } = useSimulationContext();
  const [input, setInput] = useState<SimulationInput>(currentInput);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preset' | 'equipment' | 'cost' | 'market' | 'financial' | 'incentives' | 'risk'>('preset');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [scenarioName, setScenarioName] = useState('');

  const handlePresetSelect = (presetInput: Partial<SimulationInput>) => {
    setInput((prev) => ({
      ...prev,
      ...presetInput,
      equipment: { ...prev.equipment, ...presetInput.equipment },
      cost: { ...prev.cost, ...presetInput.cost },
    }));
    setActiveTab('equipment');
  };

  // 데모 결과 생성 함수
  const generateDemoResult = () => {
    const capacity = input.equipment.electrolyzerCapacity;
    const efficiency = input.equipment.electrolyzerEfficiency / 100;
    const h2Price = input.market.h2Price;
    const capex = input.cost.capex;
    const discountRate = input.financial.discountRate / 100;
    const lifetime = input.financial.projectLifetime;
    const incentives = input.incentives;

    // 인센티브 계산
    const itcAmount = incentives.itcEnabled ? capex * incentives.itcRate / 100 : 0;
    const capexSubsidyTotal = incentives.capexSubsidy + capex * incentives.capexSubsidyRate / 100;
    const effectiveCapex = capex - itcAmount - capexSubsidyTotal;

    // 연간 kg당 추가 수익 (인센티브)
    const perKgIncentive = (
      (incentives.carbonCreditEnabled ? incentives.carbonCreditPrice : 0) +
      (incentives.cleanH2CertificationEnabled ? incentives.cleanH2Premium : 0)
    );

    // 간단한 시뮬레이션 계산
    const annualProduction = capacity * 8760 * 0.85 * efficiency * 0.018; // ton/year
    const annualRevenue = annualProduction * 1000 * (h2Price + perKgIncentive); // 원/year
    const annualOpex = capex * (input.cost.opexRatio / 100);
    const annualCashflow = annualRevenue - annualOpex;

    // NPV 계산 (인센티브 반영)
    let npv = -effectiveCapex;
    for (let i = 1; i <= lifetime; i++) {
      // 기간 제한 인센티브 (PTC, 운영보조금)
      const yearPtc = (incentives.ptcEnabled && i <= incentives.ptcDuration)
        ? annualProduction * 1000 * incentives.ptcAmount : 0;
      const yearOperatingSubsidy = (incentives.operatingSubsidy > 0 && i <= incentives.operatingSubsidyDuration)
        ? annualProduction * 1000 * incentives.operatingSubsidy : 0;

      const yearCashflow = annualCashflow + yearPtc + yearOperatingSubsidy;
      npv += yearCashflow / Math.pow(1 + discountRate, i);
    }

    // IRR 근사 계산 (실질 CAPEX 기준)
    const irr = (annualCashflow / effectiveCapex) * 100 * 0.7;

    // LCOH 계산 (실질 비용 기준)
    const totalProduction = annualProduction * lifetime;
    const totalCost = effectiveCapex + annualOpex * lifetime;
    const lcoh = (totalCost / totalProduction / 1000);

    const baseNpv = npv;

    return {
      simulationId: `demo-${Date.now()}`,
      status: 'completed' as const,
      kpis: {
        npv: { p50: baseNpv, p90: baseNpv * 0.85, p99: baseNpv * 0.7 },
        irr: { p50: irr, p90: irr * 0.9, p99: irr * 0.8 },
        dscr: { min: 1.45, avg: 1.8 },
        paybackPeriod: capex / annualCashflow,
        var95: baseNpv * -0.1,
        annualH2Production: { p50: annualProduction, p90: annualProduction * 0.9, p99: annualProduction * 0.8 },
        lcoh: lcoh,
      },
      hourlyData: {
        production: Array.from({ length: 8760 }, (_, h) => {
          const hour = h % 24;
          const dayFactor = hour >= 6 && hour <= 18 ? 1.2 : 0.8;
          return capacity * efficiency * dayFactor * (0.8 + Math.random() * 0.4);
        }),
        revenue: Array.from({ length: 8760 }, () => annualRevenue / 8760 * (0.8 + Math.random() * 0.4)),
        electricityCost: Array.from({ length: 8760 }, () => annualOpex / 8760 * 0.6 * (0.8 + Math.random() * 0.4)),
        operatingHours: Array.from({ length: 8760 }, () => (Math.random() > 0.15 ? 1 : 0)),
      },
      distributions: {
        npvHistogram: Array.from({ length: 30 }, (_, i) => ({
          bin: baseNpv * 0.5 + (baseNpv * i) / 30,
          count: Math.floor(Math.exp(-Math.pow((i - 15) / 5, 2) / 2) * 500 + 50),
        })),
        revenueHistogram: Array.from({ length: 30 }, (_, i) => ({
          bin: annualRevenue * 0.7 + (annualRevenue * 0.6 * i) / 30,
          count: Math.floor(Math.exp(-Math.pow((i - 15) / 5, 2) / 2) * 400 + 50),
        })),
      },
      sensitivity: [
        { variable: 'electricity_price', baseCase: baseNpv, lowCase: baseNpv * 1.3, highCase: baseNpv * 0.7, lowChangePct: 30, highChangePct: -30 },
        { variable: 'h2_price', baseCase: baseNpv, lowCase: baseNpv * 0.85, highCase: baseNpv * 1.15, lowChangePct: -15, highChangePct: 15 },
        { variable: 'availability', baseCase: baseNpv, lowCase: baseNpv * 0.9, highCase: baseNpv * 1.05, lowChangePct: -10, highChangePct: 5 },
        { variable: 'efficiency', baseCase: baseNpv, lowCase: baseNpv * 0.95, highCase: baseNpv * 1.03, lowChangePct: -5, highChangePct: 3 },
        { variable: 'capex', baseCase: baseNpv, lowCase: baseNpv * 1.1, highCase: baseNpv * 0.9, lowChangePct: 10, highChangePct: -10 },
      ],
      riskWaterfall: [
        { factor: '기준 NPV', impact: baseNpv * 1.2 },
        { factor: '기상 변동성', impact: baseNpv * -0.1 },
        { factor: '전력가격 변동', impact: baseNpv * -0.06 },
        { factor: '효율 저하', impact: baseNpv * -0.04 },
        { factor: '최종 NPV', impact: baseNpv },
      ],
      yearlyCashflow: Array.from({ length: lifetime }, (_, i) => {
        const yearRevenue = annualRevenue * Math.pow(1 + (input.market.h2PriceEscalation / 100), i);
        const yearOpex = annualOpex * Math.pow(1.02, i);
        const debtService = i < input.financial.loanTenor ? effectiveCapex * input.financial.debtRatio / 100 / input.financial.loanTenor * (1 + input.financial.interestRate / 100) : 0;

        // 기간 제한 인센티브 추가
        const yearPtc = (incentives.ptcEnabled && i < incentives.ptcDuration)
          ? annualProduction * 1000 * incentives.ptcAmount : 0;
        const yearOperatingSubsidy = (incentives.operatingSubsidy > 0 && i < incentives.operatingSubsidyDuration)
          ? annualProduction * 1000 * incentives.operatingSubsidy : 0;

        const netCashflow = yearRevenue - yearOpex - debtService + yearPtc + yearOperatingSubsidy;
        return {
          year: i + 1,
          revenue: yearRevenue + yearPtc + yearOperatingSubsidy, // 인센티브를 수익에 포함
          opex: yearOpex,
          debtService: debtService,
          netCashflow: netCashflow,
          cumulativeCashflow: -effectiveCapex + netCashflow * (i + 1),
        };
      }),
    };
  };

  const handleRunSimulation = async (useDemo = false) => {
    setLoading(true);
    setError(null);

    if (useDemo) {
      // 데모 모드: 프론트엔드에서 결과 생성
      const demoResult = generateDemoResult();
      setCurrentInput(input);
      setCurrentResult(demoResult);
      setLoading(false);
      navigate('/dashboard');
      return;
    }

    try {
      const result = await simulationApi.run(input, projectId);
      // Context에 저장
      setCurrentInput(input);
      setCurrentResult(result);
      navigate(`/dashboard/${result.simulationId}`);
    } catch (err) {
      console.error('Simulation failed:', err);
      setError('백엔드 서버에 연결할 수 없습니다. 데모 모드로 실행하시겠습니까?');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveScenario = async () => {
    if (!scenarioName.trim()) return;
    const description = `${input.equipment.electrolyzerCapacity} MW ${input.cost.electricitySource}, ${input.market.h2Price.toLocaleString()}원/kg`;
    const saved = await saveScenario(scenarioName, description);
    if (saved) {
      setShowSaveModal(false);
      setScenarioName('');
    }
  };

  const tabs = [
    { id: 'preset', label: '프리셋' },
    { id: 'equipment', label: '설비' },
    { id: 'cost', label: '비용' },
    { id: 'market', label: '시장' },
    { id: 'financial', label: '재무' },
    { id: 'incentives', label: '인센티브' },
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
    incentives: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
      </svg>
    ),
    risk: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  };

  return (
    <div className="max-w-7xl mx-auto">
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
        {/* 모바일: 그리드 레이아웃 */}
        <div className="grid grid-cols-4 gap-1.5 p-1.5 bg-dark-50 rounded-2xl sm:hidden">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`
                flex flex-col items-center justify-center gap-1 px-2 py-2.5 rounded-xl text-xs font-medium
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
              <span className="truncate w-full text-center">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* 데스크탑: 기존 가로 레이아웃 */}
        <div className="hidden sm:flex items-center gap-1 p-1.5 bg-dark-50 rounded-2xl">
          {tabs.map((tab) => (
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
          {activeTab === 'incentives' && (
            <IncentivesConfig
              config={input.incentives}
              costConfig={input.cost}
              onChange={(incentives) => setInput({ ...input, incentives })}
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

              {/* 인센티브 섹션 */}
              <div className="p-3 bg-gradient-to-br from-emerald-50/50 to-transparent rounded-xl">
                <h4 className="font-semibold text-dark-700 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  인센티브
                </h4>
                <div className="space-y-2 text-dark-500">
                  {(input.incentives.itcEnabled || input.incentives.capexSubsidyRate > 0 || input.incentives.capexSubsidy > 0) ? (
                    <div className="flex justify-between items-center">
                      <span>CAPEX 지원</span>
                      <span className="font-semibold text-emerald-600 bg-white px-2 py-0.5 rounded">
                        {(
                          (input.incentives.itcEnabled ? input.cost.capex * input.incentives.itcRate / 100 : 0) +
                          input.incentives.capexSubsidy +
                          input.cost.capex * input.incentives.capexSubsidyRate / 100
                        ) / 100000000}억원
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <span>CAPEX 지원</span>
                      <span className="font-semibold text-dark-400 bg-white px-2 py-0.5 rounded">없음</span>
                    </div>
                  )}
                  {(input.incentives.ptcEnabled || input.incentives.operatingSubsidy > 0 || input.incentives.carbonCreditEnabled || input.incentives.cleanH2CertificationEnabled) ? (
                    <div className="flex justify-between items-center">
                      <span>운영 지원</span>
                      <span className="font-semibold text-emerald-600 bg-white px-2 py-0.5 rounded">
                        +{(
                          (input.incentives.ptcEnabled ? input.incentives.ptcAmount : 0) +
                          input.incentives.operatingSubsidy +
                          (input.incentives.carbonCreditEnabled ? input.incentives.carbonCreditPrice : 0) +
                          (input.incentives.cleanH2CertificationEnabled ? input.incentives.cleanH2Premium : 0)
                        ).toLocaleString()}원/kg
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <span>운영 지원</span>
                      <span className="font-semibold text-dark-400 bg-white px-2 py-0.5 rounded">없음</span>
                    </div>
                  )}
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
              {error && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                  <p className="mb-2">{error}</p>
                  <Button
                    onClick={() => handleRunSimulation(true)}
                    variant="outline"
                    size="sm"
                    fullWidth
                  >
                    데모 모드로 실행
                  </Button>
                </div>
              )}
              <Button
                onClick={() => handleRunSimulation(false)}
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
              <Button
                variant="outline"
                fullWidth
                onClick={() => setShowSaveModal(true)}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                }
              >
                시나리오 저장
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 시나리오 저장 모달 */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-dark-800 mb-4">시나리오 저장</h3>
            <p className="text-sm text-dark-500 mb-4">
              현재 설정을 시나리오로 저장하여 나중에 비교할 수 있습니다.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-dark-700 mb-2">
                시나리오 이름
              </label>
              <input
                type="text"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="예: 기준 시나리오"
                className="w-full px-4 py-3 border border-dark-200 rounded-xl focus:ring-2 focus:ring-hydrogen-500/20 focus:border-hydrogen-500"
                autoFocus
              />
            </div>
            <div className="p-3 bg-dark-50 rounded-xl mb-4 text-sm text-dark-600">
              <div className="flex justify-between mb-1">
                <span>전해조 용량</span>
                <span className="font-medium">{input.equipment.electrolyzerCapacity} MW</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>전력 구매</span>
                <span className="font-medium">{input.cost.electricitySource}</span>
              </div>
              <div className="flex justify-between">
                <span>수소 판매가</span>
                <span className="font-medium">{input.market.h2Price.toLocaleString()}원/kg</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                fullWidth
                onClick={() => {
                  setShowSaveModal(false);
                  setScenarioName('');
                }}
              >
                취소
              </Button>
              <Button
                variant="gradient"
                fullWidth
                onClick={handleSaveScenario}
                disabled={!scenarioName.trim()}
              >
                저장
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
