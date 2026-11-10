import React, { useState } from 'react';
import { ArrowLeft, Play, Eye, EyeOff, Edit3, Sparkles, ChevronRight } from 'lucide-react';
import { Sentence, SentenceProgress } from '../types';
import { YouTubePlayer, YouTubePlayerHandle } from './YouTubePlayer';

interface SentenceListScreenProps {
  sentences: Sentence[];
  progressMap: Record<number, SentenceProgress>;
  playerRef: React.RefObject<YouTubePlayerHandle | null>;
  onSelectSentence: (index: number) => void;
  onGoBack: () => void;
  onGoToEdit: () => void;
  onLoadSamples: () => void;
}

export const SentenceListScreen: React.FC<SentenceListScreenProps> = ({
  sentences,
  progressMap,
  playerRef,
  onSelectSentence,
  onGoBack,
  onGoToEdit,
  onLoadSamples,
}) => {
  const [hideTextAll, setHideTextAll] = useState(false);

  // Helper for progress icon mark (☆ not started, ◐ practiced, ★ done)
  const renderProgressMark = (progress?: SentenceProgress) => {
    if (!progress || progress.status === 'new' || progress.plays === 0) {
      return (
        <span className="text-stone-400 font-mono text-sm" title="Not started">
          ☆
        </span>
      );
    }
    if (progress.status === 'done') {
      return (
        <span className="text-amber-500 font-mono text-sm font-bold" title="Completed">
          ★
        </span>
      );
    }
    return (
      <span className="text-emerald-700 font-mono text-sm font-bold" title="Practiced">
        ◐
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-4 pb-8 animate-fadeIn">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onGoBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 py-1.5 px-2.5 rounded-lg hover:bg-stone-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home / 처음으로</span>
        </button>

        <button
          onClick={onGoToEdit}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700 hover:text-stone-900 py-1.5 px-2.5 rounded-lg border border-stone-200/90 hover:bg-stone-50 transition-colors"
        >
          <Edit3 className="w-3.5 h-3.5 text-stone-500" />
          <span>Edit / 문장 편집</span>
        </button>
      </div>

      {/* Video Player (16:9) with Educational Credit Line */}
      <div className="w-full">
        <YouTubePlayer ref={playerRef} showCredit={true} />
      </div>

      {/* Section Header & View Toggle */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-base font-bold text-stone-900">
            Practice Sentences / 연습 문장 목록
          </h2>
          <p className="text-[12px] text-stone-500">
            연습할 문장을 터치하여 쉐도잉을 시작하세요.
          </p>
        </div>

        {sentences.length > 0 && (
          <button
            onClick={() => setHideTextAll(!hideTextAll)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 transition-colors"
          >
            {hideTextAll ? (
              <>
                <Eye className="w-3.5 h-3.5 text-emerald-700" />
                <span>Show Text / 자막 보기</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5 text-stone-500" />
                <span>Hide Text / 자막 숨기기</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Legend */}
      {sentences.length > 0 && (
        <div className="flex items-center justify-end gap-3 text-[11px] text-stone-500 pr-1">
          <span className="inline-flex items-center gap-1">
            <span className="text-stone-400 font-mono">☆</span> 미연습
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="text-emerald-700 font-mono font-bold">◐</span> 녹음 연습
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="text-amber-500 font-mono font-bold">★</span> 쉐도잉 완료
          </span>
        </div>
      )}

      {/* Sentence Cards List */}
      {sentences.length === 0 ? (
        <div className="bg-stone-50 rounded-2xl p-6 border border-dashed border-stone-300 text-center flex flex-col items-center justify-center gap-3">
          <p className="text-sm font-semibold text-stone-700">
            No sentences yet. Tap Edit Sentences to add some.
          </p>
          <p className="text-xs text-stone-500 max-w-xs">
            아직 추가된 문장이 없습니다. 수업 시간에 받아 적은 문장을 [문장 편집]에서 등록해 보세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 mt-1">
            <button
              onClick={onGoToEdit}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Go to Edit Sentences / 문장 편집하기
            </button>
            <button
              onClick={onLoadSamples}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Samples / 예시 대사 불러오기</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {sentences.map((sentence, index) => {
            const progress = progressMap[sentence.id];
            const isDone = progress?.status === 'done';

            return (
              <button
                key={sentence.id}
                onClick={() => onSelectSentence(index)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                  isDone
                    ? 'bg-amber-50/40 border-amber-200/80 hover:border-amber-300'
                    : 'bg-white border-stone-200/90 hover:border-emerald-600/50 shadow-2xs'
                } active:scale-[0.99] cursor-pointer`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Sentence Index Number */}
                  <span className="w-6 h-6 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {index + 1}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded ${
                          sentence.speaker.toUpperCase() === 'ANNA'
                            ? 'bg-amber-50 text-amber-900 border border-amber-200/60'
                            : sentence.speaker.toUpperCase() === 'THIEF'
                            ? 'bg-purple-50 text-purple-900 border border-purple-200/60'
                            : 'bg-emerald-50 text-emerald-900 border border-emerald-200/60'
                        }`}
                      >
                        {sentence.speaker}
                      </span>
                      <span className="text-[11px] text-stone-400 font-mono">
                        {sentence.start.toFixed(1)}s ~ {sentence.end.toFixed(1)}s
                      </span>
                    </div>

                    {hideTextAll ? (
                      <p className="text-sm text-stone-400 italic">
                        [Text hidden / 자막 숨김]
                      </p>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-stone-900 leading-snug">
                          {sentence.text}
                        </p>
                        {sentence.korean && (
                          <p className="text-xs text-stone-500 mt-0.5 truncate">
                            {sentence.korean}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Progress Mark & Arrow */}
                <div className="flex items-center gap-2 shrink-0">
                  {renderProgressMark(progress)}
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
