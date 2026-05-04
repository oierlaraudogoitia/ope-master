import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import QuestionView from '../components/QuestionView';
import { questionsByBlock, getBlock } from '../lib/data';
import { useProgress } from '../hooks/useProgress';

export default function Study() {
  const { blockId } = useParams<{ blockId: string }>();
  const id = Number(blockId);
  const block = getBlock(id);
  const questions = useMemo(() => questionsByBlock(id), [id]);
  const [idx, setIdx] = useState(0);

  // Mark as seen when we advance — simple read-only mode but counts as study time.
  // (intentionally not recording answers since user didn't actively answer)
  void useProgress;

  if (!block || questions.length === 0) {
    return (
      <div className="pt-12 text-center">
        <p className="text-stone-500">No hay preguntas en este bloque.</p>
        <Link to="/bloques" className="mt-6 inline-block text-stone-600 underline underline-offset-4">
          Volver
        </Link>
      </div>
    );
  }

  const q = questions[idx];

  return (
    <div className="pt-2">
      <div className="flex items-center justify-between text-xs text-stone-400 tabular mb-8">
        <Link to="/bloques" className="text-stone-400">Volver</Link>
        <span>{idx + 1} / {questions.length}</span>
      </div>

      <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400 mb-4">{block.name}</p>

      <QuestionView question={q} revealed showExplanation />

      <div className="h-24" />

      <div className="fixed bottom-0 inset-x-0 bg-stone-50/95 backdrop-blur safe-bottom">
        <div className="max-w-screen-sm mx-auto px-5 py-4 flex gap-2">
          <button
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="flex-1 border border-stone-200 text-stone-700 rounded-full py-3 font-serif disabled:opacity-30"
          >
            Anterior
          </button>
          <button
            onClick={() => setIdx((i) => Math.min(questions.length - 1, i + 1))}
            disabled={idx === questions.length - 1}
            className="flex-1 bg-stone-900 text-stone-50 rounded-full py-3 font-serif disabled:opacity-30"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
