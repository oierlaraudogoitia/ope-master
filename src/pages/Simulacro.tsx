import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import QuestionView from '../components/QuestionView';
import { QUESTIONS, getBlock } from '../lib/data';
import { useProgress } from '../hooks/useProgress';
import { todayISO } from '../lib/dateUtils';
import type { Question } from '../types/types';

const SIZES = [25, 50, 100] as const;
const TIMES = [30, 60, 90] as const;

type Stage = 'setup' | 'running' | 'done';

function pickRandom<T>(arr: T[], n: number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

function fmt(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function Simulacro() {
  const { recordAnswer, setMeta } = useProgress();
  const [stage, setStage] = useState<Stage>('setup');
  const [size, setSize] = useState<number>(50);
  const [minutes, setMinutes] = useState<number>(60);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Map<number, number | null>>(new Map());
  const [idx, setIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const finish = useMemo(
    () => () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      let correct = 0;
      let wrong = 0;
      let blank = 0;
      questions.forEach((q) => {
        const a = answers.get(q.id);
        if (a === undefined || a === null) blank += 1;
        else if (a === q.correctIndex) {
          correct += 1;
          recordAnswer(q.id, true);
        } else {
          wrong += 1;
          recordAnswer(q.id, false);
        }
      });
      const total = questions.length;
      const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
      setMeta((m) => ({
        ...m,
        simulacros: [
          ...m.simulacros,
          { date: todayISO(), pct, size: total, durationMin: minutes, correct, wrong, blank },
        ],
      }));
      setStage('done');
    },
    [questions, answers, recordAnswer, setMeta, minutes],
  );

  useEffect(() => {
    if (stage !== 'running') return;
    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          finish();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [stage, finish]);

  const start = () => {
    const qs = pickRandom(QUESTIONS, Math.min(size, QUESTIONS.length));
    setQuestions(qs);
    setAnswers(new Map());
    setIdx(0);
    setSecondsLeft(minutes * 60);
    setStage('running');
  };

  const restart = () => {
    setStage('setup');
    setQuestions([]);
    setAnswers(new Map());
  };

  if (stage === 'setup') {
    return (
      <div className="pt-6">
        <h1 className="font-serif text-3xl">Simulacro</h1>

        <div className="mt-12 space-y-10">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400 mb-4">Preguntas</p>
            <div className="flex gap-2">
              {SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`flex-1 py-3 rounded-full font-serif text-lg tabular ${
                    size === s ? 'bg-stone-900 text-stone-50' : 'border border-stone-200 text-stone-600'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400 mb-4">Tiempo</p>
            <div className="flex gap-2">
              {TIMES.map((t) => (
                <button
                  key={t}
                  onClick={() => setMinutes(t)}
                  className={`flex-1 py-3 rounded-full font-serif text-lg tabular ${
                    minutes === t ? 'bg-stone-900 text-stone-50' : 'border border-stone-200 text-stone-600'
                  }`}
                >
                  {t}m
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={start}
          className="mt-16 w-full bg-stone-900 text-stone-50 rounded-full py-5 font-serif text-xl active:scale-[0.98] transition-transform"
        >
          Empezar
        </button>
      </div>
    );
  }

  if (stage === 'done') {
    let correct = 0;
    let wrong = 0;
    let blank = 0;
    questions.forEach((q) => {
      const a = answers.get(q.id);
      if (a === undefined || a === null) blank += 1;
      else if (a === q.correctIndex) correct += 1;
      else wrong += 1;
    });
    const pct = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    return (
      <div className="pt-12">
        <p className="text-xs uppercase tracking-[0.2em] text-stone-400 text-center">Simulacro</p>
        <p className="font-serif text-[88px] leading-none mt-4 tabular text-stone-900 text-center">
          {pct}<span className="text-3xl text-stone-400">%</span>
        </p>
        <p className="text-sm text-stone-500 mt-3 tabular text-center">
          {correct} aciertos · {wrong} fallos{blank > 0 ? ` · ${blank} en blanco` : ''}
        </p>

        <div className="mt-12">
          <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400 mb-4">Revisión</p>
          <ul className="space-y-5">
            {questions.map((q) => {
              const a = answers.get(q.id);
              const ok = a === q.correctIndex;
              const block = getBlock(q.blockId);
              return (
                <li key={q.id} className="border-b border-stone-100 pb-4">
                  <p className={`text-[10px] uppercase tracking-[0.15em] ${ok ? 'text-emerald-700' : a == null ? 'text-stone-400' : 'text-red-600'}`}>
                    {ok ? 'Correcta' : a == null ? 'En blanco' : 'Fallada'}
                  </p>
                  <p className="text-sm mt-2 text-stone-800 leading-snug">{q.question}</p>
                  <p className="text-xs text-stone-500 mt-2">
                    <span className="text-stone-400">Respuesta:</span> {q.options[q.correctIndex]}
                  </p>
                  {block && <p className="text-[10px] text-stone-400 mt-1">{block.law}</p>}
                </li>
              );
            })}
          </ul>
        </div>

        <button
          onClick={restart}
          className="mt-12 w-full bg-stone-900 text-stone-50 rounded-full py-4 font-serif text-lg active:scale-[0.98] transition-transform"
        >
          Otro simulacro
        </button>
      </div>
    );
  }

  // running
  const q = questions[idx];
  const selected = answers.get(q.id) ?? null;

  return (
    <div className="pt-2">
      <div className="flex items-center justify-between mb-8">
        <Link to="/" className="text-xs text-stone-400">Salir</Link>
        <span
          className={`tabular text-sm font-serif ${secondsLeft < 300 ? 'text-red-600' : 'text-stone-700'}`}
        >
          {fmt(secondsLeft)}
        </span>
        <span className="text-xs tabular text-stone-400">
          {idx + 1}/{questions.length}
        </span>
      </div>

      <QuestionView
        question={q}
        selected={selected}
        onSelect={(i) =>
          setAnswers((m) => {
            const next = new Map(m);
            next.set(q.id, i);
            return next;
          })
        }
      />

      <div className="h-24" />

      <div className="fixed bottom-0 inset-x-0 bg-stone-50/95 backdrop-blur safe-bottom">
        <div className="max-w-screen-sm mx-auto px-5 py-4 flex gap-2">
          <button
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="px-5 border border-stone-200 text-stone-700 rounded-full py-3 font-serif disabled:opacity-30"
          >
            ←
          </button>
          {idx === questions.length - 1 ? (
            <button
              onClick={finish}
              className="flex-1 bg-stone-900 text-stone-50 rounded-full py-3 font-serif"
            >
              Terminar
            </button>
          ) : (
            <button
              onClick={() => setIdx((i) => i + 1)}
              className="flex-1 bg-stone-900 text-stone-50 rounded-full py-3 font-serif"
            >
              Siguiente
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
