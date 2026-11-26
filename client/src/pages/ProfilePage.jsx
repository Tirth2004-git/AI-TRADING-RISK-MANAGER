import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDate } from '../utils/format.js';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import Modal from '../components/common/Modal.jsx';

export default function ProfilePage() {
  const { user, isDemo, logout, logoutAll, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState(null);

  const [verifyMsg, setVerifyMsg] = useState('');
  const [verifyError, setVerifyError] = useState(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteForm, setDeleteForm] = useState({ password: '', confirmText: '' });
  const [deleteError, setDeleteError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  if (isDemo) {
    return (
      <div className="max-w-2xl space-y-4">
        <h2 className="text-2xl font-bold text-white">Demo Profile</h2>
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-5 text-sm text-cyan-200 space-y-3">
          <p>
            You are currently viewing the read-only <strong>Demo Account</strong>.
            Create a personal account to unlock trade saving, custom settings, password
            management, and private data isolation.
          </p>
          <div className="flex gap-3">
            <Link
              to="/register"
              onClick={() => logout()}
              className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950"
            >
              Create Account
            </Link>
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              className="rounded-lg border border-slate-700 px-4 py-2 text-xs text-slate-200"
            >
              Exit Demo
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwLoading(true);
    setPwMsg('');
    setPwError(null);
    try {
      await authApi.changePassword(pwForm);
      setPwMsg('Password updated and other sessions invalidated.');
      setPwForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (err) {
      setPwError(err.message || 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setVerifyMsg('');
    setVerifyError(null);
    try {
      const res = await authApi.resendVerification();
      setVerifyMsg(
        res.alreadyVerified
          ? 'Your email is already verified.'
          : 'Verification email sent (check your inbox or dev logs).'
      );
      await refreshUser();
    } catch (err) {
      setVerifyError(err.message || 'Failed to resend verification');
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleting(true);
    setDeleteError(null);
    try {
      await authApi.deleteAccount(deleteForm);
      await logout();
      navigate('/login');
    } catch (err) {
      setDeleteError(err.message || 'Account deletion failed');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Profile &amp; Security</h2>
        <p className="text-sm text-slate-400">
          Manage your account credentials, active sessions, and data retention
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-slate-400">Full Name</p>
          <p className="font-semibold text-white">{user?.name}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Email</p>
          <p className="font-semibold text-white">{user?.email}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Email Verification</p>
          <div className="mt-0.5 flex items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                user?.emailVerified
                  ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                  : 'border-amber-500/30 bg-amber-500/15 text-amber-300'
              }`}
            >
              {user?.emailVerified ? 'Verified' : 'Unverified'}
            </span>
            {!user?.emailVerified ? (
              <button
                type="button"
                onClick={handleResendVerification}
                className="text-xs text-cyan-400 hover:underline"
              >
                Resend link
              </button>
            ) : null}
          </div>
          {verifyMsg ? <p className="mt-1 text-xs text-emerald-400">{verifyMsg}</p> : null}
          {verifyError ? <p className="mt-1 text-xs text-rose-400">{verifyError}</p> : null}
        </div>
        <div>
          <p className="text-xs text-slate-400">Account Created / Last Login</p>
          <p className="text-xs text-slate-300">
            Created: {formatDate(user?.createdAt)} · Last login:{' '}
            {formatDate(user?.lastLoginAt)}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleChangePassword}
        className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 space-y-4"
      >
        <h3 className="text-base font-semibold text-white">Change Password</h3>
        {pwError ? <ErrorMessage message={pwError} /> : null}
        {pwMsg ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
            {pwMsg}
          </div>
        ) : null}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="password"
            placeholder="Current password"
            value={pwForm.currentPassword}
            onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
            required
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
          <input
            type="password"
            placeholder="New password"
            value={pwForm.newPassword}
            onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
            required
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={pwForm.confirmNewPassword}
            onChange={(e) => setPwForm({ ...pwForm, confirmNewPassword: e.target.value })}
            required
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>
        <button
          type="submit"
          disabled={pwLoading}
          className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          {pwLoading ? 'Updating...' : 'Update Password'}
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700"
          >
            Sign Out
          </button>
          <button
            type="button"
            onClick={async () => {
              await logoutAll();
              navigate('/login');
            }}
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-300 hover:bg-amber-500/20"
          >
            Sign Out All Sessions
          </button>
        </div>

        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/20"
        >
          Delete Account
        </button>
      </div>

      <Modal
        isOpen={deleteOpen}
        title="Delete Account & All Personal Data"
        onClose={() => setDeleteOpen(false)}
      >
        <form onSubmit={handleDeleteAccount} className="space-y-4 text-xs text-slate-300">
          <p>
            This permanently deletes your user account, settings, trades, ledger entries,
            symbol profiles, AI reviews, and audit logs. Export your JSON backup from
            Settings first if needed.
          </p>
          {deleteError ? <ErrorMessage message={deleteError} /> : null}
          <input
            type="password"
            placeholder="Enter your password"
            value={deleteForm.password}
            onChange={(e) => setDeleteForm({ ...deleteForm, password: e.target.value })}
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
          <input
            type="text"
            placeholder="Type DELETE to confirm"
            value={deleteForm.confirmText}
            onChange={(e) =>
              setDeleteForm({ ...deleteForm, confirmText: e.target.value })
            }
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteOpen(false)}
              className="rounded-lg border border-slate-700 px-4 py-2 text-xs text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={deleting}
              className="rounded-lg bg-rose-500 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-400 disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Permanently Delete'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
