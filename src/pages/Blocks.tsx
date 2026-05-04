import { Link } from 'react-router-dom';
import { BLOCKS, questionsByBlock } from '../lib/data';
import { useProgress } from '../hooks/useProgress';
import { useMemo } from 'react';

export default function Blocks() {
  const { progress } = useProgress();

  const rows = useMemo(
    () =>
      BLOCKS.map((b) => {
        const qs = questionsByBlock(b.id);
        const seen = qs.filter((q) => (progress[q.id]?.seen ?? 0) > 0).length;
        return { block: b, total: qs.length, seen };
      }).filter((r) => r.total > 0),
    [progress],
  );

  return (
    <div className="pt-6">
      <h1 className="font-serif text-3xl">Bloques</h1>

      <ul className="mt-10">
        {rows.map(({ block, total, seen }) => (
          <li key={block.id}>
            <Link
              to={`/aprender/${block.id}`}
              className="flex justify-between items-baseline py-3 border-b border-stone-100"
            >
              <div className="min-w-0 pr-4">
                <p className="text-[15px] text-stone-800 leading-tight truncate">{block.name}</p>
                <p className="text-[11px] text-stone-400 mt-0.5">{block.law}</p>
              </div>
              <span className="text-xs tabular text-stone-400 shrink-0">
                {seen}/{total}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
