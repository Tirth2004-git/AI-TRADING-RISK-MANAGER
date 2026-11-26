import StatCard from '../common/StatCard.jsx';
import { formatCurrency, formatNumber, formatPct } from '../../utils/format.js';

export default function PerformanceStats({ performance }) {
  if (!performance) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <StatCard
        label="Win Rate"
        value={formatPct(performance.winRate, 1)}
        subtext={`${performance.wins}W / ${performance.losses}L`}
      />
      <StatCard
        label="Average R"
        value={`${formatNumber(performance.averageR, 2)}R`}
      />
      <StatCard
        label="Expectancy"
        value={formatCurrency(performance.expectancy)}
        tone={performance.expectancy >= 0 ? 'positive' : 'negative'}
      />
      <StatCard
        label="Profit Factor"
        value={
          performance.profitFactor !== null
            ? formatNumber(performance.profitFactor, 2)
            : '—'
        }
      />
      <StatCard
        label="Max Drawdown"
        value={formatPct(performance.maxDrawdownPct)}
        tone={performance.maxDrawdownPct > 0 ? 'warning' : 'default'}
      />
    </div>
  );
}
