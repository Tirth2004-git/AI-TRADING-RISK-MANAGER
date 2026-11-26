import { useCallback, useState } from 'react';
import { symbolApi } from '../api/symbolApi.js';
import useFetch from '../hooks/useFetch.js';
import Loader from '../components/common/Loader.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import EmptyState from '../components/common/EmptyState.jsx';

const INITIAL_FORM = {
  symbol: '',
  maintenanceMarginPct: '0.5',
  maxLeverage: '20',
  qtyStep: '',
  minNotional: '',
  correlationGroup: '',
  beta: '1',
};

export default function SymbolsPage() {
  const fetchSymbols = useCallback(() => symbolApi.list(), []);
  const { data: profiles, loading, error, refetch } = useFetch(fetchSymbols, []);

  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await symbolApi.create({
        symbol: form.symbol.trim().toUpperCase(),
        maintenanceMarginPct: Number(form.maintenanceMarginPct),
        maxLeverage: Number(form.maxLeverage),
        qtyStep: form.qtyStep !== '' ? Number(form.qtyStep) : null,
        minNotional: form.minNotional !== '' ? Number(form.minNotional) : null,
        correlationGroup: form.correlationGroup.trim().toUpperCase(),
        beta: Number(form.beta || 1),
      });
      setForm(INITIAL_FORM);
      await refetch();
    } catch (err) {
      setSaveError(err.message || 'Failed to save symbol profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setSaveError(null);
    try {
      await symbolApi.remove(id);
      await refetch();
    } catch (err) {
      setSaveError(err.message || 'Failed to delete symbol profile');
    }
  };

  if (loading) return <Loader label="Loading symbol profiles..." />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Symbol Profiles</h2>
        <p className="text-sm text-slate-400">
          Override maintenance margin, max leverage, step size, correlation group, and beta per contract
        </p>
      </div>

      {saveError ? <ErrorMessage message={saveError} /> : null}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 items-end rounded-xl border border-slate-800 bg-slate-900/70 p-4"
      >
        <div>
          <label className="block text-xs text-slate-400 mb-1">Symbol</label>
          <input
            type="text"
            value={form.symbol}
            onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
            placeholder="BTCUSDT"
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">MMR %</label>
          <input
            type="number"
            step="any"
            value={form.maintenanceMarginPct}
            onChange={(e) => setForm({ ...form, maintenanceMarginPct: e.target.value })}
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Max Lev</label>
          <input
            type="number"
            step="1"
            value={form.maxLeverage}
            onChange={(e) => setForm({ ...form, maxLeverage: e.target.value })}
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Qty Step</label>
          <input
            type="number"
            step="any"
            value={form.qtyStep}
            onChange={(e) => setForm({ ...form, qtyStep: e.target.value })}
            placeholder="0.001"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Min Notional</label>
          <input
            type="number"
            step="any"
            value={form.minNotional}
            onChange={(e) => setForm({ ...form, minNotional: e.target.value })}
            placeholder="10"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Group</label>
          <input
            type="text"
            value={form.correlationGroup}
            onChange={(e) =>
              setForm({ ...form, correlationGroup: e.target.value.toUpperCase() })
            }
            placeholder="MAJORS"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Beta</label>
          <input
            type="number"
            step="0.1"
            value={form.beta}
            onChange={(e) => setForm({ ...form, beta: e.target.value })}
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          {saving ? 'Adding...' : 'Add'}
        </button>
      </form>

      {!profiles?.length ? (
        <EmptyState
          title="No symbol profiles configured"
          description="Global settings are used until you add a symbol override."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/70">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Symbol</th>
                <th className="px-4 py-3">MMR %</th>
                <th className="px-4 py-3">Max Lev</th>
                <th className="px-4 py-3">Qty Step</th>
                <th className="px-4 py-3">Min Notional</th>
                <th className="px-4 py-3">Group</th>
                <th className="px-4 py-3">Beta</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {profiles.map((p) => (
                <tr key={p._id}>
                  <td className="px-4 py-3 font-semibold text-white">{p.symbol}</td>
                  <td className="px-4 py-3 text-slate-300">{p.maintenanceMarginPct}%</td>
                  <td className="px-4 py-3 text-slate-300">{p.maxLeverage}x</td>
                  <td className="px-4 py-3 text-slate-300">{p.qtyStep ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-300">{p.minNotional ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-300">{p.correlationGroup}</td>
                  <td className="px-4 py-3 text-slate-300">{p.beta}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(p._id)}
                      className="rounded border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-300 hover:bg-rose-500/20"
                    >
                      Delete
                    </button>
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
