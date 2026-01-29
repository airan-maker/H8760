/**
 * 국가별 프리셋 선택 컴포넌트
 *
 * 각 국가의 전력비용, 인센티브, 세금 등 지역 특성을 반영한 프리셋을 제공
 */
import { useEffect, useState } from 'react';
import type { CountryPreset, SimulationInput } from '../../types';
import { dataApi } from '../../services/api';

// 기본 CAPEX 값 (10MW 기준, 150만원/kW)
const BASE_CAPEX = 15_000_000_000;
const BASE_STACK_COST = 1_650_000_000;

// 국가별 상세 정보 데이터
const COUNTRY_DETAILS: Record<string, {
  incentives: { type: string; maxSupport: string; features: string };
  electricity: { industrial: string; ppa: string; features: string };
  capex: { electrolyzer: string; labor: string; financing: string };
  tax: { rate: string; depreciation: string; regulation: string };
  others: string[];
  sources: string[];
}> = {
  'korea': {
    incentives: { type: '투자세액공제 + 생산보조금', maxSupport: 'CAPEX 10-20%', features: '청정수소 인증제, 지역별 차등' },
    electricity: { industrial: '~126원/kWh', ppa: '70-100원/kWh', features: 'SMP 상한제, 재생E PPA 제한적' },
    capex: { electrolyzer: '$1,000-1,200/kW', labor: '중간', financing: '5-7%' },
    tax: { rate: '10-25% 누진', depreciation: '10년 정액', regulation: '청정수소 인증 요건' },
    others: ['청정수소 인증제 도입 (2024)', '수소경제 로드맵 추진', '지역별 실증사업 활발'],
    sources: ['산업통상자원부 수소경제 정책', 'KEPCO 전력요금표']
  },
  'usa-texas': {
    incentives: { type: '생산세액공제 (45V PTC)', maxSupport: '$3/kg H2', features: '10년간 생산량 기준, 탄소 강도에 따라 차등' },
    electricity: { industrial: '~$0.06/kWh', ppa: '$25-40/MWh', features: 'ERCOT 시장, 음의 가격 발생 가능' },
    capex: { electrolyzer: '$1,000/kW', labor: '중간', financing: '5-6%' },
    tax: { rate: '21% (연방)', depreciation: '가속상각 가능', regulation: '45V 탄소강도 요건 복잡' },
    others: ['미국 최대 풍력 발전 지역', '멕시코만 수소 허브 추진', '석유화학 수요 집중'],
    sources: ['IRA Section 45V', 'ERCOT Market Data']
  },
  'usa-california': {
    incentives: { type: '생산세액공제 (45V PTC) + 주 보조금', maxSupport: '$3/kg + 추가 지원', features: '캘리포니아 자체 클린에너지 인센티브' },
    electricity: { industrial: '~$0.15/kWh', ppa: '$40-60/MWh', features: '높은 전력 비용, 태양광 우수' },
    capex: { electrolyzer: '$1,000/kW', labor: '높음', financing: '5-6%' },
    tax: { rate: '21% (연방) + 8.84% (주)', depreciation: '가속상각 가능', regulation: 'LCFS 크레딧 활용 가능' },
    others: ['LCFS (저탄소연료표준) 크레딧 추가 수익', '수소충전소 인프라 확충', '항만/운송 탈탄소화 수요'],
    sources: ['California Energy Commission', 'CARB LCFS Program']
  },
  'canada-quebec': {
    incentives: { type: '투자세액공제 (Clean Hydrogen ITC)', maxSupport: 'CAPEX의 40%', features: '설비투자 기준, 전해조만 대상' },
    electricity: { industrial: '~$0.05/kWh', ppa: '$30-40/MWh', features: '수력 기반 저렴한 청정전력' },
    capex: { electrolyzer: '$1,000-1,100/kW', labor: '중간', financing: '5-6%' },
    tax: { rate: '15% (연방) + 11.5% (퀘벡)', depreciation: '투자공제와 연계', regulation: '전해조/CCUS만 대상' },
    others: ['북미 최저 수준 전력 비용', '풍부한 수력 자원', '미국 수출 유리한 위치'],
    sources: ['Government of Canada Budget 2023', 'Hydro-Québec']
  },
  'australia-sa': {
    incentives: { type: 'Hydrogen Headstart', maxSupport: '경쟁입찰 방식', features: '생산계약 방식, 대규모 프로젝트 대상' },
    electricity: { industrial: '~$0.08/kWh', ppa: '$20-35/MWh', features: '세계 최고 수준 태양광, 음의 가격 발생' },
    capex: { electrolyzer: '$900-1,100/kW', labor: '높음', financing: '6-8%' },
    tax: { rate: '30%', depreciation: '표준', regulation: 'Hydrogen Headstart 진행 중' },
    others: ['세계 최고 수준 태양광 일사량', '아시아 수출 유리', '대규모 프로젝트 (예: Western Green Energy Hub)'],
    sources: ['Australian Government DCCEEW', 'AEMO Market Data']
  },
  'chile': {
    incentives: { type: '정부 보조금 + 개발금융', maxSupport: '프로젝트별 상이', features: 'CORFO 지원, 녹색수소 전략' },
    electricity: { industrial: '~$0.06/kWh', ppa: '$15-25/MWh', features: '세계 최저 수준 태양광 비용' },
    capex: { electrolyzer: '$900-1,000/kW', labor: '중간', financing: '6-8%' },
    tax: { rate: '27%', depreciation: '표준', regulation: '녹색수소 인증 체계 구축 중' },
    others: ['아타카마 사막 세계 최고 일사량', '암모니아 수출 허브 목표', 'HIF 등 대규모 프로젝트 진행'],
    sources: ['Chilean Ministry of Energy', 'CORFO Green Hydrogen Strategy']
  },
  'germany': {
    incentives: { type: 'IPCEI, H2Global', maxSupport: '프로젝트별 상이', features: '복잡한 EU 규제, 장기적 접근' },
    electricity: { industrial: '~€0.20/kWh', ppa: '€60-80/MWh', features: '높은 전력 비용, 재생E 확대 중' },
    capex: { electrolyzer: '€1,100/kW', labor: '매우 높음', financing: '5-7%' },
    tax: { rate: '~30%', depreciation: '표준', regulation: 'RED II 규제 엄격' },
    others: ['EU 최대 수소 수요국', '수입 의존 전략', '산업 탈탄소화 핵심'],
    sources: ['German National Hydrogen Strategy', 'Bundesnetzagentur']
  },
  'saudi-arabia': {
    incentives: { type: '정부 투자 + PIF 지원', maxSupport: '프로젝트별 협상', features: 'NEOM 등 메가 프로젝트' },
    electricity: { industrial: '~$0.03/kWh', ppa: '$15-20/MWh', features: '세계 최저 수준 전력 비용' },
    capex: { electrolyzer: '$800-1,000/kW', labor: '낮음', financing: '4-6%' },
    tax: { rate: '20%', depreciation: '표준', regulation: '외국인 투자 유치 중' },
    others: ['NEOM 그린수소 프로젝트 (세계 최대)', '2030 비전 수소 전략', '암모니아/수소 수출 허브 목표'],
    sources: ['Saudi Vision 2030', 'NEOM Green Hydrogen Project']
  }
};

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

    // 기본 CAPEX에 국가별 계수 적용 (누적 방지)
    const adjustedCapex = BASE_CAPEX * preset.capexMultiplier;
    const adjustedStackCost = BASE_STACK_COST * preset.capexMultiplier;

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
        localTaxRate: 0,
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
  const selectedDetails = selectedPreset ? COUNTRY_DETAILS[selectedPreset.id] : null;

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
          className="text-xs text-dark-400 hover:text-dark-600 flex items-center gap-1"
        >
          <svg className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
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
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">{selectedPreset.flagEmoji}</span>
              <div>
                <h4 className="font-semibold text-dark-700">{selectedPreset.name}</h4>
                <p className="text-xs text-dark-400">{selectedPreset.notes}</p>
              </div>
            </div>

            {/* 기본 프리셋 값 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-4">
              <div className="bg-white p-2 rounded">
                <div className="text-dark-400 mb-1">PPA 전력단가</div>
                <div className="font-semibold text-dark-700">
                  {selectedPreset.currencySymbol}{selectedPreset.ppaPrice.toFixed(3)}/kWh
                </div>
                <div className="text-dark-400">≈ {selectedPreset.ppaPriceKrw.toFixed(0)}원</div>
              </div>
              <div className="bg-white p-2 rounded">
                <div className="text-dark-400 mb-1">수소 판매가</div>
                <div className="font-semibold text-dark-700">
                  {selectedPreset.currencySymbol}{selectedPreset.h2Price.toFixed(2)}/kg
                </div>
                <div className="text-dark-400">≈ {selectedPreset.h2PriceKrw.toFixed(0)}원</div>
              </div>
              <div className="bg-white p-2 rounded">
                <div className="text-dark-400 mb-1">주요 인센티브</div>
                <div className="font-semibold text-dark-700">
                  {selectedPreset.itcRate > 0 && `ITC ${selectedPreset.itcRate}%`}
                  {selectedPreset.ptcAmountKrw > 0 && ` PTC ${(selectedPreset.ptcAmountKrw/1000).toFixed(1)}천원/kg`}
                  {selectedPreset.capexSubsidyRate > 0 && ` 보조금 ${selectedPreset.capexSubsidyRate}%`}
                  {selectedPreset.itcRate === 0 && selectedPreset.ptcAmountKrw === 0 && selectedPreset.capexSubsidyRate === 0 && '-'}
                </div>
              </div>
              <div className="bg-white p-2 rounded">
                <div className="text-dark-400 mb-1">법인세율</div>
                <div className="font-semibold text-dark-700">{selectedPreset.corporateTaxRate}%</div>
                {selectedPreset.carbonPriceKrw > 0 && (
                  <div className="text-dark-400">탄소가격 {(selectedPreset.carbonPriceKrw/1000).toFixed(0)}천원/톤</div>
                )}
              </div>
            </div>

            {/* 상세 리서치 정보 */}
            {selectedDetails && (
              <div className="space-y-3 border-t border-dark-200 pt-4">
                <h5 className="text-sm font-medium text-dark-600 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  리서치 기반 상세 정보
                </h5>

                {/* 인센티브/보조금 */}
                <div className="bg-white p-3 rounded border border-dark-100">
                  <div className="text-xs font-medium text-hydrogen-600 mb-2">인센티브/보조금 체계</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-dark-400">유형:</span>
                      <span className="ml-1 text-dark-700">{selectedDetails.incentives.type}</span>
                    </div>
                    <div>
                      <span className="text-dark-400">최대 지원:</span>
                      <span className="ml-1 text-dark-700">{selectedDetails.incentives.maxSupport}</span>
                    </div>
                    <div>
                      <span className="text-dark-400">특징:</span>
                      <span className="ml-1 text-dark-700">{selectedDetails.incentives.features}</span>
                    </div>
                  </div>
                </div>

                {/* 전력 비용 */}
                <div className="bg-white p-3 rounded border border-dark-100">
                  <div className="text-xs font-medium text-amber-600 mb-2">전력 비용 (LCOH의 64% 이상)</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-dark-400">산업용:</span>
                      <span className="ml-1 text-dark-700">{selectedDetails.electricity.industrial}</span>
                    </div>
                    <div>
                      <span className="text-dark-400">재생E PPA:</span>
                      <span className="ml-1 text-dark-700">{selectedDetails.electricity.ppa}</span>
                    </div>
                    <div>
                      <span className="text-dark-400">특징:</span>
                      <span className="ml-1 text-dark-700">{selectedDetails.electricity.features}</span>
                    </div>
                  </div>
                </div>

                {/* CAPEX/건설비용 */}
                <div className="bg-white p-3 rounded border border-dark-100">
                  <div className="text-xs font-medium text-green-600 mb-2">CAPEX 및 건설비용</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-dark-400">전해조 단가:</span>
                      <span className="ml-1 text-dark-700">{selectedDetails.capex.electrolyzer}</span>
                    </div>
                    <div>
                      <span className="text-dark-400">인건비:</span>
                      <span className="ml-1 text-dark-700">{selectedDetails.capex.labor}</span>
                    </div>
                    <div>
                      <span className="text-dark-400">금융비용:</span>
                      <span className="ml-1 text-dark-700">{selectedDetails.capex.financing}</span>
                    </div>
                  </div>
                </div>

                {/* 세금/규제 */}
                <div className="bg-white p-3 rounded border border-dark-100">
                  <div className="text-xs font-medium text-purple-600 mb-2">세금 및 규제</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-dark-400">법인세율:</span>
                      <span className="ml-1 text-dark-700">{selectedDetails.tax.rate}</span>
                    </div>
                    <div>
                      <span className="text-dark-400">감가상각:</span>
                      <span className="ml-1 text-dark-700">{selectedDetails.tax.depreciation}</span>
                    </div>
                    <div>
                      <span className="text-dark-400">규제:</span>
                      <span className="ml-1 text-dark-700">{selectedDetails.tax.regulation}</span>
                    </div>
                  </div>
                </div>

                {/* 기타 특징 */}
                <div className="bg-white p-3 rounded border border-dark-100">
                  <div className="text-xs font-medium text-dark-600 mb-2">기타 지역 특성</div>
                  <ul className="text-xs text-dark-600 space-y-1">
                    {selectedDetails.others.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <span className="text-dark-300">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 출처 */}
                <div className="text-xs text-dark-400 pt-2 border-t border-dark-100">
                  <span className="font-medium">Sources: </span>
                  {selectedDetails.sources.join(', ')}
                </div>
              </div>
            )}

            {/* 적용 버튼 */}
            <button
              onClick={handleApply}
              className="mt-4 w-full py-2.5 bg-hydrogen-500 text-white rounded-lg hover:bg-hydrogen-600 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {selectedPreset.name} 조건 적용 (10MW 기준)
            </button>
            <p className="text-xs text-dark-400 text-center mt-2">
              * 기본 CAPEX {(BASE_CAPEX / 100000000).toFixed(0)}억원 × {selectedPreset.capexMultiplier.toFixed(2)} = {((BASE_CAPEX * selectedPreset.capexMultiplier) / 100000000).toFixed(0)}억원
            </p>
          </div>
        )}

        {/* 간략 모드에서 적용 버튼 */}
        {selectedPreset && !showDetails && (
          <div className="mt-3">
            <button
              onClick={handleApply}
              className="w-full py-2 bg-hydrogen-500 text-white rounded-lg hover:bg-hydrogen-600 transition-colors text-sm font-medium"
            >
              {selectedPreset.flagEmoji} {selectedPreset.name} 조건 적용
            </button>
            <p className="text-xs text-dark-400 text-center mt-1">
              CAPEX: {((BASE_CAPEX * selectedPreset.capexMultiplier) / 100000000).toFixed(0)}억원 (10MW 기준)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
