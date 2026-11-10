import React, { useState } from 'react';
import { X, LogOut, CheckCircle2, AlertCircle, Sparkles, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  currentUser?: any;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  currentUser,
  onClose,
}) => {
  const { user: authUser, signInWithGoogle, signOut } = useAuth();
  const activeUser = currentUser || authUser;
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Single Google OAuth Login via global AuthContext
  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await signInWithGoogle();
      if (error) {
        throw error;
      }
      setSuccessMsg('Google 로그인 창이 열렸습니다. 팝업에서 로그인을 완료해 주세요.');
    } catch (err: any) {
      console.warn('Google login error:', err);
      setErrorMsg(
        err.message || 'Google 로그인 연결 중 오류가 발생했습니다. 다시 시도해 주세요.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut();
      setSuccessMsg('로그아웃되었습니다.');
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || '로그아웃 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-[#FAF7F2] rounded-3xl p-6 sm:p-7 max-w-sm w-full border border-stone-200/90 shadow-2xl flex flex-col gap-5 relative animate-scaleUp text-[#242926]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
          title="닫기"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Branding Header */}
        <div className="flex flex-col items-center text-center pt-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-bold text-base shadow-sm mb-3">
            SS
          </div>
          <span className="text-[11px] font-bold tracking-widest text-emerald-800 uppercase font-mono">
            Scene Shadow: Notting Hill
          </span>
          <h2 className="text-xl font-bold text-stone-900 font-display mt-0.5">
            {activeUser ? 'Account / 내 계정' : 'Login'}
          </h2>
          <p className="text-xs text-stone-600 mt-1 max-w-[260px] leading-relaxed">
            {activeUser
              ? 'Google 계정으로 연동된 학습자 정보입니다.'
              : '별도의 회원가입 없이 Google 계정 하나로 간편하게 시작하세요.'}
          </p>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="leading-snug">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {activeUser ? (
          /* Logged In View */
          <div className="flex flex-col gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-2xs flex items-center gap-3.5">
              {activeUser.user_metadata?.avatar_url ? (
                <img
                  src={activeUser.user_metadata.avatar_url}
                  alt="Profile"
                  className="w-11 h-11 rounded-full object-cover border border-emerald-600/30"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-base border border-emerald-200">
                  {(activeUser.email?.[0] || 'G').toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-stone-900 truncate">
                    {activeUser.user_metadata?.full_name || activeUser.email?.split('@')[0]}
                  </span>
                  <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded text-[10px] font-semibold">
                    Google 연동
                  </span>
                </div>
                <span className="text-[11px] text-stone-500 block truncate mt-0.5">
                  {activeUser.email}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loading}
              className="w-full min-h-[46px] rounded-xl flex items-center justify-center gap-1.5 px-4 py-2 bg-stone-200/80 hover:bg-stone-300 text-stone-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-stone-600" />
              <span>{loading ? '로그아웃 중...' : '로그아웃 / Sign Out'}</span>
            </button>
          </div>
        ) : (
          /* Google Sign In Only (No separate signup, perfectly aligned with user instructions) */
          <div className="flex flex-col gap-4">
            {/* Feature highlights */}
            <div className="bg-white/80 rounded-2xl p-3.5 border border-stone-200/70 space-y-2">
              <div className="flex items-center gap-2 text-xs text-stone-700">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>나만의 쉐도잉 진도와 점검 기록 자동 저장</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-700">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>비밀번호 입력 없는 1초 간편 로그인</span>
              </div>
            </div>

            {/* Google Login Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full min-h-[50px] rounded-2xl bg-white hover:bg-stone-50 text-stone-800 border border-stone-300/90 hover:border-stone-400 font-semibold text-xs sm:text-sm flex items-center justify-center gap-3 shadow-xs hover:shadow-sm active:scale-[0.99] transition-all cursor-pointer group"
            >
              {/* Official Google G Logo SVG */}
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.87c2.27-2.09 3.67-5.17 3.67-9.14z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.04c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.27v3.13C3.25 21.32 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.27 14.25c-.25-.72-.38-1.49-.38-2.25s.13-1.53.38-2.25V6.62H1.27C.46 8.24 0 10.06 0 12s.46 3.76 1.27 5.38l4-3.13z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.68 1.27 6.62l4 3.13c.95-2.85 3.6-4.96 6.73-4.96z"
                />
              </svg>

              <span>
                {loading ? 'Google 계정 연결 중...' : 'Google 계정으로 계속하기'}
              </span>
            </button>

            {/* Educational safe notice */}
            <p className="text-[11px] text-stone-500 text-center leading-relaxed">
              본 앱은 성균관대학교 「인공지능과 영어교육」 수업 및 비영리 교육 목적으로 안전하게 운영됩니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
