import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useProgress } from '../hooks/useProgress';
import { BLOCKS, getBlock } from '../lib/data';
import { buildPlan } from '../lib/studyPlan';
import { diffDaysISO, todayISO } from '../lib/dateUtils';
import type { DayMode, PlanDay } from '../types/types';

const MODE_LABEL: Record<DayMode, string> = {
  aprender: 'Estudio',
  test: 'Test',
  flashcards: 'Repaso',
  repaso: 'Falladas',
  simulacro: 'Simulacro',
  descanso: 'Descanso',
};

function modeRoute(d: PlanDay): string {
  switch (d.mode) {
    case 'aprender':
      return d.blockIds[0] ? `/aprender/${d.blockIds[0]}` : '/practica';
    case 'test':
      return '/practica';
    case 'flashcards':
      return '/practica?modo=pendientes';
    case 'repaso':
      return '/practica?modo=falladas';
    case 'simulacro':
      return '/simulacro';
    default:
      return '/';
  }
}

export default function Plan() {
  const { meta } = useProgress();
  const plan = useMemo(() => buildPlan(BLOCKS), []);
  const currentDay = Math.min(30, Math.max(1, diffDaysISO(meta.startDate, todayISO()) + 1));

  return (
    <div className="pt-6">
      <h1 className="font-serif text-3xl">Plan</h1>
      <p className="text-sm text-stone-500 mt-1">30 días hasta el examen</p>

      <ol className="mt-10 space-y-1">
        {plan.map((d) => {
          const isToday = d.day === currentDay;
          const isPast = d.day < currentDay;
          const blockNames = d.blockIds.map((id) => getBlock(id)?.name).filter(Boolean).join(' · ');
          return (
            <li key={d.day}>
              <Link
                to={modeRoute(d)}
                className={`flex items-baseline gap-4 py-3 border-b border-stone-100 ${isPast ? 'text-stone-300' : isToday ? 'text-stone-900' : 'text-stone-700'}`}
              >
                <span className="font-serif text-2xl tabular w-10 shrink-0">{d.day}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.15em] text-stone-400">
                    {MODE_LABEL[d.mode]}
                    {d.minutes > 0 && <span className="ml-2 tabular">{d.minutes}m</span>}
                  </p>
                  <p className="text-sm mt-0.5 truncate">{blockNames || d.description}</p>
                </div>
                {isToday && <span className="text-xs text-amber-700 shrink-0">hoy</span>}
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
