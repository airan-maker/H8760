import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  BeakerIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  ArrowsRightLeftIcon,
  UserCircleIcon,
  AdjustmentsHorizontalIcon,
  ChevronDownIcon,
  TableCellsIcon,
  SparklesIcon,
  ChartBarSquareIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useSimulationContext } from '../contexts/SimulationContext';
import { useAuth } from '../contexts/AuthContext';
import { UserMenu } from './auth';

interface LayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: '프로젝트', href: '/wizard', icon: BeakerIcon, description: '새 프로젝트 생성' },
  { name: '설정', href: '/config', icon: Cog6ToothIcon, description: '시뮬레이션 설정' },
  { name: '대시보드', href: '/dashboard', icon: ChartBarIcon, description: '결과 분석' },
  { name: '비교', href: '/compare', icon: ArrowsRightLeftIcon, description: '시나리오 비교' },
];

const optimizationMenu = [
  { name: 'Grid Search', href: '/optimization/grid', icon: TableCellsIcon, description: '변수 조합 전수 탐색' },
  { name: 'AI 최적화', href: '/optimization/ai', icon: SparklesIcon, description: 'AI 기반 최적 조합 추천' },
  { name: '민감도 탐색', href: '/optimization/sensitivity', icon: ChartBarSquareIcon, description: '영향력 큰 변수 집중 탐색' },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { savedScenarios, currentResult } = useSimulationContext();
  const { user, loading: authLoading } = useAuth();
  const [isOptimizationOpen, setIsOptimizationOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isOptimizationActive = location.pathname.startsWith('/optimization');

  // 페이지 이동 시 모바일 메뉴 닫기
  const handleMobileNavClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-hydrogen-400 to-primary-500 rounded-xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity" />
                <div className="relative w-11 h-11 bg-gradient-to-br from-hydrogen-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform">
                  <span className="text-white font-bold text-xl tracking-tight">H</span>
                  <div className="absolute -top-1 -right-1">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-hydrogen-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-hydrogen-500"></span>
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-dark-900 to-dark-600 bg-clip-text text-transparent">
                  H8760
                </h1>
              </div>
            </Link>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-dark-500 hover:text-dark-800 hover:bg-dark-50/50 transition-colors"
            >
              {isMobileMenuOpen ? (
                <XMarkIcon className="w-6 h-6" />
              ) : (
                <Bars3Icon className="w-6 h-6" />
              )}
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1 bg-dark-50/50 rounded-2xl p-1.5">
              {navigation.map((item) => {
                const isActive =
                  location.pathname === item.href ||
                  location.pathname.startsWith(item.href + '/');

                // 비교 페이지에 저장된 시나리오 수 표시
                const badge = item.href === '/compare' && savedScenarios.length > 0
                  ? savedScenarios.length
                  : item.href === '/dashboard' && currentResult
                  ? null  // 대시보드에 결과 있음을 표시할 수도 있음
                  : null;

                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`
                      group relative flex items-center px-4 py-2.5 rounded-xl text-sm font-medium
                      transition-all duration-300
                      ${
                        isActive
                          ? 'bg-white text-hydrogen-700 shadow-md'
                          : 'text-dark-500 hover:text-dark-800 hover:bg-white/60'
                      }
                    `}
                  >
                    <item.icon className={`w-4 h-4 mr-2 transition-colors ${isActive ? 'text-hydrogen-600' : 'text-dark-400 group-hover:text-hydrogen-500'}`} />
                    {item.name}
                    {badge && (
                      <span className="ml-1.5 px-1.5 py-0.5 text-xs font-bold rounded-full bg-hydrogen-500 text-white">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}

              {/* 최적화 드롭다운 메뉴 */}
              <div className="relative">
                <button
                  onClick={() => setIsOptimizationOpen(!isOptimizationOpen)}
                  onBlur={() => setTimeout(() => setIsOptimizationOpen(false), 150)}
                  className={`
                    group relative flex items-center px-4 py-2.5 rounded-xl text-sm font-medium
                    transition-all duration-300
                    ${
                      isOptimizationActive
                        ? 'bg-white text-hydrogen-700 shadow-md'
                        : 'text-dark-500 hover:text-dark-800 hover:bg-white/60'
                    }
                  `}
                >
                  <AdjustmentsHorizontalIcon className={`w-4 h-4 mr-2 transition-colors ${isOptimizationActive ? 'text-hydrogen-600' : 'text-dark-400 group-hover:text-hydrogen-500'}`} />
                  최적화
                  <ChevronDownIcon className={`w-4 h-4 ml-1 transition-transform ${isOptimizationOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* 드롭다운 메뉴 */}
                {isOptimizationOpen && (
                  <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                    {optimizationMenu.map((item) => {
                      const isItemActive = location.pathname === item.href;
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          className={`
                            flex items-center px-4 py-2.5 text-sm transition-colors
                            ${isItemActive ? 'bg-hydrogen-50 text-hydrogen-700' : 'text-dark-600 hover:bg-gray-50'}
                          `}
                        >
                          <item.icon className={`w-4 h-4 mr-3 ${isItemActive ? 'text-hydrogen-600' : 'text-dark-400'}`} />
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-dark-400">{item.description}</div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </nav>

            {/* 로그인/사용자 메뉴 */}
            <div className="hidden lg:flex items-center ml-4">
              {authLoading ? (
                <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
              ) : user ? (
                <UserMenu />
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-hydrogen-500 to-primary-600 rounded-xl hover:from-hydrogen-600 hover:to-primary-700 transition-all shadow-sm hover:shadow-md"
                >
                  <UserCircleIcon className="w-5 h-5" />
                  로그인
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-white/20 bg-white/95 backdrop-blur-md">
            <div className="px-4 py-3 space-y-1">
              {navigation.map((item) => {
                const isActive =
                  location.pathname === item.href ||
                  location.pathname.startsWith(item.href + '/');

                const badge = item.href === '/compare' && savedScenarios.length > 0
                  ? savedScenarios.length
                  : null;

                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={handleMobileNavClick}
                    className={`
                      flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all
                      ${
                        isActive
                          ? 'bg-hydrogen-50 text-hydrogen-700'
                          : 'text-dark-600 hover:bg-gray-50'
                      }
                    `}
                  >
                    <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-hydrogen-600' : 'text-dark-400'}`} />
                    {item.name}
                    {badge && (
                      <span className="ml-auto px-2 py-0.5 text-xs font-bold rounded-full bg-hydrogen-500 text-white">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}

              {/* 최적화 서브메뉴 */}
              <div className="pt-2 border-t border-gray-100">
                <div className="px-4 py-2 text-xs font-semibold text-dark-400 uppercase tracking-wider">
                  최적화
                </div>
                {optimizationMenu.map((item) => {
                  const isItemActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={handleMobileNavClick}
                      className={`
                        flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all
                        ${
                          isItemActive
                            ? 'bg-hydrogen-50 text-hydrogen-700'
                            : 'text-dark-600 hover:bg-gray-50'
                        }
                      `}
                    >
                      <item.icon className={`w-5 h-5 mr-3 ${isItemActive ? 'text-hydrogen-600' : 'text-dark-400'}`} />
                      <div>
                        <div>{item.name}</div>
                        <div className="text-xs text-dark-400">{item.description}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* 모바일 로그인 버튼 */}
              <div className="pt-3 border-t border-gray-100">
                {authLoading ? (
                  <div className="w-full h-12 rounded-xl bg-gray-200 animate-pulse" />
                ) : user ? (
                  <div className="px-4 py-2">
                    <UserMenu />
                  </div>
                ) : (
                  <Link
                    to="/login"
                    onClick={handleMobileNavClick}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-hydrogen-500 to-primary-600 rounded-xl hover:from-hydrogen-600 hover:to-primary-700 transition-all"
                  >
                    <UserCircleIcon className="w-5 h-5" />
                    로그인
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        {children}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-dark-100/50 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-sm font-medium text-dark-600">H8760</span>
            <div className="flex items-center space-x-4 text-xs text-dark-400">
              <span>v1.0.0</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                시스템 정상
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
