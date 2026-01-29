import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/common';
import { KPICards } from '../components/dashboard';
import {
  DistributionHistogram,
  WaterfallChart,
  TornadoChart,
  Heatmap8760,
  CashflowChart,
} from '../components/charts';
import { AIInsightsPanel, SectionExplainer, WhatIfPanel } from '../components/analysis';
import type { SimulationResult, SimulationInput } from '../types';
import type { SimulationContext } from '../types/analysis';
import { useSimulationContext } from '../contexts/SimulationContext';
import { useAuth } from '../contexts/AuthContext';

// CSV 내보내기를 위한 유틸리티 함수
const generateSimulationCSV = (input: SimulationInput, result: SimulationResult): string => {
  const lines: string[] = [];
  const addSection = (title: string) => {
    lines.push('');
    lines.push(`=== ${title} ===`);
  };
  const addRow = (label: string, value: string | number, unit?: string, formula?: string) => {
    const formattedValue = typeof value === 'number'
      ? value.toLocaleString('ko-KR')
      : value;
    lines.push(`"${label}","${formattedValue}","${unit || ''}","${formula || ''}"`);
  };

  // 헤더
  lines.push('항목,값,단위,계산식/설명');

  // ========== 1. 시뮬레이션 기본 정보 ==========
  addSection('1. 시뮬레이션 기본 정보');
  addRow('시뮬레이션 ID', result.simulationId);
  addRow('생성 일시', new Date().toLocaleString('ko-KR'));
  addRow('시뮬레이션 상태', result.status);

  // ========== 2. 입력 변수 - 설비 사양 ==========
  addSection('2. 입력 변수 - 설비 사양');
  addRow('전해조 용량', input.equipment.electrolyzerCapacity, 'MW', '수소 생산 설비 규모');
  addRow('전해조 효율', input.equipment.electrolyzerEfficiency, '%', '전기 → 수소 변환 효율 (LHV 기준)');
  addRow('비소비량', input.equipment.specificConsumption, 'kWh/kg', '수소 1kg 생산에 필요한 전력량');
  addRow('효율 저하율', input.equipment.degradationRate, '%/년', '연간 성능 저하율');
  addRow('스택 수명', input.equipment.stackLifetime, '시간', '스택 교체 주기');
  addRow('연간 가동률', input.equipment.annualAvailability, '%', '계획/비계획 정지 반영');

  // ========== 3. 입력 변수 - 비용 구조 ==========
  addSection('3. 입력 변수 - 비용 구조');
  addRow('CAPEX (초기투자비)', input.cost.capex, '원', '설비 구매 및 설치 비용');
  addRow('CAPEX (억원)', Math.round(input.cost.capex / 100000000), '억원');
  addRow('OPEX 비율', input.cost.opexRatio, '% of CAPEX', '연간 운영비 = CAPEX × OPEX비율');
  addRow('연간 OPEX', Math.round(input.cost.capex * input.cost.opexRatio / 100), '원');
  addRow('스택 교체비용', input.cost.stackReplacementCost, '원');
  addRow('전력 구매 방식', input.cost.electricitySource);
  addRow('PPA 가격', input.cost.ppaPrice || 0, '원/kWh', '전력 구매 단가');

  // ========== 4. 입력 변수 - 시장 조건 ==========
  addSection('4. 입력 변수 - 시장 조건');
  addRow('수소 판매 가격', input.market.h2Price, '원/kg', '판매 단가');
  addRow('수소 가격 상승률', input.market.h2PriceEscalation, '%/년', '연간 가격 인상율');
  addRow('전력 가격 시나리오', input.market.electricityPriceScenario);

  // ========== 5. 입력 변수 - 재무 조건 ==========
  addSection('5. 입력 변수 - 재무 조건');
  addRow('할인율', input.financial.discountRate, '%', 'NPV 계산에 사용되는 WACC');
  addRow('프로젝트 기간', input.financial.projectLifetime, '년');
  addRow('부채 비율', input.financial.debtRatio, '%', '총 투자 대비 차입금 비율');
  addRow('차입금', Math.round(input.cost.capex * input.financial.debtRatio / 100), '원', 'CAPEX × 부채비율');
  addRow('자기자본', Math.round(input.cost.capex * (100 - input.financial.debtRatio) / 100), '원', 'CAPEX × (1 - 부채비율)');
  addRow('대출 이자율', input.financial.interestRate, '%');
  addRow('대출 기간', input.financial.loanTenor, '년');
  addRow('건설 기간', input.financial.constructionPeriod, '년', 'CAPEX 투입 기간');
  addRow('거치 기간', input.financial.gracePeriod, '년', '이자만 납부하는 기간');
  addRow('상환 방식', input.financial.repaymentMethod === 'equal_payment' ? '원리금균등' : '원금균등');
  addRow('운전자본 개월수', input.financial.workingCapitalMonths, '개월', 'OPEX 기준 초기 운영자금');
  addRow('IDC 포함 여부', input.financial.includeIdc ? '예' : '아니오', '', '건설기간 이자 자본화');
  addRow('CAPEX 분할', input.financial.capexSchedule?.join(', ') || '1.0', '', '건설기간별 투입 비율');

  // ========== 6. 입력 변수 - 인센티브 ==========
  addSection('6. 입력 변수 - 인센티브');
  addRow('투자세액공제(ITC) 활성화', input.incentives.itcEnabled ? '예' : '아니오');
  addRow('ITC 비율', input.incentives.itcRate, '%', 'CAPEX 대비 세액공제율');
  addRow('ITC 금액', input.incentives.itcEnabled ? Math.round(input.cost.capex * input.incentives.itcRate / 100) : 0, '원');
  addRow('생산세액공제(PTC) 활성화', input.incentives.ptcEnabled ? '예' : '아니오');
  addRow('PTC 금액', input.incentives.ptcAmount, '원/kg');
  addRow('PTC 적용 기간', input.incentives.ptcDuration, '년');
  addRow('CAPEX 보조금', input.incentives.capexSubsidy, '원');
  addRow('CAPEX 보조금율', input.incentives.capexSubsidyRate, '%');
  addRow('운영 보조금', input.incentives.operatingSubsidy, '원/kg');
  addRow('운영 보조금 기간', input.incentives.operatingSubsidyDuration, '년');
  addRow('탄소배출권 활성화', input.incentives.carbonCreditEnabled ? '예' : '아니오');
  addRow('탄소배출권 가격', input.incentives.carbonCreditPrice, '원/kg');
  addRow('청정수소인증 활성화', input.incentives.cleanH2CertificationEnabled ? '예' : '아니오');
  addRow('청정수소 프리미엄', input.incentives.cleanH2Premium, '원/kg');

  // ========== 7. 입력 변수 - 몬테카를로 설정 ==========
  addSection('7. 입력 변수 - 몬테카를로 설정');
  addRow('시뮬레이션 반복 횟수', input.monteCarlo.iterations, '회');
  addRow('기상 변동성 (σ)', input.monteCarlo.weatherSigma, '', '표준편차');
  addRow('가격 변동성 (σ)', input.monteCarlo.priceSigma, '', '표준편차');
  addRow('기상 변동성 반영', input.riskWeights.weatherVariability ? '예' : '아니오');
  addRow('가격 변동성 반영', input.riskWeights.priceVolatility ? '예' : '아니오');
  addRow('신뢰 수준', input.riskWeights.confidenceLevel);

  // ========== 8. 계산 공식 설명 ==========
  addSection('8. 핵심 계산 공식');
  addRow('수소 생산량', '전력(MW) × 1000 × 가동시간 × 효율 / 비소비량', 'kg', 'H2 = P × 1000 × h × η / SEC');
  addRow('연간 생산량', `${input.equipment.electrolyzerCapacity} × 1000 × 8760 × ${input.equipment.annualAvailability}% / ${input.equipment.specificConsumption}`, 'kg/년');
  addRow('NPV 공식', 'NPV = -CAPEX + Σ(CF_t / (1+r)^t)', '원', '순현재가치 = 초기투자 + 미래현금흐름의 현재가치 합');
  addRow('IRR 공식', 'NPV = 0 이 되는 r', '%', '내부수익률 (Newton-Raphson 방식으로 계산)');
  addRow('LCOH 공식', 'LCOH = Σ(비용_PV) / Σ(생산량_PV)', '원/kg', '균등화 수소 비용');
  addRow('DSCR 공식', 'DSCR = EBITDA / 원리금상환액', '', '부채상환비율');
  addRow('원리금균등상환', 'PMT = P × r(1+r)^n / ((1+r)^n - 1)', '원/년', 'P=원금, r=이자율, n=기간');
  addRow('VaR 95%', '몬테카를로 분포의 5번째 백분위수', '원', '5% 확률로 발생 가능한 최대 손실');

  // ========== 9. 자본 구조 요약 (Bankability 2순위) ==========
  if (result.capitalSummary) {
    addSection('9. 자본 구조 요약');
    addRow('기본 CAPEX', result.capitalSummary.totalCapex, '원');
    addRow('기본 CAPEX', Math.round(result.capitalSummary.totalCapex / 100000000), '억원');
    addRow('IDC (건설기간 이자)', result.capitalSummary.idcAmount, '원', '건설기간 동안 발생한 이자 자본화');
    addRow('IDC', Math.round(result.capitalSummary.idcAmount / 100000000), '억원');
    addRow('총 투자비 (IDC 포함)', result.capitalSummary.totalCapexWithIdc, '원');
    addRow('총 투자비', Math.round(result.capitalSummary.totalCapexWithIdc / 100000000), '억원');
    addRow('부채 금액', result.capitalSummary.debtAmount, '원');
    addRow('부채 금액', Math.round(result.capitalSummary.debtAmount / 100000000), '억원');
    addRow('자기자본 금액', result.capitalSummary.equityAmount, '원');
    addRow('자기자본 금액', Math.round(result.capitalSummary.equityAmount / 100000000), '억원');
    addRow('운전자본', result.capitalSummary.workingCapital, '원', '초기 운영자금 (프로젝트 종료시 회수)');
    addRow('운전자본', Math.round(result.capitalSummary.workingCapital / 100000000), '억원');
    addRow('잔존가치', result.capitalSummary.salvageValue, '원', '프로젝트 종료시 자산 가치');
    addRow('잔존가치', Math.round(result.capitalSummary.salvageValue / 100000000), '억원');
  }

  // ========== 10. KPI 결과 ==========
  addSection('10. KPI 결과');
  addRow('NPV (P50)', result.kpis.npv.p50, '원', '50% 확률로 이 값 이상');
  addRow('NPV (P50) 억원', Math.round(result.kpis.npv.p50 / 100000000), '억원');
  addRow('NPV (P90)', result.kpis.npv.p90, '원', '90% 확률로 이 값 이상');
  addRow('NPV (P99)', result.kpis.npv.p99, '원', '99% 확률로 이 값 이상');
  // Bankability 추가 지표
  if (result.kpis.npvAfterTax) {
    addRow('NPV 세후 (P50)', result.kpis.npvAfterTax.p50, '원', '법인세 반영');
    addRow('NPV 세후 (P50) 억원', Math.round(result.kpis.npvAfterTax.p50 / 100000000), '억원');
  }
  addRow('Project IRR (P50)', result.kpis.irr.p50, '%');
  addRow('Project IRR (P90)', result.kpis.irr.p90, '%');
  addRow('Project IRR (P99)', result.kpis.irr.p99, '%');
  if (result.kpis.equityIrr) {
    addRow('Equity IRR (P50)', result.kpis.equityIrr.p50, '%', '자기자본 수익률');
    addRow('Equity IRR (P90)', result.kpis.equityIrr.p90, '%');
  }
  addRow('DSCR (최소)', result.kpis.dscr.min, '', '최소 부채상환비율');
  addRow('DSCR (평균)', result.kpis.dscr.avg, '', '평균 부채상환비율');
  if (result.kpis.coverageRatios) {
    addRow('LLCR', result.kpis.coverageRatios.llcr, '', 'Loan Life Coverage Ratio');
    addRow('PLCR', result.kpis.coverageRatios.plcr, '', 'Project Life Coverage Ratio');
  }
  addRow('투자회수기간', result.kpis.paybackPeriod, '년');
  addRow('VaR 95%', result.kpis.var95, '원', '최악 시나리오 손실');
  addRow('LCOH', result.kpis.lcoh, '원/kg', '균등화 수소 비용');
  addRow('연간 수소 생산량 (P50)', result.kpis.annualH2Production.p50, '톤/년');
  addRow('연간 수소 생산량 (P90)', result.kpis.annualH2Production.p90, '톤/년');
  addRow('연간 수소 생산량 (P99)', result.kpis.annualH2Production.p99, '톤/년');

  // ========== 11. 연간 현금흐름 ==========
  addSection('11. 연간 현금흐름 상세');
  lines.push('년도,수익(원),운영비(원),감가상각(원),EBITDA(원),EBIT(원),이자비용(원),원금상환(원),법인세(원),세전순현금흐름(원),세후순현금흐름(원),누적현금흐름(원),DSCR');
  result.yearlyCashflow.forEach(cf => {
    lines.push(`${cf.year},${cf.revenue},${cf.opex},${cf.depreciation || 0},${cf.ebitda || 0},${cf.ebit || 0},${cf.interestExpense || 0},${cf.principalRepayment || 0},${cf.tax || 0},${cf.netCashflow},${cf.netCashflowAfterTax || cf.netCashflow},${cf.cumulativeCashflow},${cf.dscr || 0}`);
  });

  // ========== 12. 민감도 분석 ==========
  addSection('12. 민감도 분석 결과');
  lines.push('변수,기준 NPV(원),하한 NPV(원),상한 NPV(원),하한 변화율(%),상한 변화율(%)');
  result.sensitivity.forEach(s => {
    const varName = {
      'electricity_price': '전력 가격',
      'h2_price': '수소 가격',
      'availability': '가동률',
      'efficiency': '효율',
      'capex': 'CAPEX'
    }[s.variable] || s.variable;
    lines.push(`"${varName}",${s.baseCase},${s.lowCase},${s.highCase},${s.lowChangePct},${s.highChangePct}`);
  });

  // ========== 13. 리스크 폭포수 ==========
  addSection('13. 리스크 폭포수');
  lines.push('요인,영향(원),영향(억원)');
  result.riskWaterfall.forEach(r => {
    lines.push(`"${r.factor}",${r.impact},${Math.round(r.impact / 100000000)}`);
  });

  // ========== 14. NPV 분포 히스토그램 ==========
  addSection('14. NPV 분포 (몬테카를로)');
  lines.push('구간(원),빈도');
  result.distributions.npvHistogram.forEach(bin => {
    lines.push(`${bin.bin},${bin.count}`);
  });

  // ========== 15. 검증용 중간 계산값 ==========
  addSection('15. 검증용 중간 계산값');
  const annualProduction = input.equipment.electrolyzerCapacity * 1000 * 8760 * (input.equipment.annualAvailability / 100) / input.equipment.specificConsumption;
  const annualRevenue = annualProduction * input.market.h2Price;
  const annualOpex = input.cost.capex * (input.cost.opexRatio / 100);
  const annualElecCost = annualProduction * input.equipment.specificConsumption * (input.cost.ppaPrice || 0);
  const grossMargin = annualRevenue - annualElecCost - annualOpex;
  const debtAmount = input.cost.capex * (input.financial.debtRatio / 100);
  const equityAmount = input.cost.capex - debtAmount;

  addRow('연간 이론 생산량', Math.round(annualProduction), 'kg', `${input.equipment.electrolyzerCapacity}MW × 8760h × ${input.equipment.annualAvailability}% / ${input.equipment.specificConsumption}kWh/kg`);
  addRow('연간 이론 생산량', Math.round(annualProduction / 1000), '톤');
  addRow('연간 전력 소비량', Math.round(annualProduction * input.equipment.specificConsumption), 'kWh', '생산량 × 비소비량');
  addRow('연간 전력 소비량', Math.round(annualProduction * input.equipment.specificConsumption / 1000000), 'MWh');
  addRow('연간 예상 수익', Math.round(annualRevenue), '원', '생산량 × 수소가격');
  addRow('연간 예상 수익', Math.round(annualRevenue / 100000000), '억원');
  addRow('연간 전력비', Math.round(annualElecCost), '원', '전력소비 × PPA가격');
  addRow('연간 전력비', Math.round(annualElecCost / 100000000), '억원');
  addRow('연간 OPEX', Math.round(annualOpex), '원');
  addRow('연간 OPEX', Math.round(annualOpex / 100000000), '억원');
  addRow('연간 총비용', Math.round(annualElecCost + annualOpex), '원', '전력비 + OPEX');
  addRow('연간 총비용', Math.round((annualElecCost + annualOpex) / 100000000), '억원');
  addRow('연간 매출총이익', Math.round(grossMargin), '원', '수익 - 전력비 - OPEX');
  addRow('연간 매출총이익', Math.round(grossMargin / 100000000), '억원');
  addRow('차입금 (Debt)', Math.round(debtAmount), '원');
  addRow('차입금 (Debt)', Math.round(debtAmount / 100000000), '억원');
  addRow('자기자본 (Equity)', Math.round(equityAmount), '원');
  addRow('자기자본 (Equity)', Math.round(equityAmount / 100000000), '억원');

  // 단순 NPV 계산 (검증용)
  const r = input.financial.discountRate / 100;
  let simpleNPV = -input.cost.capex;
  for (let t = 1; t <= input.financial.projectLifetime; t++) {
    simpleNPV += grossMargin / Math.pow(1 + r, t);
  }
  addRow('단순 NPV (검증용)', Math.round(simpleNPV), '원', '부채상환/세금 미반영');
  addRow('단순 NPV (검증용)', Math.round(simpleNPV / 100000000), '억원');

  return lines.join('\n');
};

