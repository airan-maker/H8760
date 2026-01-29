/**
 * 국가별 프리셋 선택 컴포넌트
 *
 * 각 국가의 전력비용, 인센티브, 세금 등 지역 특성을 반영한 프리셋을 제공
 */
import { useEffect, useState } from 'react';
import type { CountryPreset, SimulationInput } from '../../types';
import { dataApi } from '../../services/api';

interface Props {
  currentInput: SimulationInput;
  onApply: (input: Partial<SimulationInput>) => void;
}

export default function CountryPresetSelector({ currentInput, onApply }: Props) {
  const [presets, setPresets] = useState<CountryPreset[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const loadPresets = async () => {
      try {
        const data = await dataApi.getCountryPresets();
        setPresets(data);
      } catch (error) {
        console.error('Failed to load country presets:', error);
        // 기본 프리셋 (한국)만 표시
        setPresets([]);
      } finally {
        setLoading(false);
      }
    };
    loadPresets();
  }, []);

  const handleSelect = (preset: CountryPreset) => {
    setSelectedId(preset.id);
  };

  const handleApply = () => {
    const preset = presets.find(p => p.id === selectedId);
    if (!preset) return;

    // 현재 CAPEX에 국가별 계수 적용
    const adjustedCapex = currentInput.cost.capex * preset.capexMultiplier;
    const adjustedStackCost = currentInput.cost.stackReplacementCost * preset.capexMultiplier;

    onApply({
      cost: {
        ...currentInput.cost,
        capex: adjustedCapex,
        stackReplacementCost: adjustedStackCost,
        ppaPrice: preset.ppaPriceKrw,
      },
      market: {
        ...currentInput.market,
        h2Price: preset.h2PriceKrw,
        h2PriceEscalation: preset.h2PriceEscalation,
      },
      financial: {
        ...currentInput.financial,
        interestRate: preset.interestRate,
        discountRate: preset.discountRate,
      },
      tax: {
        ...currentInput.tax,
        corporateTaxRate: preset.corporateTaxRate,
        localTaxRate: 0, // 국가별로 다르게 처리
      },
      incentives: {
        ...currentInput.incentives,
        itcEnabled: preset.itcRate > 0,
        itcRate: preset.itcRate,
        ptcEnabled: preset.ptcAmountKrw > 0,
        ptcAmount: preset.ptcAmountKrw,
        ptcDuration: preset.ptcDuration,
        capexSubsidyRate: preset.capexSubsidyRate,
        operatingSubsidy: preset.operatingSubsidyKrw,
        operatingSubsidyDuration: preset.operatingSubsidyDuration,
      },
    });
  };

  const selectedPreset = presets.find(p => p.id === selectedId);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-dark-200 p-4">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-8 h-8 bg-dark-100 rounded-lg"></div>
          <div className="h-4 bg-dark-100 rounded w-32"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-dark-200 overflow-hidden">
      {/* 헤더 */}
      <div className="px-4 py-3 bg-dark-50 border-b border-dark-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium text-dark-700">국가별 프리셋</span>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-dark-400 hover:text-dark-600"
        >
          {showDetails ? '간략히' : '상세보기'}
        </button>
      </div>

      {/* 국가 선택 그리드 */}
      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleSelect(preset)}
              className={`p-3 rounded-lg border-2 transition-all text-left ${
                selectedId === preset.id
                  ? 'border-hydrogen-500 bg-hydrogen-50'
                  : 'border-dark-100 hover:border-dark-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{preset.flagEmoji}</span>
                <span className={`font-medium text-sm ${
                  selectedId === preset.id ? 'text-hydrogen-700' : 'text-dark-700'
                }`}>
                  {preset.name}
                </span>
              </div>
              <p className="text-xs text-dark-400 line-clamp-2">{preset.description}</p>
            </button>
          ))}
        </div>

        {/* 선택된 국가 상세 정보 */}
        {selectedPreset && showDetails && (
          <div className="mt-4 p-4 bg-dark-50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{selectedPreset.flagEmoji}</span>
              <div>
                <h4 className="font-semibold text-dark-700">{selectedPreset.name}</h4>
                <p className="text-xs text-dark-400">{selectedPreset.notes}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {/* 전력 비용 */}
              <div className="bg-white p-2 rounded">
                <div className="text-dark-400 mb-1">PPA 전력단가</div>
                <div className="font-semibold text-dark-700">
                  {selectedPreset.currencySymbol}{selectedPreset.ppaPrice.toFixed(3)}/kWh
                </div>
                <div className="text-dark-400">≈ {selectedPreset.ppaPriceKrw.toFixed(0)}원</div>
              </div>

              {/* 수소 가격 */}
              <div className="bg-white p-2 rounded">
                <div className="text-dark-400 mb-1">수소 판매가</div>
                <div className="font-semibold text-dark-700">
                  {selectedPreset.currencySymbol}{selectedPreset.h2Price.toFixed(2)}/kg
                </div>
                <div className="text-dark-400">≈ {selectedPreset.h2PriceKrw.toFixed(0)}원</div>
              </div>

              {/* 인센티브 */}
              <div className="bg-white p-2 rounded">
                <div className="text-dark-400 mb-1">주요 인센티브</div>
                <div className="font-semibold text-dark-700">
                  {selectedPreset.itcRate > 0 && `ITC ${selectedPreset.itcRate}%`}
                  {selectedPreset.ptcAmountKrw > 0 && `PTC ${selectedPreset.ptcAmountKrw.toLocaleString()}원/kg`}
                  {selectedPreset.capexSubsidyRate > 0 && `보조금 ${selectedPreset.capexSubsidyRate}%`}
                  {selectedPreset.itcRate === 0 && selectedPreset.ptcAmountKrw === 0 && selectedPreset.capexSubsidyRate === 0 && '-'}
                </div>
              </div>

              {/* 세금 */}
              <div className="bg-white p-2 rounded">
                <div className="text-dark-400 mb-1">법인세율</div>
                <div className="font-semibold text-dark-700">{selectedPreset.corporateTaxRate}%</div>
                {selectedPreset.carbonPriceKrw > 0 && (
                  <div className="text-dark-400">탄소가격 {(selectedPreset.carbonPriceKrw/1000).toFixed(0)}천원/톤</div>
                )}
              </div>
            </div>

            {/* 적용 버튼 */}
            <button
              onClick={handleApply}
              className="mt-4 w-full py-2.5 bg-hydrogen-500 text-white rounded-lg hover:bg-hydrogen-600 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {selectedPreset.name} 조건 적용
            </button>
          </div>
        )}

        {/* 간략 모드에서 적용 버튼 */}
        {selectedPreset && !showDetails && (
          <button
            onClick={handleApply}
            className="mt-3 w-full py-2 bg-hydrogen-500 text-white rounded-lg hover:bg-hydrogen-600 transition-colors text-sm font-medium"
          >
            {selectedPreset.flagEmoji} {selectedPreset.name} 조건 적용
          </button>
        )}
      </div>
    </div>
  );
}
