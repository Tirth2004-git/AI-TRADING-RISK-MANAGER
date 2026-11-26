import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { tradeApi } from '../api/tradeApi.js';
import { aiApi } from '../api/aiApi.js';
import useFetch from '../hooks/useFetch.js';
import {
  formatCurrency,
  formatDate,
  formatNumber,
  getBandBadgeClass,
} from '../utils/format.js';
import Loader from '../components/common/Loader.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import ScoreBreakdown from '../components/trade/ScoreBreakdown.jsx';
import WarningList from '../components/trade/WarningList.jsx';
import AiCoachPanel from '../components/ai/AiCoachPanel.jsx';

export default function TradeDetailPage() {
  const { id } = useParams();
  const fetchTrade = useCallback(() => tradeApi.getById(id), [id]);
  const { data: trade, loading, error, refetch } = useFetch(fetchTrade, [id]);

  const [journal, setJournal] = useState({
    setupTag: '',
    emotionTag: '',
    followedPlan: '',
    lesson: '',
  });
  const [savingJournal, setSavingJournal] = useState(false);
  const [journalMsg, setJournalMsg] = useState('');
  const [journalError, setJournalError] = useState(null);

  const [aiReview, setAiReview] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  useEffect(() => {
    if (trade) {
      setJournal({
        setupTag: trade.setupTag || '',
        emotionTag: trade.emotionTag || '',
        followedPlan:
          trade.followedPlan === true
            ? 'true'
            : trade.followedPlan === false
            ? 'false'
            : '',
        lesson: trade.lesson || '',
      });
    }
  }, [trade]);

  const handleSaveJournal = async (e) => {
    e.preventDefault();
    setSavingJournal(true);
    setJournalMsg('');
    setJournalError(null);
    try {
      await tradeApi.updateJournal(id, {
        setupTag: journal.setupTag,
        emotionTag: journal.emotionTag,
        followedPlan:
          journal.followedPlan === 'true'
            ? true
            : journal.followedPlan === 'false'
            ? false
            : null,
        lesson: journal.lesson,
      });
      setJournalMsg('Journal saved.');
      await refetch();
    } catch (err) {
      setJournalError(err.message || 'Failed to save journal');
    } finally {
      setSavingJournal(false);
    }
  };

  const handleAskAi = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const review = await aiApi.reviewTrade({ tradeId: id });
      setAiReview(review);
    } catch (err) {
      setAiError(err.message || 'AI review failed');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) return <Loader label="Loading trade details..." />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!trade) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">
              {trade.symbol} · {trade.side} ({trade.leverage}x)
            </h2>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getBandBadgeClass(
                trade.riskBand
              )}`}
            >
              {trade.riskScore} · {trade.riskBand}
            </span>
            <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
              {trade.status}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Opened {formatDate(trade.openedAt)}
            {trade.closedAt ? ` · Closed ${formatDate(trade.closedAt)}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAskAi}
            disabled={aiLoading}
            className="rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-4 py-2 text-sm font-medium text-cyan-300 hover:bg-cyan-500/25 disabled:opacity-50"
          >
            {aiLoading ? 'Reviewing...' : 'AI Trade Review'}
          </button>
          <Link
            to={trade.status === 'OPEN' ? '/positions' : '/history'}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Back
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <p className="text-slate-400 uppercase">Entry / Exit</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {formatCurrency(trade.entry)} /{' '}
            {trade.exitPrice ? formatCurrency(trade.exitPrice) : '—'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <p className="text-slate-400 uppercase">Stop / Target</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {trade.stopLoss ? formatCurrency(trade.stopLoss) : 'None'} /{' '}
            {trade.target ? formatCurrency(trade.target) : 'None'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <p className="text-slate-400 uppercase">Quantity / Margin</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {formatNumber(trade.quantity, 4)} / {formatCurrency(trade.metrics?.margin)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <p className="text-slate-400 uppercase">Realized PnL / R</p>
          <p
            className={`mt-1 text-sm font-semibold ${
              (trade.realizedPnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {trade.realizedPnl != null ? formatCurrency(trade.realizedPnl) : '—'} (
            {trade.rMultiple != null ? `${trade.rMultiple.toFixed(2)}R` : '—'})
          </p>
        </div>
      </div>

      <AiCoachPanel review={aiReview} loading={aiLoading} error={aiError} />
      <WarningList warnings={trade.warnings} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ScoreBreakdown breakdown={trade.scoreBreakdown} />

        <form
          onSubmit={handleSaveJournal}
          className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3"
        >
          <h3 className="text-sm font-semibold text-white">Trade Journal</h3>
          {journalError ? <ErrorMessage message={journalError} /> : null}
          {journalMsg ? (
            <p className="text-xs text-emerald-400">{journalMsg}</p>
          ) : null}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Setup Tag</label>
              <input
                type="text"
                value={journal.setupTag}
                onChange={(e) => setJournal({ ...journal, setupTag: e.target.value })}
                placeholder="BREAKOUT"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Emotion Tag</label>
              <input
                type="text"
                value={journal.emotionTag}
                onChange={(e) => setJournal({ ...journal, emotionTag: e.target.value })}
                placeholder="CALM"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Followed Plan?</label>
              <select
                value={journal.followedPlan}
                onChange={(e) =>
                  setJournal({ ...journal, followedPlan: e.target.value })
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-white"
              >
                <option value="">Unset</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Lesson Learned</label>
            <textarea
              rows={2}
              value={journal.lesson}
              onChange={(e) => setJournal({ ...journal, lesson: e.target.value })}
              placeholder="What worked or what needs improvement..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-white"
            />
          </div>
          <button
            type="submit"
            disabled={savingJournal}
            className="rounded-lg bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
          >
            {savingJournal ? 'Saving...' : 'Save Journal'}
          </button>
        </form>
      </div>

      {trade.exits?.length ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <h3 className="text-sm font-semibold text-white mb-2">Exits History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-2">Time</th>
                  <th className="py-2">Qty</th>
                  <th className="py-2">Price</th>
                  <th className="py-2">Fee</th>
                  <th className="py-2">Funding</th>
                  <th className="py-2">PnL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {trade.exits.map((ex, i) => (
                  <tr key={i}>
                    <td className="py-2 text-slate-400">{formatDate(ex.time)}</td>
                    <td className="py-2 text-slate-200">{formatNumber(ex.quantity, 4)}</td>
                    <td className="py-2 text-slate-200">{formatCurrency(ex.price)}</td>
                    <td className="py-2 text-slate-300">{formatCurrency(ex.fee)}</td>
                    <td className="py-2 text-slate-300">{formatCurrency(ex.fundingPaid)}</td>
                    <td
                      className={`py-2 font-semibold ${
                        ex.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatCurrency(ex.pnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
