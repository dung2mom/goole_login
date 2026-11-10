import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Repeat,
  Mic,
  Square,
  Volume2,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { Sentence, SentenceProgress, StepType, SelfCheckValue } from '../types';
import { STEP_INFOS } from '../constants/initialData';
import { YouTubePlayer, YouTubePlayerHandle } from './YouTubePlayer';
import { useShadowRecorder, compareSpokenWords, SpeechCheckResult } from '../hooks/useShadowRecorder';

interface ShadowingScreenProps {
  sentence: Sentence;
  index: number;
  totalSentences: number;
  progress: SentenceProgress;
  playerRef: React.RefObject<YouTubePlayerHandle | null>;
  onUpdateProgress: (updated: SentenceProgress) => void;
  onNext: () => void;
  onPrev: () => void;
  onGoToList: () => void;
}

export const ShadowingScreen: React.FC<ShadowingScreenProps> = ({
  sentence,
  index,
  totalSentences,
  progress,
  playerRef,
  onUpdateProgress,
  onNext,
  onPrev,
  onGoToList,
}) => {
  // Step State (1: 듣기, 2: 읽기, 3: 쉐도우, 4: 확인)
  const [activeStep, setActiveStep] = useState<StepType>(1);

  // Text visibility toggles
  const [isTextHidden, setIsTextHidden] = useState(true);
  const [isKoreanHidden, setIsKoreanHidden] = useState(false);

  // Playback parameters
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isPlayingClip, setIsPlayingClip] = useState(false);

  // Independent Voice Recording State
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordTimerRef = useRef<number | null>(null);

  // Recording & voice hook
  const {
    isRecording,
    recordedAudioUrl,
    isPlayingAudio,
    statusMessage,
    startRecording,
    stopRecording,
    playVoice,
    stopVoice,
    clearRecording,
  } = useShadowRecorder();

  // Speech recognition (Word check) state
  const [isSpeechChecking, setIsSpeechChecking] = useState(false);
  const [speechResult, setSpeechResult] = useState<SpeechCheckResult | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Check if Web Speech API is supported
  const isSpeechRecognitionSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Reset or initialize view state when sentence changes
  useEffect(() => {
    setActiveStep(1);
    setIsTextHidden(true);
    setSpeechResult(null);
    setSpeechError(null);
    clearRecording();
    stopVoice();
    if (recordTimerRef.current) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    setRecordSeconds(0);

    if (playerRef.current) {
      playerRef.current.stopSegment();
    }
  }, [sentence.id]);

  // Clean up recording timer on unmount
  useEffect(() => {
    return () => {
      if (recordTimerRef.current) {
        window.clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
    };
  }, []);

  // Adjust step selection & auto-play for Step 1 (듣기) and Step 3 (쉐도우)
  const handleStepSelect = (step: StepType) => {
    setActiveStep(step);
    const stepInfo = STEP_INFOS.find((s) => s.step === step);
    if (stepInfo) {
      setIsTextHidden(stepInfo.defaultTextHidden);
    }

    // Stop recording if active
    if (isRecording) {
      if (recordTimerRef.current) {
        window.clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
      stopRecording();
      setRecordSeconds(0);
    }

    // Step 1 (듣기) or Step 3 (쉐도우): automatically start playback!
    if (step === 1 || step === 3) {
      stopVoice();

      if (playerRef.current) {
        playerRef.current.stopSegment();
        setIsPlayingClip(true);
        playerRef.current.setPlaybackRate(playbackRate);
        playerRef.current.playSegment(sentence.start, sentence.end, loopEnabled, () => {
          if (!loopEnabled) {
            setIsPlayingClip(false);
          }
        });

        // Increment play count
        onUpdateProgress({
          ...progress,
          plays: (progress.plays || 0) + 1,
        });
      }
    } else {
      // Step 2 (읽기) or Step 4 (확인): pause/stop video so learner can read / record
      if (playerRef.current && isPlayingClip) {
        playerRef.current.stopSegment();
        setIsPlayingClip(false);
      }
    }
  };

  // Play clip segment once or loop
  const handlePlaySegment = useCallback(() => {
    if (!playerRef.current) return;

    if (isPlayingClip) {
      playerRef.current.stopSegment();
      setIsPlayingClip(false);
      return;
    }

    // Stop voice playback if active
    stopVoice();

    setIsPlayingClip(true);
    playerRef.current.setPlaybackRate(playbackRate);
    playerRef.current.playSegment(sentence.start, sentence.end, loopEnabled, () => {
      if (!loopEnabled) {
        setIsPlayingClip(false);
      }
    });

    // Increment play count
    onUpdateProgress({
      ...progress,
      plays: (progress.plays || 0) + 1,
    });
  }, [sentence.start, sentence.end, loopEnabled, playbackRate, isPlayingClip, progress, onUpdateProgress, playerRef, stopVoice]);

  // Toggle loop and notify player immediately
  const handleToggleLoop = () => {
    const nextLoop = !loopEnabled;
    setLoopEnabled(nextLoop);
    if (playerRef.current) {
      playerRef.current.setLoop(nextLoop);
    }
  };

  // Speed rate button handler
  const handleSetSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (playerRef.current) {
      playerRef.current.setPlaybackRate(rate);
    }
  };

  // Dedicated Voice Recording (Video audio is NOT played to avoid sound overlapping!)
  const handleToggleRecord = async () => {
    if (isRecording) {
      // User tapped Stop Recording
      if (recordTimerRef.current) {
        window.clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
      await stopRecording();
      setRecordSeconds(0);

      // Mark status: "practiced" after 1 recording, "done" if recorded in Step 4 (확인)
      const newStatus = activeStep === 4 ? 'done' : progress.status === 'done' ? 'done' : 'practiced';
      onUpdateProgress({
        ...progress,
        recordings: (progress.recordings || 0) + 1,
        status: newStatus,
      });
      return;
    }

    // Stop video playback completely so speech does not clash
    if (playerRef.current) {
      playerRef.current.stopSegment();
    }
    setIsPlayingClip(false);
    stopVoice();

    // Start microphone recording only
    const started = await startRecording();
    if (!started) return;

    setRecordSeconds(0);
    recordTimerRef.current = window.setInterval(() => {
      setRecordSeconds((prev) => prev + 1);
    }, 1000);
  };

  // Self-check rating updater
  const handleSelfCheckChange = (questionIndex: 0 | 1 | 2, rating: SelfCheckValue) => {
    const currentCheck = [...progress.selfCheck] as [SelfCheckValue, SelfCheckValue, SelfCheckValue];
    currentCheck[questionIndex] = rating;

    onUpdateProgress({
      ...progress,
      selfCheck: currentCheck,
    });
  };

  // Web Speech API Word Check
  const handleRunWordCheck = () => {
    if (!isSpeechRecognitionSupported) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setIsSpeechChecking(true);
      setSpeechError(null);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        const result = compareSpokenWords(sentence.text, transcript);
        setSpeechResult(result);
        setIsSpeechChecking(false);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          setSpeechError('소리가 감지되지 않았습니다. 다시 버튼을 누르고 말씀해 보세요.');
        } else {
          setSpeechError('음성 인식이 완료되지 않았습니다. 다시 시도해 주세요.');
        }
        setIsSpeechChecking(false);
      };

      recognition.onend = () => {
        setIsSpeechChecking(false);
      };

      recognition.start();
    } catch (e) {
      console.warn('Speech recognition start failed:', e);
      setIsSpeechChecking(false);
    }
  };

  // Render sentence text with stress words bolded and exact word arrangement preserved
  const renderSentenceWithStress = () => {
    const stressTokens = new Set(
      (sentence.stress || []).flatMap((s) =>
        s.toLowerCase().split(/\s+/).map((w) => w.replace(/[^a-z0-9]/g, ''))
      ).filter(Boolean)
    );

    const tokens = sentence.text.trim().split(/\s+/).filter(Boolean);

    return (
      <div className="text-[22px] sm:text-2xl font-bold text-stone-900 leading-snug tracking-tight text-center my-2 select-text font-display flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        {tokens.map((token, i) => {
          const stripped = token.toLowerCase().replace(/[^a-z0-9]/g, '');
          const isStressed =
            stressTokens.has(stripped) ||
            (stripped.length > 3 &&
              Array.from(stressTokens).some((st) => stripped.includes(st) || st.includes(stripped)));

          return (
            <span
              key={i}
              className={`inline-block transition-colors ${
                isStressed
                  ? 'font-extrabold text-stone-950 underline decoration-amber-500/80 decoration-3 underline-offset-4'
                  : 'font-normal text-stone-700'
              }`}
            >
              {token}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 pb-12 animate-fadeIn">
      {/* Top Navigation Row: Back to List & Sentence Counter */}
      <div className="flex items-center justify-between">
        <button
          onClick={onGoToList}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 py-1.5 px-2.5 rounded-lg hover:bg-stone-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Sentences / 목록</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            disabled={index === 0}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-700 hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Previous sentence"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <span className="text-xs font-bold font-mono px-2 py-0.5 bg-stone-100 text-stone-800 rounded-md">
            {index + 1} / {totalSentences}
          </span>

          <button
            onClick={onNext}
            disabled={index === totalSentences - 1}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-700 hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Next sentence"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 1. Video Player (16:9) with Educational Credit */}
      <div className="w-full">
        <YouTubePlayer
          ref={playerRef}
          playbackRate={playbackRate}
          onPlayingChange={(playing) => setIsPlayingClip(playing)}
          showCredit={true}
        />
      </div>

      {/* 2. Speaker Indicator from Script */}
      <div className="flex items-center justify-between text-xs text-stone-500 px-1 -mt-1">
        <div className="flex items-center gap-1.5">
          <span
            className={`font-bold tracking-wide uppercase px-2 py-0.5 rounded-md text-[11px] border ${
              sentence.speaker.toUpperCase() === 'ANNA'
                ? 'bg-amber-50 text-amber-900 border-amber-200/80'
                : sentence.speaker.toUpperCase() === 'THIEF'
                ? 'bg-purple-50 text-purple-900 border-purple-200/80'
                : 'bg-emerald-50 text-emerald-900 border-emerald-200/80'
            }`}
          >
            {sentence.speaker}
          </span>
          <span>·</span>
          <span className="font-mono text-stone-400">
            {sentence.start.toFixed(1)}s – {sentence.end.toFixed(1)}s
          </span>
        </div>

        <button
          onClick={() => setIsTextHidden(!isTextHidden)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-600 hover:text-stone-900 underline underline-offset-2"
        >
          {isTextHidden ? (
            <>
              <Eye className="w-3.5 h-3.5 text-emerald-700" />
              <span>Show Text / 자막 보기</span>
            </>
          ) : (
            <>
              <EyeOff className="w-3.5 h-3.5 text-stone-500" />
              <span>Hide Text / 문장 숨기기</span>
            </>
          )}
        </button>
      </div>

      {/* 3 & 4. Sentence Box (with bold stress words & Korean meaning) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/90 shadow-xs flex flex-col items-center justify-center min-h-[110px]">
        {isTextHidden ? (
          <div className="py-4 text-center">
            <p className="text-sm font-medium text-stone-400 italic">
              [ Text hidden for active listening / 자막 숨김 상태 ]
            </p>
            <p className="text-xs text-stone-400 mt-1">
              소리에 집중해 들어보세요. 상단 토글로 언제든 자막을 확인할 수 있습니다.
            </p>
          </div>
        ) : (
          <>
            {renderSentenceWithStress()}
            {!isKoreanHidden && sentence.korean && (
              <p className="text-xs text-stone-500 text-center mt-1 select-text">
                {sentence.korean}
              </p>
            )}
            {sentence.korean && (
              <button
                onClick={() => setIsKoreanHidden(!isKoreanHidden)}
                className="text-[10px] text-stone-400 hover:text-stone-600 mt-2 underline"
              >
                {isKoreanHidden ? '한국어 해석 보기' : '해석 숨기기'}
              </button>
            )}
          </>
        )}
      </div>

      {/* 5. Playback Control Row: Play, Loop, Speed Buttons */}
      <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200/80 flex flex-wrap items-center justify-between gap-2">
        {/* Play / Pause Segment Button */}
        <button
          onClick={handlePlaySegment}
          className={`min-h-[48px] px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-2xs ${
            isPlayingClip
              ? 'bg-amber-600 hover:bg-amber-700 text-white'
              : 'bg-emerald-700 hover:bg-emerald-800 text-white'
          }`}
        >
          {isPlayingClip ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
          <span>{isPlayingClip ? 'Pause / 일시정지' : 'Play / 재생'}</span>
        </button>

        {/* Loop Toggle Button */}
        <button
          onClick={handleToggleLoop}
          className={`min-h-[48px] px-3.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold border transition-all ${
            loopEnabled
              ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/30'
              : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
          }`}
          title="Loop sentence with 1.5s pause for speaking"
        >
          <Repeat className={`w-4 h-4 ${loopEnabled ? 'text-emerald-700' : 'text-stone-400'}`} />
          <span>Loop {loopEnabled ? 'ON' : 'OFF'}</span>
        </button>

        {/* Speed Segmented Buttons: 0.5x, 0.75x, 1.0x */}
        <div className="flex items-center bg-stone-200/70 p-1 rounded-xl h-[48px]">
          {[0.5, 0.75, 1.0].map((rate) => (
            <button
              key={rate}
              onClick={() => handleSetSpeed(rate)}
              className={`h-full px-2.5 text-xs font-semibold rounded-lg transition-colors ${
                playbackRate === rate
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {rate}×
            </button>
          ))}
        </div>
      </div>

      {/* 6. Step Guide: 4 Tabs (듣기, 읽기, 쉐도우, 확인) */}
      <div className="bg-white rounded-2xl p-3.5 border border-stone-200/90 shadow-2xs">
        <div className="grid grid-cols-4 gap-1.5 mb-2.5">
          {STEP_INFOS.map((info) => {
            const isActive = activeStep === info.step;
            return (
              <button
                key={info.step}
                onClick={() => handleStepSelect(info.step)}
                className={`py-2 px-1 rounded-xl text-center flex flex-col items-center justify-center transition-all ${
                  isActive
                    ? 'bg-emerald-700 text-white font-bold shadow-xs'
                    : 'bg-stone-50 text-stone-600 hover:bg-stone-100 font-medium'
                }`}
              >
                <span className="text-xs">{`Step ${info.step}`}</span>
                <span className="text-[11px] opacity-95 truncate max-w-full font-semibold mt-0.5">
                  {info.step === 1
                    ? '듣기 ▶'
                    : info.step === 2
                    ? '읽기'
                    : info.step === 3
                    ? '쉐도우 ▶'
                    : '확인'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Current Step Guidance */}
        {(() => {
          const current = STEP_INFOS.find((s) => s.step === activeStep);
          if (!current) return null;
          return (
            <div className="bg-stone-50 rounded-xl p-2.5 text-xs text-stone-700 flex flex-col gap-0.5 border border-stone-200/60">
              <div className="font-semibold text-stone-900 flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                  <span>
                    {current.titleKo} ({current.titleEn})
                  </span>
                </div>
                {(current.step === 1 || current.step === 3) && (
                  <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100/80 border border-emerald-200 px-1.5 py-0.5 rounded">
                    클릭 시 자동 재생
                  </span>
                )}
              </div>
              <p className="text-stone-600 pl-3.5 text-[11px] leading-relaxed">
                {current.descKo}
              </p>
              <p className="text-stone-400 pl-3.5 text-[10px]">
                {current.descEn}
              </p>
            </div>
          );
        })()}
      </div>

      {/* 7. Record Area: Independent Voice Recording (No audio overlap!) */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-xs flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-stone-800 uppercase tracking-wide flex items-center gap-1.5">
            <Mic className="w-4 h-4 text-emerald-800" />
            <span>Voice Record / 내 목소리 녹음</span>
          </div>

          {progress.recordings > 0 && (
            <span className="text-[11px] text-stone-500">
              녹음 횟수: <strong className="text-emerald-800">{progress.recordings}회</strong>
            </span>
          )}
        </div>

        {statusMessage && (
          <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
            {statusMessage}
          </div>
        )}

        {/* Primary Record Button (At least 48px, thumb friendly) */}
        <button
          onClick={handleToggleRecord}
          className={`w-full min-h-[52px] rounded-xl flex flex-col items-center justify-center px-4 py-2 font-semibold text-sm transition-all shadow-sm ${
            isRecording
              ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse'
              : 'bg-emerald-700 hover:bg-emerald-800 text-white active:scale-[0.99]'
          }`}
        >
          <div className="flex items-center gap-2">
            {isRecording ? <Square className="w-5 h-5 fill-white" /> : <Mic className="w-5 h-5" />}
            <span>
              {isRecording
                ? `⏹️ Stop Recording (${String(Math.floor(recordSeconds / 60)).padStart(2, '0')}:${String(
                    recordSeconds % 60
                  ).padStart(2, '0')})`
                : '🎙 Record Voice / 녹음 시작'}
            </span>
          </div>
          <span className="text-[11px] font-normal opacity-90">
            {isRecording
              ? '녹음 중... (문장을 말씀하신 후 이 버튼을 눌러 녹음을 완료하세요)'
              : '내 목소리 녹음하기 (대사 음성이 겹치지 않습니다)'}
          </span>
        </button>

        {/* Playback Buttons: My Voice & Original Replay */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            onClick={isPlayingAudio ? stopVoice : playVoice}
            disabled={!recordedAudioUrl}
            className={`min-h-[48px] rounded-xl px-3 flex flex-col items-center justify-center text-xs font-semibold border transition-all ${
              recordedAudioUrl
                ? 'bg-stone-50 hover:bg-stone-100 text-stone-800 border-stone-200'
                : 'bg-stone-100/60 text-stone-400 border-stone-200 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-emerald-700" />
              <span>{isPlayingAudio ? 'Stop Voice' : '▶ My Voice'}</span>
            </div>
            <span className="text-[10px] font-normal opacity-80">내 목소리 듣기</span>
          </button>

          <button
            onClick={handlePlaySegment}
            className="min-h-[48px] rounded-xl px-3 flex flex-col items-center justify-center text-xs font-semibold bg-stone-50 hover:bg-stone-100 text-stone-800 border border-stone-200 transition-all"
          >
            <div className="flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-amber-700 fill-amber-700" />
              <span>▶ Original</span>
            </div>
            <span className="text-[10px] font-normal opacity-80">원문 대사 다시 듣기</span>
          </button>
        </div>
      </div>

      {/* 8. Self-Check (3 questions with 😀 / 🙂 / 😐) */}
      <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/90 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-stone-900 uppercase tracking-wide">
            Self-Check / 스스로 점검하기
          </span>
          <span className="text-[11px] text-stone-500">녹음 후 느낌을 기록하세요</span>
        </div>

        {/* Question 1: Speed */}
        <div className="bg-white rounded-xl p-3 border border-stone-200/80 flex items-center justify-between gap-2">
          <div className="flex-1 pr-1">
            <p className="text-xs font-semibold text-stone-800">
              Did I keep up with the speed?
            </p>
            <p className="text-[11px] text-stone-500">속도를 맞춰 따라갔나요?</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {([2, 1, 0] as const).map((val) => {
              const isSelected = progress.selfCheck[0] === val;
              const emoji = val === 2 ? '😀' : val === 1 ? '🙂' : '😐';
              return (
                <button
                  key={val}
                  onClick={() => handleSelfCheckChange(0, val)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-transform ${
                    isSelected
                      ? 'bg-emerald-100 ring-2 ring-emerald-600 scale-110'
                      : 'bg-stone-100 hover:bg-stone-200'
                  }`}
                  title={val === 2 ? 'Great' : val === 1 ? 'Okay' : 'Needs work'}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        </div>

        {/* Question 2: Stress */}
        <div className="bg-white rounded-xl p-3 border border-stone-200/80 flex items-center justify-between gap-2">
          <div className="flex-1 pr-1">
            <p className="text-xs font-semibold text-stone-800">
              Did I stress the bold words?
            </p>
            <p className="text-[11px] text-stone-500">강조 단어에 힘을 주었나요?</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {([2, 1, 0] as const).map((val) => {
              const isSelected = progress.selfCheck[1] === val;
              const emoji = val === 2 ? '😀' : val === 1 ? '🙂' : '😐';
              return (
                <button
                  key={val}
                  onClick={() => handleSelfCheckChange(1, val)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-transform ${
                    isSelected
                      ? 'bg-emerald-100 ring-2 ring-emerald-600 scale-110'
                      : 'bg-stone-100 hover:bg-stone-200'
                  }`}
                  title={val === 2 ? 'Great' : val === 1 ? 'Okay' : 'Needs work'}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        </div>

        {/* Question 3: Intonation */}
        <div className="bg-white rounded-xl p-3 border border-stone-200/80 flex items-center justify-between gap-2">
          <div className="flex-1 pr-1">
            <p className="text-xs font-semibold text-stone-800">
              Did my voice go up and down like the actor?
            </p>
            <p className="text-[11px] text-stone-500">배우처럼 억양을 살렸나요?</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {([2, 1, 0] as const).map((val) => {
              const isSelected = progress.selfCheck[2] === val;
              const emoji = val === 2 ? '😀' : val === 1 ? '🙂' : '😐';
              return (
                <button
                  key={val}
                  onClick={() => handleSelfCheckChange(2, val)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-transform ${
                    isSelected
                      ? 'bg-emerald-100 ring-2 ring-emerald-600 scale-110'
                      : 'bg-stone-100 hover:bg-stone-200'
                  }`}
                  title={val === 2 ? 'Great' : val === 1 ? 'Okay' : 'Needs work'}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 9. Word Check (Optional via Web Speech API) */}
      {isSpeechRecognitionSupported && (
        <div className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-2xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-800 uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Word Check (Web Speech) / 발음 단어 확인</span>
            </span>
            <span className="text-[10px] text-stone-400">Chrome 지원</span>
          </div>

          <p className="text-[11px] text-stone-500">
            버튼을 누르고 문장을 영어로 말하면 인식된 단어 순서를 확인해 드립니다 (점수가 아닌 학습 참고용 힌트입니다).
          </p>

          <button
            onClick={handleRunWordCheck}
            disabled={isSpeechChecking}
            className={`min-h-[46px] rounded-xl flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold border transition-all ${
              isSpeechChecking
                ? 'bg-amber-50 border-amber-300 text-amber-800 animate-pulse'
                : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-800'
            }`}
          >
            <Mic className="w-4 h-4 text-emerald-700" />
            <span>
              {isSpeechChecking ? 'Listening... 말씀해 주세요' : 'Check My Words / 발음 단어 인식하기'}
            </span>
          </button>

          {speechError && (
            <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg">
              {speechError}
            </p>
          )}

          {speechResult && (
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex flex-col gap-2">
              <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  You said {speechResult.matchedCount} of {speechResult.totalCount} words.
                </span>
              </div>

              {/* Matched words in green, missed words in gray with underline */}
              <div className="text-sm font-medium leading-relaxed bg-white p-2.5 rounded-lg border border-stone-100 flex flex-wrap gap-1.5">
                {speechResult.words.map((item, idx) => (
                  <span
                    key={idx}
                    className={
                      item.matched
                        ? 'text-emerald-700 font-bold bg-emerald-50 px-1 rounded'
                        : 'text-stone-400 underline decoration-stone-300 decoration-2 px-1'
                    }
                  >
                    {item.word}
                  </span>
                ))}
              </div>

              <p className="text-[11px] text-stone-500 italic">
                Recognized: &ldquo;{speechResult.transcript}&rdquo;
              </p>
            </div>
          )}
        </div>
      )}

      {/* 10. Next / Finish Button */}
      <div className="pt-2">
        <button
          onClick={onNext}
          className="w-full min-h-[50px] rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-xs transition-colors"
        >
          <span>
            {index === totalSentences - 1 ? 'Finish Practice / 결과 보기' : 'Next Sentence ▶ / 다음 문장'}
          </span>
        </button>
      </div>
    </div>
  );
};
