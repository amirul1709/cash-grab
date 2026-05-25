import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const links = [
  { to: '/',             label: 'Dashboard',    icon: '▦' },
  { to: '/accounts',    label: 'Accounts',     icon: '🏦' },
  { to: '/transactions',label: 'Transactions', icon: '↕' },
  { to: '/categories',  label: 'Categories',   icon: '🏷' },
  { to: '/budgets',     label: 'Budgets',      icon: '📊' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const sidebar = (
    <>
      <div className="px-6 py-5 border-b border-gray-700">
        <span className="text-xl font-bold text-indigo-400">Cash Grab</span>
      </div>

      <nav className="flex-1 py-4 space-y-1 px-3 overflow-y-auto">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <span aria-hidden>{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-700">
        <p className="text-xs text-gray-400 truncate mb-2">{user?.name}</p>
        <button
          onClick={logout}
          className="w-full text-left text-xs text-gray-500 hover:text-red-400 transition-colors"
        >
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-gray-900 text-white flex-col shrink-0">
        {sidebar}
      </aside>

      {/* Mobile drawer + backdrop */}
      <div
        className={`md:hidden fixed inset-0 z-40 transition-opacity ${
          drawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden={!drawerOpen}
      >
        <div className="absolute inset-0 bg-black/50" />
      </div>
      <aside
        className={`md:hidden fixed top-0 left-0 bottom-0 z-50 w-64 bg-gray-900 text-white flex flex-col transform transition-transform ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Main navigation"
        aria-hidden={!drawerOpen}
      >
        {sidebar}
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-30 bg-gray-900 text-white flex items-center justify-between px-4 h-14 border-b border-gray-800">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="p-2 -ml-2 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Open navigation"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="text-base font-bold text-indigo-400">Cash Grab</span>
          <span className="w-8" aria-hidden />
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
