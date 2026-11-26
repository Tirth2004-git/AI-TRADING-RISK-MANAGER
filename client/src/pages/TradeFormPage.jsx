import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { tradeApi } from '../api/tradeApi.js';
import { aiApi } from '../api/aiApi.js';
import useDebounce from '../hooks/useDebounce.js';
import TradeForm from '../components/trade/TradeForm.jsx';
import RiskResults from '../components/trade/RiskResults.jsx';
import AiCoachPanel from '../components/ai/AiCoachPanel.jsx';
import Loader from '../components/common/Loader.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';

const INITIAL_FORM = {
  symbol: 'BTCUSDT',
  side: 'LONG',
  entry: '',
  stopLoss: '',
  target: '',
  leverage: '10',
  quantity: '',
  fundingRatePct: '',
  fundingIntervals: '0',
  notes: '',
};

function buildPayload(form) {
  return {
    symbol: form.symbol.trim().toUpperCase(),
    side: form.side,
    entry: Number(form.entry),
    stopLoss: form.stopLoss !== '' ? Number(form.stopLoss) : null,
    target: form.target !== '' ? Number(form.target) : null,
    leverage: Number(form.leverage),
    quantity: form.quantity !== '' ? Number(form.quantity) : null,
    fundingRatePct: form.fundingRatePct !== '' ? Number(form.fundingRatePct) : null,
    fundingIntervals: Number(form.fundingIntervals || 0),
    notes: form.notes || '',
  };
}

export default function TradeFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [values, setValues] = useState(INITIAL_FORM);
  const [loadingTrade, setLoadingTrade] = useState(isEdit);
  const [loadError, setLoadError] = useState(null);

  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);

  const [acknowledged, setAcknowledged] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const [aiReview, setAiReview] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  useEffect(() => {
    if (!isEdit) {
      setValues(INITIAL_FORM);
      setLoadingTrade(false);
      return;
    }

    let cancelled = false;
    setLoadingTrade(true);
    setLoadError(null);
    tradeApi
      .getById(id)
      .then((trade) => {
        if (cancelled) return;
        setValues({
          symbol: trade.symbol || '',
          side: trade.side || 'LONG',
          entry: trade.entry != null ? String(trade.entry) : '',
          stopLoss: trade.stopLoss != null ? String(trade.stopLoss) : '',
          target: trade.target != null ? String(trade.target) : '',
          leverage: trade.leverage != null ? String(trade.leverage) : '10',
          quantity: trade.quantity != null ? String(trade.quantity) : '',
          fundingRatePct:
            trade.fundingRatePct != null ? String(trade.fundingRatePct) : '',
          fundingIntervals:
            trade.fundingIntervals != null ? String(trade.fundingIntervals) : '0',
          notes: trade.notes || '',
        });
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || 'Failed to load trade');
      })
      .finally(() => {
        if (!cancelled) setLoadingTrade(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  const canAnalyze = useMemo(() => {
    const entryOk = Number(values.entry) > 0;
    const levOk = Number(values.leverage) >= 1 && Number(values.leverage) <= 125;
    const symbolOk = /^[A-Z0-9]{2,15}$/.test(values.symbol.trim().toUpperCase());
    const hasStopOrQty = values.stopLoss !== '' || values.quantity !== '';
    return entryOk && levOk && symbolOk && hasStopOrQty;
  }, [values]);

  const debouncedValues = useDebounce(values, 350);

  useEffect(() => {
    const entryOk = Number(debouncedValues.entry) > 0;
    const levOk =
      Number(debouncedValues.leverage) >= 1 && Number(debouncedValues.leverage) <= 125;
    const symbolOk = /^[A-Z0-9]{2,15}$/.test(
      debouncedValues.symbol.trim().toUpperCase()
    );
    const hasStopOrQty =
      debouncedValues.stopLoss !== '' || debouncedValues.quantity !== '';

    if (!entryOk || !levOk || !symbolOk || !hasStopOrQty) {
      setAnalysis(null);
      setAnalyzeError(null);
      return;
    }

    let cancelled = false;
    setAnalyzing(true);
    setAnalyzeError(null);
    setAcknowledged(false);

    tradeApi
      .analyze(buildPayload(debouncedValues))
      .then((res) => {
        if (!cancelled) setAnalysis(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setAnalysis(null);
          setAnalyzeError(err.message || 'Analysis failed');
        }
      })
      .finally(() => {
        if (!cancelled) setAnalyzing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedValues]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        ...buildPayload(values),
        acknowledged,
        overrideReason: overrideReason.trim(),
      };
      if (isEdit) {
        await tradeApi.update(id, payload);
      } else {
        await tradeApi.create(payload);
      }
      navigate('/positions');
    } catch (err) {
      setSubmitError(err.message || 'Failed to save trade');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAskAi = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const payload = buildPayload(values);
      delete payload.notes;
      const review = await aiApi.reviewTrade(payload);
      setAiReview(review);
    } catch (err) {
      setAiError(err.message || 'AI review failed');
    } finally {
      setAiLoading(false);
    }
  };

  if (loadingTrade) return <Loader label="Loading trade..." />;
  if (loadError) return <ErrorMessage message={loadError} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">
          {isEdit ? 'Edit Open Trade' : 'New Trade Risk Check'}
        </h2>
        <p className="text-sm text-slate-400">
          Validate position size, trading costs, liquidation distance, and guardrails
        </p>
      </div>

      {submitError ? <ErrorMessage message={submitError} /> : null}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5">
          <TradeForm
            values={values}
            onChange={setValues}
            onSubmit={handleSubmit}
            requiresAcknowledgement={Boolean(analysis?.requiresAcknowledgement)}
            acknowledged={acknowledged}
            onAcknowledgedChange={setAcknowledged}
            isBlocked={analysis?.guardrails?.status === 'BLOCK'}
            overrideReason={overrideReason}
            onOverrideReasonChange={setOverrideReason}
            submitting={submitting}
            isEdit={isEdit}
            onAskAi={handleAskAi}
            aiLoading={aiLoading}
            canAnalyze={canAnalyze}
          />
        </div>

        <div className="lg:col-span-7 space-y-4">
          <RiskResults analysis={analysis} loading={analyzing} error={analyzeError} />
          <AiCoachPanel review={aiReview} loading={aiLoading} error={aiError} />
        </div>
      </div>
    </div>
  );
}
