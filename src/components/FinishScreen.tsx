import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, ArrowRight, CheckCircle2, AlertCircle, Headphones, BookOpen } from 'lucide-react';
import { Sentence, SentenceProgress } from '../types';
import { EDUCATIONAL_CREDIT_LINE } from '../constants/initialData';

interface FinishScreenProps {
  sentences: Sentence[];
  progressMap: Record<number, SentenceProgress>;
  onPracticeSentence: (index: number) => void;
  onGoToStart: () => void;
  onGoToList: () => void;
  onGoToSummary?: () => void;
}

export const FinishScreen: React.FC<FinishScreenProps> = ({
  sentences,
  progressMap,
  onPracticeSentence,
  onGoToStart,
  onGoToList,
  onGoToSummary,
}) => {
  // Fire celebratory confetti on mount
  useEffect(() => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#047857', '#059669', '#d97706', '#f59e0b', '#78350f'],
      });
    } catch (e) {
      // Ignore if canvas is not available
    }
  }, []);

  // Compute statistics
  const totalSentences = sentences.length;
  let completedCount = 0;
  let totalRecordings = 0;
  let totalPlays = 0;

  // Sentences where learner selected 😐 (rating 0) on any self-check question
  const needsPracticeSentences: { sentence: Sentence; index: number }[] = [];

  sentences.forEach((sentence, idx) => {
    const prog = progressMap[sentence.id];
    if (prog) {
      if (prog.status === 'done' || prog.status === 'practiced') {
        completedCount++;
      }
      totalRecordings += prog.recordings || 0;
      totalPlays += prog.plays || 0;

      // Has 😐 in any of the 3 self check questions
      if (prog.selfCheck && prog.selfCheck.includes(0)) {
        needsPracticeSentences.push({ sentence, index: idx });
      }
    }
  });

  return (
    <div className="flex flex-col gap-5 pb-10 animate-fadeIn">
      {/* Celebration Header */}
      <div className="bg-white rounded-3xl p-6 text-center border border-stone-200/90 shadow-xs flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3 shadow-inner">
          <Trophy className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-bold text-stone-900 font-display">
          Great Job! / 쉐도잉 완료!
        </h1>
        <p className="text-xs text-stone-600 mt-1 max-w-xs leading-relaxed">
          노팅힐 서점 씬 쉐도잉 연습을 멋지게 마쳤습니다. 영화 대사의 리듬과 억양을 자연스럽게 체득하는 훌륭한 첫걸음입니다.
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 w-full mt-5 pt-4 border-t border-stone-100">
          <div className="flex flex-col items-center p-2 rounded-xl bg-stone-50">
            <span className="text-lg font-bold font-mono text-emerald-800">
              {completedCount} / {totalSentences}
            </span>
            <span className="text-[10px] text-stone-500 mt-0.5">완료 문장</span>
          </div>

          <div className="flex flex-col items-center p-2 rounded-xl bg-stone-50">
            <span className="text-lg font-bold font-mono text-amber-800">
              {totalRecordings}
            </span>
            <span className="text-[10px] text-stone-500 mt-0.5">총 녹음 횟수</span>
          </div>

          <div className="flex flex-col items-center p-2 rounded-xl bg-stone-50">
            <span className="text-lg font-bold font-mono text-stone-800">
              {totalPlays}
            </span>
            <span className="text-[10px] text-stone-500 mt-0.5">클립 재생</span>
          </div>
        </div>
      </div>

      {/* Review Sentences marked 😐 (Needs Practice) */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>Sentences for Further Practice / 다시 연습할 문장</span>
          </div>
          <span className="text-[11px] font-mono text-stone-500">
            {needsPracticeSentences.length}개
          </span>
        </div>

        {needsPracticeSentences.length === 0 ? (
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/60 text-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 mx-auto mb-1" />
            <p className="text-xs font-semibold text-emerald-900">
              모든 문장을 자신감 있게 완수했습니다!
            </p>
            <p className="text-[11px] text-emerald-700 mt-0.5">
              스스로 점검한 항목 중 아쉬움(😐)으로 표시된 문장이 없습니다.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] text-stone-500 mb-1">
              스스로 속도, 강세, 억양 점검에서 😐로 체크했던 문장들입니다. 바로 다시 연습해 보세요.
            </p>
            {needsPracticeSentences.map(({ sentence, index }) => (
              <div
                key={sentence.id}
                className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-stone-500 uppercase">
                      {sentence.speaker}
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      #{index + 1}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-stone-900 truncate mt-0.5">
                    {sentence.text}
                  </p>
                </div>

                <button
                  onClick={() => onPracticeSentence(index)}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Practice again</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col gap-2.5">
        {onGoToSummary && (
          <button
            onClick={onGoToSummary}
            className="w-full min-h-[50px] rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <span>View Study Summary / 학습 기록 요약 보기</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={onGoToList}
          className="w-full min-h-[46px] rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          <span>View Sentence List / 문장 목록 전체 보기</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={onGoToStart}
          className="w-full min-h-[46px] rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
          <span>Return to Start / 처음 화면으로</span>
        </button>
      </div>

      {/* Mandatory Finish Screen Educational Credit Line */}
      <div className="pt-4 border-t border-stone-200/60 text-center">
        <p className="text-[13px] text-stone-500 leading-relaxed font-normal select-text">
          {EDUCATIONAL_CREDIT_LINE}
        </p>
      </div>
    </div>
  );
};
