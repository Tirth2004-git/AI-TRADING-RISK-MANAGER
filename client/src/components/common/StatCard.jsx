export default function StatCard({ label, value, subtext, tone = 'default' }) {
  const toneClasses = {
    default: 'text-white',
    positive: 'text-emerald-400',
    negative: 'text-rose-400',
    warning: 'text-amber-400',
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${toneClasses[tone] || toneClasses.default}`}>
        {value}
      </p>
      {subtext ? <p className="mt-1 text-xs text-slate-400">{subtext}</p> : null}
    </div>
  );
}
