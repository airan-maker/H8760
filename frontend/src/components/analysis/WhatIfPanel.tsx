/**
 * What-if 분석 패널
 *
 * 민감도 분석, 시나리오 비교, 히트맵 분석을 통합하여 제공
 */
import { useMemo, useState } from 'react';
import type { SimulationInput, SimulationResult } from '../../types';
import TornadoChart from '../charts/TornadoChart';
import SensitivityHeatmap from '../charts/SensitivityHeatmap';
import ScenarioComparison, { type ScenarioData } from '../charts/ScenarioComparison';

interface Props {
  input: SimulationInput;
  result: SimulationResult;
}

// 탭 정의
type TabId = 'tornado' | 'heatmap' | 'scenarios';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'tornado', label: '민감도 분석', icon: '📊' },
  { id: 'heatmap', label: '2변수 분석', icon: '🗺️' },
  { id: 'scenarios', label: '시나리오 비교', icon: '⚖️' },
];

export default function WhatIfPanel({ input, result }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('tornado');

  // 간단한 NPV/IRR 계산 함수 (민감도 분석용)
  const calculateSimpleNpv = (
    capex: number,
    h2Price: number,
    electricityPrice: number,
    efficiency: number,
    availability: number
  ): number => {
    const annualProduction = input.equipment.electrolyzerCapacity * 1000 * 8760 * (availability / 100) / (100 / efficiency * 33.33);
    const annualRevenue = annualProduction * h2Price;
    const annualElecCost = annualProduction * (100 / efficiency * 33.33) * electricityPrice;
    const annualOpex = capex * (input.cost.opexRatio / 100);
    const annualCashflow = annualRevenue - annualElecCost - annualOpex;

    let npv = -capex;
    const r = input.financial.discountRate / 100;
    for (let t = 1; t <= input.financial.projectLifetime; t++) {
      npv += annualCashflow / Math.pow(1 + r, t);
    }
    return npv;
  };

  // IRR 계산 (간단한 근사)
  const calculateSimpleIrr = (
    capex: number,
    h2Price: number,
    electricityPrice: number,
    efficiency: number,
    availability: number
  ): number => {
    const annualProduction = input.equipment.electrolyzerCapacity * 1000 * 8760 * (availability / 100) / (100 / efficiency * 33.33);
    const annualRevenue = annualProduction * h2Price;
    const annualElecCost = annualProduction * (100 / efficiency * 33.33) * electricityPrice;
    const annualOpex = capex * (input.cost.opexRatio / 100);
    const annualCashflow = annualRevenue - annualElecCost - annualOpex;

    // Newton-Raphson으로 IRR 근사
    let irr = 0.1;
    for (let iter = 0; iter < 50; iter++) {
      let npv = -capex;
      let dnpv = 0;
      for (let t = 1; t <= input.financial.projectLifetime; t++) {
        npv += annualCashflow / Math.pow(1 + irr, t);
        dnpv -= t * annualCashflow / Math.pow(1 + irr, t + 1);
      }
      if (Math.abs(dnpv) < 1e-10) break;
      const newIrr = irr - npv / dnpv;
      if (Math.abs(newIrr - irr) < 1e-6) break;
      irr = Math.max(-0.99, Math.min(5, newIrr));
    }
    return irr * 100;
  };

  // 히트맵용 계산 함수
  const heatmapCalculator = useMemo(() => {
    return (xValue: number, yValue: number): number => {
      // X: 전력가격, Y: CAPEX → IRR
      return calculateSimpleIrr(
        yValue, // CAPEX
        input.market.h2Price,
        xValue, // 전력가격
        input.equipment.electrolyzerEfficiency,
        input.equipment.annualAvailability
      );
    };
  }, [input]);

  // 시나리오 데이터 생성
  const scenarioData = useMemo<ScenarioData[]>(() => {
    const baseCapex = input.cost.capex;
    const baseH2Price = input.market.h2Price;
    const baseElecPrice = input.cost.ppaPrice || 100;
    const baseEfficiency = input.equipment.electrolyzerEfficiency;
    const baseAvailability = input.equipment.annualAvailability;

    // 낙관적 시나리오: 유리한 조건
    const optCapex = baseCapex * 0.85; // -15%
    const optH2Price = baseH2Price * 1.15; // +15%
    const optElecPrice = baseElecPrice * 0.85; // -15%
    const optEfficiency = Math.min(baseEfficiency * 1.05, 85); // +5%
    const optAvailability = Math.min(baseAvailability * 1.05, 95); // +5%

    const optNpv = calculateSimpleNpv(optCapex, optH2Price, optElecPrice, optEfficiency, optAvailability);
    const optIrr = calculateSimpleIrr(optCapex, optH2Price, optElecPrice, optEfficiency, optAvailability);

    // 비관적 시나리오: 불리한 조건
    const pessCapex = baseCapex * 1.2; // +20%
    const pessH2Price = baseH2Price * 0.85; // -15%
    const pessElecPrice = baseElecPrice * 1.25; // +25%
    const pessEfficiency = baseEfficiency * 0.95; // -5%
    const pessAvailability = baseAvailability * 0.9; // -10%

    const pessNpv = calculateSimpleNpv(pessCapex, pessH2Price, pessElecPrice, pessEfficiency, pessAvailability);
    const pessIrr = calculateSimpleIrr(pessCapex, pessH2Price, pessElecPrice, pessEfficiency, pessAvailability);

    return [
      {
        name: '낙관적',
        type: 'optimistic' as const,
        description: '기술 발전 + 정책 지원',
        assumptions: [
          { label: 'CAPEX', value: `${(optCapex / 1e8).toFixed(0)}억`, change: '-15%' },
          { label: '수소가격', value: `${optH2Price.toLocaleString()}원`, change: '+15%' },
          { label: '전력가격', value: `${optElecPrice.toFixed(0)}원`, change: '-15%' },
          { label: '가동률', value: `${optAvailability.toFixed(0)}%`, change: '+5%' },
        ],
        kpis: {
          npv: optNpv,
          irr: optIrr,
          paybackPeriod: optNpv > 0 ? Math.max(1, input.financial.projectLifetime * 0.6) : input.financial.projectLifetime,
          lcoh: result.kpis.lcoh * 0.85,
          dscr: result.kpis.dscr.min * 1.3,
        },
      },
      {
        name: '기준',
        type: 'base' as const,
        description: '현재 입력값 기준',
        assumptions: [
          { label: 'CAPEX', value: `${(baseCapex / 1e8).toFixed(0)}억` },
          { label: '수소가격', value: `${baseH2Price.toLocaleString()}원` },
          { label: '전력가격', value: `${baseElecPrice.toFixed(0)}원` },
          { label: '가동률', value: `${baseAvailability.toFixed(0)}%` },
        ],
        kpis: {
          npv: result.kpis.npv.p50,
          irr: result.kpis.irr.p50,
          paybackPeriod: result.kpis.paybackPeriod,
          lcoh: result.kpis.lcoh,
          dscr: result.kpis.dscr.min,
        },
      },
      {
        name: '비관적',
        type: 'pessimistic' as const,
        description: '비용 상승 + 시장 악화',
        assumptions: [
          { label: 'CAPEX', value: `${(pessCapex / 1e8).toFixed(0)}억`, change: '+20%' },
          { label: '수소가격', value: `${pessH2Price.toLocaleString()}원`, change: '-15%' },
          { label: '전력가격', value: `${pessElecPrice.toFixed(0)}원`, change: '+25%' },
          { label: '가동률', value: `${pessAvailability.toFixed(0)}%`, change: '-10%' },
        ],
        kpis: {
          npv: pessNpv,
          irr: pessIrr,
          paybackPeriod: pessNpv > 0 ? input.financial.projectLifetime * 0.9 : input.financial.projectLifetime,
          lcoh: result.kpis.lcoh * 1.25,
          dscr: Math.max(0.5, result.kpis.dscr.min * 0.7),
        },
      },
    ];
  }, [input, result, calculateSimpleNpv, calculateSimpleIrr]);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-dark-800">What-if 분석</h2>
          <p className="text-sm text-dark-500">변수 변동에 따른 프로젝트 수익성 변화 분석</p>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex gap-2 p-1 bg-dark-100 rounded-xl">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-dark-500 hover:text-dark-700 hover:bg-white/50'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div>
        {activeTab === 'tornado' && (
          <div className="space-y-6">
            <TornadoChart data={result.sensitivity} baseNpv={result.kpis.npv.p50} />
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
              <p className="font-medium mb-1">토네이도 차트 해석</p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-600">
                <li>막대 길이가 긴 변수일수록 프로젝트 수익성에 미치는 영향이 큽니다</li>
                <li>빨간색 영역은 변수 감소 시, 초록색 영역은 증가 시 NPV 변화를 나타냅니다</li>
                <li>가장 영향력이 큰 변수에 대한 리스크 관리가 중요합니다</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'heatmap' && (
          <div className="space-y-6">
            <SensitivityHeatmap
              baseValues={{
                xValue: input.cost.ppaPrice || 100,
                yValue: input.cost.capex,
                kpiValue: result.kpis.irr.p50,
              }}
              xVariable={{
                name: 'electricity_price',
                label: '전력가격',
                unit: '원/kWh',
                range: [(input.cost.ppaPrice || 100) * 0.6, (input.cost.ppaPrice || 100) * 1.4],
              }}
              yVariable={{
                name: 'capex',
                label: 'CAPEX',
                unit: '억원',
                range: [input.cost.capex * 0.7, input.cost.capex * 1.3],
              }}
              targetKpi="irr"
              calculateKpi={heatmapCalculator}
              gridSize={7}
            />
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
              <p className="font-medium mb-1">2변수 민감도 분석 해석</p>
              <ul className="list-disc list-inside space-y-0.5 text-amber-600">
                <li>히트맵은 두 변수를 동시에 변경했을 때의 IRR 변화를 보여줍니다</li>
                <li>초록색 영역은 높은 IRR(좋음), 빨간색 영역은 낮은 IRR(나쁨)을 의미합니다</li>
                <li>현재 기준점은 파란색 점으로 표시됩니다</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'scenarios' && (
          <div className="space-y-6">
            <ScenarioComparison scenarios={scenarioData} />
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl text-sm text-purple-700">
              <p className="font-medium mb-1">시나리오 분석 활용</p>
              <ul className="list-disc list-inside space-y-0.5 text-purple-600">
                <li><span className="font-medium">낙관적 시나리오:</span> 최상의 조건 하에서 달성 가능한 수익성</li>
                <li><span className="font-medium">기준 시나리오:</span> 현재 입력값 기반의 예상 수익성</li>
                <li><span className="font-medium">비관적 시나리오:</span> 리스크 발생 시 최악의 수익성</li>
                <li>시나리오 간 NPV 차이가 클수록 프로젝트 리스크가 높습니다</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
