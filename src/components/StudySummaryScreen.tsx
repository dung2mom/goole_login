import React, { useEffect, useState } from 'react';
import { Sentence, SentenceProgress, UserActivityLog, UserStudySummary } from '../types';
import { fetchUserActivityData } from '../services/activityService';
import { useAuth } from '../context/AuthContext';
import {
  Headphones,
  Mic,
  Award,
  Clock,
  ArrowLeft,
  Play,
  RotateCcw,
  Sparkles,
  TrendingUp,
  LogIn,
  CheckCircle2,
} from 'lucide-react';

interface StudySummaryScreenProps {
  sentences: Sentence[];
  progressMap: Record<number, SentenceProgress>;
  onGoBack: () => void;
  onPracticeSentence: (index: number) => void;
  onGoToList: () => void;
  onOpenLogin: () => void;
}

export const StudySummaryScreen: React.FC<StudySummaryScreenProps> = ({
  sentences,
  progressMap,
  onGoBack,
  onPracticeSentence,
  onGoToList,
  onOpenLogin,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [remoteSummary, setRemoteSummary] = useState<UserStudySummary | null>(null);
  const [recentLogs, setRecentLogs] = useState<UserActivityLog[]>([]);

  // Load latest activity data from Supabase
  const loadData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const data = await fetchUserActivityData(user.id);
    setRemoteSummary(data.summary);
    setRecentLogs(data.recentLogs);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Compute local fallback/realtime metrics from progressMap
  const totalLocalListen = sentences.reduce(
    (acc, s) => acc + (progressMap[s.id]?.plays || 0),
    0
  );
  const totalLocalShadowing = sentences.reduce(
    (acc, s) => acc + (progressMap[s.id]?.recordings || 0),
    0
  );
  const completedSentences = sentences.filter(
    (s) => progressMap[s.id]?.status === 'done'
  ).length;
  const progressPercent =
    sentences.length > 0 ? Math.round((completedSentences / sentences.length) * 100) : 0;

  // Prefer remote stored numbers if available, else local
  const displayListen = remoteSummary?.total_listen_count ?? totalLocalListen;
  const displayShadowing = remoteSummary?.total_shadowing_count ?? totalLocalShadowing;
  const displayCompleted = remoteSummary?.completed_sentences ?? completedSentences;
  const displayPercent = remoteSummary?.progress_percent ?? progressPercent;

  // Format relative timestamp
  const formatTime = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('ko-KR', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getActivityTypeLabel = (type: string) => {
    switch (type) {
      case 'listen':
        return { label: '듣기 훈련', icon: Headphones, color: 'text-sky-600 bg-sky-50 border-sky-200' };
      case 'shadowing':
        return { label: '쉐도잉 녹음', icon: Mic, color: 'text-amber-600 bg-amber-50 border-amber-200' };
      case 'self_check':
        return { label: '자가 진단', icon: Sparkles, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
      case 'complete':
        return { label: '학습 완료', icon: CheckCircle2, color: 'text-purple-600 bg-purple-50 border-purple-200' };
      default:
        return { label: '학습 활동', icon: Clock, color: 'text-stone-600 bg-stone-50 border-stone-200' };
    }
  };

  return (
    <div className="flex flex-col gap-4 py-2 pb-10 animate-fadeIn">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onGoBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors py-1 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>뒤로가기</span>
        </button>
        <div className="flex items-center gap-2">
          {user && (
            <button
              onClick={loadData}
              title="새로고침"
              className="p-1.5 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-200/50 transition-colors cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
          <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full">
            Supabase 실시간 동기화
          </span>
        </div>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900 font-display tracking-tight flex items-center gap-2">
          <span>나의 학습 활동 기록</span>
          <TrendingUp className="w-5 h-5 text-emerald-600" />
        </h1>
        <p className="text-xs text-stone-600 mt-1">
          Notting Hill 명장면 쉐도잉 누적 횟수 및 실시간 Supabase 저장 기록입니다.
        </p>
      </div>

      {/* Login Alert Banner if guest */}
      {!user && (
        <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
            <LogIn className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-amber-900">게스트 모드로 진행 중입니다</h4>
            <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
              Google 로그인하시면 모든 듣기·쉐도잉 학습 기록과 타임스탬프가 Supabase 클라우드에 영구 저장됩니다.
            </p>
            <button
              onClick={onOpenLogin}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Google 계정으로 로그인
            </button>
          </div>
        </div>
      )}

      {/* Key Metric 4-Card Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Card 1: Listening Count */}
        <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-medium">총 듣기 학습</span>
            <div className="w-7 h-7 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
              <Headphones className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold font-display text-stone-900 tracking-tight">
              {displayListen}
              <span className="text-xs font-normal text-stone-500 ml-1">회</span>
            </div>
            <p className="text-[10px] text-stone-500 mt-0.5">원어민 발음 반복 청취</p>
          </div>
        </div>

        {/* Card 2: Shadowing Count */}
        <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-medium">총 쉐도잉 횟수</span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Mic className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold font-display text-stone-900 tracking-tight">
              {displayShadowing}
              <span className="text-xs font-normal text-stone-500 ml-1">회</span>
            </div>
            <p className="text-[10px] text-stone-500 mt-0.5">음성 녹음 및 낭독 연습</p>
          </div>
        </div>

        {/* Card 3: Completed Sentences */}
        <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-medium">학습 완료 문장</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold font-display text-stone-900 tracking-tight">
              {displayCompleted}
              <span className="text-xs font-normal text-stone-500 ml-1">/ {sentences.length}</span>
            </div>
            <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
              진도율 {displayPercent}%
            </p>
          </div>
        </div>

        {/* Card 4: Last Studied Timestamp */}
        <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-medium">최근 학습 시각</span>
            <div className="w-7 h-7 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xs font-semibold text-stone-800 tracking-tight truncate">
              {remoteSummary?.last_studied_at
                ? formatTime(remoteSummary.last_studied_at)
                : '오늘 학습 중'}
            </div>
            <p className="text-[10px] text-stone-500 mt-0.5">Supabase Timestamp 기록</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-2xl border border-stone-200/80 shadow-xs">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-semibold text-stone-800">전체 명장면 쉐도잉 마스터 현황</span>
          <span className="font-bold text-emerald-700">{displayPercent}%</span>
        </div>
        <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, displayPercent)}%` }}
          />
        </div>
      </div>

      {/* Per-Sentence Breakdown Table */}
      <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-2xl border border-stone-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-stone-900 tracking-tight">
            문장별 상세 듣기 / 쉐도잉 횟수
          </h3>
          <span className="text-[11px] text-stone-500">{sentences.length}개 대사</span>
        </div>

        <div className="divide-y divide-stone-100 max-h-[280px] overflow-y-auto pr-1">
          {sentences.map((sentence, idx) => {
            const p = progressMap[sentence.id];
            const listenCount = p?.plays || 0;
            const shadowCount = p?.recordings || 0;
            const isDone = p?.status === 'done';

            return (
              <div
                key={sentence.id}
                className="py-2.5 flex items-center justify-between gap-2 hover:bg-stone-50/60 rounded-lg px-1 transition-colors"
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <span className="text-[11px] font-bold text-stone-400 w-4 shrink-0 mt-0.5">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded">
                        {sentence.speaker}
                      </span>
                      {isDone && (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/70 px-1 py-0.2 rounded">
                          완료
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-800 font-medium truncate mt-0.5">
                      {sentence.text}
                    </p>
                  </div>
                </div>

                {/* Counts badges */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-800 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-md"
                    title="듣기 횟수"
                  >
                    <Headphones className="w-3 h-3 text-sky-600" />
                    <span>{listenCount}</span>
                  </span>
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md"
                    title="쉐도잉 녹음 횟수"
                  >
                    <Mic className="w-3 h-3 text-amber-600" />
                    <span>{shadowCount}</span>
                  </span>
                  <button
                    onClick={() => onPracticeSentence(idx)}
                    className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                    title="이 문장 학습하기"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Supabase Activity Timestamp Log (최근 활동 기록) */}
      <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-2xl border border-stone-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-stone-600" />
            <h3 className="text-xs font-bold text-stone-900 tracking-tight">
              실시간 활동 기록 (타임스탬프)
            </h3>
          </div>
          <span className="text-[10px] text-stone-500">최근 20건</span>
        </div>

        {loading ? (
          <div className="py-6 text-center text-xs text-stone-400">
            기록을 불러오는 중입니다...
          </div>
        ) : recentLogs.length > 0 ? (
          <div className="divide-y divide-stone-100 max-h-[220px] overflow-y-auto pr-1">
            {recentLogs.map((log) => {
              const info = getActivityTypeLabel(log.activity_type);
              const Icon = info.icon;
              return (
                <div key={log.id} className="py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${info.color}`}
                    >
                      <Icon className="w-2.5 h-2.5" />
                      <span>{info.label}</span>
                    </span>
                    <span className="text-stone-700 font-medium text-[11px]">
                      문장 #{log.sentence_id}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-stone-400 text-[10px]">
                    <span>
                      🎧 {log.listen_count}회 · 🎙️ {log.shadowing_count}회
                    </span>
                    <span className="font-mono text-stone-500">{formatTime(log.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-xs text-stone-500">
              {user
                ? '아직 기록된 활동이 없습니다. 문장을 듣거나 쉐도잉해보세요!'
                : '로그인 후 학습하시면 실시간 타임스탬프 기록이 이곳에 저장됩니다.'}
            </p>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onGoToList}
          className="flex-1 min-h-[46px] rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold transition-colors cursor-pointer"
        >
          문장 목록으로 이동
        </button>
        <button
          onClick={() => onPracticeSentence(0)}
          className="flex-1 min-h-[46px] rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>쉐도잉 학습 시작</span>
        </button>
      </div>
    </div>
  );
};
