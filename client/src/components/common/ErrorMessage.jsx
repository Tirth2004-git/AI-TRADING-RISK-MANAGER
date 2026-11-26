export default function ErrorMessage({ message, onRetry }) {
  if (!message) return null;

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
      <span>{message}</span>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded-lg border border-rose-500/40 px-3 py-1 text-xs font-medium text-rose-200 hover:bg-rose-500/20"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
