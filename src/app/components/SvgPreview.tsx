import { useRef, useState, useCallback, useLayoutEffect, type WheelEvent, type MouseEvent } from 'react';
import { useAppStore } from '../state/store';
import { LAYER_LABELS, type LayerName } from '../../core/svg/colors';

const LAYER_ORDER: LayerName[] = ['cut', 'engrave', 'score', 'text', 'center', 'reference'];
const MM_TO_PX = 96 / 25.4;

export function SvgPreview() {
  const sheets = useAppStore((s) => s.sheets);
  const activeSheetIndex = useAppStore((s) => s.activeSheetIndex);
  const setActiveSheet = useAppStore((s) => s.setActiveSheet);
  const layerVisibility = useAppStore((s) => s.layerVisibility);
  const toggleLayer = useAppStore((s) => s.toggleLayer);

  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ x: number; y: number } | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const sheet = sheets[activeSheetIndex];

  const fitToContent = useCallback(() => {
    const viewport = viewportRef.current;
    const svg = sheetRef.current?.querySelector('svg');
    if (!viewport || !svg) return;
    let box: { x: number; y: number; width: number; height: number };
    try {
      box = svg.getBBox();
    } catch {
      return; // getBBox can throw if the SVG isn't laid out yet (e.g. jsdom/tests)
    }
    if (!box.width || !box.height) return;

    const cw = viewport.clientWidth;
    const ch = viewport.clientHeight;
    const padding = 0.85;
    const fitScale = Math.min(cw / (box.width * MM_TO_PX), ch / (box.height * MM_TO_PX)) * padding;
    const clampedScale = Math.min(6, Math.max(0.05, fitScale));

    const contentCenterX = (box.x + box.width / 2) * MM_TO_PX;
    const contentCenterY = (box.y + box.height / 2) * MM_TO_PX;

    setScale(clampedScale);
    setPan({ x: cw / 2 - contentCenterX * clampedScale, y: ch / 2 - contentCenterY * clampedScale });
  }, []);

  // Auto-fit whenever a new sheet is generated/selected.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(fitToContent, [sheet?.svg]);

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setScale((s) => Math.min(8, Math.max(0.02, s * (1 + delta))));
  }, []);

  const onMouseDown = useCallback(
    (e: MouseEvent) => {
      dragState.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    },
    [pan],
  );

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.current) return;
    setPan({ x: e.clientX - dragState.current.x, y: e.clientY - dragState.current.y });
  }, []);

  const onMouseUp = useCallback(() => {
    dragState.current = null;
  }, []);

  const visibilityCss = LAYER_ORDER.map((name) => `#layer-${name}{display:${layerVisibility[name] ? 'block' : 'none'}}`).join(
    '\n',
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900/60 px-3 py-2">
        <div className="flex flex-wrap gap-1.5">
          {LAYER_ORDER.map((name) => (
            <button
              key={name}
              onClick={() => toggleLayer(name)}
              className={`rounded px-2 py-1 text-xs transition ${
                layerVisibility[name]
                  ? 'bg-neutral-700 text-neutral-100'
                  : 'bg-neutral-900 text-neutral-500 line-through'
              }`}
            >
              {LAYER_LABELS[name]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          {sheets.length > 1 && (
            <select
              className="rounded border border-neutral-700 bg-neutral-950 px-1.5 py-1"
              value={activeSheetIndex}
              onChange={(e) => setActiveSheet(parseInt(e.target.value, 10))}
            >
              {sheets.map((_s, i) => (
                <option key={i} value={i}>
                  List {i + 1}/{sheets.length}
                </option>
              ))}
            </select>
          )}
          <button className="rounded border border-neutral-700 px-2 py-1" onClick={() => setScale((s) => s * 1.2)}>
            +
          </button>
          <button className="rounded border border-neutral-700 px-2 py-1" onClick={() => setScale((s) => s * 0.8)}>
            −
          </button>
          <button className="rounded border border-neutral-700 px-2 py-1" onClick={fitToContent}>
            Uklopi
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="relative flex-1 overflow-hidden bg-[#0a0a0d] [background-image:radial-gradient(#1f2028_1px,transparent_1px)] [background-size:16px_16px]"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {!sheet ? (
          <div className="flex h-full items-center justify-center text-sm text-neutral-500">
            Unesite opis i kliknite „Generiši" da vidite pregled.
          </div>
        ) : (
          <div
            ref={sheetRef}
            className="absolute left-0 top-0 origin-top-left cursor-grab bg-white shadow-2xl active:cursor-grabbing"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
          >
            <style>{visibilityCss}</style>
            {/* eslint-disable-next-line react/no-danger */}
            <div dangerouslySetInnerHTML={{ __html: sheet.svg }} />
          </div>
        )}
      </div>
    </div>
  );
}
