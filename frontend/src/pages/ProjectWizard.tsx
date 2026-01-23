import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button } from '../components/common';
import { projectsApi } from '../services/api';

export default function ProjectWizard() {
  const navigate = useNavigate();
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
      navigate(`/config/${project.id}`);
    } catch (error) {
      console.error('Failed to create project:', error);
      // 에러 시에도 config 페이지로 이동 (데모 목적)
      navigate('/config');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickStart = () => {
    navigate('/config');
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 p-8 lg:p-12 mb-8">
        <div className="absolute inset-0 bg-hero-pattern opacity-30"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-hydrogen-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary-500/20 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-hydrogen-500 to-primary-500 rounded-2xl shadow-lg shadow-hydrogen-500/30">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="px-3 py-1 bg-hydrogen-500/20 text-hydrogen-400 text-xs font-semibold rounded-full">
              v1.0
            </span>
          </div>

          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3">
            수소 전해조<br />
            <span className="gradient-text">최적화 플랫폼</span>
          </h1>
          <p className="text-dark-300 text-lg max-w-xl mb-8">
            실시간 시뮬레이션으로 수소 생산 시설의 경제성을 분석하고 최적의 운영 전략을 수립하세요.
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

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { icon: '⚡', title: '실시간 분석', desc: '몬테카를로 시뮬레이션' },
          { icon: '📊', title: '8760 최적화', desc: '연간 운영 패턴 분석' },
          { icon: '💰', title: '경제성 평가', desc: 'NPV, IRR, LCOH 산출' },
        ].map((feature, index) => (
          <div
            key={feature.title}
            className="group bg-white rounded-2xl border border-dark-100 p-5 hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <span className="text-3xl mb-3 block group-hover:scale-110 transition-transform">{feature.icon}</span>
            <h3 className="font-semibold text-dark-800 mb-1">{feature.title}</h3>
            <p className="text-sm text-dark-400">{feature.desc}</p>
          </div>
        ))}
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

      {/* 최근 프로젝트 */}
      <Card className="mt-8" variant="bordered" title="최근 프로젝트" icon={
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }>
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
          <p className="text-dark-600 font-medium mb-1">저장된 프로젝트가 없습니다</p>
          <p className="text-sm text-dark-400">새 프로젝트를 생성하여 시작하세요</p>
        </div>
      </Card>
    </div>
  );
}
