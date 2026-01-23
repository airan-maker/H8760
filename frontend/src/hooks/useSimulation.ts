import { useState, useCallback } from 'react';
import { simulationApi } from '../services/api';
import type { SimulationInput, SimulationResult } from '../types';

interface UseSimulationReturn {
  result: SimulationResult | null;
  loading: boolean;
  error: string | null;
  runSimulation: (input: SimulationInput, projectId?: string) => Promise<void>;
  clearResult: () => void;
}

export function useSimulation(): UseSimulationReturn {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSimulation = useCallback(
    async (input: SimulationInput, projectId?: string) => {
      setLoading(true);
      setError(null);

      try {
        const simulationResult = await simulationApi.run(input, projectId);
        setResult(simulationResult);

        // 결과를 localStorage에 저장
        localStorage.setItem('lastSimulationResult', JSON.stringify(simulationResult));
        localStorage.setItem('lastSimulationInput', JSON.stringify(input));
      } catch (err) {
        const message = err instanceof Error ? err.message : '시뮬레이션 실행 중 오류가 발생했습니다';
        setError(message);
        console.error('Simulation error:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    result,
    loading,
    error,
    runSimulation,
    clearResult,
  };
}
