import { useEffect } from 'react';
import { PromptBar } from './app/components/PromptBar';
import { MaterialPanel } from './app/components/MaterialPanel';
import { ParameterPanel } from './app/components/ParameterPanel';
import { WarningsPanel } from './app/components/WarningsPanel';
import { AssemblyPanel } from './app/components/AssemblyPanel';
import { ExportPanel } from './app/components/ExportPanel';
import { PreviewPane } from './app/components/PreviewPane';
import { useAppStore } from './app/state/store';

export default function App() {
  const generateFromPrompt = useAppStore((s) => s.generateFromPrompt);
  const error = useAppStore((s) => s.error);

  useEffect(() => {
    generateFromPrompt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-screen flex-col bg-neutral-950 text-neutral-100">
      <header className="flex items-center gap-3 border-b border-neutral-800 bg-neutral-900 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-fuchsia-600 font-bold">L</div>
        <div>
          <h1 className="text-sm font-semibold">LaserCAD</h1>
          <p className="text-xs text-neutral-500">Parametarski CAD sistem za lasersko rezanje</p>
        </div>
      </header>

      <PromptBar />

      {error && (
        <div className="border-b border-red-900 bg-red-950/60 px-4 py-2 text-sm text-red-300">Greška: {error}</div>
      )}

      <main className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <PreviewPane />
        </div>
        <aside className="w-80 shrink-0 overflow-y-auto border-l border-neutral-800 bg-neutral-900/40">
          <MaterialPanel />
          <ParameterPanel />
          <WarningsPanel />
          <AssemblyPanel />
          <ExportPanel />
        </aside>
      </main>
    </div>
  );
}
