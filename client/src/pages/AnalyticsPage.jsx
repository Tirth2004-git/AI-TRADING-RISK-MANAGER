import { useCallback, useState } from 'react';
import { analyticsApi } from '../api/analyticsApi.js';
import { aiApi } from '../api/aiApi.js';
import useFetch from '../hooks/useFetch.js';
import { formatCurrency, formatNumber, formatPct } from '../utils/format.js';
import Loader from '../components/common/Loader.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import StatCard from '../components/common/StatCard.jsx';
import AiCoachPanel from '../components/ai/AiCoachPanel.jsx';

function SegmentTable({ title, rows = [] }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <h3 className="text-sm font-semibold text-white mb-3">{title}</h3>
      {!rows.length ? (
        <p className="text-xs text-slate-500">No closed trades yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-2">Segment</th>
                <th className="py-2">Trades</th>
                <th className="py-2">Win Rate</th>
                <th className="py-2">Avg R</th>
                <th className="py-2">Net PnL</th>
                <th className="py-2">Fees</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {rows.map((r) => (
                <tr key={r.key}>
                  <td className="py-2 font-medium text-white">
                    {r.key}{' '}
                    {r.smallSample ? (
                      <span className="ml-1 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                        small sample
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2 text-slate-300">{r.count}</td>
                  <td className="py-2 text-slate-300">{formatPct(r.winRate, 1)}</td>
                  <td className="py-2 text-slate-300">{formatNumber(r.averageR, 2)}R</td>
                  <td
                    className={`py-2 font-semibold ${
                      r.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {formatCurrency(r.netPnl)}
                  </td>
                  <td className="py-2 text-slate-400">{formatCurrency(r.totalFees)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const fetchAnalytics = useCallback(() => analyticsApi.getAnalytics(), []);
  const { data, loading, error, refetch } = useFetch(fetchAnalytics, []);

  const [aiReview, setAiReview] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const handleWeeklyReview = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const review = await aiApi.reviewWeekly();
      setAiReview(review);
    } catch (err) {
      setAiError(err.message || 'Weekly AI review failed');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) return <Loader label="Loading behaviour analytics..." />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  const { flagCounts, bySetup, bySymbol, bySide, byWeekday } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Behaviour Analytics</h2>
          <p className="text-sm text-slate-400">
            Rule-based discipline flags and segmented performance
          </p>
        </div>

        <button
          type="button"
          onClick={handleWeeklyReview}
          disabled={aiLoading}
          className="rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-4 py-2 text-sm font-medium text-cyan-300 hover:bg-cyan-500/25 disabled:opacity-50"
        >
          {aiLoading ? 'Generating...' : 'AI Weekly Review'}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Revenge Trades"
          value={flagCounts.revengeTrade}
          tone={flagCounts.revengeTrade > 0 ? 'negative' : 'default'}
        />
        <StatCard
          label="Overtrading"
          value={flagCounts.overtrading}
          tone={flagCounts.overtrading > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Widened Stops"
          value={flagCounts.widenedStop}
          tone={flagCounts.widenedStop > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Guardrail Overrides"
          value={flagCounts.overrideUsed}
          tone={flagCounts.overrideUsed > 0 ? 'negative' : 'default'}
        />
      </div>

      <AiCoachPanel review={aiReview} loading={aiLoading} error={aiError} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SegmentTable title="By Setup Tag" rows={bySetup} />
        <SegmentTable title="By Symbol" rows={bySymbol} />
        <SegmentTable title="By Side" rows={bySide} />
        <SegmentTable title="By Weekday (IST)" rows={byWeekday} />
      </div>
    </div>
  );
}
