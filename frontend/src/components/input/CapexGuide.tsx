/**
 * CAPEX 변동 가이드라인 컴포넌트
 *
 * 다양한 프로젝트 조건에 따른 CAPEX 변동 요인을 가이드하고
 * 사용자가 조건을 선택하여 CAPEX 조정 계수를 계산할 수 있게 합니다.
 */
import { useState, useMemo } from 'react';

// CAPEX 변동 요인 정의
interface CapexFactor {
  id: string;
  name: string;
  description: string;
  options: {
    id: string;
    label: string;
    description: string;
    multiplier: number; // 1.0 = 기준, 1.1 = +10%, 0.9 = -10%
  }[];
}

const CAPEX_FACTORS: CapexFactor[] = [
  {
    id: 'site',
    name: '부지 조건',
    description: '토지 비용, 계통 연결, 용수 가용성',
    options: [
      { id: 'optimal', label: '최적', description: '산업단지 내, 계통 연결 용이, 용수 충분', multiplier: 1.0 },
      { id: 'moderate', label: '보통', description: '일반 부지, 3km 이내 계통 연결', multiplier: 1.05 },
      { id: 'challenging', label: '어려움', description: '원거리, 10km+ 계통연결, 용수 부족', multiplier: 1.15 },
      { id: 'remote', label: '극지/원격', description: '도서/산간 지역, 특수 인프라 필요', multiplier: 1.30 },
    ]
  },
  {
    id: 'equipment',
    name: '전해조 브랜드/기술',
    description: '전해조 제조사 및 기술 수준',
    options: [
      { id: 'economy', label: '중국산', description: 'Peric, LONGi 등 ($300-700/kW)', multiplier: 0.70 },
      { id: 'standard', label: '표준', description: 'Nel, ITM Power 등 ($1,000-1,200/kW)', multiplier: 1.0 },
      { id: 'premium', label: '프리미엄', description: 'Siemens, Thyssenkrupp ($1,500-2,000/kW)', multiplier: 1.25 },
      { id: 'cutting_edge', label: '최신기술', description: 'SOEC, AEM 기술 ($2,000-3,000/kW)', multiplier: 1.60 },
    ]
  },
  {
    id: 'bop',
    name: 'BOP (Balance of Plant)',
    description: '전력변환, 냉각, 수처리, 압축 등 부대설비',
    options: [
      { id: 'minimal', label: '최소', description: '기본 BOP만, 저압 운영', multiplier: 0.90 },
      { id: 'standard', label: '표준', description: '일반적인 BOP 구성', multiplier: 1.0 },
      { id: 'enhanced', label: '강화', description: '고압축기, 고급 수처리', multiplier: 1.10 },
      { id: 'full', label: '풀 패키지', description: '저장탱크, 충전설비 포함', multiplier: 1.25 },
    ]
  },
  {
    id: 'timing',
    name: '시장 타이밍',
    description: '장비 가격 변동 및 공급망 상황',
    options: [
      { id: 'buyer', label: '매수자 우위', description: '공급 과잉, 할인 협상 가능', multiplier: 0.90 },
      { id: 'normal', label: '정상', description: '일반적인 시장 상황 (2024-2025)', multiplier: 1.0 },
      { id: 'tight', label: '공급 부족', description: '대기 시간 증가, 프리미엄 발생', multiplier: 1.10 },
      { id: 'crisis', label: '공급망 위기', description: '심각한 지연, 급격한 가격 상승', multiplier: 1.25 },
    ]
  },
  {
    id: 'epc',
    name: 'EPC 계약 방식',
    description: '시공사 선정 및 계약 형태',
    options: [
      { id: 'competitive', label: '경쟁입찰', description: '다수 업체 경쟁, 최저가 낙찰', multiplier: 0.92 },
      { id: 'negotiated', label: '협상계약', description: '기존 파트너와 협상', multiplier: 1.0 },
      { id: 'turnkey', label: '턴키', description: 'EPC 일괄 도급, 리스크 전가', multiplier: 1.08 },
      { id: 'oem_direct', label: 'OEM 직접', description: '제조사 직영 설치', multiplier: 1.15 },
    ]
  },
  {
    id: 'project_type',
    name: '프로젝트 유형',
    description: 'Greenfield vs Brownfield',
    options: [
      { id: 'brownfield_infra', label: 'Brownfield (인프라 완비)', description: '기존 산업시설 내, 유틸리티 공유', multiplier: 0.75 },
      { id: 'brownfield_partial', label: 'Brownfield (일부 활용)', description: '기존 부지, 일부 인프라 활용', multiplier: 0.88 },
      { id: 'greenfield', label: 'Greenfield', description: '신규 부지, 전체 신규 건설', multiplier: 1.0 },
      { id: 'greenfield_remote', label: 'Greenfield (원격)', description: '원격지 신규 건설, 추가 인프라', multiplier: 1.15 },
    ]
  },
];

