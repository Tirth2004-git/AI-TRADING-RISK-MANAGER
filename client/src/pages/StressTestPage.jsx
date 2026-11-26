import { useCallback, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { stressApi } from '../api/stressApi.js';
import useFetch from '../hooks/useFetch.js';
import { formatCurrency, formatNumber, formatPct } from '../utils/format.js';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import StatCard from '../components/common/StatCard.jsx';

export default function StressTestPage() {
  const fetchAdvanced = useCallback(() => stressApi.getAdvanced(), []);
  const { data: advanced } = useFetch(fetchAdvanced, []);

  const [mode, setMode] = useState('STOPS_WORK');
  const [customShock, setCustomShock] = useState('');
  const [stressResult, setStressResult] = useState(null);
  const [stressLoading, setStressLoading] = useState(false);
  const [stressError, setStressError] = useState(null);

  const [seed, setSeed] = useState('42');
  const [mcResult, setMcResult] = useState(null);
  const [mcLoading, setMcLoading] = useState(false);
  const [mcError, setMcError] = useState(null);

  const [corrInput, setCorrInput] = useState(
    'BTCUSDT: 62000, 63500, 61800, 64200\nETHUSDT: 3100, 3190, 3090, 3240'
  );
  const [corrResult, setCorrResult] = useState(null);
  const [corrError, setCorrError] = useState(null);

  const handleRunStress = async (e) => {
    e.preventDefault();
    setStressLoading(true);
    setStressError(null);
    try {
      const res = await stressApi.runStress({
        mode,
        customShockPct: customShock !== '' ? Number(customShock) : null,
      });
      setStressResult(res);
    } catch (err) {
      setStressError(err.message || 'Stress test failed');
    } finally {
      setStressLoading(false);
    }
  };

  const handleRunMc = async (e) => {
    e.preventDefault();
    setMcLoading(true);
    setMcError(null);
    try {
      const res = await stressApi.runMonteCarlo({
        runs: 10000,
        tradesPerRun: 100,
        seed: Number(seed || 42),
      });
      setMcResult(res);
    } catch (err) {
      setMcError(err.message || 'Monte Carlo failed');
    } finally {
      setMcLoading(false);
    }
  };

  const handleRunCorrelation = async (e) => {
    e.preventDefault();
    setCorrError(null);
    try {
      const series = {};
      for (const line of corrInput.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const [sym, vals] = trimmed.split(':');
        if (!sym || !vals) continue;
        const nums = vals
          .split(',')
          .map((v) => Number(v.trim()))
          .filter((n) => Number.isFinite(n) && n > 0);
        if (nums.length > 0) series[sym.trim().toUpperCase()] = nums;
      }
      const res = await stressApi.runCorrelation({ series });
      setCorrResult(res);
    } catch (err) {
      setCorrError(err.message || 'Correlation failed');
    }
  };

  const mcChartData = mcResult?.eligible
    ? [
        { label: '5th %ile', equity: mcResult.p5FinalEquity },
        { label: 'Starting', equity: mcResult.startingEquity },
        { label: 'Median', equity: mcResult.medianFinalEquity },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">
          Stress Test, Monte Carlo & Advanced Risk
        </h2>
        <p className="text-sm text-slate-400">
          Shock open positions, bootstrap R-multiples, and inspect Risk of Ruin, Kelly, and Recovery
        </p>
      </div>

      {/* Advanced Risk Metrics */}
      {advanced ? (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Analytical Risk of Ruin (50%)"
            value={
              advanced.riskOfRuin.eligible
                ? formatPct(advanced.riskOfRuin.riskOfRuinPct, 2)
                : 'Insufficient data'
            }
            subtext={
              advanced.riskOfRuin.eligible
                ? `Units to ruin: ${advanced.riskOfRuin.unitsToRuin} · Analytical`
                : 'Need closed wins & losses'
            }
          />
          <StatCard
            label="Kelly Criterion (Full / Half)"
            value={
              advanced.kelly.eligible
                ? `${formatPct(advanced.kelly.fullKellyPct, 1)} / ${formatPct(
                    advanced.kelly.halfKellyPct,
                    1
                  )}`
                : 'Insufficient data'
            }
            subtext={
              advanced.kelly.eligible
                ? `Quarter Kelly: ${formatPct(advanced.kelly.quarterKellyPct, 1)}`
                : 'Advisory only; never auto-applied'
            }
          />
          <StatCard
            label="Required Recovery"
            value={formatPct(advanced.drawdownRecovery.requiredRecoveryPct)}
            subtext={`Max DD: ${formatPct(advanced.drawdownRecovery.maxDrawdownPct)}`}
            tone={
              advanced.drawdownRecovery.requiredRecoveryPct > 10 ? 'warning' : 'default'
            }
          />
          <StatCard
            label="Daily Risk Budget Remaining"
            value={formatPct(advanced.riskBudget.dailyRemainingPct)}
            subtext={`Weekly remaining: ${formatPct(advanced.riskBudget.weeklyRemainingPct)}`}
          />
        </section>
      ) : null}

      {/* Stress Test Section */}
      <section className="space-y-4">
        <form
          onSubmit={handleRunStress}
          className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4"
        >
          <div>
            <label className="block text-xs text-slate-400 mb-1">Execution Mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              <option value="STOPS_WORK">Stops Work (with slippage)</option>
              <option value="GAP">Gap / Slippage Failure</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Custom Shock % (optional)
            </label>
            <input
              type="number"
              step="any"
              value={customShock}
              onChange={(e) => setCustomShock(e.target.value)}
              placeholder="-35"
              className="w-36 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>

          <button
            type="submit"
            disabled={stressLoading}
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
          >
            {stressLoading ? 'Running...' : 'Run Stress Test'}
          </button>
        </form>

        {stressError ? <ErrorMessage message={stressError} /> : null}

        {stressResult ? (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/70">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-slate-800 bg-slate-900 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Shock</th>
                  <th className="px-4 py-3">Equity Before</th>
                  <th className="px-4 py-3">Change</th>
                  <th className="px-4 py-3">Equity After</th>
                  <th className="px-4 py-3">Liquidated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {stressResult.scenarios.map((sc) => (
                  <tr key={sc.shockPct}>
                    <td className="px-4 py-3 font-semibold text-white">
                      {sc.shockPct > 0 ? `+${sc.shockPct}%` : `${sc.shockPct}%`}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {formatCurrency(sc.equityBefore)}
                    </td>
                    <td
                      className={`px-4 py-3 font-semibold ${
                        sc.totalChange >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatCurrency(sc.totalChange)}
                    </td>
                    <td className="px-4 py-3 text-white">
                      {formatCurrency(sc.equityAfter)}
                    </td>
                    <td className="px-4 py-3 text-amber-300">{sc.liquidatedCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {/* Monte Carlo Section */}
      <section className="space-y-4">
        <form
          onSubmit={handleRunMc}
          className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4"
        >
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Random Seed</label>
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                className="w-32 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>
            <button
              type="submit"
              disabled={mcLoading}
              className="rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-4 py-2 text-sm font-medium text-cyan-300 hover:bg-cyan-500/25 disabled:opacity-50"
            >
              {mcLoading ? 'Simulating...' : 'Run 10,000 Monte Carlo Runs'}
            </button>
          </div>

          <span className="text-xs text-slate-400">
            Simulation from your own history, not a prediction
          </span>
        </form>

        {mcError ? <ErrorMessage message={mcError} /> : null}

        {mcResult ? (
          mcResult.eligible ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <StatCard
                  label="Median Final Equity"
                  value={formatCurrency(mcResult.medianFinalEquity)}
                />
                <StatCard
                  label="5th Percentile Equity"
                  value={formatCurrency(mcResult.p5FinalEquity)}
                  tone="warning"
                />
                <StatCard label="Prob >= 20% DD" value={formatPct(mcResult.probDrawdown20)} />
                <StatCard label="Prob >= 30% DD" value={formatPct(mcResult.probDrawdown30)} />
                <StatCard
                  label="Prob >= 50% DD"
                  value={formatPct(mcResult.probDrawdown50)}
                  tone={mcResult.probDrawdown50 > 5 ? 'negative' : 'default'}
                />
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <h3 className="text-sm font-semibold text-white mb-2">
                  Monte Carlo Equity Distribution
                </h3>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mcChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 12 }} />
                      <YAxis
                        stroke="#64748b"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(v) => `$${v}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '0.5rem',
                          fontSize: '12px',
                        }}
                        formatter={(v) => [formatCurrency(v), 'Equity']}
                      />
                      <Bar dataKey="equity" fill="#22d3ee" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              Monte Carlo requires at least {mcResult.requiredTrades} closed trades. You
              currently have {mcResult.closedTradesCount} ({mcResult.tradesNeeded} more
              needed).
            </div>
          )
        ) : null}
      </section>

      {/* Manual Price Series Correlation */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Manual Return Correlation Calculator
          </h3>
          <p className="text-xs text-slate-400">
            No live price feeds exist in local-first mode. Paste close prices per symbol
            (`SYMBOL: p1, p2, p3...`) to compute Pearson return correlation.
          </p>
        </div>

        <form onSubmit={handleRunCorrelation} className="space-y-3">
          <textarea
            rows={3}
            value={corrInput}
            onChange={(e) => setCorrInput(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-white"
          />
          <button
            type="submit"
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700"
          >
            Compute Correlation
          </button>
        </form>

        {corrError ? <ErrorMessage message={corrError} /> : null}
        {corrResult ? (
          corrResult.eligible ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-2">Symbol</th>
                    {corrResult.symbols.map((s) => (
                      <th key={s} className="py-2">
                        {s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {corrResult.symbols.map((s1) => (
                    <tr key={s1}>
                      <td className="py-2 font-semibold text-white">{s1}</td>
                      {corrResult.symbols.map((s2) => (
                        <td key={s2} className="py-2 text-slate-300">
                          {corrResult.matrix[s1][s2] !== null
                            ? formatNumber(corrResult.matrix[s1][s2], 3)
                            : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[11px] text-slate-500">{corrResult.limitation}</p>
            </div>
          ) : (
            <p className="text-xs text-amber-300">{corrResult.reason}</p>
          )
        ) : null}
      </section>
    </div>
  );
}
