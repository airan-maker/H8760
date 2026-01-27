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

// 인센티브 설정 (세액공제, 보조금 등)
export interface IncentivesConfig {
  // 세액공제
  itcEnabled: boolean; // 투자세액공제 활성화
  itcRate: number; // 투자세액공제율 (% of CAPEX)
  ptcEnabled: boolean; // 생산세액공제 활성화
  ptcAmount: number; // 생산세액공제액 (원/kg H2)
  ptcDuration: number; // 생산세액공제 적용기간 (년)

  // 보조금
  capexSubsidy: number; // 설비투자 보조금 (원)
  capexSubsidyRate: number; // 설비투자 보조금율 (% of CAPEX)
  operatingSubsidy: number; // 운영 보조금 (원/kg H2)
  operatingSubsidyDuration: number; // 운영 보조금 적용기간 (년)

  // 기타 인센티브
  carbonCreditPrice: number; // 탄소배출권 가격 (원/kg H2)
  carbonCreditEnabled: boolean; // 탄소배출권 수익 활성화
  cleanH2Premium: number; // 청정수소 인증 프리미엄 (원/kg H2)
  cleanH2CertificationEnabled: boolean; // 청정수소 인증 활성화
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
  incentives: IncentivesConfig;
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

/**
 * 기본값 (리서치 결과 기반 2024-2025년 한국 시장 기준)
 *
 * 주요 상수:
 * - LHV (저위발열량): 33.33 kWh/kg
 * - 현재 전해조 실제 소비량: 약 50 kWh/kg (효율 약 67%)
 * - 스택 수명: PEM 45,000~80,000시간, Alkaline 60,000~90,000시간
 * - OPEX: CAPEX의 2~5%/년
 * - 한국 그린수소 가격: 5,200~7,150원/kg (2024-2025)
 */
export const defaultSimulationInput: SimulationInput = {
  equipment: {
    electrolyzerCapacity: 10,        // MW
    electrolyzerEfficiency: 67,      // % (현재 기술 기준 약 67%, 미래 목표 75%)
    specificConsumption: 50,         // kWh/kg H2 (효율 67% 기준)
    degradationRate: 0.5,            // %/년 (PEM 기준, Alkaline은 0.3%)
    stackLifetime: 80000,            // 시간 (PEM 최신 기술 기준)
    annualAvailability: 85,          // % 가동률
  },
  cost: {
    capex: 50_000_000_000,           // 원 (10MW 기준 약 150만원/kW)
    opexRatio: 2.5,                  // % of CAPEX (업계 표준 2~5%)
    stackReplacementCost: 5_500_000_000,  // 원 (CAPEX의 11% - PEM 기준 문헌값)
    electricitySource: 'PPA',
    ppaPrice: 100,                   // 원/kWh (한국 산업용 평균 약 100원 기준)
  },
  market: {
    h2Price: 6000,                   // 원/kg (한국 그린수소 2024-2025년 범위 내)
    h2PriceEscalation: 0,            // %/년
    electricityPriceScenario: 'base',
  },
  financial: {
    discountRate: 8,                 // % (한국 수소 프로젝트 WACC 기준)
    projectLifetime: 20,             // 년
    debtRatio: 70,                   // %
    interestRate: 5,                 // %
    loanTenor: 15,                   // 년
  },
  incentives: {
    // 세액공제 (한국 수소법 기준)
    itcEnabled: false,
    itcRate: 10,                     // % (수소 관련 투자세액공제 최대 10%)
    ptcEnabled: false,
    ptcAmount: 700,                  // 원/kg H2 (청정수소발전 입찰 기준 추정)
    ptcDuration: 10,                 // 년

    // 보조금
    capexSubsidy: 0,                 // 원
    capexSubsidyRate: 0,             // %
    operatingSubsidy: 0,             // 원/kg H2
    operatingSubsidyDuration: 5,     // 년

    // 기타 인센티브
    carbonCreditPrice: 1000,         // 원/kg H2 (탄소배출권 환산 기준)
    carbonCreditEnabled: false,
    cleanH2Premium: 500,             // 원/kg H2 (청정수소 인증 프리미엄)
    cleanH2CertificationEnabled: false,
  },
  riskWeights: {
    weatherVariability: true,
    priceVolatility: true,
    confidenceLevel: 'P50',
  },
  monteCarlo: {
    iterations: 10000,
    weatherSigma: 0.1,               // 10% 기상 변동성
    priceSigma: 0.15,                // 15% 가격 변동성
  },
};
