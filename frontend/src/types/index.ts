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
  // Bankability 추가 필드 (1순위)
  constructionPeriod: number; // years - 건설 기간
  gracePeriod: number; // years - 대출 거치 기간
  // Bankability 추가 필드 (2순위)
  capexSchedule: number[]; // CAPEX 분할 비율 (예: [0.3, 0.4, 0.3])
  repaymentMethod: 'equal_payment' | 'equal_principal'; // 상환방식
  workingCapitalMonths: number; // 운전자본 개월수 (OPEX 기준)
  includeIdc: boolean; // IDC(건설기간 이자) 포함 여부
}

// 세금 및 감가상각 설정 (Bankability 평가 필수 요소)
export interface TaxConfig {
  corporateTaxRate: number; // % - 법인세율
  localTaxRate: number; // % - 지방소득세율
  depreciationMethod: 'straight_line' | 'declining_balance'; // 감가상각 방법
  electrolyzerUsefulLife: number; // years - 전해조 내용연수
  buildingUsefulLife: number; // years - 건물 내용연수
  buildingRatio: number; // % - 건물 비율 (CAPEX 대비)
  salvageValueRate: number; // % - 잔존가치율
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
  tax: TaxConfig;
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

// LLCR/PLCR 지표 (Bankability 핵심 지표)
export interface LLCRMetrics {
  llcr: number; // Loan Life Coverage Ratio
  plcr: number; // Project Life Coverage Ratio
}

// KPI
export interface KPIs {
  // 기존 지표
  npv: PercentileValue; // 세전 NPV
  irr: PercentileValue; // Project IRR
  dscr: { min: number; avg: number };
  paybackPeriod: number;
  var95: number;
  annualH2Production: PercentileValue;
  lcoh: number;
  // Bankability 추가 지표
  npvAfterTax: PercentileValue; // 세후 NPV
  equityIrr: PercentileValue; // Equity IRR
  coverageRatios: LLCRMetrics; // LLCR/PLCR
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

// 투자 자본 요약 (Bankability 2순위)
export interface CapitalSummary {
  totalCapex: number; // 총 CAPEX (원)
  idcAmount: number; // 건설기간 이자 IDC (원)
  totalCapexWithIdc: number; // IDC 포함 총 투자비 (원)
  debtAmount: number; // 부채 금액 (원)
  equityAmount: number; // 자기자본 금액 (원)
  workingCapital: number; // 운전자본 (원)
  salvageValue: number; // 잔존가치 (원)
}

// 연간 현금흐름 (프로젝트 파이낸스 표준 형식)
export interface YearlyCashflow {
  year: number;
  // 수익
  revenue: number;
  // 비용
  opex: number;
  depreciation: number; // 감가상각비
  // EBITDA / EBIT
  ebitda: number;
  ebit: number;
  // 세금
  tax: number; // 법인세
  // 부채 관련
  debtService: number;
  interestExpense: number; // 이자비용
  principalRepayment: number; // 원금상환
  // 현금흐름
  netCashflow: number; // 세전
  netCashflowAfterTax: number; // 세후
  cumulativeCashflow: number;
  // 커버리지
  dscr: number;
}

// 시뮬레이션 결과
export interface SimulationResult {
  simulationId: string;
  status: string;
  kpis: KPIs;
  capitalSummary?: CapitalSummary; // 투자 자본 요약 (2순위)
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
 * 프리셋은 정부 보조금/세액공제를 활용한 현실적인 수익성 시나리오입니다.
 * IRR 양수, NPV 양수를 목표로 설정되어 있습니다.
 *
 * 주요 상수:
 * - LHV (저위발열량): 33.33 kWh/kg
 * - 현재 전해조 실제 소비량: 약 50 kWh/kg (효율 약 67%)
 * - 스택 수명: PEM 45,000~80,000시간, Alkaline 60,000~90,000시간
 * - OPEX: CAPEX의 2~5%/년
 * - 한국 청정수소 가격: 8,000~10,000원/kg (2024-2025)
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
    capex: 15_000_000_000,           // 원 (10MW × 150만원/kW = 150억원)
    opexRatio: 2.5,                  // % of CAPEX (업계 표준 2~5%)
    stackReplacementCost: 1_650_000_000,  // 원 (CAPEX의 11% = 16.5억원)
    electricitySource: 'PPA',
    ppaPrice: 70,                    // 원/kWh (재생에너지 PPA 70원대)
  },
  market: {
    h2Price: 8500,                   // 원/kg (청정수소 시장가격)
    h2PriceEscalation: 2,            // %/년 (물가상승 반영)
    electricityPriceScenario: 'base',
  },
  financial: {
    discountRate: 8,                 // % (한국 수소 프로젝트 WACC 기준)
    projectLifetime: 20,             // 년
    debtRatio: 70,                   // %
    interestRate: 5,                 // %
    loanTenor: 15,                   // 년
    constructionPeriod: 1,           // 년 (건설 기간)
    gracePeriod: 1,                  // 년 (대출 거치 기간)
    // 2순위: CAPEX 분할, 상환방식, 운전자본
    capexSchedule: [0.3, 0.4, 0.3],  // CAPEX 분할 비율 (건설기간별)
    repaymentMethod: 'equal_payment' as const, // 원리금균등
    workingCapitalMonths: 2,         // 운전자본 2개월분
    includeIdc: true,                // IDC 포함
  },
  tax: {
    corporateTaxRate: 22,            // % (한국 법인세 기본세율)
    localTaxRate: 2.2,               // % (지방소득세 = 법인세의 10%)
    depreciationMethod: 'straight_line' as const,
    electrolyzerUsefulLife: 10,      // 년 (전해조 내용연수)
    buildingUsefulLife: 40,          // 년 (건물 내용연수)
    buildingRatio: 10,               // % (건물 비율)
    salvageValueRate: 5,             // % (잔존가치율)
  },
  incentives: {
    // 세액공제 (한국 조특법 적용)
    itcEnabled: true,                // 투자세액공제 활성화
    itcRate: 10,                     // % (수소 관련 투자세액공제)
    ptcEnabled: false,
    ptcAmount: 700,                  // 원/kg H2 (청정수소발전 입찰 기준 추정)
    ptcDuration: 10,                 // 년

    // 보조금 (정부 실증사업 지원)
    capexSubsidy: 0,                 // 원
    capexSubsidyRate: 20,            // % (설비투자 보조금 20%)
    operatingSubsidy: 500,           // 원/kg H2 (청정수소 생산지원)
    operatingSubsidyDuration: 10,    // 년

    // 기타 인센티브
    carbonCreditPrice: 1000,         // 원/kg H2 (탄소배출권 환산 기준)
    carbonCreditEnabled: false,
    cleanH2Premium: 500,             // 원/kg H2 (청정수소 인증 프리미엄)
    cleanH2CertificationEnabled: true, // 청정수소 인증 활성화
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
