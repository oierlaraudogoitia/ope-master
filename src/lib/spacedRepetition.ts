import type { ProgressEntry } from '../types/types';
import { addDaysISO, todayISO } from './dateUtils';

// SM-2 simplificado: cajas con intervalos en días.
// 0=hoy, 1=mañana, 2=3d, 3=7d, 4=15d, 5=30d, 6=60d.
export const BOX_INTERVALS = [1, 1, 3, 7, 15, 30, 60] as const;
export const MAX_BOX = BOX_INTERVALS.length - 1;
export const MAX_FLASHCARDS_PER_DAY = 25;

export type Rating = 'hard' | 'good' | 'easy';

export function emptyEntry(): ProgressEntry {
  return {
    seen: 0,
    correct: 0,
    wrong: 0,
    lastCorrect: false,
    lastSeenDate: '',
    box: 0,
    nextReview: todayISO(),
    bookmarked: false,
  };
}

export function applyAnswer(entry: ProgressEntry, isCorrect: boolean): ProgressEntry {
  const today = todayISO();
  return {
    ...entry,
    seen: entry.seen + 1,
    correct: entry.correct + (isCorrect ? 1 : 0),
    wrong: entry.wrong + (isCorrect ? 0 : 1),
    lastCorrect: isCorrect,
    lastSeenDate: today,
  };
}

// Spaced repetition rating advances/resets the box.
export function applyRating(entry: ProgressEntry, rating: Rating): ProgressEntry {
  let nextBox = entry.box;
  if (rating === 'hard') nextBox = 0;
  else if (rating === 'good') nextBox = Math.min(MAX_BOX, entry.box + 1);
  else nextBox = Math.min(MAX_BOX, entry.box + 2);
  const today = todayISO();
  return {
    ...entry,
    box: nextBox,
    nextReview: addDaysISO(today, BOX_INTERVALS[nextBox]),
    lastSeenDate: today,
  };
}

export function dueForReview(entry: ProgressEntry, today = todayISO()): boolean {
  if (!entry.nextReview) return true;
  return entry.nextReview <= today;
}
