import React, { useState } from 'react';
import { ArrowLeft, Sparkles, ShieldCheck, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { EDUCATIONAL_CREDIT_LINE } from '../constants/initialData';

interface AuthScreenProps {
  currentUser?: any;
  onGoHome: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  currentUser,
  onGoHome,
}) => {
  const { user: authUser, signInWithGoogle, signOut } = useAuth();
  const activeUser = currentUser || authUser;
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || '로그아웃 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 pb-10 animate-fadeIn">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onGoHome}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 py-1.5 px-2.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home / 처음으로</span>
        </button>
      </div>

      {/* Main Auth Card maintaining page design aesthetic */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-sm flex flex-col gap-6">
        {/* Branding & Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-bold text-lg shadow-xs mb-3">
            SS
          </div>
          <span className="text-xs font-bold tracking-widest text-emerald-800 uppercase font-mono">
            Scene Shadow: Notting Hill
          </span>
          <h1 className="text-2xl font-bold text-stone-900 font-display mt-1">
            {activeUser ? 'Account / 내 계정' : 'Login'}
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1.5 max-w-xs leading-relaxed">
            {activeUser
              ? '현재 Google 계정으로 연동되어 안전하게 학습 중입니다.'
              : '별도의 회원가입 없이 Google 계정 하나로 바로 시작할 수 있습니다.'}
          </p>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {activeUser ? (
          /* Profile view */
          <div className="flex flex-col gap-4">
            <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-stone-200/80 flex items-center gap-4">
              {activeUser.user_metadata?.avatar_url ? (
                <img
                  src={activeUser.user_metadata.avatar_url}
                  alt="Profile"
                  className="w-12 h-12 rounded-full object-cover border border-emerald-600/30"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg border border-emerald-200">
                  {(activeUser.email?.[0] || 'G').toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-stone-900 truncate">
                    {activeUser.user_metadata?.full_name || activeUser.email?.split('@')[0]}
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-semibold">
                    Google 연동
                  </span>
                </div>
                <span className="text-xs text-stone-500 block truncate mt-0.5">
                  {activeUser.email}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={onGoHome}
                className="w-full min-h-[46px] rounded-xl flex items-center justify-center px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <span>학습 계속하기</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loading}
                className="w-full min-h-[46px] rounded-xl flex items-center justify-center gap-1.5 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-stone-600" />
                <span>{loading ? '로그아웃 중...' : '로그아웃'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Google Login Primary Action */
          <div className="flex flex-col gap-4">
            {/* Value propositions */}
            <div className="bg-[#FAF7F2] rounded-2xl p-4 border border-stone-200/80 space-y-2.5">
              <div className="flex items-center gap-2.5 text-xs text-stone-700">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>문장별 쉐도잉 진도와 점검(자가진단) 결과 저장</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-stone-700">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>복잡한 가입 절차 없는 원클릭 Google 인증</span>
              </div>
            </div>

            {/* Google Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full min-h-[52px] rounded-2xl bg-white hover:bg-stone-50 text-stone-900 border border-stone-300 hover:border-stone-400 font-semibold text-sm flex items-center justify-center gap-3 shadow-xs hover:shadow transition-all cursor-pointer group active:scale-[0.99]"
            >
              {/* Official Google G Logo */}
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

            <p className="text-[11px] text-stone-500 text-center leading-relaxed pt-1">
              본 앱은 성균관대학교 「인공지능과 영어교육」 수업 및 비영리 교육 목적으로 안전하게 운영됩니다.
            </p>
          </div>
        )}
      </div>

      {/* Mandatory Educational Notice footer */}
      <div className="pt-4 border-t border-stone-200/60 text-center">
        <p className="text-[12px] text-stone-500 leading-relaxed">
          {EDUCATIONAL_CREDIT_LINE}
        </p>
      </div>
    </div>
  );
};
