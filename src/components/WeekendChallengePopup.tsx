import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function WeekendChallengePopup({ onClose }: Props) {
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const start = () => {
    onClose();
    navigate('/practica?modo=reto');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="weekend-challenge-title"
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
          Reto del fin de semana
        </p>
        <h2
          id="weekend-challenge-title"
          className="font-serif text-3xl mt-3 leading-tight text-stone-900"
        >
          <em className="italic font-normal">200 primeras</em> preguntas del PDF
        </h2>
        <p className="text-sm text-stone-500 mt-4">
          Te lanzamos 50 preguntas al azar del bloque común para repasar lo aprendido.
        </p>

        <button
          onClick={start}
          className="mt-8 w-full bg-stone-900 text-stone-50 rounded-full py-4 font-serif text-lg active:scale-[0.98] transition-transform"
        >
          Comenzar reto
        </button>
      </div>
    </div>
  );
}
