export default function EmptyState({ title, description, action }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-10 text-center">
      <p className="text-base font-medium text-slate-200">{title}</p>
      {description ? <p className="mt-1 text-sm text-slate-400">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
