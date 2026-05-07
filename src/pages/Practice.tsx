import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import QuestionView from '../components/QuestionView';
import { QUESTIONS, getBlock } from '../lib/data';
import { useProgress } from '../hooks/useProgress';
import type { Question } from '../types/types';
import { dueForReview } from '../lib/spacedRepetition';

type Mode = 'todo' | 'falladas' | 'pendientes' | 'reto';

const SESSION_SIZE = 20;
const RETO_SIZE = 50;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickQuestions(mode: Mode, blockId: number | null, progressMap: Record<number, { seen: number; lastCorrect: boolean; nextReview: string }>): Question[] {
  if (mode === 'reto') {
    const pool = QUESTIONS.filter((q) => q.source === 'comun');
    return shuffle(pool).slice(0, RETO_SIZE);
  }
  let pool: Question[];
  if (mode === 'falladas') {
    pool = QUESTIONS.filter((q) => {
      const e = progressMap[q.id];
      return e && e.seen > 0 && !e.lastCorrect;
    });
  } else if (mode === 'pendientes') {
    pool = QUESTIONS.filter((q) => {
      const e = progressMap[q.id];
      if (!e) return true;
      return dueForReview({ ...e, box: 0, correct: 0, wrong: 0, lastSeenDate: '', bookmarked: false });
    });
  } else {
    pool = QUESTIONS;
  }
  if (blockId !== null) pool = pool.filter((q) => q.blockId === blockId);
  return shuffle(pool).slice(0, SESSION_SIZE);
}

export default function Practice() {
  const [params, setParams] = useSearchParams();
  const initialMode = (params.get('modo') as Mode) || 'todo';
  const initialBlock = params.get('bloque') ? Number(params.get('bloque')) : null;

  const [mode, setMode] = useState<Mode>(initialMode);
  const blockId = initialBlock;

  const { progress, recordAnswer } = useProgress();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  const start = useMemo(
    () => () => {
      setQuestions(pickQuestions(mode, blockId, progress));
      setIdx(0);
      setSelected(null);
      setRevealed(false);
      setDone(false);
      setCorrectCount(0);
    },
    [mode, blockId, progress],
  );

  // Initial pick
  useEffect(() => {
    setQuestions(pickQuestions(mode, blockId, progress));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (done) {
    const total = questions.length;
    const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    return (
      <div className="min-h-[80vh] flex flex-col justify-center text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Sesión completada</p>
        <p className="font-serif text-[88px] leading-none mt-6 tabular text-stone-900">{pct}<span className="text-3xl text-stone-400">%</span></p>
        <p className="text-sm text-stone-500 mt-4 tabular">
          {correctCount} de {total}
        </p>
        <div className="mt-16 space-y-3">
          <button
            onClick={start}
            className="block mx-auto w-full max-w-[280px] bg-stone-900 text-stone-50 rounded-full py-4 font-serif text-lg active:scale-[0.98] transition-transform"
          >
            Otra sesión
          </button>
          <Link to="/" className="block text-stone-500 text-sm underline underline-offset-4 decoration-stone-300">
            Volver
          </Link>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center text-center">
        <h1 className="font-serif text-2xl text-stone-900">No hay preguntas</h1>
        <p className="text-stone-500 mt-3 text-sm">
          {mode === 'falladas' ? 'No tienes falladas pendientes.' : 'Cambia los filtros.'}
        </p>
        <button
          onClick={() => {
            setMode('todo');
            setParams({});
            setQuestions(pickQuestions('todo', null, progress));
          }}
          className="mt-8 mx-auto text-stone-700 underline underline-offset-4"
        >
          Practicar con todas
        </button>
      </div>
    );
  }

  const q = questions[idx];
  const block = getBlock(q.blockId);
  const isLast = idx === questions.length - 1;

  return (
    <div className="pt-2">
      <div className="flex items-center justify-between text-xs text-stone-400 tabular mb-8">
        <Link to="/" className="text-stone-400">Salir</Link>
        <span>{idx + 1} / {questions.length}</span>
      </div>

      <QuestionView
        question={q}
        selected={selected}
        revealed={revealed}
        onSelect={revealed ? undefined : setSelected}
        showExplanation={revealed}
      />

      <div className="h-24" />

      <div className="fixed bottom-0 inset-x-0 bg-stone-50/95 backdrop-blur safe-bottom">
        <div className="max-w-screen-sm mx-auto px-5 py-4">
          {!revealed ? (
            <button
              onClick={() => {
                if (selected === null) return;
                setRevealed(true);
                const ok = selected === q.correctIndex;
                if (ok) setCorrectCount((n) => n + 1);
                recordAnswer(q.id, ok);
              }}
              disabled={selected === null}
              className="w-full bg-stone-900 text-stone-50 rounded-full py-4 font-serif text-lg active:scale-[0.98] transition-transform disabled:opacity-30 disabled:pointer-events-none"
            >
              Comprobar
            </button>
          ) : (
            <div className="space-y-2">
              {block && (
                <p className="text-[11px] text-stone-400 text-center">{block.law}</p>
              )}
              <button
                onClick={() => {
                  if (isLast) {
                    setDone(true);
                  } else {
                    setIdx((i) => i + 1);
                    setSelected(null);
                    setRevealed(false);
                  }
                }}
                className="w-full bg-stone-900 text-stone-50 rounded-full py-4 font-serif text-lg active:scale-[0.98] transition-transform"
              >
                {isLast ? 'Resultado' : 'Siguiente'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
