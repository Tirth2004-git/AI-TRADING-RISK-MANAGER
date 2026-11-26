import { formatCurrency, formatNumber, formatPct } from '../../utils/format.js';
import RiskGauge from './RiskGauge.jsx';
import ScoreBreakdown from './ScoreBreakdown.jsx';
import WarningList from './WarningList.jsx';

export default function RiskResults({ analysis, loading, error }) {
  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
        {error}
      </div>
    );
  }

  if (loading && !analysis) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-sm text-slate-400">
        Calculating risk metrics...
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
        Enter trade parameters on the left to see live position sizing, costs,
        liquidation estimate, and guardrail status.
      </div>
    );
  }

  const {
    metrics,
    sizing,
    riskScore,
    riskBand,
    scoreBreakdown,
    warnings,
    guardrails,
    leverageWhatIf = [],
  } = analysis;

  return (
    <div className="space-y-4">
      {guardrails ? (
        <div
          className={`rounded-xl border p-4 ${
            guardrails.status === 'BLOCK'
              ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
              : guardrails.status === 'WARN'
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
              : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">
              Guardrail: {guardrails.status}
            </span>
            {sizing ? (
              <span className="text-xs opacity-90">{sizing.reason}</span>
            ) : null}
          </div>
          {guardrails.reasons?.length ? (
            <ul className="mt-2 list-disc pl-4 text-xs space-y-1">
              {guardrails.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <RiskGauge score={riskScore} band={riskBand} />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <p className="text-[11px] uppercase text-slate-400">Quantity</p>
          <p className="mt-1 text-base font-semibold text-white">
            {formatNumber(metrics.quantity, 4)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <p className="text-[11px] uppercase text-slate-400">Notional / Margin</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {formatCurrency(metrics.notional)} / {formatCurrency(metrics.margin)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <p className="text-[11px] uppercase text-slate-400">Amount at Risk</p>
          <p className="mt-1 text-sm font-semibold text-rose-400">
            {formatCurrency(metrics.amountAtRisk)} ({formatPct(metrics.amountAtRiskPct)})
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <p className="text-[11px] uppercase text-slate-400">Gross / Net R:R</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {metrics.riskReward !== null ? `${formatNumber(metrics.riskReward, 2)}R` : '—'}
            {' / '}
            <span className="text-cyan-300">
              {metrics.netRiskReward !== null
                ? `${formatNumber(metrics.netRiskReward, 2)}R`
                : '—'}
            </span>
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <p className="text-[11px] uppercase text-slate-400">Break-Even</p>
          <p className="mt-1 text-base font-semibold text-white">
            {formatCurrency(metrics.breakEven, 4)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <p className="text-[11px] uppercase text-slate-400">Est. Liquidation</p>
          <p
            className={`mt-1 text-sm font-semibold ${
              metrics.stopBeyondLiquidation ? 'text-rose-400' : 'text-amber-300'
            }`}
          >
            {formatCurrency(metrics.liquidation)} ({formatPct(metrics.liquidationDistancePct)})
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300 flex flex-wrap gap-4">
        <span>Entry Fee: {formatCurrency(metrics.entryFee)}</span>
        <span>Est. Exit + Slippage: {formatCurrency(metrics.estimatedExitCost)}</span>
        <span>Funding Cost: {formatCurrency(metrics.fundingCost)}</span>
        {metrics.netReward !== null ? (
          <span>Net Reward: {formatCurrency(metrics.netReward)}</span>
        ) : null}
      </div>

      {leverageWhatIf.length > 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Leverage What-If
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-1.5">Leverage</th>
                  <th className="py-1.5">Margin</th>
                  <th className="py-1.5">Est. Liquidation</th>
                  <th className="py-1.5">Liq Distance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {leverageWhatIf.map((row) => (
                  <tr key={row.leverage}>
                    <td className="py-1.5 font-semibold text-white">{row.leverage}x</td>
                    <td className="py-1.5 text-slate-300">
                      {row.allowed ? formatCurrency(row.margin) : 'Exceeds limit'}
                    </td>
                    <td className="py-1.5 text-slate-300">
                      {row.allowed ? formatCurrency(row.liquidation) : '—'}
                    </td>
                    <td className="py-1.5 text-slate-300">
                      {row.allowed ? formatPct(row.liquidationDistancePct) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <p className="text-[11px] text-slate-500">
        Liquidation price is an estimate; ignores fees, funding and exchange tiers.
      </p>

      <WarningList warnings={warnings} />
      <ScoreBreakdown breakdown={scoreBreakdown} />
    </div>
  );
}
