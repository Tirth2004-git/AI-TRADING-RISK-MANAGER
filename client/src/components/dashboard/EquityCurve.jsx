import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency } from '../../utils/format.js';

export default function EquityCurve({ data = [] }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <h3 className="text-sm font-semibold text-white">Equity Curve</h3>
      {data.length <= 1 ? (
        <div className="flex h-64 items-center justify-center text-sm text-slate-500">
          Close at least one trade to plot your equity curve.
        </div>
      ) : (
        <div className="mt-3 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="index"
                stroke="#64748b"
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `#${v}`}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 12 }}
                domain={['auto', 'auto']}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                }}
                formatter={(value) => [formatCurrency(value), 'Equity']}
                labelFormatter={(label) => `Trade #${label}`}
              />
              <Line
                type="monotone"
                dataKey="equity"
                stroke="#22d3ee"
                strokeWidth={2}
                dot={{ r: 3, fill: '#22d3ee' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
