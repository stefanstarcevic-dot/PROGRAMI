import { useAppStore } from '../state/store';
import { SvgPreview } from './SvgPreview';
import { ThreeDPreview } from './ThreeDPreview';

export function PreviewPane() {
  const viewMode = useAppStore((s) => s.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-1 border-b border-neutral-800 bg-neutral-900/60 px-3 pt-2">
        {(['2d', '3d'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`rounded-t-md px-4 py-1.5 text-xs font-medium transition ${
              viewMode === mode ? 'bg-neutral-950 text-fuchsia-400' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {mode === '2d' ? '2D SVG pregled' : '3D pregled'}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">{viewMode === '2d' ? <SvgPreview /> : <ThreeDPreview />}</div>
    </div>
  );
}
