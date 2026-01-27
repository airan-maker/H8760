/**
 * 헤더 사용자 메뉴 컴포넌트
 */
import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import {
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

export default function UserMenu() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  return (
    <Menu as="div" className="relative">
      <Menu.Button className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/60 transition-colors">
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || '사용자'}
            className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
          />
        ) : (
          <UserCircleIcon className="w-8 h-8 text-dark-400" />
        )}
        <span className="text-sm font-medium text-dark-700 hidden sm:block">
          {user.displayName || user.email?.split('@')[0]}
        </span>
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-white shadow-lg ring-1 ring-black/5 focus:outline-none divide-y divide-gray-100">
          {/* 사용자 정보 */}
          <div className="px-4 py-3">
            <p className="text-sm font-medium text-dark-900 truncate">
              {user.displayName}
            </p>
            <p className="text-xs text-dark-500 truncate">{user.email}</p>
          </div>

          {/* 메뉴 항목 */}
          <div className="py-1">
            <Menu.Item>
              {({ active }) => (
                <Link
                  to="/mypage"
                  className={`
                    flex items-center gap-3 px-4 py-2 text-sm
                    ${active ? 'bg-gray-50 text-hydrogen-600' : 'text-dark-700'}
                  `}
                >
                  <DocumentTextIcon className="w-5 h-5" />
                  마이페이지
                </Link>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <Link
                  to="/mypage?tab=settings"
                  className={`
                    flex items-center gap-3 px-4 py-2 text-sm
                    ${active ? 'bg-gray-50 text-hydrogen-600' : 'text-dark-700'}
                  `}
                >
                  <Cog6ToothIcon className="w-5 h-5" />
                  설정
                </Link>
              )}
            </Menu.Item>
          </div>

          {/* 로그아웃 */}
          <div className="py-1">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={handleLogout}
                  className={`
                    flex items-center gap-3 px-4 py-2 text-sm w-full
                    ${active ? 'bg-gray-50 text-red-600' : 'text-dark-700'}
                  `}
                >
                  <ArrowRightOnRectangleIcon className="w-5 h-5" />
                  로그아웃
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
