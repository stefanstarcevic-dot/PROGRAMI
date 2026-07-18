import { useAppStore } from '../state/store';

const SEVERITY_STYLE: Record<string, string> = {
  error: 'border-red-500/40 bg-red-500/10 text-red-300',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  info: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
};

export function WarningsPanel() {
  const design = useAppStore((s) => s.design);
  const assumptions = useAppStore((s) => s.assumptions);

  if (!design) return null;

  const hasContent = design.warnings.length > 0 || assumptions.length > 0;
  if (!hasContent) {
    return (
      <section className="border-b border-neutral-800 p-4">
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          ✓ Nema upozorenja — konstrukcija je provjerena i spremna za rezanje.
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-2 border-b border-neutral-800 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Provjera konstrukcije</h2>
      {assumptions.map((a, i) => (
        <div key={`a${i}`} className="rounded-md border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-xs text-neutral-300">
          💡 {a}
        </div>
      ))}
      {design.warnings.map((w, i) => (
        <div key={`w${i}`} className={`rounded-md border px-3 py-2 text-xs ${SEVERITY_STYLE[w.severity]}`}>
          {w.message}
        </div>
      ))}
    </section>
  );
}
