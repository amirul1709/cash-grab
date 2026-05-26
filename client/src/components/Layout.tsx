import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const links = [
  { to: '/',              label: 'Dashboard',    num: '01' },
  { to: '/accounts',     label: 'Accounts',     num: '02' },
  { to: '/transactions', label: 'Transactions', num: '03' },
  { to: '/categories',   label: 'Categories',   num: '04' },
  { to: '/budgets',      label: 'Budgets',      num: '05' },
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
      <div className="px-6 py-6 border-b border-white/10">
        <span className="text-lg font-semibold tracking-tight text-gold-400">Cash Grab</span>
        <p className="text-[10px] tracking-editorial uppercase text-white/30 mt-0.5">Finance Tracker</p>
      </div>

      <nav className="flex-1 py-6 space-y-0.5 px-4 overflow-y-auto">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors group ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:bg-white/5 hover:text-white/70'
              }`
            }
          >
            <span className="font-mono text-[10px] text-white/25 group-hover:text-white/40 w-5 shrink-0 transition-colors">
              {l.num}
            </span>
            <span className="font-medium">{l.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-5 border-t border-white/10">
        <p className="text-[9px] tracking-editorial uppercase text-white/25 mb-1">Signed in as</p>
        <p className="text-xs text-white/50 truncate mb-3">{user?.name}</p>
        <button
          onClick={logout}
          className="text-[10px] tracking-editorial uppercase text-white/25 hover:text-red-400 transition-colors"
        >
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-[#111111] text-white flex-col shrink-0 border-r border-white/5">
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
        <div className="absolute inset-0 bg-black/60" />
      </div>
      <aside
        className={`md:hidden fixed top-0 left-0 bottom-0 z-50 w-64 bg-[#111111] text-white flex flex-col transform transition-transform ${
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
        <header className="md:hidden sticky top-0 z-30 bg-[#111111] text-white flex items-center justify-between px-4 h-14 border-b border-white/5">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="p-2 -ml-2 rounded-md hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-gold-500 transition-colors"
            aria-label="Open navigation"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-gold-400">Cash Grab</span>
          <span className="w-8" aria-hidden />
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
