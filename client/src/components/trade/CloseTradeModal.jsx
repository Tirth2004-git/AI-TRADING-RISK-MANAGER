import { useEffect, useState } from 'react';
import Modal from '../common/Modal.jsx';

export default function CloseTradeModal({ trade, isOpen, onClose, onConfirm, loading }) {
  const [exitPrice, setExitPrice] = useState('');
  const [fees, setFees] = useState('0');
  const [error, setError] = useState('');

  useEffect(() => {
    if (trade) {
      setExitPrice(String(trade.entry || ''));
      setFees('0');
      setError('');
    }
  }, [trade]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const exitNum = Number(exitPrice);
    const feesNum = Number(fees || 0);
    if (!Number.isFinite(exitNum) || exitNum <= 0) {
      setError('Exit price must be greater than 0');
      return;
    }
    if (!Number.isFinite(feesNum) || feesNum < 0) {
      setError('Fees must be 0 or greater');
      return;
    }
    setError('');
    await onConfirm(trade._id, { exitPrice: exitNum, fees: feesNum });
  };

  return (
    <Modal
      isOpen={isOpen}
      title={trade ? `Close ${trade.symbol} (${trade.side})` : 'Close Trade'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <p className="rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-300">{error}</p>
        ) : null}

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Exit Price (USDT)
          </label>
          <input
            type="number"
            step="any"
            min="0"
            value={exitPrice}
            onChange={(e) => setExitPrice(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Fees (USDT)
          </label>
          <input
            type="number"
            step="any"
            min="0"
            value={fees}
            onChange={(e) => setFees(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            {loading ? 'Closing...' : 'Confirm Close'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
