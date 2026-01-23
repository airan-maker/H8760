/**
 * TypeScript 타입 정의
 */

// 설비 사양 설정
export interface EquipmentConfig {
  electrolyzerCapacity: number; // MW
  electrolyzerEfficiency: number; // %
  specificConsumption: number; // kWh/kg H2
  degradationRate: number; // %/year
  stackLifetime: number; // hours
  annualAvailability: number; // %
}

// 비용 구조 설정
export interface CostConfig {
  capex: number; // 원
  opexRatio: number; // % of CAPEX
  stackReplacementCost: number; // 원
  electricitySource: 'PPA' | 'GRID' | 'HYBRID';
  ppaPrice?: number; // 원/kWh
}

// 시장 조건 설정
export interface MarketConfig {
  h2Price: number; // 원/kg
  h2PriceEscalation: number; // %/year
  electricityPriceScenario: string;
}

// 재무 조건 설정
export interface FinancialConfig {
  discountRate: number; // %
  projectLifetime: number; // years
  debtRatio: number; // %
  interestRate: number; // %
  loanTenor: number; // years
}

// 리스크 가중치 설정
export interface RiskWeightsConfig {
  weatherVariability: boolean;
  priceVolatility: boolean;
  confidenceLevel: 'P50' | 'P90' | 'P99';
}

// 몬테카를로 설정
export interface MonteCarloConfig {
  iterations: number;
  weatherSigma: number;
  priceSigma: number;
}

// 전체 시뮬레이션 입력
export interface SimulationInput {
  equipment: EquipmentConfig;
  cost: CostConfig;
  market: MarketConfig;
  financial: FinancialConfig;
  riskWeights: RiskWeightsConfig;
  monteCarlo: MonteCarloConfig;
}

// 백분위수 값
export interface PercentileValue {
  p50: number;
  p90: number;
  p99: number;
}

// KPI
export interface KPIs {
  npv: PercentileValue;
  irr: PercentileValue;
  dscr: { min: number; avg: number };
  paybackPeriod: number;
  var95: number;
  annualH2Production: PercentileValue;
  lcoh: number;
}

// 히스토그램 빈
export interface HistogramBin {
  bin: number;
  count: number;
}

// 시간별 데이터
export interface HourlyData {
  production: number[];
  revenue: number[];
  electricityCost: number[];
  operatingHours: number[];
}

// 민감도 분석 항목
export interface SensitivityItem {
  variable: string;
  baseCase: number;
  lowCase: number;
  highCase: number;
  lowChangePct: number;
  highChangePct: number;
}

// 리스크 폭포수 항목
export interface RiskWaterfallItem {
  factor: string;
  impact: number;
}

// 연간 현금흐름
export interface YearlyCashflow {
  year: number;
  revenue: number;
  opex: number;
  debtService: number;
  netCashflow: number;
  cumulativeCashflow: number;
}

// 시뮬레이션 결과
export interface SimulationResult {
  simulationId: string;
  status: string;
  kpis: KPIs;
  hourlyData?: HourlyData;
  distributions: {
    npvHistogram: HistogramBin[];
    revenueHistogram: HistogramBin[];
  };
  sensitivity: SensitivityItem[];
  riskWaterfall: RiskWaterfallItem[];
  yearlyCashflow: YearlyCashflow[];
}

// 프로젝트
export interface Project {
  id: string;
  name: string;
  description?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

// 프리셋
export interface Preset {
  id: string;
  name: string;
  description: string;
  electrolyzerType: string;
  capacityMw: number;
  efficiency: number;
  capexPerKw: number;
}

// 기본값
export const defaultSimulationInput: SimulationInput = {
  equipment: {
    electrolyzerCapacity: 10,
    electrolyzerEfficiency: 65,
    specificConsumption: 50,
    degradationRate: 0.5,
    stackLifetime: 80000,
    annualAvailability: 85,
  },
  cost: {
    capex: 50_000_000_000,
    opexRatio: 2.5,
    stackReplacementCost: 15_000_000_000,
    electricitySource: 'PPA',
    ppaPrice: 80,
  },
  market: {
    h2Price: 6000,
    h2PriceEscalation: 0,
    electricityPriceScenario: 'base',
  },
  financial: {
    discountRate: 8,
    projectLifetime: 20,
    debtRatio: 70,
    interestRate: 5,
    loanTenor: 15,
  },
  riskWeights: {
    weatherVariability: true,
    priceVolatility: true,
    confidenceLevel: 'P50',
  },
  monteCarlo: {
    iterations: 10000,
    weatherSigma: 0.1,
    priceSigma: 0.15,
  },
};
