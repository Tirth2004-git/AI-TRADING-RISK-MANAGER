import { useCallback, useState } from 'react';
import { ledgerApi } from '../api/ledgerApi.js';
import useFetch from '../hooks/useFetch.js';
import { formatCurrency, formatDate } from '../utils/format.js';
import Loader from '../components/common/Loader.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import EmptyState from '../components/common/EmptyState.jsx';

export default function LedgerPage() {
  const fetchLedger = useCallback(() => ledgerApi.list(), []);
  const { data: entries, loading, error, refetch } = useFetch(fetchLedger, []);

  const [type, setType] = useState('DEPOSIT');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      await ledgerApi.create({
        type,
        amount: Number(amount),
        note,
      });
      setAmount('');
      setNote('');
      await refetch();
    } catch (err) {
      setSubmitError(err.message || 'Failed to record ledger entry');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader label="Loading account ledger..." />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Account Ledger</h2>
        <p className="text-sm text-slate-400">
          Record deposits and withdrawals without distorting trading drawdown
        </p>
      </div>

      {submitError ? <ErrorMessage message={submitError} /> : null}

      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4"
      >
        <div>
          <label className="block text-xs text-slate-400 mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          >
            <option value="DEPOSIT">Deposit</option>
            <option value="WITHDRAWAL">Withdrawal</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Amount (USDT)</label>
          <input
            type="number"
            step="any"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="w-40 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>

        <div className="flex-1 min-w-48">
          <label className="block text-xs text-slate-400 mb-1">Note</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Transfer reference"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Add Entry'}
        </button>
      </form>

      {!entries?.length ? (
        <EmptyState
          title="No ledger entries yet"
          description="Record a deposit or withdrawal above."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/70">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {entries.map((entry) => (
                <tr key={entry._id}>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-semibold ${
                        entry.type === 'DEPOSIT'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-rose-500/15 text-rose-400'
                      }`}
                    >
                      {entry.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-white">
                    {formatCurrency(entry.amount)}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{entry.note || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {formatDate(entry.date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
