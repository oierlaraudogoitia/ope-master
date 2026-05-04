import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { MoreHorizontal, X } from 'lucide-react';

const MENU = [
  { to: '/plan', label: 'Plan' },
  { to: '/stats', label: 'Estadísticas' },
  { to: '/bloques', label: 'Bloques' },
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isHome = pathname === '/';

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="max-w-screen-sm mx-auto px-5 pt-5 pb-3 flex items-center justify-between safe-top">
        {isHome ? (
          <span className="font-serif text-base text-stone-400">OPE</span>
        ) : (
          <button
            onClick={() => navigate('/')}
            className="font-serif text-base text-stone-400 hover:text-stone-600 -ml-1 px-1"
            aria-label="Inicio"
          >
            ←
          </button>
        )}
        <button
          onClick={() => setOpen(true)}
          className="-mr-2 p-2 text-stone-400 hover:text-stone-700"
          aria-label="Menú"
        >
          <MoreHorizontal size={20} />
        </button>
      </header>

      <main className="max-w-screen-sm mx-auto px-5 pb-12 safe-bottom">
        <Outlet />
      </main>

      {open && (
        <div className="fixed inset-0 z-50 bg-stone-50" role="dialog">
          <div className="max-w-screen-sm mx-auto px-5 pt-5 safe-top">
            <div className="flex justify-end">
              <button
                onClick={() => setOpen(false)}
                className="-mr-2 p-2 text-stone-500"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="mt-12 space-y-6">
              {MENU.map((m) => (
                <Link
                  key={m.to}
                  to={m.to}
                  onClick={() => setOpen(false)}
                  className="block font-serif text-3xl text-stone-900"
                >
                  {m.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
