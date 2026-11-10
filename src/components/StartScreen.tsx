import { Film, PlayCircle, Edit3, Sparkles, BookOpen, ExternalLink, Headphones } from 'lucide-react';
import { Sentence } from '../types';
import { SAMPLE_NOTTING_HILL_SENTENCES } from '../constants/initialData';

interface StartScreenProps {
  sentences: Sentence[];
  currentUser?: any;
  onStartPractice: () => void;
  onGoToEdit: () => void;
  onLoadSamples: () => void;
  onOpenLogin?: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  sentences,
  onStartPractice,
  onGoToEdit,
  onLoadSamples,
}) => {
  return (
    <div className="flex flex-col gap-5 pb-8 animate-fadeIn">
      {/* Hero Header */}
      <div className="relative text-center pt-3 pb-1">
        <div className="inline-flex items-center gap-1.5 text-xs text-emerald-800 font-semibold tracking-wider uppercase mb-1.5">
          <Film className="w-3.5 h-3.5" />
          <span>Movie-Clip Shadowing</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 font-display">
          Scene Shadow: Notting Hill
        </h1>
        <p className="mt-1.5 text-stone-600 text-sm font-medium">
          Listen. Copy. Speak at the same time.
        </p>
        <p className="text-xs text-stone-500">
          듣고, 따라하고, 동시에 말하는 쉐도잉 훈련
        </p>
      </div>

      {/* Movie Scene Brief Card */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200/60">
          <BookOpen className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-amber-900">
            The Travel Bookshop Scene (0:24 – 1:15)
          </div>
          <div className="text-xs text-stone-600 truncate mt-0.5">
            William Thacker &amp; Anna Scott&apos;s first meeting
          </div>
          <div className="text-[11px] text-stone-500">
            노팅힐 런던 서점에서의 운명적인 첫 만남 대사
          </div>
        </div>
      </div>

      {/* "What is Shadowing?" Card */}
      <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80">
        <div className="flex items-center gap-2 mb-2.5 text-stone-800 font-semibold text-sm">
          <Headphones className="w-4 h-4 text-emerald-700" />
          <span>What is Shadowing? / 쉐도잉이란?</span>
        </div>
        <p className="text-xs text-stone-600 leading-relaxed mb-3">
          Shadowing means listening to the dialogue in the scene and repeating the sentence almost at the same time, copying rhythm, stress, and intonation.
        </p>
        <ul className="space-y-2 text-xs text-stone-700">
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
              1
            </span>
            <div>
              <span className="font-semibold text-stone-900">Listen carefully</span>
              <span className="text-stone-500 block text-[11px]">배우의 자연스러운 발화 속도와 대사를 귀로 파악합니다.</span>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
              2
            </span>
            <div>
              <span className="font-semibold text-stone-900">Copy rhythm &amp; stress</span>
              <span className="text-stone-500 block text-[11px]">단어별 강세와 오르내리는 억양 곡선을 흉내 냅니다.</span>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
              3
            </span>
            <div>
              <span className="font-semibold text-stone-900">Speak at the same time</span>
              <span className="text-stone-500 block text-[11px]">배우의 발화에 맞춰 그림자처럼 겹쳐 소리 내어 말해 봅니다.</span>
            </div>
          </li>
        </ul>
      </div>

      {/* Sentence count status & Primary Action */}
      <div className="flex flex-col gap-2.5">
        {sentences.length === 0 ? (
          <div className="bg-amber-50/80 rounded-xl p-3.5 border border-amber-200 text-center">
            <p className="text-xs text-amber-900 font-semibold mb-1">
              No sentences yet. / 아직 등록된 문장이 없습니다.
            </p>
            <p className="text-[11px] text-amber-800 mb-2.5">
              스크립트의 인물 대사 13문장을 불러오거나 [문장 편집]에서 직접 추가할 수 있습니다.
            </p>
            <button
              onClick={onLoadSamples}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-medium transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Screenplay Dialogues / 대본 대사 불러오기</span>
            </button>
          </div>
        ) : (
          <div className="text-center text-xs text-stone-600">
            영화 원본 대본 기반 총 <span className="font-semibold text-emerald-800">{sentences.length}개</span>의 쉐도잉 문장이 준비되어 있습니다.
          </div>
        )}

        <button
          onClick={onStartPractice}
          disabled={sentences.length === 0}
          className={`w-full min-h-[52px] rounded-xl flex flex-col items-center justify-center px-4 py-2 font-semibold text-base transition-all shadow-sm ${
            sentences.length > 0
              ? 'bg-emerald-700 hover:bg-emerald-800 text-white active:scale-[0.99] cursor-pointer'
              : 'bg-stone-300 text-stone-500 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center gap-2">
            <PlayCircle className="w-5 h-5" />
            <span>Start Practice</span>
          </div>
          <span className="text-[11px] font-normal opacity-90">연습 시작</span>
        </button>

        <button
          onClick={onGoToEdit}
          className="w-full min-h-[46px] rounded-xl flex items-center justify-center gap-1.5 px-4 py-2 text-stone-700 hover:text-stone-900 hover:bg-stone-100/70 text-xs font-semibold border border-stone-200 transition-colors"
        >
          <Edit3 className="w-4 h-4 text-stone-500" />
          <span>Edit Sentences / 문장 편집</span>
        </button>
      </div>

      {/* Mandatory Educational Use & Source Card */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/90 text-stone-700 shadow-xs">
        <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <span>Educational Use &amp; Source / 교육용 고지 및 출처</span>
        </h2>

        <div className="text-xs space-y-2 leading-relaxed text-stone-600">
          <p className="font-medium text-stone-800">
            Educational use only / 교육 목적 전용
          </p>
          <p className="text-[11px]">
            This app was made <strong>only for non-commercial English learning</strong> in the university course <em>AI and English Language Education</em> (ENG3088, Sungkyunkwan University). The film clip is used <strong>only to practice listening and speaking (shadowing)</strong>. It is not sold, shared for profit, downloaded, or edited. All rights to the film belong to its copyright holders.
          </p>
          <p className="text-[11px] text-stone-500 border-t border-stone-100 pt-2">
            이 앱은 성균관대학교 「인공지능과 영어교육」(ENG3088) 수업의 <strong>비영리 영어 학습 목적으로만</strong> 제작되었습니다. 영화 장면은 듣기·말하기(쉐도잉) 연습에만 사용하며, 판매·영리적 배포·다운로드·편집을 하지 않습니다. 영화의 모든 권리는 저작권자에게 있습니다.
          </p>

          <div className="bg-stone-50 rounded-xl p-3 border border-stone-200/70 text-[11px] space-y-1.5 mt-2">
            <div>
              <span className="font-semibold text-stone-800">Film source / 영화 출처:</span>
              <ul className="pl-3.5 list-disc mt-0.5 space-y-0.5 text-stone-600">
                <li>Title: <em>Notting Hill</em> (노팅힐), 1999</li>
                <li>Director: Roger Michell · Screenplay: Richard Curtis</li>
                <li>Production: Working Title Films · Distribution: Universal Pictures</li>
                <li>Scene: William and Anna&apos;s first meeting in the bookshop (안나와의 첫만남)</li>
              </ul>
            </div>

            <div className="pt-1 border-t border-stone-200/50">
              <span className="font-semibold text-stone-800">Video source / 영상 출처:</span>
              <ul className="pl-3.5 list-disc mt-0.5 space-y-0.5 text-stone-600">
                <li>YouTube: &ldquo;노팅힐 (Notting Hill) | 안나와의 첫만남&rdquo;</li>
                <li>Channel: LUPO · Section used: 0:24 – 1:15</li>
                <li>
                  <a
                    href="https://www.youtube.com/watch?v=5NAboW2SZ3s"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-800 hover:text-emerald-900 underline font-medium"
                  >
                    <span>Watch clip on YouTube (5NAboW2SZ3s)</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              </ul>
            </div>

            <p className="text-[10px] text-stone-500 italic pt-0.5">
              Played through YouTube&apos;s official embedded player (IFrame Player API); views count on YouTube and the original video is not copied.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
