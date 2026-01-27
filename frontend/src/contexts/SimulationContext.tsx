import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { SimulationInput, SimulationResult } from '../types';
import { defaultSimulationInput } from '../types';
import { useAuth } from './AuthContext';
import { scenariosApi } from '../services/api';

// 저장된 시나리오 타입
export interface SavedScenario {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  input: SimulationInput;
  result: SimulationResult;
  isServerSynced?: boolean; // 서버 동기화 여부
}

// 프로젝트 정보
export interface ProjectInfo {
  id: string;
  name: string;
  description?: string;
  location?: string;
}

// Context 상태 타입
interface SimulationContextState {
  // 현재 프로젝트
  currentProject: ProjectInfo | null;
  setCurrentProject: (project: ProjectInfo | null) => void;

  // 현재 시뮬레이션 입력
  currentInput: SimulationInput;
  setCurrentInput: (input: SimulationInput) => void;

  // 현재 시뮬레이션 결과
  currentResult: SimulationResult | null;
  setCurrentResult: (result: SimulationResult | null) => void;

  // 저장된 시나리오들
  savedScenarios: SavedScenario[];
  saveScenario: (name: string, description?: string) => Promise<SavedScenario | null>;
  deleteScenario: (id: string) => Promise<void>;
  loadScenario: (id: string) => void;

  // 시나리오 로딩 상태
  scenariosLoading: boolean;

  // 서버 시나리오 새로고침
  refreshScenarios: () => Promise<void>;

  // 상태 초기화
  resetSimulation: () => void;
}

const SimulationContext = createContext<SimulationContextState | undefined>(undefined);

const STORAGE_KEYS = {
  PROJECT: 'h8760_currentProject',
  INPUT: 'h8760_currentInput',
  RESULT: 'h8760_currentResult',
  SCENARIOS: 'h8760_savedScenarios',
};

