import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { tradeApi } from '../api/tradeApi.js';
import useFetch from '../hooks/useFetch.js';
import { formatCurrency, formatNumber, formatPct } from '../utils/format.js';
import Loader from '../components/common/Loader.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Modal from '../components/common/Modal.jsx';
import CloseTradeModal from '../components/trade/CloseTradeModal.jsx';

export default function PositionsPage() {
  const fetchOpen = useCallback(() => tradeApi.list({ status: 'OPEN' }), []);
  const { data: trades, loading, error, refetch } = useFetch(fetchOpen, []);

  const [closingTrade, setClosingTrade] = useState(null);
  const [exitTrade, setExitTrade] = useState(null);
  const [exitForm, setExitForm] = useState({ quantity: '', price: '', fee: '0', fundingPaid: '0' });

  const [stopTrade, setStopTrade] = useState(null);
  const [stopForm, setStopForm] = useState({ stopLoss: '', reason: '' });

  const [markTrade, setMarkTrade] = useState(null);
  const [markPriceInput, setMarkPriceInput] = useState('');

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  const handleConfirmClose = async (id, payload) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await tradeApi.close(id, payload);
      setClosingTrade(null);
      await refetch();
    } catch (err) {
      setActionError(err.message || 'Failed to close trade');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePartialExit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      await tradeApi.addExit(exitTrade._id, {
        quantity: Number(exitForm.quantity),
        price: Number(exitForm.price),
        fee: Number(exitForm.fee || 0),
        fundingPaid: Number(exitForm.fundingPaid || 0),
      });
      setExitTrade(null);
      await refetch();
    } catch (err) {
      setActionError(err.message || 'Failed to record exit');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMoveStop = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      await tradeApi.moveStop(stopTrade._id, {
        stopLoss: Number(stopForm.stopLoss),
        reason: stopForm.reason,
      });
      setStopTrade(null);
      await refetch();
    } catch (err) {
      setActionError(err.message || 'Failed to move stop-loss');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateMark = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      await tradeApi.updateMark(markTrade._id, {
        markPrice: Number(markPriceInput),
      });
      setMarkTrade(null);
      await refetch();
    } catch (err) {
      setActionError(err.message || 'Failed to update mark price');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelTrade = async (trade) => {
    setActionError(null);
    try {
      await tradeApi.cancel(trade._id);
      await refetch();
    } catch (err) {
      setActionError(err.message || 'Failed to cancel trade');
    }
  };

  if (loading) return <Loader label="Loading open positions..." />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Open Positions</h2>
          <p className="text-sm text-slate-400">
            Update mark price, move stop-loss, record partial exits, or close positions
          </p>
        </div>

        <Link
          to="/trades/new"
          className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
        >
          + New Trade
        </Link>
      </div>

      {actionError ? <ErrorMessage message={actionError} /> : null}

      {!trades?.length ? (
        <EmptyState
          title="No open positions"
          description="Run a risk check on a new trade to open a position."
          action={
            <Link
              to="/trades/new"
              className="inline-block rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
            >
              Create Trade
            </Link>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/70">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="border-b border-slate-800 bg-slate-900 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Symbol / Side</th>
                <th className="px-4 py-3">Entry / Stop</th>
                <th className="px-4 py-3">Rem / Init Qty</th>
                <th className="px-4 py-3">Mark / Unrealized</th>
                <th className="px-4 py-3">Liq Distance</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {trades.map((t) => (
                <tr key={t._id} className="hover:bg-slate-800/30">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-white">{t.symbol}</span>{' '}
                    <span
                      className={`ml-1 rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                        t.side === 'LONG'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-rose-500/15 text-rose-400'
                      }`}
                    >
                      {t.side} {t.leverage}x
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    <div>Entry: {formatCurrency(t.entry)}</div>
                    <div className="text-xs text-slate-400">
                      SL: {t.stopLoss ? formatCurrency(t.stopLoss) : 'None'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {formatNumber(t.remainingQuantity ?? t.quantity, 4)} /{' '}
                    {formatNumber(t.initialQuantity ?? t.quantity, 4)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-200">
                      {formatCurrency(t.markState?.effectiveMark)}{' '}
                      <span className="text-[11px] text-slate-400">
                        ({t.markState?.markLabel}
                        {t.markState?.isMarkStale ? ' · stale' : ''})
                      </span>
                    </div>
                    <div
                      className={`text-xs font-semibold ${
                        (t.markState?.unrealizedPnl ?? 0) >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {formatCurrency(t.markState?.unrealizedPnl ?? 0)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-amber-300 font-medium">
                    {formatPct(t.markState?.distanceToLiquidationPct)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex flex-wrap justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setMarkTrade(t);
                          setMarkPriceInput(String(t.markPrice ?? t.entry));
                        }}
                        className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
                      >
                        Mark
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStopTrade(t);
                          setStopForm({
                            stopLoss: String(t.stopLoss ?? ''),
                            reason: '',
                          });
                        }}
                        className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
                      >
                        Stop
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setExitTrade(t);
                          setExitForm({
                            quantity: String(t.remainingQuantity ?? t.quantity),
                            price: String(t.markPrice ?? t.entry),
                            fee: '0',
                            fundingPaid: '0',
                          });
                        }}
                        className="rounded border border-cyan-500/40 bg-cyan-500/15 px-2 py-1 text-xs text-cyan-300 hover:bg-cyan-500/25"
                      >
                        Exit
                      </button>
                      <Link
                        to={`/trades/${t._id}`}
                        className="rounded border border-slate-700 px-2 py-1 text-xs text-cyan-300 hover:bg-slate-800"
                      >
                        Details
                      </Link>
                      <Link
                        to={`/trades/${t._id}/edit`}
                        className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => setClosingTrade(t)}
                        className="rounded border border-emerald-500/40 bg-emerald-500/15 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/25"
                      >
                        Close
                      </button>
                      {!t.exits?.length ? (
                        <button
                          type="button"
                          onClick={() => handleCancelTrade(t)}
                          className="rounded border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/20"
                        >
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CloseTradeModal
        trade={closingTrade}
        isOpen={Boolean(closingTrade)}
        onClose={() => setClosingTrade(null)}
        onConfirm={handleConfirmClose}
        loading={actionLoading}
      />

      <Modal
        isOpen={Boolean(markTrade)}
        title={markTrade ? `Update Mark Price (${markTrade.symbol})` : 'Mark Price'}
        onClose={() => setMarkTrade(null)}
      >
        <form onSubmit={handleUpdateMark} className="space-y-4">
          <input
            type="number"
            step="any"
            min="0"
            value={markPriceInput}
            onChange={(e) => setMarkPriceInput(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setMarkTrade(null)}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950"
            >
              Save Mark
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(stopTrade)}
        title={stopTrade ? `Move Stop-Loss (${stopTrade.symbol})` : 'Move Stop'}
        onClose={() => setStopTrade(null)}
      >
        <form onSubmit={handleMoveStop} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-300 mb-1">New Stop-Loss</label>
            <input
              type="number"
              step="any"
              min="0"
              value={stopForm.stopLoss}
              onChange={(e) => setStopForm({ ...stopForm, stopLoss: e.target.value })}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-300 mb-1">
              Reason (required if widening)
            </label>
            <input
              type="text"
              value={stopForm.reason}
              onChange={(e) => setStopForm({ ...stopForm, reason: e.target.value })}
              placeholder="e.g. Trail stop to lock profit"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setStopTrade(null)}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950"
            >
              Update Stop
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(exitTrade)}
        title={exitTrade ? `Record Partial Exit (${exitTrade.symbol})` : 'Partial Exit'}
        onClose={() => setExitTrade(null)}
      >
        <form onSubmit={handlePartialExit} className="space-y-3">
          <div>
            <label className="block text-xs text-slate-300 mb-1">Quantity</label>
            <input
              type="number"
              step="any"
              min="0"
              value={exitForm.quantity}
              onChange={(e) => setExitForm({ ...exitForm, quantity: e.target.value })}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-300 mb-1">Exit Price</label>
            <input
              type="number"
              step="any"
              min="0"
              value={exitForm.price}
              onChange={(e) => setExitForm({ ...exitForm, price: e.target.value })}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Exit Fee</label>
              <input
                type="number"
                step="any"
                min="0"
                value={exitForm.fee}
                onChange={(e) => setExitForm({ ...exitForm, fee: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Funding Paid</label>
              <input
                type="number"
                step="any"
                value={exitForm.fundingPaid}
                onChange={(e) => setExitForm({ ...exitForm, fundingPaid: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setExitTrade(null)}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950"
            >
              Record Exit
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
