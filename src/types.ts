export interface Sentence {
  id: number;
  speaker: string;
  text: string;
  korean: string;
  stress: string[];
  start: number;
  end: number;
}

export type SelfCheckValue = 2 | 1 | 0 | null; // 2: Good (😀), 1: Okay (🙂), 0: Needs work (😐)

export interface SentenceProgress {
  id: number;
  plays: number;
  recordings: number;
  selfCheck: [SelfCheckValue, SelfCheckValue, SelfCheckValue]; // [speed, stress, intonation]
  status: 'new' | 'practiced' | 'done';
}

export type ScreenType = 'start' | 'list' | 'practice' | 'edit' | 'finish' | 'auth';

export type StepType = 1 | 2 | 3 | 4;

export interface StepInfo {
  step: StepType;
  titleEn: string;
  titleKo: string;
  descEn: string;
  descKo: string;
  defaultTextHidden: boolean;
}
