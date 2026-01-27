/**
 * 최적화 API 서비스
 */
import api from './api';
import type { SimulationInput } from '../types';
import type {
  OptimizableVariable,
  VariableRange,
  GridSearchResponse,
  AIOptimizeResponse,
  SensitivityExploreResponse,
  KPITarget,
  VariableConstraint,
  TargetKPI,
} from '../types/optimization';

// =============================================================================
// 헬퍼 함수: snake_case ↔ camelCase 변환
// =============================================================================

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function convertKeysToSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = toSnakeCase(key);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[newKey] = convertKeysToSnakeCase(value as Record<string, unknown>);
    } else {
      result[newKey] = value;
    }
  }
  return result;
}

function convertKeysToCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = toCamelCase(key);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[newKey] = convertKeysToCamelCase(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[newKey] = value.map(item =>
        item && typeof item === 'object'
          ? convertKeysToCamelCase(item as Record<string, unknown>)
          : item
      );
    } else {
      result[newKey] = value;
    }
  }
  return result;
}

// SimulationInput을 백엔드 형식으로 변환
function convertInputToBackend(input: SimulationInput): Record<string, unknown> {
  return {
    equipment: {
      electrolyzer_capacity: input.equipment.electrolyzerCapacity,
      electrolyzer_efficiency: input.equipment.electrolyzerEfficiency,
      specific_consumption: input.equipment.specificConsumption,
      degradation_rate: input.equipment.degradationRate,
      stack_lifetime: input.equipment.stackLifetime,
      annual_availability: input.equipment.annualAvailability,
    },
    cost: {
      capex: input.cost.capex,
      opex_ratio: input.cost.opexRatio,
      stack_replacement_cost: input.cost.stackReplacementCost,
      electricity_source: input.cost.electricitySource,
      ppa_price: input.cost.ppaPrice,
    },
    market: {
      h2_price: input.market.h2Price,
      h2_price_escalation: input.market.h2PriceEscalation,
      electricity_price_scenario: input.market.electricityPriceScenario,
    },
    financial: {
      discount_rate: input.financial.discountRate,
      project_lifetime: input.financial.projectLifetime,
      debt_ratio: input.financial.debtRatio,
      interest_rate: input.financial.interestRate,
      loan_tenor: input.financial.loanTenor,
    },
    risk_weights: {
      weather_variability: input.riskWeights.weatherVariability,
      price_volatility: input.riskWeights.priceVolatility,
      confidence_level: input.riskWeights.confidenceLevel,
    },
    monte_carlo: {
      iterations: input.monteCarlo.iterations,
      weather_sigma: input.monteCarlo.weatherSigma,
      price_sigma: input.monteCarlo.priceSigma,
    },
    renewable: {
      enabled: false,
      source_type: 'solar',
      capacity_mw: 15.0,
      capacity_factor: 15.0,
      profile_type: 'typical',
    },
  };
}

// =============================================================================
// Optimization API
// =============================================================================

export const optimizationApi = {
  // 최적화 가능 변수 목록 조회
  getVariables: async (): Promise<OptimizableVariable[]> => {
    const response = await api.get('/optimization/variables');
    return response.data.map((v: Record<string, unknown>) => ({
      name: toCamelCase(v.name as string),
      displayName: v.display_name,
      category: v.category,
      minValue: v.min_value,
      maxValue: v.max_value,
      defaultValue: v.default_value,
      unit: v.unit,
      step: v.step,
    }));
  },

  // ==========================================================================
  // Grid Search
  // ==========================================================================

  startGridSearch: async (
    baseInput: SimulationInput,
    variableRanges: VariableRange[],
    targetKpi: TargetKPI = 'npv_p50',
    monteCarloIterations: number = 1000,
    maxCombinations: number = 1000
  ): Promise<GridSearchResponse> => {
    const payload = {
      base_input: convertInputToBackend(baseInput),
      variable_ranges: variableRanges.map(v => ({
        name: toSnakeCase(v.name),
        display_name: v.displayName,
        min_value: v.minValue,
        max_value: v.maxValue,
        step: v.step,
        unit: v.unit,
      })),
      target_kpi: targetKpi,
      monte_carlo_iterations: monteCarloIterations,
      max_combinations: maxCombinations,
    };

    const response = await api.post('/optimization/grid-search', payload);
    return convertGridSearchResponse(response.data);
  },

  getGridSearchStatus: async (jobId: string): Promise<GridSearchResponse> => {
    const response = await api.get(`/optimization/grid-search/${jobId}/status`);
    return convertGridSearchResponse(response.data);
  },

  cancelGridSearch: async (jobId: string): Promise<void> => {
    await api.delete(`/optimization/grid-search/${jobId}`);
  },

  // ==========================================================================
  // AI 최적화
  // ==========================================================================

  runAIOptimization: async (
    baseInput: SimulationInput,
    targets: KPITarget[],
    constraints: VariableConstraint[] = [],
    useSensitivity: boolean = true,
    maxIterations: number = 5
  ): Promise<AIOptimizeResponse> => {
    const payload = {
      base_input: convertInputToBackend(baseInput),
      targets: targets.map(t => ({
        kpi: t.kpi,
        condition: t.condition,
        value: t.value,
        priority: t.priority,
      })),
      constraints: constraints.map(c => ({
        name: toSnakeCase(c.name),
        min_value: c.minValue,
        max_value: c.maxValue,
        fixed_value: c.fixedValue,
      })),
      use_sensitivity: useSensitivity,
      max_iterations: maxIterations,
    };

    const response = await api.post('/optimization/ai-optimize', payload);
    return convertAIOptimizeResponse(response.data);
  },

  // ==========================================================================
  // 민감도 기반 탐색
  // ==========================================================================

  runSensitivityExplore: async (
    baseInput: SimulationInput,
    selectedVariables: string[] | null = null,
    resolution: number = 20,
    targetKpi: TargetKPI = 'npv_p50'
  ): Promise<SensitivityExploreResponse> => {
    const payload = {
      base_input: convertInputToBackend(baseInput),
      selected_variables: selectedVariables?.map(toSnakeCase) ?? null,
      resolution,
      target_kpi: targetKpi,
    };

    const response = await api.post('/optimization/sensitivity-explore', payload);
    return convertSensitivityExploreResponse(response.data);
  },
};

