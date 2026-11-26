import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard' },
  { to: '/trades/new', label: 'New Trade' },
  { to: '/positions', label: 'Positions' },
  { to: '/history', label: 'History' },
  { to: '/stress', label: 'Stress Test' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/ledger', label: 'Ledger' },
  { to: '/symbols', label: 'Symbols' },
  { to: '/settings', label: 'Settings' },
  { to: '/profile', label: 'Profile' },
];

export default function Sidebar() {
  return (
    <aside className="w-full md:w-60 shrink-0 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-6 px-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
          Crypto Futures
        </span>
        <h1 className="text-lg font-bold text-white">Risk Manager</h1>
      </div>
      <nav className="flex md:flex-col gap-1 overflow-x-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100 border border-transparent'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