// 기준 CAPEX (10MW 기준)
const BASE_CAPEX_PER_KW = 1_500_000; // 150만원/kW

interface Props {
  capacityMw: number;
  currentCapex: number;
  onApplyCapex?: (adjustedCapex: number) => void;
}

export default function CapexGuide({ capacityMw, currentCapex, onApplyCapex }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [selections, setSelections] = useState<Record<string, string>>({
    site: 'moderate',
    equipment: 'standard',
    bop: 'standard',
    timing: 'normal',
    epc: 'negotiated',
    project_type: 'greenfield',
  });

  const handleSelect = (factorId: string, optionId: string) => {
    setSelections(prev => ({ ...prev, [factorId]: optionId }));
  };

  // 총 조정 계수 및 예상 CAPEX 계산
  const { totalMultiplier, adjustedCapex, breakdown } = useMemo(() => {
    let multiplier = 1.0;
    const breakdown: { name: string; label: string; multiplier: number }[] = [];

    CAPEX_FACTORS.forEach(factor => {
      const selectedOption = factor.options.find(opt => opt.id === selections[factor.id]);
      if (selectedOption) {
        multiplier *= selectedOption.multiplier;
        breakdown.push({
          name: factor.name,
          label: selectedOption.label,
          multiplier: selectedOption.multiplier,
        });
      }
    });

    const baseCapex = capacityMw * 1000 * BASE_CAPEX_PER_KW;
    const adjusted = baseCapex * multiplier;

    return {
      totalMultiplier: multiplier,
      adjustedCapex: adjusted,
      breakdown,
    };
  }, [selections, capacityMw]);

  const formatKrw = (value: number) => {
    const billions = value / 100000000;
    return `${billions.toFixed(1)}억원`;
  };

  const baseCapex = capacityMw * 1000 * BASE_CAPEX_PER_KW;
  const difference = adjustedCapex - baseCapex;
  const differencePercent = ((totalMultiplier - 1) * 100).toFixed(1);

  return (
    <div className="bg-white rounded-xl border border-dark-200 overflow-hidden">
      {/* 헤더 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-dark-50 border-b border-dark-100 flex items-center justify-between hover:bg-dark-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span className="font-medium text-dark-700">CAPEX 변동 가이드</span>
          <span className="text-xs text-dark-400 ml-2">프로젝트 조건에 따른 CAPEX 조정</span>
        </div>
        <svg className={`w-5 h-5 text-dark-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="p-4">
          {/* 현재 CAPEX 정보 */}
          <div className="mb-4 p-3 bg-dark-50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-dark-500">현재 설정 CAPEX</span>
              <span className="font-semibold text-dark-700">{formatKrw(currentCapex)}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-dark-500">기준 CAPEX ({capacityMw}MW × 150만원/kW)</span>
              <span className="text-dark-600">{formatKrw(baseCapex)}</span>
            </div>
          </div>

          {/* 변동 요인 선택 */}
          <div className="space-y-4">
            {CAPEX_FACTORS.map((factor) => (
              <div key={factor.id} className="border border-dark-100 rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-dark-50 border-b border-dark-100">
                  <div className="font-medium text-sm text-dark-700">{factor.name}</div>
                  <div className="text-xs text-dark-400">{factor.description}</div>
                </div>
                <div className="p-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                  {factor.options.map((option) => {
                    const isSelected = selections[factor.id] === option.id;
                    const isBase = option.multiplier === 1.0;
                    const changePercent = ((option.multiplier - 1) * 100).toFixed(0);

                    return (
                      <button
                        key={option.id}
                        onClick={() => handleSelect(factor.id, option.id)}
                        className={`p-2 rounded-lg border-2 text-left transition-all ${
                          isSelected
                            ? 'border-hydrogen-500 bg-hydrogen-50'
                            : 'border-dark-100 hover:border-dark-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-medium ${isSelected ? 'text-hydrogen-700' : 'text-dark-700'}`}>
                            {option.label}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            isBase
                              ? 'bg-dark-100 text-dark-500'
                              : option.multiplier < 1
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                          }`}>
                            {isBase ? '기준' : `${Number(changePercent) > 0 ? '+' : ''}${changePercent}%`}
                          </span>
                        </div>
                        <p className="text-xs text-dark-400 line-clamp-2">{option.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* 계산 결과 요약 */}
          <div className="mt-6 p-4 bg-gradient-to-br from-hydrogen-50 to-amber-50 rounded-lg border border-hydrogen-200">
            <h4 className="text-sm font-semibold text-dark-700 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-hydrogen-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              CAPEX 조정 계산 결과
            </h4>

            {/* 조정 내역 */}
            <div className="space-y-1 mb-3 text-xs">
              <div className="flex justify-between text-dark-500">
                <span>기준 CAPEX</span>
                <span>{formatKrw(baseCapex)}</span>
              </div>
              {breakdown.map((item, idx) => (
                <div key={idx} className="flex justify-between text-dark-600">
                  <span className="flex items-center gap-1">
                    <span className="text-dark-400">×</span>
                    {item.name}: {item.label}
                  </span>
                  <span className={item.multiplier === 1 ? 'text-dark-400' : item.multiplier < 1 ? 'text-green-600' : 'text-red-600'}>
                    {item.multiplier.toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="border-t border-dark-200 pt-1 mt-2">
                <div className="flex justify-between font-medium">
                  <span>총 조정 계수</span>
                  <span className={totalMultiplier === 1 ? '' : totalMultiplier < 1 ? 'text-green-600' : 'text-red-600'}>
                    ×{totalMultiplier.toFixed(3)}
                  </span>
                </div>
              </div>
            </div>

            {/* 최종 결과 */}
            <div className="flex items-end justify-between p-3 bg-white rounded-lg border border-hydrogen-200">
              <div>
                <div className="text-xs text-dark-400 mb-1">조정된 예상 CAPEX</div>
                <div className="text-2xl font-bold text-hydrogen-600">{formatKrw(adjustedCapex)}</div>
                <div className={`text-sm ${difference === 0 ? 'text-dark-400' : difference < 0 ? 'text-green-600' : 'text-red-600'}`}>
                  기준 대비 {difference >= 0 ? '+' : ''}{formatKrw(difference)} ({Number(differencePercent) >= 0 ? '+' : ''}{differencePercent}%)
                </div>
              </div>
              {onApplyCapex && (
                <button
                  onClick={() => onApplyCapex(adjustedCapex)}
                  className="px-4 py-2 bg-hydrogen-500 text-white rounded-lg hover:bg-hydrogen-600 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  이 값으로 적용
                </button>
              )}
            </div>

            {/* 참고 사항 */}
            <div className="mt-3 p-2 bg-white/50 rounded text-xs text-dark-500">
              <span className="font-medium">참고:</span> 이 가이드는 일반적인 산업 벤치마크를 기반으로 한 추정치입니다.
              실제 CAPEX는 상세 설계, 견적, 협상 결과에 따라 달라질 수 있습니다.
            </div>
          </div>

          {/* 추가 정보: 시장 전망 */}
          <div className="mt-4 p-3 bg-dark-50 rounded-lg border border-dark-100">
            <h5 className="text-xs font-semibold text-dark-600 mb-2 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              전해조 가격 전망 (2024-2030)
            </h5>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center p-2 bg-white rounded">
                <div className="text-dark-400">2024</div>
                <div className="font-semibold text-dark-700">$1,000/kW</div>
                <div className="text-dark-400">(기준)</div>
              </div>
              <div className="text-center p-2 bg-white rounded">
                <div className="text-dark-400">2027</div>
                <div className="font-semibold text-green-600">$700/kW</div>
                <div className="text-green-500">-30%</div>
              </div>
              <div className="text-center p-2 bg-white rounded">
                <div className="text-dark-400">2030</div>
                <div className="font-semibold text-green-600">$450/kW</div>
                <div className="text-green-500">-55%</div>
              </div>
            </div>
            <p className="text-xs text-dark-400 mt-2">
              * BNEF, IEA 전망 기준. 연간 10-15% 가격 하락 예상. 중국산은 이미 $300-500/kW 수준.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
