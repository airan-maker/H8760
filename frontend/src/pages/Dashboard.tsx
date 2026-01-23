import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '../components/common';
import { KPICards } from '../components/dashboard';
import {
  DistributionHistogram,
  WaterfallChart,
  TornadoChart,
  Heatmap8760,
  CashflowChart,
} from '../components/charts';
import type { SimulationResult } from '../types';

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
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [_input, setInput] = useState<unknown>(null);
  const [confidenceLevel, setConfidenceLevel] = useState<'P50' | 'P90' | 'P99'>('P50');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // localStorage에서 결과 로드 또는 데모 데이터 사용
    const loadResult = () => {
      try {
        const savedResult = localStorage.getItem('lastSimulationResult');
        const savedInput = localStorage.getItem('lastSimulationInput');

        if (savedResult) {
          setResult(JSON.parse(savedResult));
        } else {
          setResult(generateDemoResult());
        }

        if (savedInput) {
          setInput(JSON.parse(savedInput));
        }
      } catch {
        setResult(generateDemoResult());
      } finally {
        setLoading(false);
      }
    };

    loadResult();
  }, [simulationId]);

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
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-dark-100">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-hydrogen-500 to-primary-500 rounded-xl shadow-lg shadow-hydrogen-500/20">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-dark-800">시뮬레이션 결과</h1>
          </div>
          <p className="text-dark-500">프로젝트 분석 결과를 확인하고 인사이트를 얻으세요</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* 신뢰 수준 선택 */}
          <div className="flex items-center gap-2 bg-dark-50 rounded-xl p-1">
            {(['P50', 'P90', 'P99'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setConfidenceLevel(level)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  confidenceLevel === level
                    ? 'bg-white text-hydrogen-700 shadow-sm'
                    : 'text-dark-500 hover:text-dark-700'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
          <Button variant="outline" icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          }>
            PDF 다운로드
          </Button>
          <Link to="/config">
            <Button variant="gradient" icon={
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

      {/* KPI 카드 */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-medium text-dark-400 uppercase tracking-wider">핵심 지표</span>
          <span className="flex-1 h-px bg-dark-100"></span>
        </div>
        <KPICards kpis={result.kpis} confidenceLevel={confidenceLevel} />
      </section>

      {/* 차트 그리드 */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-medium text-dark-400 uppercase tracking-wider">상세 분석</span>
          <span className="flex-1 h-px bg-dark-100"></span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* NPV 분포 */}
          <div className="bg-white rounded-2xl shadow-card border border-dark-100 p-5 hover:shadow-card-hover transition-shadow">
            <DistributionHistogram
              title="NPV 분포 (몬테카를로)"
              data={result.distributions.npvHistogram}
              p50={result.kpis.npv.p50}
              p90={result.kpis.npv.p90}
              p99={result.kpis.npv.p99}
            />
          </div>

          {/* 리스크 폭포수 */}
          <div className="bg-white rounded-2xl shadow-card border border-dark-100 p-5 hover:shadow-card-hover transition-shadow">
            <WaterfallChart data={result.riskWaterfall} />
          </div>

          {/* 민감도 분석 */}
          <div className="bg-white rounded-2xl shadow-card border border-dark-100 p-5 hover:shadow-card-hover transition-shadow">
            <TornadoChart data={result.sensitivity} baseNpv={result.kpis.npv.p50} />
          </div>

          {/* 현금흐름 */}
          <div className="bg-white rounded-2xl shadow-card border border-dark-100 p-5 hover:shadow-card-hover transition-shadow">
            <CashflowChart data={result.yearlyCashflow} />
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
          </div>
        </section>
      )}
    </div>
  );
}
