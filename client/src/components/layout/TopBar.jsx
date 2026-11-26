import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { portfolioApi } from '../../api/portfolioApi.js';
import { guardrailApi } from '../../api/guardrailApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatCurrency, formatPct } from '../../utils/format.js';

function getStatusBadge(status) {
  switch (status) {
    case 'ALLOW':
      return {
        cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        label: 'ALLOW',
      };
    case 'WARN':
      return {
        cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        label: 'WARN',
      };
    case 'BLOCK':
      return {
        cls: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
        label: 'BLOCK',
      };
    default:
      return {
        cls: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
        label: '—',
      };
  }
}

export default function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isDemo, logout } = useAuth();
  const [data, setData] = useState(null);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light-theme', theme === 'light');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const loadTop = useCallback(async () => {
    try {
      const [summary, guardrails] = await Promise.all([
        portfolioApi.getSummary(),
        guardrailApi.getStatus(),
      ]);
      setData({ summary, guardrails });
    } catch {
      // Keep previous top-bar state if transient error occurs
    }
  }, []);

  useEffect(() => {
    loadTop();
  }, [loadTop, location.pathname]);

  useEffect(() => {
    const handler = () => loadTop();
    window.addEventListener('risk-manager:refresh', handler);
    return () => window.removeEventListener('risk-manager:refresh', handler);
  }, [loadTop]);

  const summary = data?.summary;
  const guardrails = data?.guardrails;
  const badge = getStatusBadge(guardrails?.status);

  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2.5 text-xs">
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        {isDemo ? (
          <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
            DEMO (READ-ONLY)
          </span>
        ) : null}
        <div>
          <span className="text-slate-400">Equity: </span>
          <span className="font-semibold text-white">
            {summary ? formatCurrency(summary.equity ?? summary.balance) : '—'}
          </span>
        </div>
        <div>
          <span className="text-slate-400">Daily Loss: </span>
          <span className="font-semibold text-slate-200">
            {guardrails
              ? `${formatPct(guardrails.limits.dailyLossPct)} / ${guardrails.limits.maxDailyLossPct}%`
              : '—'}
          </span>
        </div>
        <div>
          <span className="text-slate-400">Open Risk: </span>
          <span className="font-semibold text-slate-200">
            {guardrails
              ? `${formatPct(guardrails.limits.openRiskPct)} / ${guardrails.limits.maxOpenRiskPct}%`
              : '—'}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          aria-label="Toggle theme"
          className="rounded-lg border border-slate-700 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-800"
        >
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">Status:</span>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wide ${badge.cls}`}
          >
            {badge.label}
          </span>
        </div>

        <span className="text-slate-400 hidden sm:inline">{user?.name}</span>

        <button
          type="button"
          onClick={async () => {
            await logout();
            navigate('/login');
          }}
          className="rounded-lg border border-slate-700 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
        >
          {isDemo ? 'Exit Demo' : 'Sign Out'}
        </button>
      </div>
    </header>
  );
}
