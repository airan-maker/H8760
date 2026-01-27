/**
 * 로그인 페이지
 */
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GoogleLoginButton } from '../components/auth';

export default function Login() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 리디렉션 경로 (로그인 후 돌아갈 페이지)
  const from = (location.state as { from?: string })?.from || '/';

  // 이미 로그인되어 있으면 리디렉션
  useEffect(() => {
    if (!loading && user) {
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, from]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-hydrogen-200 border-t-hydrogen-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* 타이틀 */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-dark-900 mb-2">H8760 로그인</h1>
          <p className="text-dark-500">
            계정에 로그인하여 시나리오를 저장하고 관리하세요
          </p>
        </div>

        {/* 로그인 카드 */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {/* 비로그인 안내 */}
          <div className="bg-hydrogen-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-hydrogen-700">
              <strong>로그인 없이도</strong> 시뮬레이션을 사용할 수 있습니다.
              <br />
              로그인하면 시나리오를 서버에 저장하고 다른 기기에서도 접근할 수 있습니다.
            </p>
          </div>

          {/* 구글 로그인 버튼 */}
          <GoogleLoginButton
            className="w-full"
            onSuccess={() => navigate(from, { replace: true })}
            onError={(error) => {
              console.error('로그인 오류:', error);
            }}
          />

          {/* 구분선 */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-dark-400">또는</span>
            </div>
          </div>

          {/* 비로그인 사용 버튼 */}
          <button
            onClick={() => navigate('/')}
            className="w-full px-6 py-3 text-dark-600 font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            로그인 없이 계속하기
          </button>
        </div>

        {/* 추가 정보 */}
        <p className="text-center text-xs text-dark-400 mt-6">
          로그인하면{' '}
          <a href="#" className="text-hydrogen-600 hover:underline">
            이용약관
          </a>{' '}
          및{' '}
          <a href="#" className="text-hydrogen-600 hover:underline">
            개인정보처리방침
          </a>
          에 동의하는 것으로 간주됩니다.
        </p>
      </div>
    </div>
  );
}
