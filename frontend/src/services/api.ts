/**
 * API 클라이언트
 */
import axios from 'axios';
import type {
  Project,
  SimulationInput,
  SimulationResult,
  Preset,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 프로젝트 API
export const projectsApi = {
  // 프로젝트 목록 조회
  list: async (): Promise<Project[]> => {
    const response = await api.get('/projects');
    return response.data;
  },

  // 프로젝트 상세 조회
  get: async (id: string): Promise<Project> => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },

  // 프로젝트 생성
  create: async (data: {
    name: string;
    description?: string;
    location?: string;
  }): Promise<Project> => {
    const response = await api.post('/projects', data);
    return response.data;
  },

  // 프로젝트 수정
  update: async (
    id: string,
    data: { name?: string; description?: string; location?: string }
  ): Promise<Project> => {
    const response = await api.put(`/projects/${id}`, data);
    return response.data;
  },

  // 프로젝트 삭제
  delete: async (id: string): Promise<void> => {
    await api.delete(`/projects/${id}`);
  },
};

// 시뮬레이션 API
export const simulationApi = {
  // 시뮬레이션 실행
  run: async (input: SimulationInput, projectId?: string): Promise<SimulationResult> => {
    // 스네이크 케이스로 변환
    const payload = {
      project_id: projectId,
      input: {
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
      },
      save_result: true,
    };

    const response = await api.post('/simulation/run', payload);

    // 카멜 케이스로 변환
    const data = response.data;
    return {
      simulationId: data.simulation_id,
      status: data.status,
      kpis: {
        npv: data.kpis.npv,
        irr: data.kpis.irr,
        dscr: data.kpis.dscr,
        paybackPeriod: data.kpis.payback_period,
        var95: data.kpis.var_95,
        annualH2Production: data.kpis.annual_h2_production,
        lcoh: data.kpis.lcoh,
      },
      hourlyData: data.hourly_data
        ? {
            production: data.hourly_data.production,
            revenue: data.hourly_data.revenue,
            electricityCost: data.hourly_data.electricity_cost,
            operatingHours: data.hourly_data.operating_hours,
          }
        : undefined,
      distributions: {
        npvHistogram: data.distributions.npv_histogram,
        revenueHistogram: data.distributions.revenue_histogram,
      },
      sensitivity: data.sensitivity.map((s: Record<string, unknown>) => ({
        variable: s.variable,
        baseCase: s.base_case,
        lowCase: s.low_case,
        highCase: s.high_case,
        lowChangePct: s.low_change_pct,
        highChangePct: s.high_change_pct,
      })),
      riskWaterfall: data.risk_waterfall,
      yearlyCashflow: data.yearly_cashflow.map((c: Record<string, unknown>) => ({
        year: c.year,
        revenue: c.revenue,
        opex: c.opex,
        debtService: c.debt_service,
        netCashflow: c.net_cashflow,
        cumulativeCashflow: c.cumulative_cashflow,
      })),
    };
  },

  // 시뮬레이션 결과 조회
  getResult: async (id: string): Promise<SimulationResult> => {
    const response = await api.get(`/simulation/${id}/result`);
    return response.data;
  },

  // 시나리오 비교
  compare: async (simulationIds: string[]) => {
    const response = await api.post('/simulation/compare', simulationIds);
    return response.data;
  },
};

// 데이터 API
export const dataApi = {
  // 프리셋 목록 조회
  getPresets: async (): Promise<Preset[]> => {
    const response = await api.get('/data/presets');
    return response.data.map((p: Record<string, unknown>) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      electrolyzerType: p.electrolyzer_type,
      capacityMw: p.capacity_mw,
      efficiency: p.efficiency,
      capexPerKw: p.capex_per_kw,
    }));
  },

  // 전력 가격 데이터 조회
  getElectricityPrices: async (scenario: string = 'base') => {
    const response = await api.get(`/data/electricity-prices/${scenario}`);
    return response.data;
  },
};

export default api;
