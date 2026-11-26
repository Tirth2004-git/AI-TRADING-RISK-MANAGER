import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { portfolioApi } from '../api/portfolioApi.js';
import { guardrailApi } from '../api/guardrailApi.js';
import { tradeApi } from '../api/tradeApi.js';
import { aiApi } from '../api/aiApi.js';
import useFetch from '../hooks/useFetch.js';
import { formatCurrency, formatNumber, formatPct } from '../utils/format.js';
import StatCard from '../components/common/StatCard.jsx';
import Loader from '../components/common/Loader.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import WarningList from '../components/trade/WarningList.jsx';
import EquityCurve from '../components/dashboard/EquityCurve.jsx';
import DrawdownChart from '../components/dashboard/DrawdownChart.jsx';
import ExposureChart from '../components/dashboard/ExposureChart.jsx';
import AiCoachPanel from '../components/ai/AiCoachPanel.jsx';

function LimitMeter({ label, used, max, suffix = '%' }) {
  const pct = max > 0 ? Math.min(100, (used / max) * 100) : 0;
  const barColor =
    pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-cyan-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="font-medium text-slate-200">
          {Number(used).toFixed(2)}
          {suffix} / {max}
          {suffix}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const fetchDashboard = useCallback(async () => {
    const [summary, performance, guardrails, openTrades, closedTrades] =
      await Promise.all([
        portfolioApi.getSummary(),
        portfolioApi.getPerformance(),
        guardrailApi.getStatus(),
        tradeApi.list({ status: 'OPEN' }),
        tradeApi.list({ status: 'CLOSED' }),
      ]);
    return { summary, performance, guardrails, openTrades, closedTrades };
  }, []);

  const { data, loading, error, refetch } = useFetch(fetchDashboard, []);

  const [aiReview, setAiReview] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const avgOpenRiskScore = useMemo(() => {
    if (!data?.openTrades?.length) return null;
    const sum = data.openTrades.reduce((s, t) => s + (t.riskScore || 0), 0);
    return Math.round(sum / data.openTrades.length);
  }, [data]);

  const closestToLiq = useMemo(() => {
    if (!data?.openTrades) return [];
    return [...data.openTrades]
      .sort(
        (a, b) =>
          (a.markState?.distanceToLiquidationPct ?? 999) -
          (b.markState?.distanceToLiquidationPct ?? 999)
      )
      .slice(0, 5);
  }, [data]);

  const dailyCalendar = useMemo(() => {
    if (!data?.closedTrades) return [];
    const map = new Map();
    for (const t of data.closedTrades) {
      if (!t.closedAt) continue;
      const day = new Date(t.closedAt).toLocaleDateString('en-CA', {
        timeZone: 'Asia/Kolkata',
      });
      map.set(day, (map.get(day) || 0) + (t.realizedPnl || 0));
    }
    return Array.from(map.entries())
      .map(([day, pnl]) => ({ day, pnl }))
      .sort((a, b) => b.day.localeCompare(a.day))
      .slice(0, 12);
  }, [data]);

  const monthlyPerformance = useMemo(() => {
    if (!data?.closedTrades) return [];
    const map = new Map();
    for (const t of data.closedTrades) {
      if (!t.closedAt) continue;
      const month = new Date(t.closedAt).toLocaleDateString('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
      });
      map.set(month, (map.get(month) || 0) + (t.realizedPnl || 0));
    }
    return Array.from(map.entries())
      .map(([month, pnl]) => ({ month, pnl }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [data]);

  const handlePortfolioAiReview = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const review = await aiApi.reviewPortfolio();
      setAiReview(review);
    } catch (err) {
      setAiError(err.message || 'Failed to load AI portfolio review');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) return <Loader label="Loading dashboard..." />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  const { summary, performance, guardrails } = data;
  const limits = guardrails?.limits;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
          <p className="text-sm text-slate-400">
            Account overview, limit meters, exposure, and drawdown tracking
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePortfolioAiReview}
            disabled={aiLoading}
            className="rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-4 py-2 text-sm font-medium text-cyan-300 hover:bg-cyan-500/25 disabled:opacity-50"
          >
            {aiLoading ? 'Reviewing...' : 'AI Portfolio Review'}
          </button>
          <Link
            to="/trades/new"
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
          >
            + New Trade
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Equity"
          value={formatCurrency(summary.equity ?? summary.balance)}
          subtext={`Available: ${formatCurrency(summary.availableMargin)} · Balance: ${formatCurrency(summary.balance)}`}
        />
        <StatCard
          label="Realized / Unrealized PnL"
          value={formatCurrency(performance.totalPnl)}
          subtext={`Unrealized: ${formatCurrency(summary.unrealizedPnl)} · Today: ${formatCurrency(summary.todayRealizedPnl)}`}
          tone={performance.totalPnl >= 0 ? 'positive' : 'negative'}
        />
        <StatCard
          label="Win Rate / Profit Factor"
          value={`${formatPct(performance.winRate, 1)} / ${
            performance.profitFactor !== null
              ? formatNumber(performance.profitFactor, 2)
              : '—'
          }`}
          subtext={`${performance.wins}W / ${performance.losses}L (${performance.totalTrades} closed)`}
        />
        <StatCard
          label="Drawdown / Portfolio Score"
          value={`${formatPct(summary.currentDrawdownPct)} / ${
            avgOpenRiskScore !== null ? `${avgOpenRiskScore}/100` : '—'
          }`}
          subtext={`Max DD: ${formatPct(summary.maxDrawdownPct)} · Open: ${summary.openCount}`}
          tone={summary.currentDrawdownPct > 0 ? 'warning' : 'default'}
        />
      </div>

      {limits ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <LimitMeter label="Daily Loss" used={limits.dailyLossPct} max={limits.maxDailyLossPct} />
          <LimitMeter label="Weekly Loss" used={limits.weeklyLossPct} max={limits.maxWeeklyLossPct} />
          <LimitMeter label="Open Risk" used={limits.openRiskPct} max={limits.maxOpenRiskPct} />
          <LimitMeter
            label="Trades Today"
            used={limits.tradesToday}
            max={limits.maxTradesPerDay}
            suffix=""
          />
        </div>
      ) : null}

      <WarningList warnings={summary.warnings} title="Active Portfolio Warnings" />
      <AiCoachPanel review={aiReview} loading={aiLoading} error={aiError} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <EquityCurve data={performance.equityCurve} />
        <DrawdownChart data={performance.equityCurve} />
        <ExposureChart concentration={summary.concentration} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <h3 className="text-sm font-semibold text-white mb-3">
            Positions Closest to Liquidation
          </h3>
          {!closestToLiq.length ? (
            <p className="text-xs text-slate-500">No open positions.</p>
          ) : (
            <div className="space-y-2 text-xs">
              {closestToLiq.map((t) => (
                <Link
                  key={t._id}
                  to={`/trades/${t._id}`}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 hover:border-cyan-500/40"
                >
                  <span className="font-semibold text-white">
                    {t.symbol} ({t.side})
                  </span>
                  <span className="font-semibold text-amber-300">
                    {formatPct(t.markState?.distanceToLiquidationPct)} away
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <h3 className="text-sm font-semibold text-white mb-3">
            Monthly Performance (IST)
          </h3>
          {!monthlyPerformance.length ? (
            <p className="text-xs text-slate-500">No closed trades yet.</p>
          ) : (
            <div className="space-y-2 text-xs">
              {monthlyPerformance.map((m) => (
                <div
                  key={m.month}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2"
                >
                  <span className="text-slate-300">{m.month}</span>
                  <span
                    className={`font-semibold ${
                      m.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {formatCurrency(m.pnl)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <h3 className="text-sm font-semibold text-white mb-3">
            Daily Realized PnL (Asia/Kolkata)
          </h3>
          {!dailyCalendar.length ? (
            <p className="text-xs text-slate-500">No closed trades yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-xs">
              {dailyCalendar.map((item) => (
                <div
                  key={item.day}
                  className={`rounded-lg border px-2.5 py-1.5 ${
                    item.pnl >= 0
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                  }`}
                >
                  <div className="text-[10px] opacity-80">{item.day}</div>
                  <div className="font-semibold">{formatCurrency(item.pnl)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
