import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatPct } from '../../utils/format.js';

export default function DrawdownChart({ data = [] }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <h3 className="text-sm font-semibold text-white">Drawdown Curve (%)</h3>
      {data.length <= 1 ? (
        <div className="flex h-64 items-center justify-center text-sm text-slate-500">
          Close at least one trade to plot drawdown history.
        </div>
      ) : (
        <div className="mt-3 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
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
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                }}
                formatter={(value) => [formatPct(value), 'Drawdown']}
                labelFormatter={(label) => `Event #${label}`}
              />
              <Area
                type="monotone"
                dataKey="drawdownPct"
                stroke="#f43f5e"
                fill="#f43f5e"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
