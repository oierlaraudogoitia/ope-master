import { useMemo, useState } from 'react';
import { BLOCKS, QUESTIONS, questionsByBlock } from '../lib/data';
import { useProgress } from '../hooks/useProgress';
import { addDaysISO, todayISO } from '../lib/dateUtils';

export default function Stats() {
  const { progress, meta, reset, stats } = useProgress();
  const [confirmReset, setConfirmReset] = useState<0 | 1 | 2>(0);

  const byBlock = useMemo(
    () =>
      BLOCKS.map((b) => {
        const qs = questionsByBlock(b.id);
        let seen = 0;
        let correct = 0;
        qs.forEach((q) => {
          const e = progress[q.id];
          if (!e) return;
          seen += e.seen;
          correct += e.correct;
        });
        return { block: b, total: qs.length, seen, pct: seen > 0 ? Math.round((correct / seen) * 100) : 0 };
      })
        .filter((r) => r.seen > 0)
        .sort((a, b) => b.seen - a.seen),
    [progress],
  );

  const heatmap = useMemo(() => {
    const today = todayISO();
    const days: { iso: string; studied: boolean }[] = [];
    for (let i = 29; i >= 0; i--) {
      const iso = addDaysISO(today, -i);
      days.push({ iso, studied: meta.studyDays.includes(iso) });
    }
    return days;
  }, [meta.studyDays]);

  const streak = useMemo(() => {
    let s = 0;
    let day = todayISO();
    while (meta.studyDays.includes(day)) {
      s += 1;
      day = addDaysISO(day, -1);
    }
    return s;
  }, [meta.studyDays]);

  return (
    <div className="pt-6 space-y-12">
      <header>
        <h1 className="font-serif text-3xl">Estadísticas</h1>
      </header>

      <section className="grid grid-cols-3 gap-3 text-center">
        <Stat value={`${stats.pctCorrect}%`} label="acierto" />
        <Stat value={stats.seenQuestions} sub={`de ${QUESTIONS.length}`} label="vistas" />
        <Stat value={streak} label={streak === 1 ? 'día' : 'días'} />
      </section>

      <section>
        <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400 mb-4">Últimos 30 días</p>
        <div className="grid grid-cols-15 gap-1" style={{ gridTemplateColumns: 'repeat(15, 1fr)' }}>
          {heatmap.map((d) => (
            <div
              key={d.iso}
              className={`aspect-square rounded-sm ${d.studied ? 'bg-stone-900' : 'bg-stone-100'}`}
            />
          ))}
        </div>
      </section>

      {byBlock.length > 0 && (
        <section>
          <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400 mb-4">Por bloque</p>
          <ul className="space-y-3">
            {byBlock.map(({ block, pct, seen }) => (
              <li key={block.id} className="flex justify-between items-baseline border-b border-stone-100 pb-2">
                <span className="text-sm text-stone-700 truncate pr-3">{block.name}</span>
                <span className="text-sm tabular text-stone-500 shrink-0">
                  {pct}% <span className="text-xs text-stone-400 ml-2">{seen}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {meta.simulacros.length > 0 && (
        <section>
          <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400 mb-4">Simulacros</p>
          <ul className="space-y-2">
            {meta.simulacros.slice().reverse().map((s, i) => (
              <li key={i} className="flex justify-between items-baseline text-sm border-b border-stone-100 pb-2">
                <span className="text-stone-500 tabular text-xs">{s.date}</span>
                <span className="text-xs text-stone-400 tabular">{s.size}p · {s.durationMin}m</span>
                <span className="font-serif tabular text-stone-900">{s.pct}%</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="pt-8">
        {confirmReset === 0 && (
          <button
            onClick={() => setConfirmReset(1)}
            className="text-xs text-stone-400 underline underline-offset-4 decoration-stone-200"
          >
            Resetear progreso
          </button>
        )}
        {confirmReset === 1 && (
          <button
            onClick={() => setConfirmReset(2)}
            className="text-xs text-red-600 underline underline-offset-4 decoration-red-200"
          >
            ¿Seguro? Esto borra todo
          </button>
        )}
        {confirmReset === 2 && (
          <div className="space-y-3">
            <p className="text-xs text-red-600">Última oportunidad.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmReset(0)} className="text-xs text-stone-500 underline underline-offset-4">
                Cancelar
              </button>
              <button
                onClick={() => {
                  reset();
                  setConfirmReset(0);
                }}
                className="text-xs text-red-600 underline underline-offset-4"
              >
                Sí, resetear
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ value, sub, label }: { value: string | number; sub?: string; label: string }) {
  return (
    <div>
      <p className="font-serif text-3xl tabular text-stone-900">
        {value}
        {sub && <span className="text-xs text-stone-400 font-sans ml-1">{sub}</span>}
      </p>
      <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400 mt-2">{label}</p>
    </div>
  );
}
