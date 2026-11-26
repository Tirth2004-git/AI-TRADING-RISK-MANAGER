import { useCallback, useEffect, useState } from 'react';
import { settingsApi } from '../api/settingsApi.js';
import { exportApi } from '../api/exportApi.js';
import { demoApi } from '../api/demoApi.js';
import useFetch from '../hooks/useFetch.js';
import Loader from '../components/common/Loader.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import Modal from '../components/common/Modal.jsx';

const FIELDS = [
  { key: 'startingBalance', label: 'Starting Balance (USDT)', step: 'any', min: 1 },
  { key: 'riskPerTradePct', label: 'Risk Per Trade (%)', step: '0.1', min: 0.01, max: 100 },
  { key: 'maxLeverage', label: 'Max Leverage (x)', step: '1', min: 1, max: 125 },
  { key: 'minRiskReward', label: 'Minimum Risk:Reward', step: '0.1', min: 0.1 },
  { key: 'maxOpenRiskPct', label: 'Max Open Risk (%)', step: '0.1', min: 0.1, max: 100 },
  { key: 'maxDrawdownPct', label: 'Max Drawdown (%)', step: '0.1', min: 0.1, max: 100 },
  { key: 'maxDailyLossPct', label: 'Max Daily Loss (%)', step: '0.1', min: 0.1, max: 100 },
  { key: 'maintenanceMarginPct', label: 'Maintenance Margin (%)', step: '0.05', min: 0.01, max: 50 },
  { key: 'takerFeePct', label: 'Est. Taker Fee (%)', step: '0.01', min: 0, max: 10 },
  { key: 'slippagePct', label: 'Est. Slippage (%)', step: '0.01', min: 0, max: 10 },
  { key: 'defaultFundingRatePct', label: 'Default Funding Rate (%)', step: '0.01', min: -5, max: 5 },
  { key: 'maxWeeklyLossPct', label: 'Max Weekly Loss (%)', step: '0.1', min: 0.1, max: 100 },
  { key: 'maxTradesPerDay', label: 'Max Trades Per Day', step: '1', min: 1, max: 500 },
  { key: 'cooldownMinutes', label: 'Loss Cooldown (min)', step: '1', min: 0, max: 10080 },
  { key: 'cooldownAfterLosses', label: 'Cooldown After N Losses', step: '1', min: 1, max: 50 },
  { key: 'maxGroupRiskPct', label: 'Max Group Risk (%)', step: '0.1', min: 0.1, max: 100 },
];

