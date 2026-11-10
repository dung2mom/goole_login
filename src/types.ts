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

export type ScreenType = 'start' | 'list' | 'practice' | 'edit' | 'finish' | 'auth' | 'summary';

export interface UserActivityLog {
  id: string;
  user_id: string;
  sentence_id: number;
  activity_type: 'listen' | 'shadowing' | 'self_check' | 'complete';
  listen_count: number;
  shadowing_count: number;
  speed_check: number | null;
  stress_check: number | null;
  intonation_check: number | null;
  status: string;
  created_at: string;
}

export interface UserStudySummary {
  user_id: string;
  total_listen_count: number;
  total_shadowing_count: number;
  completed_sentences: number;
  total_sentences: number;
  progress_percent: number;
  last_studied_at: string;
}

export type StepType = 1 | 2 | 3 | 4;

export interface StepInfo {
  step: StepType;
  titleEn: string;
  titleKo: string;
  descEn: string;
  descKo: string;
  defaultTextHidden: boolean;
}
