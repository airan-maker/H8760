import { useEffect, useState } from 'react';
import { Card } from '../common';
import type { Preset, SimulationInput } from '../../types';
import { dataApi } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

interface Props {
  onSelect: (input: Partial<SimulationInput>) => void;
  onCustomSelect?: () => void;
}

export default function PresetSelector({ onSelect, onCustomSelect }: Props) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPresets = async () => {
      try {
        const data = await dataApi.getPresets();
        setPresets(data);
      } catch (error) {
        console.error('Failed to load presets:', error);
        // 기본 프리셋 사용
        setPresets([
          {
            id: 'small_pem',
            name: '소규모 PEM',
            description: '1-5 MW PEM 전해조',
            electrolyzerType: 'PEM',
            capacityMw: 5.0,
            efficiency: 67.0,
            capexPerKw: 1500000,
          },
          {
            id: 'medium_pem',
            name: '중규모 PEM',
            description: '10-20 MW PEM 전해조',
            electrolyzerType: 'PEM',
            capacityMw: 10.0,
            efficiency: 65.0,
            capexPerKw: 1200000,
          },
          {
            id: 'large_alk',
            name: '대규모 ALK',
            description: '50-100 MW 알칼라인 전해조',
            electrolyzerType: 'ALK',
            capacityMw: 50.0,
            efficiency: 62.0,
            capexPerKw: 800000,
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadPresets();
  }, []);

  const handleSelect = (preset: Preset) => {
    setSelectedId(preset.id);
    const capex = preset.capacityMw * 1000 * preset.capexPerKw;
    // PEM: 11%, ALK: 15%, SOEC: 12%
    const stackReplacementRate = preset.electrolyzerType === 'ALK' ? 0.15 :
                                  preset.electrolyzerType === 'SOEC' ? 0.12 : 0.11;

    onSelect({
      equipment: {
        electrolyzerCapacity: preset.capacityMw,
        electrolyzerEfficiency: preset.efficiency,
        specificConsumption: (100 / preset.efficiency) * 33.33,
        degradationRate: preset.electrolyzerType === 'PEM' ? 0.5 : 0.3,
        stackLifetime: preset.electrolyzerType === 'PEM' ? 80000 : 90000,
        annualAvailability: 85,
      },
      cost: {
        capex: capex,
        opexRatio: 2.5,
        stackReplacementCost: capex * stackReplacementRate,
        electricitySource: 'PPA',
        ppaPrice: 70,  // 재생에너지 PPA 70원대
      },
    });
  };

  if (loading) {
    return (
      <Card>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card title="프리셋 선택" description="사전 정의된 설비 구성을 선택하세요">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => handleSelect(preset)}
            className={`
              text-left p-4 rounded-lg border-2 transition-all duration-150
              ${
                selectedId === preset.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }
            `}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-gray-900">{preset.name}</span>
              <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                {preset.electrolyzerType}
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-3">{preset.description}</p>
            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>용량</span>
                <span className="font-medium">{preset.capacityMw} MW</span>
              </div>
              <div className="flex justify-between">
                <span>효율</span>
                <span className="font-medium">{preset.efficiency}%</span>
              </div>
              <div className="flex justify-between">
                <span>CAPEX</span>
                <span className="font-medium">
                  {formatCurrency(preset.capacityMw * 1000 * preset.capexPerKw, true)}
                </span>
              </div>
            </div>
          </button>
        ))}

        {/* 커스텀 옵션 */}
        <button
          onClick={() => {
            setSelectedId('custom');
            onCustomSelect?.();
          }}
          className={`
            text-left p-4 rounded-lg border-2 border-dashed transition-all duration-150
            ${
              selectedId === 'custom'
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 hover:border-gray-400'
            }
          `}
        >
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <svg
                className="w-6 h-6 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <span className="font-semibold text-gray-900">커스텀</span>
            <p className="text-sm text-gray-500 mt-1">직접 설정</p>
          </div>
        </button>
      </div>
    </Card>
  );
}
