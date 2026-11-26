export default function ScoreBreakdown({ breakdown = [] }) {
  if (!breakdown.length) return null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <h3 className="text-sm font-semibold text-white">Score Breakdown</h3>
      <div className="mt-3 space-y-2.5">
        {breakdown.map((item) => (
          <div
            key={item.factor}
            className="flex items-start justify-between gap-3 rounded-lg border border-slate-800/80 bg-slate-950/50 px-3 py-2"
          >
            <div>
              <p className="text-xs font-medium text-slate-200">{item.factor}</p>
              <p className="text-xs text-slate-400">{item.reason}</p>
            </div>
            <span
              className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${
                item.points > 0
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'bg-emerald-500/15 text-emerald-400'
              }`}
            >
              +{item.points}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
