import { Link } from 'react-router-dom';
import {
  formatCurrency,
  formatDate,
  formatNumber,
  getBandBadgeClass,
} from '../../utils/format.js';

export default function TradeTable({
  trades = [],
  mode = 'open',
  onCloseTrade,
  onCancelTrade,
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/70">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-800 bg-slate-900 text-xs uppercase text-slate-400">
          <tr>
            <th className="px-4 py-3">Symbol</th>
            <th className="px-4 py-3">Side</th>
            <th className="px-4 py-3">Entry</th>
            {mode === 'history' ? <th className="px-4 py-3">Exit</th> : null}
            <th className="px-4 py-3">Stop / Target</th>
            <th className="px-4 py-3">Qty / Lev</th>
            <th className="px-4 py-3">Risk</th>
            {mode === 'history' ? <th className="px-4 py-3">PnL / R</th> : null}
            <th className="px-4 py-3">Score</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/70">
          {trades.map((trade) => (
            <tr key={trade._id} className="hover:bg-slate-800/30">
              <td className="px-4 py-3 font-semibold text-white">{trade.symbol}</td>
              <td className="px-4 py-3">
                <span
                  className={`rounded px-2 py-0.5 text-xs font-semibold ${
                    trade.side === 'LONG'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-rose-500/15 text-rose-400'
                  }`}
                >
                  {trade.side}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-200">{formatCurrency(trade.entry)}</td>
              {mode === 'history' ? (
                <td className="px-4 py-3 text-slate-200">
                  {formatCurrency(trade.exitPrice)}
                </td>
              ) : null}
              <td className="px-4 py-3 text-xs text-slate-300">
                <div>SL: {trade.stopLoss ? formatCurrency(trade.stopLoss) : 'None'}</div>
                <div>TP: {trade.target ? formatCurrency(trade.target) : 'None'}</div>
              </td>
              <td className="px-4 py-3 text-xs text-slate-300">
                <div>{formatNumber(trade.quantity, 4)}</div>
                <div className="text-slate-400">{trade.leverage}x</div>
              </td>
              <td className="px-4 py-3 text-xs text-slate-300">
                <div>{formatCurrency(trade.metrics?.amountAtRisk)}</div>
                <div className="text-slate-400">
                  {trade.metrics?.amountAtRiskPct?.toFixed(2)}%
                </div>
              </td>
              {mode === 'history' ? (
                <td className="px-4 py-3 text-xs font-semibold">
                  <div
                    className={
                      trade.realizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }
                  >
                    {formatCurrency(trade.realizedPnl)}
                  </div>
                  <div className="text-slate-400">
                    {trade.rMultiple !== null && trade.rMultiple !== undefined
                      ? `${trade.rMultiple.toFixed(2)}R`
                      : '—'}
                  </div>
                </td>
              ) : null}
              <td className="px-4 py-3">
                <span
                  className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getBandBadgeClass(
                    trade.riskBand
                  )}`}
                >
                  {trade.riskScore} · {trade.riskBand}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-slate-400">
                {formatDate(mode === 'history' ? trade.closedAt : trade.openedAt)}
              </td>
              {mode === 'open' ? (
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-2">
                    <Link
                      to={`/trades/${trade._id}`}
                      className="rounded border border-slate-700 px-2.5 py-1 text-xs text-cyan-300 hover:bg-slate-800"
                    >
                      Details
                    </Link>
                    <Link
                      to={`/trades/${trade._id}/edit`}
                      className="rounded border border-slate-700 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-800"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => onCloseTrade(trade)}
                      className="rounded border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-500/25"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => onCancelTrade(trade)}
                      className="rounded border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-300 hover:bg-rose-500/20"
                    >
                      Cancel
                    </button>
                  </div>
                </td>
              ) : (
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/trades/${trade._id}`}
                    className="rounded border border-slate-700 px-2.5 py-1 text-xs text-cyan-300 hover:bg-slate-800"
                  >
                    Details & Journal
                  </Link>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
