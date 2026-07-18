import { useAppStore } from '../state/store';

export function AssemblyPanel() {
  const design = useAppStore((s) => s.design);
  if (!design || design.assembly.length === 0) return null;

  return (
    <section className="flex flex-col gap-2 border-b border-neutral-800 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Redoslijed sastavljanja</h2>
      <ol className="flex flex-col gap-2">
        {design.assembly.map((step) => (
          <li key={step.order} className="flex gap-2 text-xs text-neutral-300">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-fuchsia-600/20 font-semibold text-fuchsia-400">
              {step.order}
            </span>
            <span>{step.description}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
