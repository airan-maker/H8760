import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button } from '../components/common';
import { projectsApi } from '../services/api';
import { useSimulationContext } from '../contexts/SimulationContext';
import {
  BoltIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  CpuChipIcon,
  GlobeAltIcon,
  BuildingOffice2Icon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';

// 글로벌 주요 수소 프로젝트 데이터
const globalProjects = [
  {
    name: 'NEOM Green Hydrogen',
    country: '사우디아라비아',
    flag: '🇸🇦',
    capacity: '2.2 GW',
    investment: '$84억',
    status: '건설 중 (80%)',
    startYear: 2027,
    description: '세계 최대 그린수소→암모니아 프로젝트, 연간 120만톤 암모니아 생산',
    partners: 'ACWA Power, Air Products, NEOM',
    offtake: 'Air Products 30년 장기 구매계약',
  },
  {
    name: 'Western Green Energy Hub',
    country: '호주',
    flag: '🇦🇺',
    capacity: '70 GW (계획)',
    investment: '$700억+',
    status: '개발 단계',
    startYear: 2030,
    description: '세계 최대 규모 재생에너지-수소 허브, 15,000km² 부지',
    partners: 'InterContinental Energy, CWP Global',
    offtake: '아시아 수출 목표',
  },
  {
    name: 'AM Green Ammonia',
    country: '인도',
    flag: '🇮🇳',
    capacity: '1.3 GW',
    investment: '$50억',
    status: 'FID 완료',
    startYear: 2027,
    description: '인도 최초 대규모 그린암모니아 프로젝트',
    partners: 'Greenko, AM Green',
    offtake: '유럽/아시아 수출',
  },
  {
    name: 'HyDeal Ambition',
    country: '유럽',
    flag: '🇪🇺',
    capacity: '95 GW (목표)',
    investment: '$1,500억',
    status: '단계적 개발',
    startYear: '2025-2030',
    description: '유럽 최대 그린수소 컨소시엄, 30개국 참여',
    partners: 'Enagás, OGE, SNAM 외 30개사',
    offtake: '€1.5/kg 목표 가격',
  },
  {
    name: 'ACES Delta',
    country: '미국',
    flag: '🇺🇸',
    capacity: '220 MW → 1.5 GW',
    investment: '$15억',
    status: '1단계 운영 중',
    startYear: 2025,
    description: '유타주 대규모 수소 저장 및 발전 프로젝트',
    partners: 'Mitsubishi Power, Magnum Development',
    offtake: 'Intermountain Power Agency',
  },
];

// 시장 현황 통계
const marketStats = [
  { label: '글로벌 발표 프로젝트', value: '1,572개', subtext: '70개국' },
  { label: '글로벌 설치 용량', value: '2 GW', subtext: '2024년 기준' },
  { label: 'FID 완료 투자액', value: '$750억', subtext: '전체의 11%' },
  { label: '2030년 예상 생산량', value: '37 Mt/년', subtext: '저탄소 수소' },
];

export default function ProjectWizard() {
  const navigate = useNavigate();
  const { setCurrentProject, resetSimulation, savedScenarios } = useSimulationContext();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
  });

  const handleCreate = async () => {
    if (!formData.name) return;

    setLoading(true);
    try {
      const project = await projectsApi.create(formData);
      // Context에 프로젝트 정보 저장
      setCurrentProject({
        id: project.id,
        name: formData.name,
        description: formData.description,
        location: formData.location,
      });
      resetSimulation();
      navigate(`/config/${project.id}`);
    } catch (error) {
      console.error('Failed to create project:', error);
      // 에러 시에도 Context에 저장하고 config 페이지로 이동
      const tempId = `temp_${Date.now()}`;
      setCurrentProject({
        id: tempId,
        name: formData.name,
        description: formData.description,
        location: formData.location,
      });
      resetSimulation();
      navigate('/config');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickStart = () => {
    setCurrentProject({
      id: `quick_${Date.now()}`,
      name: '빠른 시작 프로젝트',
      description: '빠른 시작으로 생성된 프로젝트',
    });
    resetSimulation();
    navigate('/config');
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 p-8 lg:p-12 mb-8">
        <div className="absolute inset-0 bg-hero-pattern opacity-30"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-hydrogen-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary-500/20 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 bg-hydrogen-500/20 text-hydrogen-400 text-xs font-semibold rounded-full">
              v1.0
            </span>
          </div>

          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3">
            수소 전해조<br />
            <span className="gradient-text">운영 전략 및 경제성 분석 플랫폼</span>
          </h1>
          <p className="text-dark-300 text-lg max-w-full mb-8">
            실시간 시뮬레이션으로 수소 생산 시설의 경제성을 분석하고 최적의 운영 전략 및 자금 조달 계획을 수립하세요.
          </p>

          <div className="flex flex-wrap gap-4">
            <Button onClick={handleQuickStart} variant="gradient" size="xl" icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }>
              빠른 시작
            </Button>
            <a href="#create-project">
              <Button variant="outline" size="xl" className="border-white/20 text-white hover:bg-white/10">
                프로젝트 생성
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* Features - Enhanced */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
        {[
          {
            icon: CurrencyDollarIcon,
            title: '연도별 현금흐름 분석',
            desc: '프로젝트 기간 전체의 상세 현금흐름 추정 및 분석',
            color: 'from-green-400 to-emerald-500',
            details: ['수익/비용 상세 분해', '세후 현금흐름', '누적 현금흐름'],
          },
          {
            icon: ChartBarIcon,
            title: '8760시간 운영 분석',
            desc: '연간 시간별 전력가격, 생산량, 운영 패턴 상세 분석',
            color: 'from-blue-400 to-cyan-500',
            details: ['시간별 전력비용', 'Capacity Factor', '계절별 패턴'],
          },
          {
            icon: BoltIcon,
            title: '프로젝트 파이낸스 분석',
            desc: 'NPV, IRR, LCOH, DSCR 등 핵심 재무지표 자동 산출',
            color: 'from-yellow-400 to-orange-500',
            details: ['순현재가치(NPV)', '내부수익률(IRR)', '수소 균등화 비용(LCOH)'],
          },
          {
            icon: ShieldCheckIcon,
            title: 'Bankability 평가',
            desc: '금융기관 관점의 Covenant, 적립금, 스트레스 테스트',
            color: 'from-purple-400 to-violet-500',
            details: ['DSCR 스트레스 테스트', 'LLCR/PLCR 산출', 'Covenant 분석'],
          },
          {
            icon: CpuChipIcon,
            title: 'AI 기반 최적화',
            desc: 'Claude AI가 목표 KPI 달성을 위한 최적 파라미터 추천',
            color: 'from-pink-400 to-rose-500',
            details: ['목표 지향 탐색', 'Grid Search', '민감도 기반 탐색'],
          },
          {
            icon: BanknotesIcon,
            title: '인센티브 분석',
            desc: 'ITC, PTC, 보조금, 탄소배출권 등 정책 지원 효과 정량화',
            color: 'from-teal-400 to-cyan-500',
            details: ['세액공제 효과', '보조금 반영', '청정수소 인증'],
          },
        ].map((feature, index) => (
          <div
            key={feature.title}
            className="group bg-white rounded-2xl border border-dark-100 p-6 hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
              <feature.icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-dark-800 mb-2">{feature.title}</h3>
            <p className="text-sm text-dark-500 mb-3">{feature.desc}</p>
            <div className="flex flex-wrap gap-1.5">
              {feature.details.map((detail) => (
                <span key={detail} className="px-2 py-0.5 bg-dark-50 text-dark-500 text-xs rounded-md">
                  {detail}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 글로벌 수소 시장 현황 */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-6">
          <GlobeAltIcon className="w-6 h-6 text-hydrogen-600" />
          <h2 className="text-xl font-bold text-dark-800">글로벌 그린수소 프로젝트 현황</h2>
        </div>

        {/* 시장 통계 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {marketStats.map((stat) => (
            <div key={stat.label} className="bg-gradient-to-br from-dark-800 to-dark-900 rounded-2xl p-5 text-center">
              <div className="text-2xl md:text-3xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-dark-300">{stat.label}</div>
              <div className="text-xs text-hydrogen-400 mt-1">{stat.subtext}</div>
            </div>
          ))}
        </div>

        {/* 주요 프로젝트 테이블 */}
        <div className="bg-white rounded-2xl border border-dark-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-dark-50 border-b border-dark-100">
                  <th className="text-left px-5 py-4 text-sm font-semibold text-dark-600">프로젝트</th>
                  <th className="text-left px-5 py-4 text-sm font-semibold text-dark-600 hidden md:table-cell">전해조 용량</th>
                  <th className="text-left px-5 py-4 text-sm font-semibold text-dark-600 hidden lg:table-cell">투자규모</th>
                  <th className="text-left px-5 py-4 text-sm font-semibold text-dark-600">상태</th>
                  <th className="text-left px-5 py-4 text-sm font-semibold text-dark-600 hidden xl:table-cell">Offtake 구조</th>
                </tr>
              </thead>
              <tbody>
                {globalProjects.map((project, index) => (
                  <tr key={project.name} className={`border-b border-dark-50 hover:bg-dark-50/50 transition-colors ${index === globalProjects.length - 1 ? 'border-b-0' : ''}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{project.flag}</span>
                        <div>
                          <div className="font-semibold text-dark-800">{project.name}</div>
                          <div className="text-sm text-dark-500">{project.country}</div>
                          <div className="text-xs text-dark-400 mt-1 hidden sm:block max-w-xs">{project.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <div className="font-semibold text-hydrogen-600">{project.capacity}</div>
                      <div className="text-xs text-dark-400">{project.partners.split(',')[0]}</div>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <div className="font-semibold text-dark-800">{project.investment}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        project.status.includes('운영') ? 'bg-green-100 text-green-700' :
                        project.status.includes('건설') ? 'bg-blue-100 text-blue-700' :
                        project.status.includes('FID') ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {project.status}
                      </div>
                      <div className="text-xs text-dark-400 mt-1">{project.startYear}년</div>
                    </td>
                    <td className="px-5 py-4 hidden xl:table-cell">
                      <div className="text-sm text-dark-600 max-w-[200px]">{project.offtake}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 출처 표시 */}
          <div className="px-5 py-3 bg-dark-50 border-t border-dark-100">
            <p className="text-xs text-dark-400">
              출처: IEA Global Hydrogen Review 2025, Hydrogen Council Insights 2024 |
              <span className="text-dark-500"> 전 세계 1,572개 프로젝트 중 FID 완료는 약 11% 수준</span>
            </p>
          </div>
        </div>

        {/* 투자 구조 인사이트 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-gradient-to-br from-hydrogen-50 to-primary-50 rounded-xl p-5 border border-hydrogen-100">
            <BuildingOffice2Icon className="w-8 h-8 text-hydrogen-600 mb-3" />
            <h4 className="font-semibold text-dark-800 mb-2">Offtake 계약 구조</h4>
            <p className="text-sm text-dark-600">
              대부분의 대형 프로젝트는 <strong>Take-or-Pay</strong> 장기 구매계약(15-30년)을
              기반으로 금융조달. 예측 가능한 수익 흐름이 Bankability의 핵심.
            </p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100">
            <BanknotesIcon className="w-8 h-8 text-green-600 mb-3" />
            <h4 className="font-semibold text-dark-800 mb-2">프로젝트 파이낸스</h4>
            <p className="text-sm text-dark-600">
              평균 <strong>부채비율 60-70%</strong>, DSCR 1.3x 이상 요구.
              정부 보증, ECA 금융, 그린본드 등 다양한 조달 구조 활용.
            </p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-5 border border-purple-100">
            <ShieldCheckIcon className="w-8 h-8 text-purple-600 mb-3" />
            <h4 className="font-semibold text-dark-800 mb-2">주요 리스크 요인</h4>
            <p className="text-sm text-dark-600">
              전력비용 변동성, 수소가격 불확실성, 기술 성숙도가
              <strong> FID 지연의 주요 원인</strong>. 인센티브 정책이 핵심 변수.
            </p>
          </div>
        </div>
      </div>

      {/* 프로젝트 생성 폼 */}
      <div id="create-project" className="scroll-mt-8">
        <Card
          variant="gradient"
          title="새 프로젝트 생성"
          description="프로젝트 정보를 입력하고 시뮬레이션을 시작하세요"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          }
        >
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-dark-700 mb-2">
                프로젝트 이름 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="예: 울산 그린수소 1단계"
                className="w-full px-4 py-3 border border-dark-200 rounded-xl bg-white focus:ring-2 focus:ring-hydrogen-500/20 focus:border-hydrogen-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-dark-700 mb-2">
                프로젝트 설명
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="프로젝트에 대한 간단한 설명을 입력하세요"
                rows={3}
                className="w-full px-4 py-3 border border-dark-200 rounded-xl bg-white focus:ring-2 focus:ring-hydrogen-500/20 focus:border-hydrogen-500 transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-dark-700 mb-2">
                위치
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="예: 울산광역시"
                className="w-full px-4 py-3 border border-dark-200 rounded-xl bg-white focus:ring-2 focus:ring-hydrogen-500/20 focus:border-hydrogen-500 transition-all"
              />
            </div>

            <div className="pt-2">
              <Button
                onClick={handleCreate}
                variant="gradient"
                fullWidth
                loading={loading}
                disabled={!formData.name}
                size="lg"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                }
                iconPosition="right"
              >
                프로젝트 생성 후 시뮬레이션 설정
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* 저장된 시나리오 */}
      <Card className="mt-8" variant="bordered" title="저장된 시나리오" icon={
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      }>
        {savedScenarios.length > 0 ? (
          <div className="space-y-3">
            {savedScenarios.slice(0, 3).map((scenario) => (
              <div
                key={scenario.id}
                className="flex items-center justify-between p-4 bg-dark-50 rounded-xl hover:bg-dark-100 transition-colors cursor-pointer"
                onClick={() => navigate('/compare')}
              >
                <div>
                  <h4 className="font-medium text-dark-800">{scenario.name}</h4>
                  <p className="text-sm text-dark-500">{scenario.description}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-hydrogen-600">
                    {(scenario.result.kpis.npv.p50 / 100000000).toFixed(0)}억원
                  </p>
                  <p className="text-xs text-dark-400">NPV (P50)</p>
                </div>
              </div>
            ))}
            {savedScenarios.length > 3 && (
              <button
                onClick={() => navigate('/compare')}
                className="w-full py-3 text-center text-sm text-hydrogen-600 hover:text-hydrogen-700 font-medium"
              >
                + {savedScenarios.length - 3}개 더 보기
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-dark-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-dark-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="text-dark-600 font-medium mb-1">저장된 시나리오가 없습니다</p>
            <p className="text-sm text-dark-400">시뮬레이션을 실행하고 시나리오를 저장해보세요</p>
          </div>
        )}
      </Card>
    </div>
  );
}
