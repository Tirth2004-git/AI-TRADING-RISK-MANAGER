export default function WarningList({ warnings = [], title = 'Active Warnings' }) {
  if (!warnings.length) return null;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
      <h3 className="text-sm font-semibold text-amber-300">{title}</h3>
      <ul className="mt-2 space-y-1.5 text-xs text-amber-200/90 list-disc pl-4">
        {warnings.map((warning, idx) => (
          <li key={idx}>{warning}</li>
        ))}
      </ul>
    </div>
  );
}