// =============================================================================
// 응답 변환 헬퍼
// =============================================================================

function convertGridSearchResponse(data: Record<string, unknown>): GridSearchResponse {
  const results = (data.results as Record<string, unknown>[] || []).map((r, idx) => ({
    combination: convertKeysToCamelCase(r.combination as Record<string, unknown>) as Record<string, number>,
    npvP50: r.npv_p50 as number,
    npvP90: r.npv_p90 as number,
    irrP50: r.irr_p50 as number,
    lcoh: r.lcoh as number,
    dscrMin: r.dscr_min as number,
    annualH2Production: r.annual_h2_production as number,
    rank: (r.rank as number) || idx + 1,
  }));

  const bestResultRaw = data.best_result as Record<string, unknown> | null;
  const bestResult = bestResultRaw
    ? {
        combination: convertKeysToCamelCase(bestResultRaw.combination as Record<string, unknown>) as Record<string, number>,
        npvP50: bestResultRaw.npv_p50 as number,
        npvP90: bestResultRaw.npv_p90 as number,
        irrP50: bestResultRaw.irr_p50 as number,
        lcoh: bestResultRaw.lcoh as number,
        dscrMin: bestResultRaw.dscr_min as number,
        annualH2Production: bestResultRaw.annual_h2_production as number,
        rank: 1,
      }
    : null;

  const heatmapRaw = data.heatmap_data as Record<string, unknown> | null;
  const heatmapData = heatmapRaw
    ? {
        xVariable: toCamelCase(heatmapRaw.x_variable as string),
        yVariable: toCamelCase(heatmapRaw.y_variable as string),
        xValues: heatmapRaw.x_values as number[],
        yValues: heatmapRaw.y_values as number[],
        zMatrix: heatmapRaw.z_matrix as number[][],
        zVariable: heatmapRaw.z_variable as string,
      }
    : null;

  return {
    jobId: data.job_id as string,
    status: data.status as GridSearchResponse['status'],
    progress: data.progress as number,
    totalCombinations: data.total_combinations as number,
    completedCombinations: data.completed_combinations as number,
    results,
    bestResult,
    heatmapData,
    errorMessage: (data.error_message as string) || null,
  };
}

function convertAIOptimizeResponse(data: Record<string, unknown>): AIOptimizeResponse {
  const recommendations = (data.recommendations as Record<string, unknown>[] || []).map(r => ({
    rank: r.rank as number,
    recommendedInput: convertKeysToCamelCase(r.recommended_input as Record<string, unknown>),
    expectedKpis: r.expected_kpis as Record<string, number>,
    reasoning: r.reasoning as string,
    confidence: r.confidence as number,
    tradeOffs: r.trade_offs as string[],
  }));

  return {
    status: data.status as string,
    recommendations,
    analysisSummary: data.analysis_summary as string,
    sensitivityReference: data.sensitivity_reference as Record<string, unknown> | null,
    iterationsUsed: data.iterations_used as number,
  };
}

function convertSensitivityExploreResponse(data: Record<string, unknown>): SensitivityExploreResponse {
  const sensitivityRanking = (data.sensitivity_ranking as Record<string, unknown>[] || []).map(r => ({
    variable: toCamelCase(r.variable as string),
    displayName: r.display_name as string,
    impactScore: r.impact_score as number,
    npvSwing: r.npv_swing as number,
    lowCasePct: r.low_case_pct as number,
    highCasePct: r.high_case_pct as number,
  }));

  const contourRaw = data.contour_data as Record<string, unknown> | null;
  const contourData = contourRaw
    ? {
        xVariable: toCamelCase(contourRaw.x_variable as string),
        yVariable: toCamelCase(contourRaw.y_variable as string),
        xValues: contourRaw.x_values as number[],
        yValues: contourRaw.y_values as number[],
        zMatrix: contourRaw.z_matrix as number[][],
        optimalPoint: contourRaw.optimal_point as { x: number; y: number; z: number } | null,
        contourLevels: contourRaw.contour_levels as number[],
      }
    : null;

  return {
    status: data.status as string,
    sensitivityRanking,
    selectedVariables: ((data.selected_variables as string[]) || []).map(toCamelCase),
    contourData,
    optimalRegion: data.optimal_region as Record<string, unknown> | null,
    recommendations: data.recommendations as string[],
  };
}

export default optimizationApi;
