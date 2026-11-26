function getVerdictBadge(verdict) {
  switch (verdict) {
    case 'ACCEPTABLE':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'NEEDS_CHANGES':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'TOO_RISKY':
      return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    default:
      return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
  }
}

export default function AiCoachPanel({ review, loading, error }) {
  if (loading) {
    return (
      <div className="rounded-xl border border-cyan-500/30 bg-slate-900/80 p-4 text-sm text-cyan-300">
        AI Risk Coach is reviewing the metrics...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
        {error}
      </div>
    );
  }

  if (!review) return null;

  const { response, source, model } = review;

  return (
    <div className="rounded-xl border border-cyan-500/30 bg-slate-900/80 p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">AI Risk Coach</h3>
          <p className="text-[11px] text-slate-400">
            Source: {source} {model ? `(${model})` : ''}
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${getVerdictBadge(
            response.verdict
          )}`}
        >
          {response.verdict.replace('_', ' ')}
        </span>
      </div>

      <p className="text-sm text-slate-200 leading-relaxed">{response.summary}</p>

      {response.weaknesses?.length ? (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-300">
            Weaknesses
          </h4>
          <ul className="mt-1.5 list-disc pl-4 space-y-1 text-xs text-slate-300">
            {response.weaknesses.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {response.suggestions?.length ? (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
            Suggestions
          </h4>
          <ul className="mt-1.5 list-disc pl-4 space-y-1 text-xs text-slate-300">
            {response.suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
