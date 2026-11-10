import React, { useState, useEffect, useRef } from 'react';
import { ScreenType, Sentence, SentenceProgress } from './types';
import {
  loadStoredSentences,
  saveStoredSentences,
  loadStoredProgress,
  saveStoredProgress,
  createInitialProgress,
  SAMPLE_NOTTING_HILL_SENTENCES,
} from './constants/initialData';
import { YouTubePlayerHandle } from './components/YouTubePlayer';
import { StartScreen } from './components/StartScreen';
import { SentenceListScreen } from './components/SentenceListScreen';
import { ShadowingScreen } from './components/ShadowingScreen';
import { EditSentencesScreen } from './components/EditSentencesScreen';
import { FinishScreen } from './components/FinishScreen';
import { StudySummaryScreen } from './components/StudySummaryScreen';
import { LoginModal } from './components/LoginModal';
import { AuthScreen } from './components/AuthScreen';
import { UserProfilePopover } from './components/UserProfilePopover';
import { useAuth } from './context/AuthContext';
import { supabase } from './lib/supabase';
import { recordUserActivity } from './services/activityService';
import { LogIn, BarChart3 } from 'lucide-react';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/auth') {
      return 'auth';
    }
    return 'start';
  });
  const [sentences, setSentences] = useState<Sentence[]>(() => loadStoredSentences());
  const [progressMap, setProgressMap] = useState<Record<number, SentenceProgress>>(() =>
    loadStoredProgress()
  );
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number>(0);

  // Global Auth via AuthContext
  const { user } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showReturnButton, setShowReturnButton] = useState(false);

  // Automatically redirect to main page ('start') when user signs in
  useEffect(() => {
    if (user) {
      setIsLoginModalOpen(false);
      if (currentScreen === 'auth') {
        setCurrentScreen('start');
      }
    }
  }, [user, currentScreen]);

  // Handle OAuth popup window callback (Requirements 1.a, 1.b, 1.c, 3, 6)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isPopup = Boolean(window.opener) || window.name === 'google_oauth_popup';
    const hasAuthParams =
      window.location.hash.includes('access_token') ||
      window.location.search.includes('code');

    if (!hasAuthParams) return;

    const handlePopupAuth = async () => {
      console.log('[DEBUG] Popup: OAuth callback detected with auth parameters');

      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get('code');

      // 1.a) Set session and wait until confirmed before closing
      let confirmedSession = null;
      if (accessToken && refreshToken) {
        console.log('[DEBUG] Popup: establishing session via setSession with hash tokens...');
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          console.error('[DEBUG] Popup: setSession error:', error);
        } else {
          confirmedSession = data.session;
        }
      } else if (code) {
        console.log('[DEBUG] Popup: exchanging authorization code for session...');
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('[DEBUG] Popup: exchangeCode error:', error);
        } else {
          confirmedSession = data.session;
        }
      }

      if (!confirmedSession) {
        const { data } = await supabase.auth.getSession();
        confirmedSession = data.session;
      }

      // 1.a) Verify session confirmed
      if (confirmedSession?.user) {
        console.log('[DEBUG] Popup: session confirmed:', confirmedSession.user.email);
      } else {
        console.warn('[DEBUG] Popup: session confirmation incomplete');
      }

      // 1.b) 세션이 확정된 것을 확인한 뒤에만, 원래 창으로 전달한다
      if (window.opener) {
        const tokenToSend = accessToken || confirmedSession?.access_token;
        const refreshToSend = refreshToken || confirmedSession?.refresh_token;

        if (tokenToSend && refreshToSend) {
          try {
            window.opener.postMessage(
              {
                type: 'SUPABASE_AUTH',
                access_token: tokenToSend,
                refresh_token: refreshToSend,
              },
              window.location.origin
            );
            console.log('[DEBUG] Popup: postMessage sent to opener with origin:', window.location.origin);
          } catch (postErr) {
            console.error('[DEBUG] Popup: postMessage error:', postErr);
          }

          // 1.c) 전달 후 300ms 뒤에 window.close() 한다. 세션 확정 전에는 절대 닫지 마.
          setTimeout(() => {
            console.log('[DEBUG] Popup: closing popup window after 300ms');
            window.close();
          }, 300);
        } else {
          console.warn('[DEBUG] Popup: tokens not available to post to opener');
        }
      } else if (isPopup) {
        // 3. window.opener 가 null 이어서 전달이 불가능한 경우 대비: "앱으로 돌아가기" 버튼 표시
        console.warn('[DEBUG] Popup: window.opener is null, displaying return button UI');
        setShowReturnButton(true);
      }
    };

    handlePopupAuth();
  }, []);

  // Shared ref for YouTube player instance
  const playerRef = useRef<YouTubePlayerHandle | null>(null);

  // Sync sentences to localStorage
  const handleUpdateSentences = (newSentences: Sentence[]) => {
    setSentences(newSentences);
    saveStoredSentences(newSentences);
  };

  // Sync progress to state and localStorage, and persist to Supabase if logged in
  const handleUpdateProgress = (
    updatedProgress: SentenceProgress,
    activityType: 'listen' | 'shadowing' | 'self_check' | 'complete' = 'listen'
  ) => {
    setProgressMap((prev) => {
      const next = {
        ...prev,
        [updatedProgress.id]: updatedProgress,
      };
      saveStoredProgress(next);

      // Record activity to Supabase with real-time timestamp when authenticated
      if (user?.id) {
        recordUserActivity(
          user.id,
          updatedProgress.id,
          activityType,
          updatedProgress,
          next,
          sentences
        );
      }

      return next;
    });
  };

  // Load sample Notting Hill dialogues
  const handleLoadSamples = () => {
    handleUpdateSentences(SAMPLE_NOTTING_HILL_SENTENCES);
    // Initialize progress entries if not present
    const updatedProgress = { ...progressMap };
    SAMPLE_NOTTING_HILL_SENTENCES.forEach((s) => {
      if (!updatedProgress[s.id]) {
        updatedProgress[s.id] = createInitialProgress(s.id);
      }
    });
    setProgressMap(updatedProgress);
    saveStoredProgress(updatedProgress);
  };

  // Start Practice handler
  const handleStartPractice = () => {
    if (sentences.length > 0) {
      setCurrentScreen('list');
    } else {
      setCurrentScreen('edit');
    }
  };

  // Select a sentence to practice from list
  const handleSelectSentence = (index: number) => {
    setActiveSentenceIndex(index);
    // Ensure progress entry exists
    const currentSentence = sentences[index];
    if (currentSentence && !progressMap[currentSentence.id]) {
      handleUpdateProgress(createInitialProgress(currentSentence.id));
    }
    setCurrentScreen('practice');
  };

  // Next sentence in Shadowing Screen
  const handleNextSentence = () => {
    if (activeSentenceIndex < sentences.length - 1) {
      const nextIdx = activeSentenceIndex + 1;
      setActiveSentenceIndex(nextIdx);
      const nextSentence = sentences[nextIdx];
      if (nextSentence && !progressMap[nextSentence.id]) {
        handleUpdateProgress(createInitialProgress(nextSentence.id));
      }
    } else {
      // Completed all sentences -> Screen 5 Finish
      setCurrentScreen('finish');
    }
  };

  // Previous sentence
  const handlePrevSentence = () => {
    if (activeSentenceIndex > 0) {
      setActiveSentenceIndex(activeSentenceIndex - 1);
    }
  };

  // Get active sentence & progress
  const activeSentence = sentences[activeSentenceIndex] || sentences[0];
  const activeProgress = activeSentence
    ? progressMap[activeSentence.id] || createInitialProgress(activeSentence.id)
    : createInitialProgress(1);

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#242926] flex justify-center selection:bg-emerald-100">
      {/* Mobile-first centered frame, maximum width 480px */}
      <div className="w-full max-w-[480px] min-h-screen flex flex-col px-3.5 py-3 sm:py-5">
        {/* Top Minimal Brand Bar */}
        <header className="flex items-center justify-between py-2 mb-2 border-b border-stone-200/60">
          <button
            onClick={() => setCurrentScreen('start')}
            className="flex items-center gap-2 text-left group cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shadow-xs group-hover:bg-emerald-800 transition-colors">
              SS
            </div>
            <div>
              <span className="text-xs font-bold text-stone-900 tracking-tight font-display">
                Scene Shadow
              </span>
              <span className="text-[10px] text-stone-500 block -mt-0.5">
                Notting Hill (1999)
              </span>
            </div>
          </button>

          {/* Quick Mode Indicator / Switcher & Top-Right Login Link */}
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-stone-600">
            {currentScreen !== 'start' && (
              <button
                onClick={() => setCurrentScreen('start')}
                className="px-2 py-1 rounded-md text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 transition-colors"
              >
                Home
              </button>
            )}
            {currentScreen !== 'list' && sentences.length > 0 && (
              <button
                onClick={() => setCurrentScreen('list')}
                className="px-2 py-1 rounded-md text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 transition-colors"
              >
                List
              </button>
            )}
            {currentScreen !== 'summary' && (
              <button
                onClick={() => setCurrentScreen('summary')}
                className="px-2 py-1 rounded-md text-emerald-800 hover:bg-emerald-50 font-semibold transition-colors flex items-center gap-1"
                title="나의 학습 기록 요약"
              >
                <BarChart3 className="w-3 h-3 text-emerald-600" />
                <span>요약</span>
              </button>
            )}
            {currentScreen !== 'edit' && (
              <button
                onClick={() => setCurrentScreen('edit')}
                className="px-2 py-1 rounded-md text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 transition-colors"
              >
                Edit
              </button>
            )}

            {/* When logged in: Profile Popover with Sign out on hover; When logged out: Single top-right Login button */}
            {user ? (
              <UserProfilePopover onSignOutSuccess={() => setCurrentScreen('start')} />
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setIsLoginModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/70 transition-colors cursor-pointer"
                title="Login"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login</span>
              </button>
            )}
          </div>
        </header>

        {/* Dynamic Screen View */}
        <main className="flex-1">
          {currentScreen === 'start' && (
            <StartScreen
              sentences={sentences}
              currentUser={user}
              onStartPractice={handleStartPractice}
              onGoToEdit={() => setCurrentScreen('edit')}
              onLoadSamples={handleLoadSamples}
              onGoToSummary={() => setCurrentScreen('summary')}
              onOpenLogin={() => setIsLoginModalOpen(true)}
            />
          )}

          {currentScreen === 'list' && (
            <SentenceListScreen
              sentences={sentences}
              progressMap={progressMap}
              playerRef={playerRef}
              onSelectSentence={handleSelectSentence}
              onGoBack={() => setCurrentScreen('start')}
              onGoToEdit={() => setCurrentScreen('edit')}
              onLoadSamples={handleLoadSamples}
            />
          )}

          {currentScreen === 'practice' && activeSentence && (
            <ShadowingScreen
              sentence={activeSentence}
              index={activeSentenceIndex}
              totalSentences={sentences.length}
              progress={activeProgress}
              playerRef={playerRef}
              onUpdateProgress={handleUpdateProgress}
              onNext={handleNextSentence}
              onPrev={handlePrevSentence}
              onGoToList={() => setCurrentScreen('list')}
            />
          )}

          {currentScreen === 'edit' && (
            <EditSentencesScreen
              sentences={sentences}
              playerRef={playerRef}
              onUpdateSentences={handleUpdateSentences}
              onGoBack={() => {
                if (sentences.length > 0) {
                  setCurrentScreen('list');
                } else {
                  setCurrentScreen('start');
                }
              }}
            />
          )}

          {currentScreen === 'finish' && (
            <FinishScreen
              sentences={sentences}
              progressMap={progressMap}
              onPracticeSentence={(idx) => {
                setActiveSentenceIndex(idx);
                setCurrentScreen('practice');
              }}
              onGoToStart={() => setCurrentScreen('start')}
              onGoToList={() => setCurrentScreen('list')}
              onGoToSummary={() => setCurrentScreen('summary')}
            />
          )}

          {currentScreen === 'summary' && (
            <StudySummaryScreen
              sentences={sentences}
              progressMap={progressMap}
              onGoBack={() => setCurrentScreen('start')}
              onPracticeSentence={(idx) => {
                setActiveSentenceIndex(idx);
                setCurrentScreen('practice');
              }}
              onGoToList={() => setCurrentScreen('list')}
              onOpenLogin={() => setIsLoginModalOpen(true)}
            />
          )}

          {currentScreen === 'auth' && (
            <AuthScreen
              currentUser={user}
              onGoHome={() => setCurrentScreen('start')}
            />
          )}
        </main>

        {/* In-page Login / Account Modal without navigating away */}
        <LoginModal
          isOpen={isLoginModalOpen}
          currentUser={user}
          onClose={() => setIsLoginModalOpen(false)}
        />

        {/* Requirement 3: Return to App button when opener is null in popup */}
        {showReturnButton && (
          <div className="fixed inset-0 z-50 bg-[#FAF7F2] flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-bold text-base shadow-sm mb-3">
              SS
            </div>
            <h2 className="text-xl font-bold text-stone-900 font-display">로그인이 완료되었습니다</h2>
            <p className="text-xs text-stone-600 mt-2 max-w-xs leading-relaxed">
              Google 인증이 성공적으로 완료되었습니다. 원래 창과의 연결이 분리되어 팝업이 자동으로 닫히지 않았습니다. 아래 버튼을 눌러 학습 화면으로 이동하세요.
            </p>
            <div className="flex flex-col gap-2 w-full max-w-xs mt-6">
              <button
                type="button"
                onClick={() => {
                  window.location.href = window.location.origin;
                }}
                className="w-full min-h-[46px] rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                앱으로 돌아가기
              </button>
              <button
                type="button"
                onClick={() => window.close()}
                className="w-full min-h-[40px] rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                이 창 닫기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
