import { useCallback, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { Progress, ProgressEntry, Meta } from '../types/types';
import { todayISO } from '../lib/dateUtils';
import { applyAnswer, applyRating, emptyEntry, type Rating } from '../lib/spacedRepetition';

const PROGRESS_KEY = 'osakidetza-progress';
const META_KEY = 'osakidetza-meta';

export function useProgress() {
  const [progress, setProgress] = useLocalStorage<Progress>(PROGRESS_KEY, {});
  const [meta, setMeta] = useLocalStorage<Meta>(META_KEY, {
    startDate: todayISO(),
    studyDays: [],
    simulacros: [],
  });

  const get = useCallback(
    (id: number): ProgressEntry => progress[id] ?? emptyEntry(),
    [progress],
  );

  const update = useCallback(
    (id: number, updater: (prev: ProgressEntry) => ProgressEntry) => {
      setProgress((p) => {
        const prev = p[id] ?? emptyEntry();
        return { ...p, [id]: updater(prev) };
      });
    },
    [setProgress],
  );

  const recordAnswer = useCallback(
    (id: number, isCorrect: boolean) => {
      update(id, (prev) => applyAnswer(prev, isCorrect));
      const today = todayISO();
      setMeta((m) => (m.studyDays.includes(today) ? m : { ...m, studyDays: [...m.studyDays, today] }));
    },
    [update, setMeta],
  );

  const recordRating = useCallback(
    (id: number, rating: Rating) => {
      update(id, (prev) => applyRating(prev, rating));
      const today = todayISO();
      setMeta((m) => (m.studyDays.includes(today) ? m : { ...m, studyDays: [...m.studyDays, today] }));
    },
    [update, setMeta],
  );

  const toggleBookmark = useCallback(
    (id: number) => {
      update(id, (prev) => ({ ...prev, bookmarked: !prev.bookmarked }));
    },
    [update],
  );

  const reset = useCallback(() => {
    setProgress({});
    setMeta({ startDate: todayISO(), studyDays: [], simulacros: [] });
  }, [setProgress, setMeta]);

  const stats = useMemo(() => {
    const entries = Object.values(progress);
    const totalSeen = entries.reduce((s, e) => s + e.seen, 0);
    const totalCorrect = entries.reduce((s, e) => s + e.correct, 0);
    const totalWrong = entries.reduce((s, e) => s + e.wrong, 0);
    const wrongPending = entries.filter((e) => e.seen > 0 && !e.lastCorrect).length;
    return {
      seenQuestions: entries.filter((e) => e.seen > 0).length,
      totalSeen,
      totalCorrect,
      totalWrong,
      wrongPending,
      pctCorrect: totalSeen > 0 ? Math.round((totalCorrect / totalSeen) * 100) : 0,
    };
  }, [progress]);

  return {
    progress,
    setProgress,
    meta,
    setMeta,
    get,
    update,
    recordAnswer,
    recordRating,
    toggleBookmark,
    reset,
    stats,
  };
}
