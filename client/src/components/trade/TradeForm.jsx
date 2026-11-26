export default function TradeForm({
  values,
  onChange,
  onSubmit,
  requiresAcknowledgement,
  acknowledged,
  onAcknowledgedChange,
  isBlocked,
  overrideReason,
  onOverrideReasonChange,
  submitting,
  isEdit,
  onAskAi,
  aiLoading,
  canAnalyze,
}) {
  const handleField = (field) => (e) => {
    onChange({ ...values, [field]: e.target.value });
  };

  const overrideValid = !isBlocked || overrideReason.trim().length >= 20;

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Symbol
          </label>
          <input
            type="text"
            value={values.symbol}
            onChange={(e) =>
              onChange({ ...values, symbol: e.target.value.toUpperCase() })
            }
            placeholder="BTCUSDT"
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Side
          </label>
          <div className="grid grid-cols-2 gap-2">
            {['LONG', 'SHORT'].map((side) => (
              <button
                key={side}
                type="button"
                onClick={() => onChange({ ...values, side })}
                className={`rounded-lg border py-2 text-sm font-semibold transition-colors ${
                  values.side === side
                    ? side === 'LONG'
                      ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                      : 'border-rose-500/50 bg-rose-500/20 text-rose-300'
                    : 'border-slate-700 bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                {side}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Entry Price (USDT)
          </label>
          <input
            type="number"
            step="any"
            min="0"
            value={values.entry}
            onChange={handleField('entry')}
            placeholder="65000"
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Leverage (1–125x)
          </label>
          <input
            type="number"
            step="1"
            min="1"
            max="125"
            value={values.leverage}
            onChange={handleField('leverage')}
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Stop-Loss (optional)
          </label>
          <input
            type="number"
            step="any"
            min="0"
            value={values.stopLoss}
            onChange={handleField('stopLoss')}
            placeholder="Auto-sizes if set"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Target Price (optional)
          </label>
          <input
            type="number"
            step="any"
            min="0"
            value={values.target}
            onChange={handleField('target')}
            placeholder="Take profit"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Quantity {values.stopLoss ? '(optional)' : '(required)'}
          </label>
          <input
            type="number"
            step="any"
            min="0"
            value={values.quantity}
            onChange={handleField('quantity')}
            placeholder="Auto"
            required={!values.stopLoss}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Funding Rate (%)
          </label>
          <input
            type="number"
            step="any"
            value={values.fundingRatePct}
            onChange={handleField('fundingRatePct')}
            placeholder="Default"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Funding Intervals
          </label>
          <input
            type="number"
            step="1"
            min="0"
            value={values.fundingIntervals}
            onChange={handleField('fundingIntervals')}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-300 mb-1">
          Notes (local only, never sent to AI)
        </label>
        <textarea
          rows={2}
          value={values.notes}
          onChange={handleField('notes')}
          placeholder="Setup thesis, invalidation notes..."
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
        />
      </div>

      {isBlocked ? (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 space-y-2">
          <p className="text-xs font-semibold text-rose-300">
            Guardrail BLOCK active. Override reason required (min 20 characters):
          </p>
          <textarea
            rows={2}
            value={overrideReason}
            onChange={(e) => onOverrideReasonChange(e.target.value)}
            placeholder="Explain why you are overriding this circuit breaker (min 20 chars)..."
            className="w-full rounded-lg border border-rose-500/40 bg-slate-950 px-3 py-2 text-xs text-white focus:border-rose-400 focus:outline-none"
          />
          <p className="text-[11px] text-rose-200/80">
            This app records decisions; it cannot stop orders on an exchange.
          </p>
        </div>
      ) : null}

      {requiresAcknowledgement ? (
        <label className="flex items-start gap-2.5 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200 cursor-pointer">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => onAcknowledgedChange(e.target.checked)}
            className="mt-0.5 rounded border-rose-500 bg-slate-950 text-rose-500"
          />
          <span>
            I understand the risk: this trade is rated High or Critical and may exceed my
            configured limits.
          </span>
        </label>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={
            submitting ||
            !canAnalyze ||
            !overrideValid ||
            (requiresAcknowledgement && !acknowledged)
          }
          className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Saving...' : isEdit ? 'Update Trade' : 'Save Trade'}
        </button>

        <button
          type="button"
          onClick={onAskAi}
          disabled={aiLoading || !canAnalyze}
          className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {aiLoading ? 'Asking AI Coach...' : 'Ask AI Coach'}
        </button>
      </div>
    </form>
  );
}
