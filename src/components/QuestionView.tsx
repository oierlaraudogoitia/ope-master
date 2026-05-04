import type { Question } from '../types/types';

interface Props {
  question: Question;
  selected?: number | null;
  revealed?: boolean;
  onSelect?: (idx: number) => void;
  showExplanation?: boolean;
}

export default function QuestionView({
  question,
  selected,
  revealed = false,
  onSelect,
  showExplanation = false,
}: Props) {
  return (
    <div className="space-y-6">
      {question.impugnable && (
        <p className="text-[10px] uppercase tracking-[0.18em] text-orange-700">Impugnable</p>
      )}

      <h2 className="font-serif text-[22px] leading-snug text-stone-900">{question.question}</h2>

      <div className="space-y-2">
        {question.options.map((opt, idx) => {
          const isCorrect = idx === question.correctIndex;
          const isSelected = idx === selected;
          let cls = 'border-stone-200 bg-white text-stone-800';
          if (revealed) {
            if (isCorrect) cls = 'border-emerald-600 bg-white text-stone-900';
            else if (isSelected) cls = 'border-red-500 bg-white text-stone-500 line-through decoration-stone-300';
            else cls = 'border-stone-100 bg-white text-stone-400';
          } else if (isSelected) {
            cls = 'border-stone-900 bg-white text-stone-900';
          }
          return (
            <button
              key={idx}
              onClick={onSelect ? () => onSelect(idx) : undefined}
              disabled={!onSelect || revealed}
              className={`w-full text-left rounded-2xl border p-4 transition-colors active:scale-[0.99] ${cls}`}
            >
              <span className="text-[15px] leading-snug">
                {opt || <em className="text-stone-400">(opción vacía)</em>}
              </span>
            </button>
          );
        })}
      </div>

      {revealed && showExplanation && question.explanation && (
        <div className="pt-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400 mb-2">Por qué</p>
          <p className="text-[15px] leading-relaxed text-stone-700">{question.explanation}</p>
          {question.mnemonic && (
            <p className="mt-3 text-[14px] italic text-stone-500 font-serif">{question.mnemonic}</p>
          )}
        </div>
      )}
    </div>
  );
}