export function SimulationProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();

  // 현재 프로젝트
  const [currentProject, setCurrentProjectState] = useState<ProjectInfo | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROJECT);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // 현재 시뮬레이션 입력 (기존 데이터와 호환성 유지를 위해 기본값과 병합)
  const [currentInput, setCurrentInputState] = useState<SimulationInput>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.INPUT);
      if (saved) {
        const parsed = JSON.parse(saved);
        // 기존 데이터에 없는 필드(예: incentives)는 기본값으로 채움
        return {
          ...defaultSimulationInput,
          ...parsed,
          incentives: {
            ...defaultSimulationInput.incentives,
            ...(parsed.incentives || {}),
          },
        };
      }
      return defaultSimulationInput;
    } catch {
      return defaultSimulationInput;
    }
  });

  // 현재 시뮬레이션 결과
  const [currentResult, setCurrentResultState] = useState<SimulationResult | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RESULT);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // 로컬 저장 시나리오
  const [localScenarios, setLocalScenarios] = useState<SavedScenario[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SCENARIOS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 서버 저장 시나리오
  const [serverScenarios, setServerScenarios] = useState<SavedScenario[]>([]);
  const [scenariosLoading, setScenariosLoading] = useState(false);

  // 통합 시나리오 목록 (로그인 시 서버, 비로그인 시 로컬)
  const savedScenarios = user ? serverScenarios : localScenarios;

  // localStorage 동기화
  useEffect(() => {
    if (currentProject) {
      localStorage.setItem(STORAGE_KEYS.PROJECT, JSON.stringify(currentProject));
    } else {
      localStorage.removeItem(STORAGE_KEYS.PROJECT);
    }
  }, [currentProject]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INPUT, JSON.stringify(currentInput));
  }, [currentInput]);

  useEffect(() => {
    if (currentResult) {
      localStorage.setItem(STORAGE_KEYS.RESULT, JSON.stringify(currentResult));
    } else {
      localStorage.removeItem(STORAGE_KEYS.RESULT);
    }
  }, [currentResult]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SCENARIOS, JSON.stringify(localScenarios));
  }, [localScenarios]);

  // 서버에서 시나리오 가져오기
  const fetchServerScenarios = useCallback(async () => {
    if (!user) return;

    setScenariosLoading(true);
    try {
      const scenarios = await scenariosApi.list();
      setServerScenarios(
        scenarios.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description || '',
          createdAt: s.createdAt,
          input: s.inputConfig as SimulationInput,
          result: s.result as SimulationResult,
          isServerSynced: true,
        }))
      );
    } catch (error) {
      console.error('시나리오 목록 조회 실패:', error);
    } finally {
      setScenariosLoading(false);
    }
  }, [user]);

  // 로그인 시 서버 시나리오 가져오기
  useEffect(() => {
    // 인증 로딩 중에는 호출하지 않음
    if (authLoading) return;

    if (user) {
      fetchServerScenarios();
    } else {
      setServerScenarios([]);
    }
  }, [user, authLoading, fetchServerScenarios]);

  // 프로젝트 설정
  const setCurrentProject = (project: ProjectInfo | null) => {
    setCurrentProjectState(project);
  };

  // 입력 설정
  const setCurrentInput = (input: SimulationInput) => {
    setCurrentInputState(input);
  };

  // 결과 설정
  const setCurrentResult = (result: SimulationResult | null) => {
    setCurrentResultState(result);
  };

  // 시나리오 저장
  const saveScenario = async (name: string, description?: string): Promise<SavedScenario | null> => {
    if (!currentResult) return null;

    const scenarioDescription = description || `${currentInput.equipment.electrolyzerCapacity} MW, ${currentInput.cost.electricitySource}`;

    if (user) {
      // 로그인 상태: 서버에 저장
      try {
        const created = await scenariosApi.create({
          name,
          description: scenarioDescription,
          inputConfig: currentInput as unknown as Record<string, unknown>,
          result: currentResult as unknown as Record<string, unknown>,
        });

        const scenario: SavedScenario = {
          id: created.id,
          name: created.name,
          description: created.description || '',
          createdAt: created.createdAt,
          input: created.inputConfig as SimulationInput,
          result: created.result as SimulationResult,
          isServerSynced: true,
        };

        setServerScenarios((prev) => [scenario, ...prev]);
        return scenario;
      } catch (error) {
        console.error('시나리오 저장 실패:', error);
        return null;
      }
    } else {
      // 비로그인 상태: localStorage에 저장
      const scenario: SavedScenario = {
        id: `scenario_${Date.now()}`,
        name,
        description: scenarioDescription,
        createdAt: new Date().toISOString(),
        input: { ...currentInput },
        result: { ...currentResult },
        isServerSynced: false,
      };

      setLocalScenarios((prev) => [scenario, ...prev]);
      return scenario;
    }
  };

  // 시나리오 삭제
  const deleteScenario = async (id: string): Promise<void> => {
    if (user) {
      // 로그인 상태: 서버에서 삭제
      try {
        await scenariosApi.delete(id);
        setServerScenarios((prev) => prev.filter((s) => s.id !== id));
      } catch (error) {
        console.error('시나리오 삭제 실패:', error);
        throw error;
      }
    } else {
      // 비로그인 상태: localStorage에서 삭제
      setLocalScenarios((prev) => prev.filter((s) => s.id !== id));
    }
  };

  // 시나리오 불러오기
  const loadScenario = (id: string) => {
    const scenarios = user ? serverScenarios : localScenarios;
    const scenario = scenarios.find((s) => s.id === id);
    if (scenario) {
      setCurrentInputState(scenario.input);
      setCurrentResultState(scenario.result);
    }
  };

  // 시나리오 새로고침
  const refreshScenarios = async () => {
    if (user) {
      await fetchServerScenarios();
    }
  };

  // 시뮬레이션 초기화
  const resetSimulation = () => {
    setCurrentInputState(defaultSimulationInput);
    setCurrentResultState(null);
  };

  return (
    <SimulationContext.Provider
      value={{
        currentProject,
        setCurrentProject,
        currentInput,
        setCurrentInput,
        currentResult,
        setCurrentResult,
        savedScenarios,
        saveScenario,
        deleteScenario,
        loadScenario,
        scenariosLoading,
        refreshScenarios,
        resetSimulation,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulationContext() {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error('useSimulationContext must be used within a SimulationProvider');
  }
  return context;
}
