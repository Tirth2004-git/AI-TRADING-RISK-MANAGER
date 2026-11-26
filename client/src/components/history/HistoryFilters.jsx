export default function HistoryFilters({
  symbol,
  result,
  onSymbolChange,
  onResultChange,
  onExportCsv,
  hasTrades,
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Symbol
          </label>
          <input
            type="text"
            value={symbol}
            onChange={(e) => onSymbolChange(e.target.value.toUpperCase())}
            placeholder="All symbols"
            className="w-40 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Result
          </label>
          <select
            value={result}
            onChange={(e) => onResultChange(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
          >
            <option value="">All</option>
            <option value="win">Wins</option>
            <option value="loss">Losses</option>
            <option value="breakeven">Breakeven</option>
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={onExportCsv}
        disabled={!hasTrades}
        className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Export CSV
      </button>
    </div>
  );
}
