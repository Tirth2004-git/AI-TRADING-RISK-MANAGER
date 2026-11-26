export default function Disclaimer() {
  return (
    <footer className="mt-8 border-t border-slate-800/80 pt-4 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <span>Liquidation price is an estimate; ignores fees, funding and exchange tiers.</span>
      <span className="font-medium text-slate-400">Not financial advice.</span>
    </footer>
  );
}
