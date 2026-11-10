import { Sentence, SentenceProgress, StepInfo } from '../types';

export const VIDEO_ID = '5NAboW2SZ3s';
export const VIDEO_START_BOUND = 24.0;
export const VIDEO_END_BOUND = 75.0;
export const YOUTUBE_FALLBACK_URL = 'https://www.youtube.com/watch?v=5NAboW2SZ3s&t=24s';

export const EDUCATIONAL_CREDIT_LINE =
  'Clip: Notting Hill (1999), Universal Pictures / Working Title Films · via YouTube · For educational use only';

/**
 * Exact character dialogue extracted from the official screenplay (Roger Michell / Richard Curtis)
 * matching YouTube clip 5NAboW2SZ3s (0:24 – 1:15).
 * Word order and punctuation are faithfully preserved from the script.
 */
export const NOTTING_HILL_SCRIPT_SENTENCES: Sentence[] = [
  {
    id: 1,
    speaker: 'WILLIAM',
    text: 'Can I help you?',
    korean: '도와드릴까요?',
    stress: ['help', 'you'],
    start: 24.5,
    end: 26.5,
  },
  {
    id: 2,
    speaker: 'ANNA',
    text: "No, thanks. I'll just look around.",
    korean: '아니요, 괜찮아요. 그냥 좀 둘러볼게요.',
    stress: ['No', 'thanks', 'look', 'around'],
    start: 27.2,
    end: 30.5,
  },
  {
    id: 3,
    speaker: 'WILLIAM',
    text: 'Fine.',
    korean: '네, 그러세요.',
    stress: ['Fine'],
    start: 30.8,
    end: 32.5,
  },
  {
    id: 4,
    speaker: 'WILLIAM',
    text: "That book's really not good – just in case, you know, browsing turned to buying.",
    korean: '그 책은 정말 별로예요 – 혹시라도 구경하시다가 사시게 될까 봐 드리는 말씀인데요.',
    stress: ['book', 'really', 'not', 'good', 'browsing', 'buying'],
    start: 37.0,
    end: 43.2,
  },
  {
    id: 5,
    speaker: 'WILLIAM',
    text: "You'd be wasting your money.",
    korean: '돈 낭비하시는 걸 거예요.',
    stress: ['wasting', 'money'],
    start: 43.5,
    end: 46.0,
  },
  {
    id: 6,
    speaker: 'ANNA',
    text: 'Really?',
    korean: '정말요?',
    stress: ['Really'],
    start: 46.3,
    end: 47.8,
  },
  {
    id: 7,
    speaker: 'WILLIAM',
    text: 'Yes. This one though is... very good.',
    korean: '네. 하지만 이 책은... 아주 좋아요.',
    stress: ['This', 'one', 'though', 'very', 'good'],
    start: 48.0,
    end: 52.0,
  },
  {
    id: 8,
    speaker: 'WILLIAM',
    text: 'I think the man who wrote it has actually been to Turkey, which helps.',
    korean: '이 책을 쓴 사람은 실제로 터키에 가본 것 같은데, 그게 도움이 되죠.',
    stress: ['actually', 'Turkey', 'helps'],
    start: 52.5,
    end: 57.2,
  },
  {
    id: 9,
    speaker: 'WILLIAM',
    text: "There's also a very amusing incident with a kebab.",
    korean: '케밥과 관련된 아주 재미있는 일화도 나오고요.',
    stress: ['amusing', 'incident', 'kebab'],
    start: 57.5,
    end: 62.0,
  },
  {
    id: 10,
    speaker: 'ANNA',
    text: "Thanks. I'll think about it.",
    korean: '고마워요. 생각해 볼게요.',
    stress: ['Thanks', 'think', 'about'],
    start: 62.3,
    end: 65.5,
  },
  {
    id: 11,
    speaker: 'WILLIAM',
    text: 'If you could just give me a second',
    korean: '잠시만 실례해도 될까요',
    stress: ['just', 'give', 'second'],
    start: 65.8,
    end: 69.5,
  },
  {
    id: 12,
    speaker: 'WILLIAM',
    text: 'Excuse me.',
    korean: '실례합니다.',
    stress: ['Excuse', 'me'],
    start: 70.0,
    end: 72.3,
  },
  {
    id: 13,
    speaker: 'THIEF',
    text: 'Yes.',
    korean: '네.',
    stress: ['Yes'],
    start: 72.5,
    end: 74.5,
  },
];

export const SAMPLE_NOTTING_HILL_SENTENCES = NOTTING_HILL_SCRIPT_SENTENCES;

export const STEP_INFOS: StepInfo[] = [
  {
    step: 1,
    titleEn: 'Step 1 Listen',
    titleKo: '듣기',
    descEn: "Listen carefully to the actor's lines in the scene.",
    descKo: '영화 속 배우의 대사에 집중해 들어보세요.',
    defaultTextHidden: true,
  },
  {
    step: 2,
    titleEn: 'Step 2 Read',
    titleKo: '읽기',
    descEn: 'Read the sentence and check the bold stress words.',
    descKo: '문장을 눈으로 읽으며 강조 단어와 의미를 확인하세요.',
    defaultTextHidden: false,
  },
  {
    step: 3,
    titleEn: 'Step 3 Shadow',
    titleKo: '쉐도우',
    descEn: "Shadow along, copying the actor's rhythm and intonation.",
    descKo: '대사의 박자와 억양을 살려 동시에 따라 말해보세요.',
    defaultTextHidden: false,
  },
  {
    step: 4,
    titleEn: 'Step 4 Check',
    titleKo: '확인',
    descEn: 'Record your voice and check your pronunciation and intonation.',
    descKo: '내 목소리를 녹음하여 비교해보고 스스로 점검해 보세요.',
    defaultTextHidden: false,
  },
];

const STORAGE_KEY_SENTENCES = 'scene_shadow_notting_hill_screenplay_v4';
const STORAGE_KEY_PROGRESS = 'scene_shadow_notting_hill_progress_v4';

export function loadStoredSentences(): Sentence[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SENTENCES);
    if (!raw) {
      return NOTTING_HILL_SCRIPT_SENTENCES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length >= 13) {
      return parsed;
    }
    return NOTTING_HILL_SCRIPT_SENTENCES;
  } catch (e) {
    console.warn('Failed to load sentences from localStorage:', e);
    return NOTTING_HILL_SCRIPT_SENTENCES;
  }
}

export function saveStoredSentences(sentences: Sentence[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_SENTENCES, JSON.stringify(sentences));
  } catch (e) {
    console.warn('Failed to save sentences to localStorage:', e);
  }
}

export function loadStoredProgress(): Record<number, SentenceProgress> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROGRESS);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }
    return {};
  } catch (e) {
    console.warn('Failed to load progress from localStorage:', e);
    return {};
  }
}

export function saveStoredProgress(progress: Record<number, SentenceProgress>): void {
  try {
    localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(progress));
  } catch (e) {
    console.warn('Failed to save progress to localStorage:', e);
  }
}

export function createInitialProgress(id: number): SentenceProgress {
  return {
    id,
    plays: 0,
    recordings: 0,
    selfCheck: [null, null, null],
    status: 'new',
  };
}
