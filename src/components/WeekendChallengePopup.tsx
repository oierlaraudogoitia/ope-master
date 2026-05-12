import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const TOTAL_QUESTIONS = 650;
const COUNT_OPTIONS = [10, 20, 50, 100];
const CAP_PRESETS = [50, 100, 200, 300, 450, 650];
const STORAGE_KEY = 'range-test-prefs';

interface Prefs {
  cap: number;
  count: number;
}

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (typeof p.cap === 'number' && typeof p.count === 'number') {
        return {
          cap: Math.min(TOTAL_QUESTIONS, Math.max(10, p.cap)),
          count: COUNT_OPTIONS.includes(p.count) ? p.count : 50,
        };
      }
    }
  } catch {
    // ignore parse errors
  }
  return { cap: 200, count: 50 };
}

export default function WeekendChallengePopup({ onClose }: Props) {
  const navigate = useNavigate();
  const initial = loadPrefs();
  const [count, setCount] = useState<number>(initial.count);
  const [cap, setCap] = useState<number>(initial.cap);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const effectiveCap = Math.max(cap, count);

  const start = () => {
    const prefs: Prefs = { cap: effectiveCap, count };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // ignore quota errors
    }
    onClose();
    navigate(`/practica?modo=rango&hasta=${effectiveCap}&n=${count}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="range-test-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-screen-sm bg-stone-50 rounded-t-3xl sm:rounded-3xl px-7 pt-7 pb-[calc(2.5rem+env(safe-area-inset-bottom))] shadow-2xl ring-1 ring-stone-900/5 animate-popup-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-10 rounded-full bg-stone-300 mx-auto -mt-1 mb-4 sm:hidden" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>

        <p className="text-xs uppercase tracking-[0.2em] text-stone-400 mt-2">
          Test personalizado
        </p>
        <h2
          id="range-test-title"
          className="font-serif text-3xl mt-3 leading-tight text-stone-900"
        >
          Elige <em className="italic font-normal">cuántas</em> y hasta dónde
        </h2>

        {/* Cantidad */}
        <div className="mt-7">
          <p className="text-xs uppercase tracking-[0.15em] text-stone-500">Cantidad</p>
          <div className="mt-3 flex gap-2">
            {COUNT_OPTIONS.map((n) => {
              const active = n === count;
              return (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={
                    'flex-1 rounded-full py-2.5 font-serif text-base transition-colors ' +
                    (active
                      ? 'bg-stone-900 text-stone-50'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200')
                  }
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>

        {/* Rango */}
        <div className="mt-7">
          <div className="flex items-baseline justify-between">
            <p className="text-xs uppercase tracking-[0.15em] text-stone-500">Hasta la pregunta</p>
            <p className="text-sm text-stone-400 tabular">
              <span className="font-serif italic text-2xl text-stone-900 mr-1">{effectiveCap}</span>
              / {TOTAL_QUESTIONS}
            </p>
          </div>
          <input
            type="range"
            min={10}
            max={TOTAL_QUESTIONS}
            step={10}
            value={effectiveCap}
            onChange={(e) => setCap(Number(e.target.value))}
            className="mt-3 w-full accent-stone-900"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {CAP_PRESETS.map((p) => {
              const active = effectiveCap === p;
              return (
                <button
                  key={p}
                  onClick={() => setCap(p)}
                  className={
                    'rounded-full px-3.5 py-1.5 text-sm transition-colors ' +
                    (active
                      ? 'bg-stone-900 text-stone-50'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200')
                  }
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={start}
          className="mt-8 w-full bg-stone-900 text-stone-50 rounded-full py-4 font-serif text-lg active:scale-[0.98] transition-transform"
        >
          Empezar test
        </button>
      </div>
    </div>
  );
}
