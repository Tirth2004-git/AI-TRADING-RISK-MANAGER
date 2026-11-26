import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../../api/authApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import ErrorMessage from '../../components/common/ErrorMessage.jsx';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [status, setStatus] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const runVerify = async (tok) => {
    if (!tok) return;
    setLoading(true);
    setError(null);
    try {
      await authApi.verifyEmail({ token: tok });
      setStatus('Email verified successfully!');
      await refreshUser();
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = searchParams.get('token');
    if (t) runVerify(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 space-y-5">
        <h1 className="text-xl font-bold text-white">Verify Email</h1>
        {error ? <ErrorMessage message={error} /> : null}
        {status ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            {status}
          </div>
        ) : null}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            runVerify(token);
          }}
          className="space-y-3"
        >
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste verification token"
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-cyan-500 py-2.5 text-sm font-semibold text-slate-950"
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400">
          <Link to="/" className="text-cyan-400 hover:underline">
            Go to Dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
