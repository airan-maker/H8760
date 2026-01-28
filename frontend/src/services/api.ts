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
import { auth } from '../config/firebase';

// Railway 배포 시 VITE_API_URL 환경변수 사용, 로컬에서는 프록시 사용
const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 인증 헤더 인터셉터
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    } catch (error) {
      console.error('토큰 가져오기 실패:', error);
    }
  }
  return config;
});

// 응답 에러 인터셉터
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 인증 실패 시 로그인 페이지로 리디렉션 (선택적)
      console.error('인증 실패');
    }
    return Promise.reject(error);
  }
);

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
          construction_period: input.financial.constructionPeriod,
          grace_period: input.financial.gracePeriod,
          // 2순위: CAPEX 분할, 상환방식, 운전자본
          capex_schedule: input.financial.capexSchedule,
          repayment_method: input.financial.repaymentMethod,
          working_capital_months: input.financial.workingCapitalMonths,
          include_idc: input.financial.includeIdc,
        },
        tax: {
          corporate_tax_rate: input.tax.corporateTaxRate,
          local_tax_rate: input.tax.localTaxRate,
          depreciation_method: input.tax.depreciationMethod,
          electrolyzer_useful_life: input.tax.electrolyzerUsefulLife,
          building_useful_life: input.tax.buildingUsefulLife,
          building_ratio: input.tax.buildingRatio,
          salvage_value_rate: input.tax.salvageValueRate,
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
          source_type: "solar",
          capacity_mw: 15.0,
          capacity_factor: 15.0,
          profile_type: "typical",
        },
      },
      save_result: true,
    };

    const response = await api.post('/simulation/run', payload);

    // 백엔드가 camelCase로 응답하므로 직접 매핑
    const data = response.data;
    return {
      simulationId: data.simulationId,
      status: data.status,
      capitalSummary: data.capitalSummary ? {
        totalCapex: data.capitalSummary.totalCapex,
        idcAmount: data.capitalSummary.idcAmount || 0,
        totalCapexWithIdc: data.capitalSummary.totalCapexWithIdc || data.capitalSummary.totalCapex,
        debtAmount: data.capitalSummary.debtAmount,
        equityAmount: data.capitalSummary.equityAmount,
        workingCapital: data.capitalSummary.workingCapital || 0,
        salvageValue: data.capitalSummary.salvageValue || 0,
      } : undefined,
      kpis: {
        npv: data.kpis.npv,
        irr: data.kpis.irr,
        dscr: data.kpis.dscr,
        paybackPeriod: data.kpis.paybackPeriod,
        var95: data.kpis.var95,
        annualH2Production: data.kpis.annualH2Production,
        lcoh: data.kpis.lcoh,
        // Bankability 추가 지표
        npvAfterTax: data.kpis.npvAfterTax,
        equityIrr: data.kpis.equityIrr,
        coverageRatios: data.kpis.coverageRatios,
      },
      hourlyData: data.hourlyData
        ? {
            production: data.hourlyData.production,
            revenue: data.hourlyData.revenue,
            electricityCost: data.hourlyData.electricityCost,
            operatingHours: data.hourlyData.operatingHours,
          }
        : undefined,
      distributions: {
        npvHistogram: data.distributions.npvHistogram,
        revenueHistogram: data.distributions.revenueHistogram,
      },
      sensitivity: data.sensitivity.map((s: Record<string, unknown>) => ({
        variable: s.variable,
        baseCase: s.baseCase,
        lowCase: s.lowCase,
        highCase: s.highCase,
        lowChangePct: s.lowChangePct,
        highChangePct: s.highChangePct,
      })),
      riskWaterfall: data.riskWaterfall,
      yearlyCashflow: data.yearlyCashflow.map((c: Record<string, unknown>) => ({
        year: c.year,
        revenue: c.revenue,
        opex: c.opex,
        depreciation: c.depreciation || 0,
        ebitda: c.ebitda || 0,
        ebit: c.ebit || 0,
        tax: c.tax || 0,
        debtService: c.debtService,
        interestExpense: c.interestExpense || 0,
        principalRepayment: c.principalRepayment || 0,
        netCashflow: c.netCashflow,
        netCashflowAfterTax: c.netCashflowAfterTax || c.netCashflow,
        cumulativeCashflow: c.cumulativeCashflow,
        dscr: c.dscr || 0,
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

// 인증 API
export const authApi = {
  // 현재 사용자 정보 조회
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// 시나리오 타입 정의
export interface ScenarioData {
  id: string;
  name: string;
  description: string;
  inputConfig: Record<string, unknown>;
  result: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

// 시나리오 API
export const scenariosApi = {
  // 내 시나리오 목록 조회
  list: async (): Promise<ScenarioData[]> => {
    const response = await api.get('/scenarios');
    return response.data.map((s: Record<string, unknown>) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      inputConfig: s.input_config,
      result: s.result,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }));
  },

  // 시나리오 상세 조회
  get: async (id: string): Promise<ScenarioData> => {
    const response = await api.get(`/scenarios/${id}`);
    const s = response.data;
    return {
      id: s.id,
      name: s.name,
      description: s.description,
      inputConfig: s.input_config,
      result: s.result,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    };
  },

  // 시나리오 저장
  create: async (data: {
    name: string;
    description?: string;
    inputConfig: Record<string, unknown>;
    result?: Record<string, unknown>;
  }): Promise<ScenarioData> => {
    const response = await api.post('/scenarios', {
      name: data.name,
      description: data.description,
      input_config: data.inputConfig,
      result: data.result,
    });
    const s = response.data;
    return {
      id: s.id,
      name: s.name,
      description: s.description,
      inputConfig: s.input_config,
      result: s.result,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    };
  },

  // 시나리오 수정
  update: async (
    id: string,
    data: {
      name?: string;
      description?: string;
      inputConfig?: Record<string, unknown>;
      result?: Record<string, unknown>;
    }
  ): Promise<ScenarioData> => {
    const payload: Record<string, unknown> = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.description !== undefined) payload.description = data.description;
    if (data.inputConfig !== undefined) payload.input_config = data.inputConfig;
    if (data.result !== undefined) payload.result = data.result;

    const response = await api.put(`/scenarios/${id}`, payload);
    const s = response.data;
    return {
      id: s.id,
      name: s.name,
      description: s.description,
      inputConfig: s.input_config,
      result: s.result,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    };
  },

  // 시나리오 삭제
  delete: async (id: string): Promise<void> => {
    await api.delete(`/scenarios/${id}`);
  },
};

export default api;
