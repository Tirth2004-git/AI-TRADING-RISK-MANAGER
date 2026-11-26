import { useCallback, useState } from 'react';
import { tradeApi } from '../api/tradeApi.js';
import { portfolioApi } from '../api/portfolioApi.js';
import useFetch from '../hooks/useFetch.js';
import useDebounce from '../hooks/useDebounce.js';
import { exportTradesCsv } from '../utils/exportCsv.js';
import Loader from '../components/common/Loader.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import TradeTable from '../components/trade/TradeTable.jsx';
import HistoryFilters from '../components/history/HistoryFilters.jsx';
import PerformanceStats from '../components/history/PerformanceStats.jsx';

export default function HistoryPage() {
  const [symbol, setSymbol] = useState('');
  const [result, setResult] = useState('');
  const debouncedSymbol = useDebounce(symbol, 250);

  const fetchHistory = useCallback(async () => {
    const params = { status: 'CLOSED' };
    if (debouncedSymbol.trim()) params.symbol = debouncedSymbol.trim();
    if (result) params.result = result;

    const [trades, performance] = await Promise.all([
      tradeApi.list(params),
      portfolioApi.getPerformance(),
    ]);
    return { trades, performance };
  }, [debouncedSymbol, result]);

  const { data, loading, error, refetch } = useFetch(fetchHistory, [
    debouncedSymbol,
    result,
  ]);

  if (loading && !data) return <Loader label="Loading trade history..." />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  const trades = data?.trades || [];
  const performance = data?.performance;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Trade History</h2>
        <p className="text-sm text-slate-400">
          Closed trades, realized performance, and CSV export
        </p>
      </div>

      <PerformanceStats performance={performance} />

      <HistoryFilters
        symbol={symbol}
        result={result}
        onSymbolChange={setSymbol}
        onResultChange={setResult}
        onExportCsv={() => exportTradesCsv(trades)}
        hasTrades={trades.length > 0}
      />

      {!trades.length ? (
        <EmptyState
          title="No closed trades found"
          description="Close an open position or adjust your filters to view trade history."
        />
      ) : (
        <TradeTable trades={trades} mode="history" />
      )}
    </div>
  );
}
