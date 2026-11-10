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
import { LoginModal } from './components/LoginModal';
import { AuthScreen } from './components/AuthScreen';
import { UserProfilePopover } from './components/UserProfilePopover';
import { useAuth } from './context/AuthContext';
import { LogIn } from 'lucide-react';

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

  // Automatically redirect to main page ('start') when user signs in
  useEffect(() => {
    if (user) {
      setIsLoginModalOpen(false);
      if (currentScreen === 'auth') {
        setCurrentScreen('start');
      }
    }
  }, [user, currentScreen]);

  // Handle OAuth popup window callback: notify parent window and close popup
  useEffect(() => {
    if (typeof window !== 'undefined' && window.opener) {
      const hasAuthParams =
        window.location.hash.includes('access_token') ||
        window.location.search.includes('code');

      if (hasAuthParams) {
        const timer = setTimeout(() => {
          try {
            window.opener.postMessage({ type: 'SUPABASE_AUTH_SUCCESS' }, '*');
          } catch (_) {}
          window.close();
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // Shared ref for YouTube player instance
  const playerRef = useRef<YouTubePlayerHandle | null>(null);

  // Sync sentences to localStorage
  const handleUpdateSentences = (newSentences: Sentence[]) => {
    setSentences(newSentences);
    saveStoredSentences(newSentences);
  };

  // Sync progress to state and localStorage
  const handleUpdateProgress = (updatedProgress: SentenceProgress) => {
    setProgressMap((prev) => {
      const next = {
        ...prev,
        [updatedProgress.id]: updatedProgress,
      };
      saveStoredProgress(next);
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
      </div>
    </div>
  );
}
