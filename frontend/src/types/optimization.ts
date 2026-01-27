/**
 * 최적화 관련 TypeScript 타입 정의
 */

import type { SimulationInput } from './index';

// =============================================================================
// 공통 타입
// =============================================================================

export interface VariableRange {
  name: string;
  displayName: string;
  minValue: number;
  maxValue: number;
  step: number;
  unit: string;
}

export interface OptimizableVariable {
  name: string;
  displayName: string;
  category: 'equipment' | 'cost' | 'market' | 'financial';
  minValue: number;
  maxValue: number;
  defaultValue: number;
  unit: string;
  step: number;
}

// 최적화 가능한 변수 목록
export const OPTIMIZABLE_VARIABLES: OptimizableVariable[] = [
  {
    name: 'electrolyzerCapacity',
    displayName: '전해조 용량',
    category: 'equipment',
    minValue: 1.0,
    maxValue: 100.0,
    defaultValue: 10.0,
    unit: 'MW',
    step: 1.0,
  },
  {
    name: 'electrolyzerEfficiency',
    displayName: '전해조 효율',
    category: 'equipment',
    minValue: 50.0,
    maxValue: 85.0,
    defaultValue: 67.0,
    unit: '%',
    step: 1.0,
  },
  {
    name: 'ppaPrice',
    displayName: 'PPA 전력가격',
    category: 'cost',
    minValue: 30.0,
    maxValue: 500.0,
    defaultValue: 100.0,
    unit: '원/kWh',
    step: 10.0,
  },
  {
    name: 'h2Price',
    displayName: '수소 판매가격',
    category: 'market',
    minValue: 3000.0,
    maxValue: 15000.0,
    defaultValue: 6000.0,
    unit: '원/kg',
    step: 500.0,
  },
  {
    name: 'capex',
    displayName: 'CAPEX',
    category: 'cost',
    minValue: 10_000_000_000,
    maxValue: 200_000_000_000,
    defaultValue: 50_000_000_000,
    unit: '원',
    step: 5_000_000_000,
  },
  {
    name: 'discountRate',
    displayName: '할인율',
    category: 'financial',
    minValue: 5.0,
    maxValue: 15.0,
    defaultValue: 8.0,
    unit: '%',
    step: 0.5,
  },
  {
    name: 'debtRatio',
    displayName: '부채비율',
    category: 'financial',
    minValue: 0.0,
    maxValue: 90.0,
    defaultValue: 70.0,
    unit: '%',
    step: 5.0,
  },
  {
    name: 'annualAvailability',
    displayName: '연간 가동률',
    category: 'equipment',
    minValue: 70.0,
    maxValue: 98.0,
    defaultValue: 85.0,
    unit: '%',
    step: 1.0,
  },
];

// 변수명 -> 표시명 맵핑
export const VARIABLE_DISPLAY_NAMES: Record<string, string> = {
  electrolyzerCapacity: '전해조 용량',
  electrolyzerEfficiency: '전해조 효율',
  ppaPrice: 'PPA 전력가격',
  h2Price: '수소 판매가격',
  capex: 'CAPEX',
  discountRate: '할인율',
  debtRatio: '부채비율',
  annualAvailability: '연간 가동률',
};

// =============================================================================
// Grid Search 타입
// =============================================================================

export interface GridSearchRequest {
  baseInput: SimulationInput;
  variableRanges: VariableRange[];
  targetKpi: 'npv_p50' | 'irr_p50' | 'lcoh';
  monteCarloIterations: number;
  maxCombinations: number;
}

export interface GridSearchResultItem {
  combination: Record<string, number>;
  npvP50: number;
  npvP90: number;
  irrP50: number;
  lcoh: number;
  dscrMin: number;
  annualH2Production: number;
  rank: number;
}

export interface HeatmapData {
  xVariable: string;
  yVariable: string;
  xValues: number[];
  yValues: number[];
  zMatrix: number[][];
  zVariable: string;
}

export interface GridSearchResponse {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  totalCombinations: number;
  completedCombinations: number;
  results: GridSearchResultItem[];
  bestResult: GridSearchResultItem | null;
  heatmapData: HeatmapData | null;
  errorMessage: string | null;
}

// =============================================================================
// AI 최적화 타입
// =============================================================================

export interface KPITarget {
  kpi: 'npv' | 'irr' | 'lcoh' | 'dscr';
  condition: '>=' | '<=' | '==';
  value: number;
  priority: number;
}

export interface VariableConstraint {
  name: string;
  minValue?: number;
  maxValue?: number;
  fixedValue?: number;
}

export interface AIOptimizeRequest {
  baseInput: SimulationInput;
  targets: KPITarget[];
  constraints: VariableConstraint[];
  useSensitivity: boolean;
  maxIterations: number;
}

export interface AIRecommendation {
  rank: number;
  recommendedInput: Record<string, unknown>;
  expectedKpis: Record<string, number>;
  reasoning: string;
  confidence: number;
  tradeOffs: string[];
}

export interface AIOptimizeResponse {
  status: string;
  recommendations: AIRecommendation[];
  analysisSummary: string;
  sensitivityReference: Record<string, unknown> | null;
  iterationsUsed: number;
}

// =============================================================================
// 민감도 기반 탐색 타입
// =============================================================================

export interface SensitivityRank {
  variable: string;
  displayName: string;
  impactScore: number;
  npvSwing: number;
  lowCasePct: number;
  highCasePct: number;
}

export interface SensitivityExploreRequest {
  baseInput: SimulationInput;
  selectedVariables: string[] | null;
  resolution: number;
  targetKpi: 'npv_p50' | 'irr_p50' | 'lcoh';
}

export interface ContourData {
  xVariable: string;
  yVariable: string;
  xValues: number[];
  yValues: number[];
  zMatrix: number[][];
  optimalPoint: { x: number; y: number; z: number } | null;
  contourLevels: number[];
}

export interface SensitivityExploreResponse {
  status: string;
  sensitivityRanking: SensitivityRank[];
  selectedVariables: string[];
  contourData: ContourData | null;
  optimalRegion: Record<string, unknown> | null;
  recommendations: string[];
}

// =============================================================================
// 작업 상태 타입
// =============================================================================

export interface JobStatus {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  message: string | null;
  result: unknown | null;
}

// =============================================================================
// 유틸리티
// =============================================================================

export type TargetKPI = 'npv_p50' | 'irr_p50' | 'lcoh';

export const TARGET_KPI_LABELS: Record<TargetKPI, string> = {
  npv_p50: 'NPV (P50)',
  irr_p50: 'IRR (P50)',
  lcoh: 'LCOH',
};

export const KPI_DISPLAY_NAMES: Record<string, string> = {
  npv: 'NPV',
  irr: 'IRR',
  lcoh: 'LCOH',
  dscr: 'DSCR',
};