export default function SettingsPage() {
  const fetchSettings = useCallback(() => settingsApi.get(), []);
  const { data, loading, error, refetch } = useFetch(fetchSettings, []);

  const fetchDemo = useCallback(() => demoApi.getStatus(), []);
  const { data: demoStatus, refetch: refetchDemo } = useFetch(fetchDemo, []);

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [savedMsg, setSavedMsg] = useState('');

  const [demoLoading, setDemoLoading] = useState(false);
  const [demoMsg, setDemoMsg] = useState('');
  const [demoError, setDemoError] = useState(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  useEffect(() => {
    if (data) {
      const next = {};
      for (const f of FIELDS) {
        next[f.key] = data[f.key] != null ? String(data[f.key]) : '';
      }
      setForm(next);
    }
  }, [data]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSavedMsg('');
    try {
      const payload = {};
      for (const f of FIELDS) {
        payload[f.key] = Number(form[f.key]);
      }
      await settingsApi.update(payload);
      setSavedMsg('Settings saved successfully.');
      window.dispatchEvent(new Event('risk-manager:refresh'));
      await refetch();
    } catch (err) {
      setSaveError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateDemo = async () => {
    setDemoLoading(true);
    setDemoMsg('');
    setDemoError(null);
    try {
      const res = await demoApi.generate();
      setDemoMsg(
        res.alreadySeeded
          ? 'Demo data is already active (no duplicates created).'
          : `Generated ${res.created.trades} simulated trades, ${res.created.ledgerEntries} ledger entries, and ${res.created.symbolProfiles} symbol profiles.`
      );
      window.dispatchEvent(new Event('risk-manager:refresh'));
      await refetchDemo();
    } catch (err) {
      setDemoError(err.message || 'Failed to generate demo data');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleConfirmResetDemo = async () => {
    setDemoLoading(true);
    setDemoMsg('');
    setDemoError(null);
    try {
      const res = await demoApi.reset();
      setConfirmResetOpen(false);
      setDemoMsg(
        `Reset complete: removed ${res.deleted.trades} demo trades and ${res.deleted.ledgerEntries} demo ledger entries. User records and settings were preserved.`
      );
      window.dispatchEvent(new Event('risk-manager:refresh'));
      await refetchDemo();
    } catch (err) {
      setDemoError(err.message || 'Failed to reset demo data');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleExportJson = async () => {
    try {
      const dump = await exportApi.exportAll();
      const blob = new Blob([JSON.stringify(dump, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'risk-manager-export.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setSaveError(err.message || 'Failed to export JSON');
    }
  };

  if (loading && !form) return <Loader label="Loading settings..." />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!form) return null;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Risk Settings & Demo Mode</h2>
          <p className="text-sm text-slate-400">
            Configure sizing, trading cost estimates, guardrails, and demo simulation data
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportJson}
          className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
        >
          Export All JSON
        </button>
      </div>

      {/* Demo Mode Controls */}
      <section className="rounded-xl border border-cyan-500/30 bg-slate-900/80 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-white">Demo Mode</h3>
            <p className="text-xs text-slate-400">
              Populate isolated, clearly labelled simulated trades across 60–90 days without affecting real user records.
            </p>
          </div>
          <span
            className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${
              demoStatus?.active
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                : 'border-slate-700 bg-slate-800 text-slate-300'
            }`}
          >
            {demoStatus?.active ? 'Demo Active' : 'No Demo Data'}
          </span>
        </div>

        {demoStatus ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
              <div className="text-slate-400">Demo Trades</div>
              <div className="mt-0.5 font-semibold text-white">
                {demoStatus.counts.trades} ({demoStatus.counts.closedTrades}C /{' '}
                {demoStatus.counts.openTrades}O / {demoStatus.counts.cancelledTrades}X)
              </div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
              <div className="text-slate-400">Demo Ledger</div>
              <div className="mt-0.5 font-semibold text-white">
                {demoStatus.counts.ledgerEntries} entries
              </div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
              <div className="text-slate-400">Demo Symbols</div>
              <div className="mt-0.5 font-semibold text-white">
                {demoStatus.counts.symbolProfiles} profiles
              </div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
              <div className="text-slate-400">Real User Trades</div>
              <div className="mt-0.5 font-semibold text-cyan-300">
                {demoStatus.userCounts.trades} preserved
              </div>
            </div>
          </div>
        ) : null}

        {demoError ? <ErrorMessage message={demoError} /> : null}
        {demoMsg ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
            {demoMsg}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleGenerateDemo}
            disabled={demoLoading}
            className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
          >
            {demoLoading ? 'Working...' : 'Generate Demo Data'}
          </button>
          <button
            type="button"
            onClick={refetchDemo}
            disabled={demoLoading}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700"
          >
            Check Demo Status
          </button>
          <button
            type="button"
            onClick={() => setConfirmResetOpen(true)}
            disabled={demoLoading || !demoStatus?.active}
            className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/20 disabled:opacity-40"
          >
            Reset Demo Data
          </button>
        </div>
      </section>

      {saveError ? <ErrorMessage message={saveError} /> : null}
      {savedMsg ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {savedMsg}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FIELDS.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {field.label}
              </label>
              <input
                type="number"
                step={field.step}
                min={field.min}
                max={field.max}
                value={form[field.key]}
                onChange={(e) =>
                  setForm({ ...form, [field.key]: e.target.value })
                }
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
          ))}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-cyan-500 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      <Modal
        isOpen={confirmResetOpen}
        title="Confirm Demo Data Reset"
        onClose={() => setConfirmResetOpen(false)}
      >
        <div className="space-y-4 text-sm text-slate-300">
          <p>
            This will permanently delete only simulated records marked{' '}
            <code className="text-cyan-300">isDemo: true</code>. Your personal trades,
            ledger entries, and risk settings will not be touched.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmResetOpen(false)}
              className="rounded-lg border border-slate-700 px-4 py-2 text-xs text-slate-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmResetDemo}
              disabled={demoLoading}
              className="rounded-lg bg-rose-500 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-400 disabled:opacity-50"
            >
              {demoLoading ? 'Resetting...' : 'Yes, Reset Demo Data'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
