import { useState, useEffect, useMemo } from 'react';
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
import { AIInsightsPanel, SectionExplainer } from '../components/analysis';
import type { SimulationResult } from '../types';
import type { SimulationContext } from '../types/analysis';
import { useSimulationContext } from '../contexts/SimulationContext';
import { useAuth } from '../contexts/AuthContext';

// 데모용 더미 데이터
const generateDemoResult = (): SimulationResult => {
  const npvBase = 12500000000;
  const irrBase = 12.3;

  return {
    simulationId: 'demo-001',
    status: 'completed',
    kpis: {
      npv: { p50: npvBase, p90: npvBase * 0.85, p99: npvBase * 0.7 },
      irr: { p50: irrBase, p90: irrBase * 0.9, p99: irrBase * 0.8 },
      dscr: { min: 1.45, avg: 1.8 },
      paybackPeriod: 8.5,
      var95: -820000000,
      annualH2Production: { p50: 2500, p90: 2200, p99: 1900 },
      lcoh: 5200,
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
    yearlyCashflow: Array.from({ length: 20 }, (_, i) => ({
      year: i + 1,
      revenue: 8000000000 * (1 + i * 0.01),
      opex: 2000000000,
      debtService: i < 15 ? 3500000000 : 0,
      netCashflow: i < 15 ? 2500000000 : 6000000000,
      cumulativeCashflow: -50000000000 + (i + 1) * (i < 15 ? 2500000000 : 6000000000),
    })),
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

  // currentResult를 직접 사용 (로컬 state 제거)
  const result = currentResult;

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
    const description = `${currentInput.equipment.electrolyzerCapacity} MW ${currentInput.cost.electricitySource}, ${currentInput.market.h2Price.toLocaleString()}원/kg`;
    const saved = await saveScenario(scenarioName, description);
    if (saved) {
      setShowSaveModal(false);
      setScenarioName('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
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
    <div className="max-w-7xl mx-auto space-y-8">
      {/* 헤더 */}
      <div className="flex flex-col gap-4 pb-6 border-b border-dark-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-hydrogen-500 to-primary-500 rounded-xl shadow-lg shadow-hydrogen-500/20">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-dark-800">시뮬레이션 결과</h1>
              <p className="text-dark-500 text-sm hidden sm:block">프로젝트 분석 결과를 확인하고 인사이트를 얻으세요</p>
            </div>
          </div>

          {/* 데스크탑: 가로 버튼 */}
          <div className="hidden sm:flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveClick}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              }
            >
              저장
            </Button>
            <Link to="/compare">
              <Button variant="outline" size="sm" icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }>
                비교 ({savedScenarios.length})
              </Button>
            </Link>
            <Link to="/config">
              <Button variant="gradient" size="sm" icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }>
                변수 조정
              </Button>
            </Link>
          </div>
        </div>

        {/* 모바일: 그리드 버튼 */}
        <div className="grid grid-cols-3 gap-2 sm:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveClick}
            className="flex-col gap-1 py-3"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span className="text-xs">저장</span>
          </Button>
          <Link to="/compare" className="contents">
            <Button variant="outline" size="sm" className="flex-col gap-1 py-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-xs">비교 ({savedScenarios.length})</span>
            </Button>
          </Link>
          <Link to="/config" className="contents">
            <Button variant="gradient" size="sm" className="flex-col gap-1 py-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs">변수 조정</span>
            </Button>
          </Link>
        </div>

        {/* 저장 성공 알림 */}
        {saveSuccess && (
          <div className="fixed top-20 right-4 bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in z-50">
            시나리오가 저장되었습니다
          </div>
        )}
      </div>

      {/* KPI 카드 */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-medium text-dark-400 uppercase tracking-wider">핵심 지표</span>
          <span className="flex-1 h-px bg-dark-100"></span>
        </div>
        <KPICards kpis={result.kpis} confidenceLevel="P50" />
        {/* KPI 계산 로직 설명 */}
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500">
          <p className="font-semibold mb-3 text-gray-600">KPI 계산 로직 (financial.py, monte_carlo.py)</p>
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
              <p className="font-medium text-gray-600">VaR 95%</p>
              <p className="font-mono text-[10px] bg-white p-1 rounded mt-1">10,000회 중 5번째 백분위</p>
            </div>
          </div>
          <p className="text-[10px] mt-3">* 데이터 소스: 백엔드 시뮬레이션 API (energy_8760.py, financial.py, monte_carlo.py)</p>
        </div>
        <SectionExplainer section="kpi" context={analysisContext} className="mt-3" />
      </section>

      {/* 차트 그리드 */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-medium text-dark-400 uppercase tracking-wider">상세 분석</span>
          <span className="flex-1 h-px bg-dark-100"></span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* NPV 분포 */}
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

          {/* 리스크 폭포수 */}
          <div className="flex flex-col">
            <WaterfallChart data={result.riskWaterfall} />
            <SectionExplainer section="waterfall" context={analysisContext} className="mt-3" />
          </div>

          {/* 민감도 분석 */}
          <div className="flex flex-col">
            <TornadoChart data={result.sensitivity} baseNpv={result.kpis.npv.p50} />
            <SectionExplainer section="sensitivity" context={analysisContext} className="mt-3" />
          </div>

          {/* 현금흐름 */}
          <div className="flex flex-col">
            <CashflowChart data={result.yearlyCashflow} />
            <SectionExplainer section="cashflow" context={analysisContext} className="mt-3" />
          </div>
        </div>
      </section>

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

      {/* AI 인사이트 */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-medium text-dark-400 uppercase tracking-wider">AI 분석</span>
          <span className="flex-1 h-px bg-dark-100"></span>
        </div>
        <AIInsightsPanel input={currentInput} result={result} />
      </section>

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
            <h3 className="text-lg font-bold text-dark-800 mb-4">시나리오 저장</h3>
            <p className="text-sm text-dark-500 mb-4">
              현재 시뮬레이션 결과를 시나리오로 저장하여 비교 분석에 활용할 수 있습니다.
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
