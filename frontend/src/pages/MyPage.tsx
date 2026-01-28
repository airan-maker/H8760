/**
 * 마이페이지 - 시나리오 관리
 */
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  DocumentTextIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ArrowsRightLeftIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useSimulationContext, SavedScenario } from '../contexts/SimulationContext';

type TabType = 'scenarios' | 'profile' | 'settings';

export default function MyPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { savedScenarios, deleteScenario, loadScenario } = useSimulationContext();

  // 탭 상태
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const tab = searchParams.get('tab');
    return (tab as TabType) || 'scenarios';
  });

  // 검색 및 정렬
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 선택된 시나리오 (비교용)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 비로그인 시 로그인 페이지로 리디렉션
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { state: { from: '/mypage' } });
    }
  }, [user, authLoading, navigate]);

  // 탭 변경 시 URL 파라미터 업데이트
  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab, setSearchParams]);

  // 시나리오 필터링 및 정렬
  const filteredScenarios = savedScenarios
    .filter((s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'date') {
        return sortOrder === 'desc'
          ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else {
        return sortOrder === 'desc'
          ? b.name.localeCompare(a.name)
          : a.name.localeCompare(b.name);
      }
    });

  // 시나리오 불러오기
  const handleLoad = (id: string) => {
    loadScenario(id);
    navigate('/config');
  };

  // 시나리오 삭제
  const handleDelete = async (id: string) => {
    if (confirm('이 시나리오를 삭제하시겠습니까?')) {
      try {
        await deleteScenario(id);
        setSelectedIds((prev) => prev.filter((i) => i !== id));
      } catch (error) {
        console.error('시나리오 삭제 실패:', error);
      }
    }
  };

  // 시나리오 선택 토글
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // 선택된 시나리오 비교
  const handleCompare = () => {
    if (selectedIds.length >= 2) {
      // 선택된 시나리오들을 비교 페이지로 전달
      navigate('/compare', { state: { scenarioIds: selectedIds } });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-hydrogen-200 border-t-hydrogen-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const tabs = [
    { id: 'scenarios' as TabType, name: '시나리오', icon: DocumentTextIcon },
    { id: 'profile' as TabType, name: '프로필', icon: UserCircleIcon },
    { id: 'settings' as TabType, name: '설정', icon: Cog6ToothIcon },
  ];

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-dark-900">마이페이지</h1>
        <p className="text-dark-500 mt-1">시나리오를 관리하고 계정을 설정하세요</p>
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                transition-colors
                ${
                  activeTab === tab.id
                    ? 'border-hydrogen-500 text-hydrogen-600'
                    : 'border-transparent text-dark-500 hover:text-dark-700 hover:border-gray-300'
                }
              `}
            >
              <tab.icon className="w-5 h-5" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="min-h-[400px]">
        {/* 시나리오 탭 */}
        {activeTab === 'scenarios' && (
          <div className="space-y-4">
            {/* 검색 및 필터 */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* 검색 */}
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  type="text"
                  placeholder="시나리오 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-hydrogen-500 focus:border-transparent"
                />
              </div>

              {/* 정렬 */}
              <div className="flex items-center gap-2">
                <FunnelIcon className="w-5 h-5 text-dark-400" />
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [by, order] = e.target.value.split('-') as ['date' | 'name', 'asc' | 'desc'];
                    setSortBy(by);
                    setSortOrder(order);
                  }}
                  className="px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-hydrogen-500 focus:border-transparent"
                >
                  <option value="date-desc">최신순</option>
                  <option value="date-asc">오래된순</option>
                  <option value="name-asc">이름 (A-Z)</option>
                  <option value="name-desc">이름 (Z-A)</option>
                </select>
              </div>

              {/* 비교 버튼 */}
              {selectedIds.length >= 2 && (
                <button
                  onClick={handleCompare}
                  className="flex items-center gap-2 px-4 py-2 bg-hydrogen-500 text-white rounded-xl hover:bg-hydrogen-600 transition-colors"
                >
                  <ArrowsRightLeftIcon className="w-5 h-5" />
                  비교 ({selectedIds.length})
                </button>
              )}
            </div>

            {/* 시나리오 목록 */}
            {filteredScenarios.length === 0 ? (
              <div className="text-center py-12">
                <DocumentTextIcon className="w-12 h-12 text-dark-300 mx-auto mb-4" />
                <p className="text-dark-500">
                  {searchQuery ? '검색 결과가 없습니다' : '저장된 시나리오가 없습니다'}
                </p>
                <button
                  onClick={() => navigate('/config')}
                  className="mt-4 px-4 py-2 text-hydrogen-600 hover:bg-hydrogen-50 rounded-lg transition-colors"
                >
                  새 시뮬레이션 시작하기
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredScenarios.map((scenario) => (
                  <ScenarioCard
                    key={scenario.id}
                    scenario={scenario}
                    isSelected={selectedIds.includes(scenario.id)}
                    onSelect={() => toggleSelect(scenario.id)}
                    onLoad={() => handleLoad(scenario.id)}
                    onDelete={() => handleDelete(scenario.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 프로필 탭 */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center gap-4 mb-6">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || '사용자'}
                    className="w-20 h-20 rounded-full border-4 border-gray-100"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-hydrogen-500 to-primary-600 flex items-center justify-center">
                    <span className="text-white text-2xl font-bold">
                      {user.displayName?.[0] || user.email?.[0] || 'U'}
                    </span>
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold text-dark-900">{user.displayName}</h2>
                  <p className="text-dark-500">{user.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-dark-500">가입일</span>
                  <span className="text-dark-900">
                    {user.metadata.creationTime
                      ? new Date(user.metadata.creationTime).toLocaleDateString('ko-KR')
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-dark-500">마지막 로그인</span>
                  <span className="text-dark-900">
                    {user.metadata.lastSignInTime
                      ? new Date(user.metadata.lastSignInTime).toLocaleDateString('ko-KR')
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-dark-500">저장된 시나리오</span>
                  <span className="text-dark-900">{savedScenarios.length}개</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 설정 탭 */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-dark-900 mb-4">알림 설정</h3>
                <div className="space-y-4">
                  <label className="flex items-center justify-between">
                    <span className="text-dark-700">이메일 알림</span>
                    <input type="checkbox" className="w-5 h-5 text-hydrogen-500 rounded" />
                  </label>
                </div>
              </div>

              <hr className="border-gray-200" />

              <div>
                <h3 className="text-lg font-semibold text-dark-900 mb-4">데이터 관리</h3>
                <div className="space-y-3">
                  <button className="flex items-center gap-2 text-dark-600 hover:text-dark-900">
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    모든 시나리오 내보내기
                  </button>
                  <button className="flex items-center gap-2 text-red-600 hover:text-red-700">
                    <TrashIcon className="w-5 h-5" />
                    모든 데이터 삭제
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 시나리오 카드 컴포넌트
interface ScenarioCardProps {
  scenario: SavedScenario;
  isSelected: boolean;
  onSelect: () => void;
  onLoad: () => void;
  onDelete: () => void;
}

function ScenarioCard({
  scenario,
  isSelected,
  onSelect,
  onLoad,
  onDelete,
}: ScenarioCardProps) {
  const { result } = scenario;

  // 숫자 포맷
  const formatNumber = (value: number, decimals = 0) => {
    return value.toLocaleString('ko-KR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  return (
    <div
      className={`
        bg-white rounded-xl border-2 p-4 transition-all
        ${isSelected ? 'border-hydrogen-500 ring-2 ring-hydrogen-100' : 'border-gray-200 hover:border-gray-300'}
      `}
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            className="w-4 h-4 text-hydrogen-500 rounded"
          />
          <div>
            <h3 className="font-semibold text-dark-900">{scenario.name}</h3>
            <p className="text-xs text-dark-400">{scenario.description}</p>
          </div>
        </div>
      </div>

      {/* KPI 요약 */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <p className="text-xs text-dark-400">NPV</p>
          <p className="text-sm font-semibold text-dark-900">
            {formatNumber(result.kpis.npv.p50 / 1e8, 1)}억
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <p className="text-xs text-dark-400">IRR</p>
          <p className="text-sm font-semibold text-dark-900">
            {formatNumber(result.kpis.irr.p50, 1)}%
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <p className="text-xs text-dark-400">LCOH</p>
          <p className="text-sm font-semibold text-dark-900">
            {formatNumber(result.kpis.lcoh / 1000, 1)}원/kg
          </p>
        </div>
      </div>

      {/* 날짜 */}
      <p className="text-xs text-dark-400 mb-3">
        {new Date(scenario.createdAt).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </p>

      {/* 액션 버튼 */}
      <div className="flex gap-2">
        <button
          onClick={onLoad}
          className="flex-1 px-3 py-2 text-sm font-medium text-hydrogen-600 bg-hydrogen-50 rounded-lg hover:bg-hydrogen-100 transition-colors"
        >
          불러오기
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
