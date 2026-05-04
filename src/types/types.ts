export type BlockColor =
  | 'amber' | 'rose' | 'emerald' | 'sky' | 'violet' | 'teal' | 'indigo' | 'stone';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type Source = 'comun' | 'tecnico';

export interface Block {
  id: number;
  name: string;
  law: string;
  color: BlockColor;
}

export interface Question {
  id: number;
  blockId: number;
  law: string;
  source: Source;
  sourceNum: number;
  question: string;
  options: string[];
  correctIndex: number;
  impugnable: boolean;
  explanation: string;
  mnemonic: string | null;
  difficulty: Difficulty;
}

export interface QuestionsData {
  blocks: Block[];
  questions: Question[];
}

export interface ProgressEntry {
  seen: number;
  correct: number;
  wrong: number;
  lastCorrect: boolean;
  lastSeenDate: string;
  box: number;
  nextReview: string;
  bookmarked: boolean;
}

export type Progress = Record<number, ProgressEntry>;

export interface SimulacroResult {
  date: string;
  pct: number;
  size: number;
  durationMin: number;
  correct: number;
  wrong: number;
  blank: number;
}

export interface Meta {
  startDate: string;
  studyDays: string[];
  simulacros: SimulacroResult[];
}

export type DayMode = 'aprender' | 'test' | 'flashcards' | 'repaso' | 'simulacro' | 'descanso';

export interface PlanDay {
  day: number;
  mode: DayMode;
  blockIds: number[];
  description: string;
  minutes: number;
  moment: 'mañana' | 'tarde' | 'libre';
  testSize?: number;
  durationMin?: number;
}
