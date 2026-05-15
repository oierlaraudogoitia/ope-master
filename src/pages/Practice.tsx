import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import QuestionView from '../components/QuestionView';
import { QUESTIONS, getBlock } from '../lib/data';
import { useProgress } from '../hooks/useProgress';
import type { Question } from '../types/types';
import { dueForReview } from '../lib/spacedRepetition';

type Mode = 'todo' | 'falladas' | 'pendientes' | 'reto' | 'rango';

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

function shuffleOptions(q: Question): Question {
  const order = shuffle(q.options.map((_, i) => i));
  return {
    ...q,
    options: order.map((i) => q.options[i]),
    correctIndex: order.indexOf(q.correctIndex),
  };
}

function pickQuestions(
  mode: Mode,
  blockId: number | null,
  progressMap: Record<number, { seen: number; lastCorrect: boolean; nextReview: string }>,
  rango?: { desde: number; hasta: number; n: number },
): Question[] {
  if (mode === 'rango' && rango) {
    const pool = QUESTIONS.filter((q) => q.id >= rango.desde && q.id <= rango.hasta);
    return shuffle(pool).slice(0, rango.n).map(shuffleOptions);
  }
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
  const rango = useMemo(
    () => ({
      desde: Number(params.get('desde')) || 1,
      hasta: Number(params.get('hasta')) || 650,
      n: Number(params.get('n')) || 50,
    }),
    [params],
  );

  const [mode, setMode] = useState<Mode>(initialMode);
  const blockId = initialBlock;
  const isExam = mode === 'rango';

  const { progress, recordAnswer } = useProgress();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  // Exam mode: track user's selection per question.
  const [answers, setAnswers] = useState<(number | null)[]>([]);

  const startFresh = (qs: Question[]) => {
    setQuestions(qs);
    setIdx(0);
    setSelected(null);
    setRevealed(false);
    setDone(false);
    setCorrectCount(0);
    setAnswers(new Array(qs.length).fill(null));
  };

  const start = useMemo(
    () => () => {
      startFresh(pickQuestions(mode, blockId, progress, rango));
    },
    [mode, blockId, progress, rango],
  );

  // Initial pick
  useEffect(() => {
    startFresh(pickQuestions(mode, blockId, progress, rango));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------- DONE: exam-mode summary --------
  if (done && isExam) {
    const total = questions.length;
    const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const failedItems = questions
      .map((q, i) => ({ q, i, ans: answers[i] }))
      .filter(({ q, ans }) => ans === null || ans !== q.correctIndex);

    const startRepaso = () => {
      const failedQs = failedItems.map(({ q }) => shuffleOptions(q));
      startFresh(failedQs);
    };

    return (
      <div className="pt-2 pb-16">
        <div className="text-center mt-6">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Sesión completada</p>
          <p className="font-serif text-[88px] leading-none mt-6 tabular text-stone-900">
            {pct}
            <span className="text-3xl text-stone-400">%</span>
          </p>
          <p className="text-sm text-stone-500 mt-4 tabular">
            {correctCount} de {total}
          </p>
        </div>

        <div className="mt-10 space-y-3">
          {failedItems.length > 0 && (
            <button
              onClick={startRepaso}
              className="block mx-auto w-full max-w-[320px] bg-stone-900 text-stone-50 rounded-full py-4 font-serif text-lg active:scale-[0.98] transition-transform"
            >
              Empezar repaso de {failedItems.length} {failedItems.length === 1 ? 'fallada' : 'falladas'}
            </button>
          )}
          <button
            onClick={start}
            className="block mx-auto w-full max-w-[320px] bg-white border border-stone-300 text-stone-800 rounded-full py-4 font-serif text-lg active:scale-[0.98] transition-transform"
          >
            Otra sesión
          </button>
          <Link to="/" className="block text-center text-stone-500 text-sm underline underline-offset-4 decoration-stone-300">
            Volver
          </Link>
        </div>

        {failedItems.length > 0 && (
          <div className="mt-12">
            <p className="text-xs uppercase tracking-[0.2em] text-stone-400 mb-4">
              Falladas ({failedItems.length})
            </p>
            <ol className="space-y-6">
              {failedItems.map(({ q, ans }, n) => {
                const block = getBlock(q.blockId);
                return (
                  <li key={`${q.id}-${n}`} className="border-t border-stone-200 pt-4">
                    <p className="font-serif text-[17px] leading-snug text-stone-900">
                      {n + 1}. {q.question}
                    </p>
                    <div className="mt-3 space-y-1.5 text-[14px] leading-snug">
                      <p>
                        <span className="text-stone-400">Tu respuesta:</span>{' '}
                        {ans === null ? (
                          <em className="text-stone-500">(en blanco)</em>
                        ) : (
                          <span className="text-red-700 line-through decoration-red-300">«{q.options[ans]}»</span>
                        )}
                      </p>
                      <p>
                        <span className="text-stone-400">Correcta:</span>{' '}
                        <span className="text-emerald-800">«{q.options[q.correctIndex]}»</span>
                      </p>
                    </div>
                    {q.explanation && (
                      <p className="mt-3 text-[14px] leading-relaxed text-stone-700">{q.explanation}</p>
                    )}
                    {q.mnemonic && (
                      <p className="mt-2 text-[13px] italic text-stone-500 font-serif">{q.mnemonic}</p>
                    )}
                    {block && (
                      <p className="mt-3 text-[11px] text-stone-400">{block.name} · {block.law}</p>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>
    );
  }

  // -------- DONE: legacy short summary --------
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
            startFresh(pickQuestions('todo', null, progress));
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
        revealed={!isExam && revealed}
        onSelect={!isExam && revealed ? undefined : setSelected}
        showExplanation={!isExam && revealed}
      />

      <div className="h-24" />

      <div className="fixed bottom-0 inset-x-0 bg-stone-50/95 backdrop-blur safe-bottom">
        <div className="max-w-screen-sm mx-auto px-5 py-4">
          {isExam ? (
            <button
              onClick={() => {
                if (selected === null) return;
                const ok = selected === q.correctIndex;
                if (ok) setCorrectCount((n) => n + 1);
                recordAnswer(q.id, ok);
                setAnswers((a) => {
                  const copy = [...a];
                  copy[idx] = selected;
                  return copy;
                });
                if (isLast) {
                  setDone(true);
                } else {
                  setIdx((i) => i + 1);
                  setSelected(null);
                }
              }}
              disabled={selected === null}
              className="w-full bg-stone-900 text-stone-50 rounded-full py-4 font-serif text-lg active:scale-[0.98] transition-transform disabled:opacity-30 disabled:pointer-events-none"
            >
              {isLast ? 'Terminar' : 'Siguiente'}
            </button>
          ) : !revealed ? (
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
