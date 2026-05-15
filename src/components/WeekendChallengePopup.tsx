import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const TOTAL_QUESTIONS = 650;
const COUNT_OPTIONS = [10, 20, 50, 100];
const RANGE_PRESETS: { label: string; desde: number; hasta: number }[] = [
  { label: 'Común (1–200)', desde: 1, hasta: 200 },
  { label: 'Técnico (201–650)', desde: 201, hasta: 650 },
  { label: 'Todo (1–650)', desde: 1, hasta: 650 },
];
const STORAGE_KEY = 'range-test-prefs';

interface Prefs {
  desde: number;
  hasta: number;
  count: number;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      // New shape
      if (typeof p.desde === 'number' && typeof p.hasta === 'number' && typeof p.count === 'number') {
        return {
          desde: clamp(p.desde, 1, TOTAL_QUESTIONS),
          hasta: clamp(p.hasta, 1, TOTAL_QUESTIONS),
          count: COUNT_OPTIONS.includes(p.count) ? p.count : 50,
        };
      }
      // Old shape { cap, count }
      if (typeof p.cap === 'number' && typeof p.count === 'number') {
        return {
          desde: 1,
          hasta: clamp(p.cap, 1, TOTAL_QUESTIONS),
          count: COUNT_OPTIONS.includes(p.count) ? p.count : 50,
        };
      }
    }
  } catch {
    // ignore parse errors
  }
  return { desde: 1, hasta: 200, count: 50 };
}

export default function WeekendChallengePopup({ onClose }: Props) {
  const navigate = useNavigate();
  const initial = loadPrefs();
  const [count, setCount] = useState<number>(initial.count);
  const [desde, setDesde] = useState<number>(initial.desde);
  const [hasta, setHasta] = useState<number>(initial.hasta);

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

  const setDesdeClamped = (v: number) => {
    const c = clamp(v, 1, TOTAL_QUESTIONS);
    setDesde(c);
    if (c > hasta) setHasta(c);
  };
  const setHastaClamped = (v: number) => {
    const c = clamp(v, 1, TOTAL_QUESTIONS);
    setHasta(c);
    if (c < desde) setDesde(c);
  };
  const applyPreset = (d: number, h: number) => {
    setDesde(d);
    setHasta(h);
  };

  const start = () => {
    const prefs: Prefs = { desde, hasta, count };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // ignore quota errors
    }
    onClose();
    navigate(`/practica?modo=rango&desde=${desde}&hasta=${hasta}&n=${count}`);
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
        className="relative w-full max-w-screen-sm bg-stone-50 rounded-t-3xl sm:rounded-3xl px-7 pt-7 pb-[calc(2.5rem+env(safe-area-inset-bottom))] shadow-2xl ring-1 ring-stone-900/5 animate-popup-in max-h-[92vh] overflow-y-auto"
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
          Elige <em className="italic font-normal">cuántas</em> y el tramo
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

        {/* Tramo (desde – hasta) */}
        <div className="mt-7">
          <div className="flex items-baseline justify-between">
            <p className="text-xs uppercase tracking-[0.15em] text-stone-500">Tramo</p>
            <p className="text-sm text-stone-400 tabular">
              <span className="font-serif italic text-2xl text-stone-900 mr-1">{desde}</span>
              <span className="text-stone-300">→</span>
              <span className="font-serif italic text-2xl text-stone-900 mx-1">{hasta}</span>
              <span className="text-stone-400">/ {TOTAL_QUESTIONS}</span>
            </p>
          </div>

          <div
            className="dual-range mt-4"
            style={{
              ['--fill-left' as string]: `${((desde - 1) / (TOTAL_QUESTIONS - 1)) * 100}%`,
              ['--fill-right' as string]: `${((hasta - 1) / (TOTAL_QUESTIONS - 1)) * 100}%`,
            }}
          >
            <div className="dual-track" />
            <div
              className="dual-fill"
              style={{ left: 'var(--fill-left)', right: `calc(100% - var(--fill-right))` }}
            />
            <input
              type="range"
              aria-label="Desde"
              min={1}
              max={TOTAL_QUESTIONS}
              step={10}
              value={desde}
              onChange={(e) => setDesdeClamped(Number(e.target.value))}
              style={{ zIndex: desde > TOTAL_QUESTIONS - 50 ? 4 : 3 }}
            />
            <input
              type="range"
              aria-label="Hasta"
              min={1}
              max={TOTAL_QUESTIONS}
              step={10}
              value={hasta}
              onChange={(e) => setHastaClamped(Number(e.target.value))}
              style={{ zIndex: 3 }}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {RANGE_PRESETS.map((p) => {
              const active = desde === p.desde && hasta === p.hasta;
              return (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p.desde, p.hasta)}
                  className={
                    'rounded-full px-3.5 py-1.5 text-sm transition-colors ' +
                    (active
                      ? 'bg-stone-900 text-stone-50'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200')
                  }
                >
                  {p.label}
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
