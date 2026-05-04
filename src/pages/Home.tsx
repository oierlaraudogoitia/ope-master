import { Link } from 'react-router-dom';
import { useProgress } from '../hooks/useProgress';
import { QUESTIONS } from '../lib/data';
import { useMemo } from 'react';
import { diffDaysISO, todayISO } from '../lib/dateUtils';

export default function Home() {
  const { meta, progress, stats } = useProgress();
  const dayNum = Math.min(30, Math.max(1, diffDaysISO(meta.startDate, todayISO()) + 1));

  const wrongCount = useMemo(
    () => QUESTIONS.filter((q) => progress[q.id]?.seen && !progress[q.id]?.lastCorrect).length,
    [progress],
  );

  const streak = useMemo(() => {
    let s = 0;
    let day = todayISO();
    while (meta.studyDays.includes(day)) {
      s += 1;
      const [y, m, d] = day.split('-').map(Number);
      const prev = new Date(y, m - 1, d);
      prev.setDate(prev.getDate() - 1);
      day = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`;
    }
    return s;
  }, [meta.studyDays]);

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col">
      <div className="pt-12">
        <p className="text-xs uppercase tracking-[0.2em] text-stone-400">
          Día {dayNum} <span className="mx-1">·</span> 30
        </p>
        <h1 className="font-serif text-5xl mt-3 leading-none">
          <em className="italic font-normal text-stone-900">Practicar</em>
        </h1>
      </div>

      <div className="flex-1 flex flex-col justify-end pb-16">
        <Link
          to="/practica"
          className="block w-full text-center bg-stone-900 text-stone-50 rounded-full py-5 font-serif text-xl active:scale-[0.98] transition-transform"
        >
          Empezar
        </Link>

        <div className="mt-8 flex justify-center gap-6 text-sm text-stone-500">
          {wrongCount > 0 && (
            <Link to="/practica?modo=falladas" className="underline underline-offset-4 decoration-stone-300">
              {wrongCount} {wrongCount === 1 ? 'fallada' : 'falladas'}
            </Link>
          )}
          <Link to="/simulacro" className="underline underline-offset-4 decoration-stone-300">
            Simulacro
          </Link>
        </div>

        <p className="mt-12 text-center text-xs text-stone-400 tabular">
          {stats.pctCorrect}% acierto
          {streak > 0 && <span className="ml-3">{streak} {streak === 1 ? 'día' : 'días'} seguidos</span>}
        </p>
      </div>
    </div>
  );
}
