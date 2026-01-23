import { Link, useLocation } from 'react-router-dom';
import {
  BeakerIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  ArrowsRightLeftIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

interface LayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: '프로젝트', href: '/wizard', icon: BeakerIcon, description: '새 프로젝트 생성' },
  { name: '설정', href: '/config', icon: Cog6ToothIcon, description: '시뮬레이션 설정' },
  { name: '대시보드', href: '/dashboard', icon: ChartBarIcon, description: '결과 분석' },
  { name: '비교', href: '/compare', icon: ArrowsRightLeftIcon, description: '시나리오 비교' },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

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
                  Hydrogen Platform
                </h1>
                <p className="text-xs text-dark-400 flex items-center gap-1">
                  <SparklesIcon className="w-3 h-3 text-hydrogen-500" />
                  수소 전해조 최적화
                </p>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center space-x-1 bg-dark-50/50 rounded-2xl p-1.5">
              {navigation.map((item) => {
                const isActive =
                  location.pathname === item.href ||
                  location.pathname.startsWith(item.href + '/');
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
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        {children}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-dark-100/50 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-br from-hydrogen-500 to-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">H</span>
              </div>
              <span className="text-sm font-medium text-dark-600">Hydrogen Platform</span>
            </div>
            <p className="text-center text-sm text-dark-400">
              수소 전해조 최적화 시뮬레이션 플랫폼
            </p>
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
