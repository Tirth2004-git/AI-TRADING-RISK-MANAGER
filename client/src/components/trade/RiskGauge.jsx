import { getBandBadgeClass } from '../../utils/format.js';

function getGaugeColor(band) {
  switch (band) {
    case 'Low':
      return '#10b981';
    case 'Medium':
      return '#f59e0b';
    case 'High':
      return '#f97316';
    case 'Critical':
      return '#f43f5e';
    default:
      return '#64748b';
  }
}

export default function RiskGauge({ score = 0, band = 'Low' }) {
  const clamped = Math.max(0, Math.min(100, Number(score) || 0));
  const color = getGaugeColor(band);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Risk Score
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{clamped}</span>
            <span className="text-sm text-slate-400">/ 100</span>
          </div>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${getBandBadgeClass(band)}`}
        >
          {band}
        </span>
      </div>

      <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>

      <div className="mt-1.5 flex justify-between text-[11px] text-slate-500">
        <span>0 Low</span>
        <span>26 Med</span>
        <span>51 High</span>
        <span>76 Critical</span>
      </div>
    </div>
  );
}