// CSV 다운로드 함수
const downloadCSV = (content: string, filename: string) => {
  // BOM 추가 (Excel에서 한글 깨짐 방지)
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// 데모용 더미 데이터
const generateDemoResult = (): SimulationResult => {
  const npvBase = 12500000000;
  const irrBase = 12.3;

  return {
    simulationId: 'demo-001',
    status: 'completed',
    capitalSummary: {
      totalCapex: 50000000000,
      idcAmount: 1750000000,
      totalCapexWithIdc: 51750000000,
      debtAmount: 36225000000,
      equityAmount: 15525000000,
      workingCapital: 208333333,
      salvageValue: 2500000000,
    },
    kpis: {
      npv: { p50: npvBase, p90: npvBase * 0.85, p99: npvBase * 0.7 },
      irr: { p50: irrBase, p90: irrBase * 0.9, p99: irrBase * 0.8 },
      dscr: { min: 1.45, avg: 1.8 },
      paybackPeriod: 8.5,
      var95: -820000000,
      annualH2Production: { p50: 2500, p90: 2200, p99: 1900 },
      lcoh: 5200,
      // Bankability 추가 지표
      npvAfterTax: { p50: npvBase * 0.78, p90: npvBase * 0.78 * 0.85, p99: npvBase * 0.78 * 0.7 },
      equityIrr: { p50: 18.5, p90: 15.7, p99: 12.9 },
      coverageRatios: { llcr: 1.45, plcr: 1.82 },
    },
    hourlyData: {
      production: Array.from({ length: 8760 }, () => Math.random() * 300),
      revenue: Array.from({ length: 8760 }, () => Math.random() * 1800000),
      electricityCost: Array.from({ length: 8760 }, () => Math.random() * 500000),
      operatingHours: Array.from({ length: 8760 }, () => (Math.random() > 0.15 ? 1 : 0)),
    },
    distributions: {
      npvHistogram: Array.from({ length: 30 }, (_, i) => ({
        bin: npvBase * 0.5 + (npvBase * i) / 30,
        count: Math.floor(Math.random() * 500 + 100),
      })),
      revenueHistogram: Array.from({ length: 30 }, (_, i) => ({
        bin: 8000000000 + (i * 200000000),
        count: Math.floor(Math.random() * 400 + 50),
      })),
    },
    sensitivity: [
      { variable: 'electricity_price', baseCase: npvBase, lowCase: npvBase * 1.3, highCase: npvBase * 0.7, lowChangePct: 30, highChangePct: -30 },
      { variable: 'h2_price', baseCase: npvBase, lowCase: npvBase * 0.85, highCase: npvBase * 1.15, lowChangePct: -15, highChangePct: 15 },
      { variable: 'availability', baseCase: npvBase, lowCase: npvBase * 0.9, highCase: npvBase * 1.05, lowChangePct: -10, highChangePct: 5 },
      { variable: 'efficiency', baseCase: npvBase, lowCase: npvBase * 0.95, highCase: npvBase * 1.03, lowChangePct: -5, highChangePct: 3 },
      { variable: 'capex', baseCase: npvBase, lowCase: npvBase * 1.1, highCase: npvBase * 0.9, lowChangePct: 10, highChangePct: -10 },
    ],
    riskWaterfall: [
      { factor: '기준 NPV', impact: 15000000000 },
      { factor: '기상 변동성', impact: -1200000000 },
      { factor: '전력가격 변동', impact: -800000000 },
      { factor: '효율 저하', impact: -500000000 },
      { factor: '최종 NPV', impact: 12500000000 },
    ],
    yearlyCashflow: Array.from({ length: 20 }, (_, i) => {
      const revenue = 8000000000 * (1 + i * 0.01);
      const opex = 2000000000;
      const depreciation = i < 10 ? 4500000000 : (i < 40 ? 125000000 : 0);
      const ebitda = revenue - opex;
      const ebit = ebitda - depreciation;
      const interestExpense = i < 15 ? (36225000000 - i * 2415000000) * 0.05 : 0;
      const principalRepayment = i < 15 ? 2415000000 : 0;
      const debtService = interestExpense + principalRepayment;
      const taxableIncome = ebit - interestExpense;
      const tax = taxableIncome > 0 ? taxableIncome * 0.242 : 0;
      const netCashflow = ebitda - debtService;
      const netCashflowAfterTax = ebitda - tax - debtService;

      return {
        year: i + 1,
        revenue,
        opex,
        depreciation,
        ebitda,
        ebit,
        tax,
        debtService,
        interestExpense,
        principalRepayment,
        netCashflow,
        netCashflowAfterTax,
        cumulativeCashflow: -50000000000 + (i + 1) * netCashflow,
        dscr: debtService > 0 ? ebitda / debtService : Infinity,
      };
    }),
  };
};

export default function Dashboard() {
  const { simulationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentResult, currentInput, setCurrentResult, saveScenario, savedScenarios } = useSimulationContext();
  const [loading, setLoading] = useState(true);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // currentResult를 직접 사용 (로컬 state 제거)
  const result = currentResult;

  // CSV 내보내기 핸들러
  const handleExportCSV = useCallback(() => {
    if (!currentInput || !result) return;

    const csvContent = generateSimulationCSV(currentInput, result);
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `시뮬레이션_결과_${timestamp}.csv`;
    downloadCSV(csvContent, filename);
  }, [currentInput, result]);

  // 저장 버튼 클릭 핸들러
  const handleSaveClick = () => {
    if (!user) {
      setShowLoginModal(true);
    } else {
      setShowSaveModal(true);
    }
  };

  // 로그인 페이지로 이동
  const handleGoToLogin = () => {
    setShowLoginModal(false);
    navigate('/login', { state: { from: '/dashboard' } });
  };

  // AI 설명을 위한 컨텍스트 생성
  const analysisContext = useMemo<SimulationContext | null>(() => {
    if (!currentInput || !result) return null;

    // 입력 설정 요약
    const input_summary = {
      capacity_mw: currentInput.equipment.electrolyzerCapacity,
      efficiency: currentInput.equipment.electrolyzerEfficiency,
      capex_billion: Math.round(currentInput.cost.capex / 100000000),
      electricity_source: currentInput.cost.electricitySource,
      h2_price: currentInput.market.h2Price,
      discount_rate: currentInput.financial.discountRate,
      project_lifetime: currentInput.financial.projectLifetime,
      debt_ratio: currentInput.financial.debtRatio,
      interest_rate: currentInput.financial.interestRate,
      loan_tenor: currentInput.financial.loanTenor,
    };

    // KPI 요약
    const kpi_summary = {
      npv: {
        p50_billion: Math.round(result.kpis.npv.p50 / 100000000),
        p90_billion: Math.round(result.kpis.npv.p90 / 100000000),
        p99_billion: Math.round(result.kpis.npv.p99 / 100000000),
      },
      irr: {
        p50: Math.round(result.kpis.irr.p50 * 10) / 10,
        p90: Math.round(result.kpis.irr.p90 * 10) / 10,
        p99: Math.round(result.kpis.irr.p99 * 10) / 10,
      },
      dscr: {
        min: Math.round(result.kpis.dscr.min * 100) / 100,
        avg: Math.round(result.kpis.dscr.avg * 100) / 100,
      },
      payback_years: Math.round(result.kpis.paybackPeriod * 10) / 10,
      var95_billion: Math.round(result.kpis.var95 / 100000000),
      lcoh: result.kpis.lcoh,
      annual_h2_production: Math.round(result.kpis.annualH2Production.p50),
    };

    // 민감도 분석 요약
    const sensitivity_summary = result.sensitivity.map((item) => ({
      variable: item.variable,
      low_change_pct: item.lowChangePct,
      high_change_pct: item.highChangePct,
    }));

    // 리스크 폭포수 요약
    const risk_waterfall_summary = result.riskWaterfall.map((item) => ({
      factor: item.factor,
      impact_billion: Math.round(item.impact / 100000000),
    }));

    // 현금흐름 요약
    const cashflow = result.yearlyCashflow;
    const totalRevenue = cashflow.reduce((sum, y) => sum + y.revenue, 0);
    const totalOpex = cashflow.reduce((sum, y) => sum + y.opex, 0);
    const debtPayoffYear = cashflow.findIndex((y) => y.debtService === 0);

    const cashflow_summary = {
      total_investment_billion: Math.round(currentInput.cost.capex / 100000000),
      avg_annual_revenue_billion: Math.round(totalRevenue / cashflow.length / 100000000),
      avg_annual_opex_billion: Math.round(totalOpex / cashflow.length / 100000000),
      debt_payoff_year: debtPayoffYear > 0 ? debtPayoffYear : currentInput.financial.loanTenor,
    };

    // 재무 구조 요약
    const debtAmount = currentInput.cost.capex * currentInput.financial.debtRatio / 100;
    const annualDebtService = cashflow.length > 0 ? cashflow[0].debtService : 0;

    const financing_summary = {
      debt_ratio: currentInput.financial.debtRatio,
      interest_rate: currentInput.financial.interestRate,
      loan_tenor: currentInput.financial.loanTenor,
      annual_debt_service_billion: Math.round(annualDebtService / 100000000),
    };

    // 인센티브 요약
    const incentives = currentInput.incentives;
    const itcAmount = incentives?.itcEnabled ? currentInput.cost.capex * incentives.itcRate / 100 : 0;
    const capexSubsidyTotal = (incentives?.capexSubsidy || 0) + currentInput.cost.capex * (incentives?.capexSubsidyRate || 0) / 100;

    const incentives_summary = {
      itc_enabled: incentives?.itcEnabled || false,
      itc_rate: incentives?.itcRate || 0,
      itc_amount_billion: Math.round(itcAmount / 100000000),
      ptc_enabled: incentives?.ptcEnabled || false,
      ptc_amount_per_kg: incentives?.ptcAmount || 0,
      ptc_duration_years: incentives?.ptcDuration || 0,
      capex_subsidy_billion: Math.round(capexSubsidyTotal / 100000000),
      operating_subsidy_per_kg: incentives?.operatingSubsidy || 0,
      operating_subsidy_duration_years: incentives?.operatingSubsidyDuration || 0,
      carbon_credit_enabled: incentives?.carbonCreditEnabled || false,
      carbon_credit_price: incentives?.carbonCreditPrice || 0,
      clean_h2_certification_enabled: incentives?.cleanH2CertificationEnabled || false,
      clean_h2_premium: incentives?.cleanH2Premium || 0,
      total_capex_reduction_billion: Math.round((itcAmount + capexSubsidyTotal) / 100000000),
      effective_capex_billion: Math.round((currentInput.cost.capex - itcAmount - capexSubsidyTotal) / 100000000),
    };

    return {
      input_summary,
      kpi_summary,
      financing_summary,
      incentives_summary,
      sensitivity_summary,
      risk_waterfall_summary,
      cashflow_summary,
    };
  }, [currentInput, result]);

  useEffect(() => {
    // 짧은 로딩 표시 후 완료
    const timer = setTimeout(() => {
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [simulationId]);

  const handleSaveScenario = async () => {
    if (!scenarioName.trim()) return;

    setSaving(true);
    setSaveError(null);

    try {
      const description = `${currentInput.equipment.electrolyzerCapacity} MW ${currentInput.cost.electricitySource}, ${currentInput.market.h2Price.toLocaleString()}원/kg`;
      const saved = await saveScenario(scenarioName, description);

      if (saved) {
        setSaveSuccess(true);
        setScenarioName('');
      } else {
        setSaveError('시나리오 저장에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('저장 오류:', error);
      setSaveError('시나리오 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 저장 성공 후 모달 닫기
  const handleCloseSaveModal = () => {
    setShowSaveModal(false);
    setSaveSuccess(false);
    setScenarioName('');
    setSaveError(null);
  };

  // 저장 성공 후 비교 페이지로 이동
  const handleGoToCompare = () => {
    setShowSaveModal(false);
    setSaveSuccess(false);
    setScenarioName('');
    navigate('/compare');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-hydrogen-100 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-hydrogen-500 rounded-full animate-spin border-t-transparent absolute top-0 left-0"></div>
        </div>
        <p className="text-dark-500 animate-pulse">시뮬레이션 결과를 불러오는 중...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 bg-dark-100 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-dark-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-dark-700 mb-2">시뮬레이션 결과가 없습니다</h3>
        <p className="text-dark-400 mb-6">새 시뮬레이션을 실행하여 결과를 확인하세요</p>
        <Link to="/config">
          <Button variant="gradient" size="lg">
            새 시뮬레이션 시작
          </Button>
        </Link>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-dark-800">시뮬레이션 결과</h1>
            <p className="text-dark-500 text-sm">프로젝트 분석 결과를 확인하고 인사이트를 얻으세요</p>
          </div>
        </div>

        {/* 액션 탭 - 모바일: 그리드 */}
        <div className="grid grid-cols-4 gap-1.5 p-1.5 bg-dark-50 rounded-2xl sm:hidden">
          <button
            onClick={handleSaveClick}
            className="flex flex-col items-center justify-center gap-1 px-2 py-2.5 rounded-xl text-xs font-medium text-dark-500 hover:text-dark-700 hover:bg-white/50 transition-all duration-300"
          >
            <svg className="w-4 h-4 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span>저장</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex flex-col items-center justify-center gap-1 px-2 py-2.5 rounded-xl text-xs font-medium text-dark-500 hover:text-dark-700 hover:bg-white/50 transition-all duration-300"
          >
            <svg className="w-4 h-4 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>CSV</span>
          </button>
          <Link
            to="/compare"
            className="flex flex-col items-center justify-center gap-1 px-2 py-2.5 rounded-xl text-xs font-medium text-dark-500 hover:text-dark-700 hover:bg-white/50 transition-all duration-300"
          >
            <svg className="w-4 h-4 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>비교</span>
          </Link>
          <Link
            to="/config"
            state={{ initialTab: 'equipment' }}
            className="flex flex-col items-center justify-center gap-1 px-2 py-2.5 rounded-xl text-xs font-medium text-dark-500 hover:text-dark-700 hover:bg-white/50 transition-all duration-300"
          >
            <svg className="w-4 h-4 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>변수</span>
          </Link>
        </div>

        {/* 액션 탭 - 데스크탑: 가로 */}
        <div className="hidden sm:flex items-center gap-1 p-1.5 bg-dark-50 rounded-2xl">
          <button
            onClick={handleSaveClick}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm text-dark-500 hover:text-dark-700 hover:bg-white/50 transition-all duration-300"
          >
            <svg className="w-4 h-4 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            저장
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm text-dark-500 hover:text-dark-700 hover:bg-white/50 transition-all duration-300"
          >
            <svg className="w-4 h-4 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            CSV 내보내기
          </button>
          <Link
            to="/compare"
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm text-dark-500 hover:text-dark-700 hover:bg-white/50 transition-all duration-300"
          >
            <svg className="w-4 h-4 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            비교 ({savedScenarios.length})
          </Link>
          <Link
            to="/config"
            state={{ initialTab: 'equipment' }}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm text-dark-500 hover:text-dark-700 hover:bg-white/50 transition-all duration-300"
          >
            <svg className="w-4 h-4 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            변수 조정
          </Link>
        </div>

      </div>

      <div className="space-y-8">
      {/* 자본 구조 요약 (있는 경우에만 표시) */}
      {result.capitalSummary && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-medium text-dark-400 uppercase tracking-wider">자본 구조</span>
            <span className="flex-1 h-px bg-dark-100"></span>
          </div>
          <div className="bg-white rounded-2xl shadow-card border border-dark-100 p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <div className="text-center p-3 bg-dark-50 rounded-xl">
                <div className="text-xs text-dark-400 mb-1">기본 CAPEX</div>
                <div className="text-lg font-bold text-dark-700">{(result.capitalSummary.totalCapex / 100000000).toFixed(0)}억</div>
              </div>
              {result.capitalSummary.idcAmount > 0 && (
                <div className="text-center p-3 bg-dark-50 rounded-xl">
                  <div className="text-xs text-dark-400 mb-1">IDC (건설이자)</div>
                  <div className="text-lg font-bold text-dark-700">+{(result.capitalSummary.idcAmount / 100000000).toFixed(1)}억</div>
                </div>
              )}
              <div className="text-center p-3 bg-dark-50 rounded-xl">
                <div className="text-xs text-dark-400 mb-1">총 투자비</div>
                <div className="text-lg font-bold text-dark-700">{(result.capitalSummary.totalCapexWithIdc / 100000000).toFixed(0)}억</div>
              </div>
              <div className="text-center p-3 bg-dark-50 rounded-xl">
                <div className="text-xs text-dark-400 mb-1">부채</div>
                <div className="text-lg font-bold text-dark-700">{(result.capitalSummary.debtAmount / 100000000).toFixed(0)}억</div>
              </div>
              <div className="text-center p-3 bg-dark-50 rounded-xl">
                <div className="text-xs text-dark-400 mb-1">자기자본</div>
                <div className="text-lg font-bold text-dark-700">{(result.capitalSummary.equityAmount / 100000000).toFixed(0)}억</div>
              </div>
              {result.capitalSummary.workingCapital > 0 && (
                <div className="text-center p-3 bg-dark-50 rounded-xl">
                  <div className="text-xs text-dark-400 mb-1">운전자본</div>
                  <div className="text-lg font-bold text-dark-700">{(result.capitalSummary.workingCapital / 100000000).toFixed(1)}억</div>
                </div>
              )}
              {result.capitalSummary.salvageValue > 0 && (
                <div className="text-center p-3 bg-dark-50 rounded-xl">
                  <div className="text-xs text-dark-400 mb-1">잔존가치</div>
                  <div className="text-lg font-bold text-dark-700">{(result.capitalSummary.salvageValue / 100000000).toFixed(0)}억</div>
                </div>
              )}
            </div>
            {/* 부채/자기자본 비율 바 */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-dark-500 mb-1">
                <span>자기자본 ({((result.capitalSummary.equityAmount / result.capitalSummary.totalCapexWithIdc) * 100).toFixed(0)}%)</span>
                <span>부채 ({((result.capitalSummary.debtAmount / result.capitalSummary.totalCapexWithIdc) * 100).toFixed(0)}%)</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden flex bg-dark-100">
                <div
                  className="bg-dark-400 transition-all duration-300"
                  style={{ width: `${(result.capitalSummary.equityAmount / result.capitalSummary.totalCapexWithIdc) * 100}%` }}
                />
                <div
                  className="bg-dark-300 transition-all duration-300"
                  style={{ width: `${(result.capitalSummary.debtAmount / result.capitalSummary.totalCapexWithIdc) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* KPI 카드 */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-medium text-dark-400 uppercase tracking-wider">핵심 지표</span>
          <span className="flex-1 h-px bg-dark-100"></span>
        </div>
        <KPICards kpis={result.kpis} confidenceLevel="P50" />
        {/* KPI 계산 로직 설명 */}
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500">
          <p className="font-semibold mb-3 text-gray-600">KPI 계산 로직 (financial.py)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="font-medium text-gray-600">NPV (순현재가치)</p>
              <p className="font-mono text-[10px] bg-white p-1 rounded mt-1">NPV = -CAPEX + Σ(CF_t / (1+r)^t)</p>
            </div>
            <div>
              <p className="font-medium text-gray-600">IRR (내부수익률)</p>
              <p className="font-mono text-[10px] bg-white p-1 rounded mt-1">NPV = 0 되는 r (Newton-Raphson)</p>
            </div>
            <div>
              <p className="font-medium text-gray-600">DSCR (부채상환비율)</p>
              <p className="font-mono text-[10px] bg-white p-1 rounded mt-1">DSCR = EBITDA / 원리금상환액</p>
            </div>
            <div>
              <p className="font-medium text-gray-600">LCOH (균등화 비용)</p>
              <p className="font-mono text-[10px] bg-white p-1 rounded mt-1">LCOH = Σ(비용PV) / Σ(생산량PV)</p>
            </div>
            <div>
              <p className="font-medium text-gray-600">연간 생산량</p>
              <p className="font-mono text-[10px] bg-white p-1 rounded mt-1">H₂ = 전력(kW) × 효율 / 비소비량</p>
            </div>
            <div>
              <p className="font-medium text-gray-600">Equity IRR</p>
              <p className="font-mono text-[10px] bg-white p-1 rounded mt-1">자기자본 기준 NPV=0 되는 r</p>
            </div>
          </div>
          <p className="text-[10px] mt-3">* 데이터 소스: 백엔드 시뮬레이션 API (energy_8760.py, financial.py)</p>
        </div>
        <SectionExplainer section="kpi" context={analysisContext} className="mt-3" />
      </section>

      {/* 현금흐름 차트 */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-medium text-dark-400 uppercase tracking-wider">현금흐름 추이</span>
          <span className="flex-1 h-px bg-dark-100"></span>
        </div>
        <div className="bg-white rounded-2xl shadow-card border border-dark-100 p-5">
          <CashflowChart data={result.yearlyCashflow} />
        </div>
      </section>

      {/* 연도별 현금흐름 세부 테이블 (Transposed: 항목이 행, 연도가 열) */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-medium text-dark-400 uppercase tracking-wider">연도별 현금흐름 상세</span>
          <span className="flex-1 h-px bg-dark-100"></span>
        </div>
        <div className="bg-white rounded-2xl shadow-card border border-dark-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="px-3 py-3 text-left font-medium sticky left-0 bg-slate-800 z-10 min-w-[120px]">항목</th>
                  {result.yearlyCashflow.map((cf) => (
                    <th key={cf.year} className="px-2 py-3 text-right font-medium min-w-[60px]">{cf.year}년</th>
                  ))}
                  <th className="px-3 py-3 text-right font-medium bg-slate-700 min-w-[80px]">합계</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100">
                {/* 매출 */}
                <tr className="bg-white">
                  <td className="px-3 py-2 font-medium text-emerald-700 sticky left-0 bg-white">매출</td>
                  {result.yearlyCashflow.map((cf) => (
                    <td key={cf.year} className="px-2 py-2 text-right text-emerald-600">{(cf.revenue / 100000000).toFixed(1)}</td>
                  ))}
                  <td className="px-3 py-2 text-right font-bold text-emerald-700 bg-emerald-50">
                    {(result.yearlyCashflow.reduce((sum, cf) => sum + cf.revenue, 0) / 100000000).toFixed(0)}
                  </td>
                </tr>
                {/* 운영비 */}
                <tr className="bg-dark-50">
                  <td className="px-3 py-2 font-medium text-rose-600 sticky left-0 bg-dark-50">운영비</td>
                  {result.yearlyCashflow.map((cf) => (
                    <td key={cf.year} className="px-2 py-2 text-right text-rose-500">-{(cf.opex / 100000000).toFixed(1)}</td>
                  ))}
                  <td className="px-3 py-2 text-right font-bold text-rose-600 bg-rose-50">
                    -{(result.yearlyCashflow.reduce((sum, cf) => sum + cf.opex, 0) / 100000000).toFixed(0)}
                  </td>
                </tr>
                {/* EBITDA */}
                <tr className="bg-white">
                  <td className="px-3 py-2 font-medium text-dark-700 sticky left-0 bg-white">EBITDA</td>
                  {result.yearlyCashflow.map((cf) => (
                    <td key={cf.year} className="px-2 py-2 text-right text-dark-700 font-medium">{(cf.ebitda / 100000000).toFixed(1)}</td>
                  ))}
                  <td className="px-3 py-2 text-right font-bold text-dark-800 bg-slate-100">
                    {(result.yearlyCashflow.reduce((sum, cf) => sum + cf.ebitda, 0) / 100000000).toFixed(0)}
                  </td>
                </tr>
                {/* 감가상각 */}
                <tr className="bg-dark-50">
                  <td className="px-3 py-2 font-medium text-dark-500 sticky left-0 bg-dark-50">감가상각</td>
                  {result.yearlyCashflow.map((cf) => (
                    <td key={cf.year} className="px-2 py-2 text-right text-dark-400">{(cf.depreciation / 100000000).toFixed(1)}</td>
                  ))}
                  <td className="px-3 py-2 text-right font-bold text-dark-500 bg-slate-100">
                    {(result.yearlyCashflow.reduce((sum, cf) => sum + cf.depreciation, 0) / 100000000).toFixed(0)}
                  </td>
                </tr>
                {/* EBIT */}
                <tr className="bg-white">
                  <td className="px-3 py-2 font-medium text-dark-700 sticky left-0 bg-white">EBIT</td>
                  {result.yearlyCashflow.map((cf) => (
                    <td key={cf.year} className="px-2 py-2 text-right text-dark-700">{(cf.ebit / 100000000).toFixed(1)}</td>
                  ))}
                  <td className="px-3 py-2 text-right font-bold text-dark-800 bg-slate-100">
                    {(result.yearlyCashflow.reduce((sum, cf) => sum + cf.ebit, 0) / 100000000).toFixed(0)}
                  </td>
                </tr>
                {/* 이자비용 */}
                <tr className="bg-dark-50">
                  <td className="px-3 py-2 font-medium text-amber-700 sticky left-0 bg-dark-50">이자비용</td>
                  {result.yearlyCashflow.map((cf) => (
                    <td key={cf.year} className="px-2 py-2 text-right text-amber-600">{cf.interestExpense > 0 ? `-${(cf.interestExpense / 100000000).toFixed(1)}` : '-'}</td>
                  ))}
                  <td className="px-3 py-2 text-right font-bold text-amber-700 bg-amber-50">
                    -{(result.yearlyCashflow.reduce((sum, cf) => sum + cf.interestExpense, 0) / 100000000).toFixed(0)}
                  </td>
                </tr>
                {/* 원금상환 */}
                <tr className="bg-white">
                  <td className="px-3 py-2 font-medium text-amber-700 sticky left-0 bg-white">원금상환</td>
                  {result.yearlyCashflow.map((cf) => (
                    <td key={cf.year} className="px-2 py-2 text-right text-amber-600">{cf.principalRepayment > 0 ? `-${(cf.principalRepayment / 100000000).toFixed(1)}` : '-'}</td>
                  ))}
                  <td className="px-3 py-2 text-right font-bold text-amber-700 bg-amber-50">
                    -{(result.yearlyCashflow.reduce((sum, cf) => sum + cf.principalRepayment, 0) / 100000000).toFixed(0)}
                  </td>
                </tr>
                {/* 법인세 */}
                <tr className="bg-dark-50">
                  <td className="px-3 py-2 font-medium text-violet-700 sticky left-0 bg-dark-50">법인세</td>
                  {result.yearlyCashflow.map((cf) => (
                    <td key={cf.year} className="px-2 py-2 text-right text-violet-600">{cf.tax > 0 ? `-${(cf.tax / 100000000).toFixed(1)}` : '-'}</td>
                  ))}
                  <td className="px-3 py-2 text-right font-bold text-violet-700 bg-violet-50">
                    -{(result.yearlyCashflow.reduce((sum, cf) => sum + cf.tax, 0) / 100000000).toFixed(0)}
                  </td>
                </tr>
                {/* 순현금흐름 (세후) */}
                <tr className="bg-primary-50/50 border-t-2 border-primary-200">
                  <td className="px-3 py-2 font-bold text-primary-800 sticky left-0 bg-primary-50/50">순현금흐름</td>
                  {result.yearlyCashflow.map((cf) => (
                    <td key={cf.year} className={`px-2 py-2 text-right font-bold ${cf.netCashflowAfterTax >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {(cf.netCashflowAfterTax / 100000000).toFixed(1)}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-bold text-primary-800 bg-primary-100">
                    {(result.yearlyCashflow.reduce((sum, cf) => sum + cf.netCashflowAfterTax, 0) / 100000000).toFixed(0)}
                  </td>
                </tr>
                {/* 누적현금흐름 */}
                <tr className="bg-blue-50/50">
                  <td className="px-3 py-2 font-bold text-blue-800 sticky left-0 bg-blue-50/50">누적현금흐름</td>
                  {result.yearlyCashflow.map((cf) => (
                    <td key={cf.year} className={`px-2 py-2 text-right font-bold ${cf.cumulativeCashflow >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                      {(cf.cumulativeCashflow / 100000000).toFixed(1)}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-bold text-blue-800 bg-blue-100">-</td>
                </tr>
                {/* DSCR */}
                <tr className="bg-white border-t-2 border-dark-200">
                  <td className="px-3 py-2 font-medium text-dark-700 sticky left-0 bg-white">DSCR</td>
                  {result.yearlyCashflow.map((cf) => (
                    <td key={cf.year} className={`px-2 py-2 text-right font-medium ${cf.dscr >= 1.3 ? 'text-emerald-600' : cf.dscr >= 1.1 ? 'text-amber-600' : cf.dscr > 0 ? 'text-rose-600' : 'text-dark-300'}`}>
                      {cf.dscr > 0 ? cf.dscr.toFixed(2) : '-'}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-bold text-dark-600 bg-slate-100">
                    평균 {(result.yearlyCashflow.filter(cf => cf.dscr > 0).reduce((sum, cf) => sum + cf.dscr, 0) / Math.max(result.yearlyCashflow.filter(cf => cf.dscr > 0).length, 1)).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {/* 테이블 범례 */}
          <div className="px-4 py-3 bg-dark-50 border-t border-dark-100 text-xs text-dark-500">
            <p className="font-medium mb-2">단위: 억원 (백만원 이하 반올림)</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <span><span className="text-emerald-600 font-medium">매출</span> = 수소 판매수익 + 부산물 수익 + 인센티브</span>
              <span><span className="text-rose-500 font-medium">운영비</span> = 전력비 + 유지보수비 + 인건비</span>
              <span><span className="text-dark-700 font-medium">EBITDA</span> = 매출 - 운영비</span>
              <span><span className="text-dark-700 font-medium">EBIT</span> = EBITDA - 감가상각</span>
              <span><span className="text-amber-600 font-medium">원리금</span> = 이자비용 + 원금상환</span>
              <span><span className="text-violet-600 font-medium">법인세</span> = (EBIT - 이자비용) × 세율</span>
            </div>
          </div>
        </div>
        <SectionExplainer section="cashflow" context={analysisContext} className="mt-3" />
      </section>

      {/* What-if 분석 */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-medium text-dark-400 uppercase tracking-wider">What-if 분석</span>
          <span className="flex-1 h-px bg-dark-100"></span>
        </div>
        <div className="bg-white rounded-2xl shadow-card border border-dark-100 p-5">
          <WhatIfPanel input={currentInput} result={result} />
        </div>
        <SectionExplainer section="whatif" context={analysisContext} className="mt-3" />
      </section>

      {/* 몬테카를로 분석 차트 (현재 비활성화) */}
      {/*
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-medium text-dark-400 uppercase tracking-wider">상세 분석</span>
          <span className="flex-1 h-px bg-dark-100"></span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col">
            <DistributionHistogram
              title="NPV 분포 (몬테카를로)"
              data={result.distributions.npvHistogram}
              p50={result.kpis.npv.p50}
              p90={result.kpis.npv.p90}
              p99={result.kpis.npv.p99}
            />
            <SectionExplainer section="npv_distribution" context={analysisContext} className="mt-3" />
          </div>
          <div className="flex flex-col">
            <WaterfallChart data={result.riskWaterfall} />
            <SectionExplainer section="waterfall" context={analysisContext} className="mt-3" />
          </div>
          <div className="flex flex-col">
            <TornadoChart data={result.sensitivity} baseNpv={result.kpis.npv.p50} />
            <SectionExplainer section="sensitivity" context={analysisContext} className="mt-3" />
          </div>
        </div>
      </section>
      */}

      {/* 8760 히트맵 */}
      {result.hourlyData && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-medium text-dark-400 uppercase tracking-wider">운영 패턴</span>
            <span className="flex-1 h-px bg-dark-100"></span>
          </div>
          <div className="bg-white rounded-2xl shadow-card border border-dark-100 p-5">
            <Heatmap8760
              data={result.hourlyData.production}
              title="연간 수소 생산 패턴"
              description="365일 x 24시간 수소 생산량 히트맵"
              colorScale="green"
            />
            {/* 히트맵 설명 */}
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 space-y-1">
              <p className="font-semibold mb-2 text-gray-600">8760 시간별 계산 (energy_8760.py)</p>
              <p>• 시간별 발전량 = 설비용량 × 이용률(t) × 효율</p>
              <p>• 시간별 수소생산 = 전력(kW) / 비소비량(kWh/kg)</p>
              <p>• 가동 판단: 전력가격(t) &lt; 기준가격 일 때 운전</p>
              <p>• 효율 보정: 부분부하 효율곡선 적용</p>
              <div className="mt-2 pt-2 border-t border-gray-200">
                <p className="font-medium text-gray-600">총 8760시간 (365일 × 24시간) 시뮬레이션</p>
                <p className="mt-1">* 기상데이터: 태양광/풍력 시간대별 이용률 반영</p>
              </div>
            </div>
          </div>
          <SectionExplainer section="heatmap" context={analysisContext} className="mt-3" />
        </section>
      )}

      {/* AI 인사이트 (Bankability 분석, 금융 자문) */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-medium text-dark-400 uppercase tracking-wider">AI 인사이트</span>
          <span className="flex-1 h-px bg-dark-100"></span>
        </div>
        <AIInsightsPanel input={currentInput} result={result} />
      </section>

      </div>

      {/* 로그인 필요 모달 */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-hydrogen-100 rounded-full">
              <svg className="w-6 h-6 text-hydrogen-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-dark-800 mb-2 text-center">로그인이 필요합니다</h3>
            <p className="text-sm text-dark-500 mb-6 text-center">
              시나리오를 저장하려면 로그인이 필요합니다.<br />
              로그인하면 여러 기기에서 시나리오에 접근할 수 있습니다.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                fullWidth
                onClick={() => setShowLoginModal(false)}
              >
                취소
              </Button>
              <Button
                variant="gradient"
                fullWidth
                onClick={handleGoToLogin}
              >
                로그인하기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 시나리오 저장 모달 */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            {saveSuccess ? (
              /* 저장 성공 화면 */
              <>
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full">
                  <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-dark-800 mb-2 text-center">저장 완료!</h3>
                <p className="text-sm text-dark-500 mb-6 text-center">
                  시나리오가 성공적으로 저장되었습니다.<br />
                  저장된 시나리오는 비교 페이지에서 확인할 수 있습니다.
                </p>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-4 text-sm text-emerald-700 text-center">
                  총 {savedScenarios.length}개의 시나리오가 저장되어 있습니다
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    fullWidth
                    onClick={handleCloseSaveModal}
                  >
                    닫기
                  </Button>
                  <Button
                    variant="gradient"
                    fullWidth
                    onClick={handleGoToCompare}
                  >
                    비교 페이지로 이동
                  </Button>
                </div>
              </>
            ) : (
              /* 저장 입력 화면 */
              <>
                <h3 className="text-lg font-bold text-dark-800 mb-4">시나리오 저장</h3>
                <p className="text-sm text-dark-500 mb-4">
                  현재 시뮬레이션 결과를 시나리오로 저장하여 비교 분석에 활용할 수 있습니다.
                </p>

                {/* 에러 메시지 */}
                {saveError && (
                  <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">
                    {saveError}
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-dark-700 mb-2">
                    시나리오 이름
                  </label>
                  <input
                    type="text"
                    value={scenarioName}
                    onChange={(e) => {
                      setScenarioName(e.target.value);
                      setSaveError(null);
                    }}
                    placeholder="예: 기준 시나리오"
                    className="w-full px-4 py-3 border border-dark-200 rounded-xl focus:ring-2 focus:ring-hydrogen-500/20 focus:border-hydrogen-500"
                    autoFocus
                    disabled={saving}
                  />
                </div>
                <div className="p-3 bg-dark-50 rounded-xl mb-4 text-sm text-dark-600">
                  <div className="flex justify-between mb-1">
                    <span>NPV (P50)</span>
                    <span className="font-medium">{(result.kpis.npv.p50 / 100000000).toFixed(0)}억원</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>IRR (P50)</span>
                    <span className="font-medium">{result.kpis.irr.p50.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>LCOH</span>
                    <span className="font-medium">{result.kpis.lcoh.toLocaleString()}원/kg</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    fullWidth
                    onClick={handleCloseSaveModal}
                    disabled={saving}
                  >
                    취소
                  </Button>
                  <Button
                    variant="gradient"
                    fullWidth
                    onClick={handleSaveScenario}
                    disabled={!scenarioName.trim() || saving}
                  >
                    {saving ? (
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        저장 중...
                      </span>
                    ) : '저장'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
