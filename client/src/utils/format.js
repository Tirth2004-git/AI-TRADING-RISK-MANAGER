export function formatCurrency(value, decimals = 2) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return '—';
  }
  const num = Number(value);
  const sign = num < 0 ? '-' : '';
  return `${sign}$${Math.abs(num).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function formatNumber(value, decimals = 4) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return '—';
  }
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

export function formatPct(value, decimals = 2) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return '—';
  }
  return `${Number(value).toFixed(decimals)}%`;
}

export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getBandBadgeClass(band) {
  switch (band) {
    case 'Low':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'Medium':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'High':
      return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
    case 'Critical':
      return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    default:
      return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
  }
}
