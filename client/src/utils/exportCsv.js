const FORMULA_PREFIX_REGEX = /^[=+\-@]/;

function escapeCsvCell(value) {
  if (value === null || value === undefined) return '""';
  let str = String(value);
  if (FORMULA_PREFIX_REGEX.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export function exportTradesCsv(trades, filename = 'trade-history.csv') {
  const headers = [
    'Symbol',
    'Side',
    'Entry',
    'Exit',
    'StopLoss',
    'Target',
    'Leverage',
    'Quantity',
    'Fees',
    'RealizedPnL',
    'RMultiple',
    'RiskScore',
    'RiskBand',
    'OpenedAt',
    'ClosedAt',
    'Notes',
  ];

  const rows = trades.map((t) => [
    t.symbol,
    t.side,
    t.entry,
    t.exitPrice ?? '',
    t.stopLoss ?? '',
    t.target ?? '',
    t.leverage,
    t.quantity,
    t.fees ?? 0,
    t.realizedPnl ?? '',
    t.rMultiple ?? '',
    t.riskScore,
    t.riskBand,
    t.openedAt ?? '',
    t.closedAt ?? '',
    t.notes ?? '',
  ]);

  const csvContent = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
