import { useAppStore } from '../state/store';
import { flattenDesignToSheets } from '../../core/export/flatten';
import { renderSheetToDxf } from '../../core/export/dxf';
import { renderSheetToPdf } from '../../core/export/pdf';
import { renderSheetToEps } from '../../core/export/eps';
import { renderSheetToAi } from '../../core/export/ai';
import { renderSheetToLightburn } from '../../core/export/lightburn';
import { downloadFile } from '../utils/download';

type ExportFormat = 'svg' | 'dxf' | 'pdf' | 'eps' | 'ai' | 'lbrn2';

const FORMATS: { id: ExportFormat; label: string; hint: string }[] = [
  { id: 'svg', label: 'SVG', hint: 'LightBurn / Inkscape / Illustrator / CorelDraw' },
  { id: 'dxf', label: 'DXF', hint: 'AutoCAD / LibreCAD / univerzalni CAD format' },
  { id: 'pdf', label: 'PDF', hint: 'Za štampu ili pregled' },
  { id: 'eps', label: 'EPS', hint: 'Stariji vektorski alati, štamparije' },
  { id: 'ai', label: 'AI', hint: 'Adobe Illustrator (PDF-kompatibilan .ai)' },
  { id: 'lbrn2', label: 'LightBurn (.lbrn2)', hint: 'Najpouzdanije: uvezite SVG direktno u LightBurn' },
];

export function ExportPanel() {
  const design = useAppStore((s) => s.design);
  const sheets = useAppStore((s) => s.sheets);
  const activeSheetIndex = useAppStore((s) => s.activeSheetIndex);

  if (!design) return null;

  const baseName = design.meta.title.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase();

  const handleExport = (format: ExportFormat) => {
    const sheet = sheets[activeSheetIndex];
    if (!sheet) return;
    const suffix = sheets.length > 1 ? `-list${activeSheetIndex + 1}` : '';

    switch (format) {
      case 'svg':
        downloadFile(`${baseName}${suffix}.svg`, sheet.svg, 'image/svg+xml');
        break;
      case 'dxf': {
        const [flat] = flattenDesignToSheets(design, { sheetWidth: sheet.widthMm, sheetHeight: sheet.heightMm });
        downloadFile(`${baseName}${suffix}.dxf`, renderSheetToDxf(flat), 'application/dxf');
        break;
      }
      case 'pdf': {
        const [flat] = flattenDesignToSheets(design, { sheetWidth: sheet.widthMm, sheetHeight: sheet.heightMm });
        downloadFile(`${baseName}${suffix}.pdf`, renderSheetToPdf(flat), 'application/pdf');
        break;
      }
      case 'eps': {
        const [flat] = flattenDesignToSheets(design, { sheetWidth: sheet.widthMm, sheetHeight: sheet.heightMm });
        downloadFile(`${baseName}${suffix}.eps`, renderSheetToEps(flat), 'application/postscript');
        break;
      }
      case 'ai': {
        const [flat] = flattenDesignToSheets(design, { sheetWidth: sheet.widthMm, sheetHeight: sheet.heightMm });
        downloadFile(`${baseName}${suffix}.ai`, renderSheetToAi(flat), 'application/pdf');
        break;
      }
      case 'lbrn2': {
        const [flat] = flattenDesignToSheets(design, { sheetWidth: sheet.widthMm, sheetHeight: sheet.heightMm });
        downloadFile(`${baseName}${suffix}.lbrn2`, renderSheetToLightburn(flat), 'application/xml');
        break;
      }
    }
  };

  return (
    <section className="flex flex-col gap-2 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Export</h2>
      <div className="grid grid-cols-2 gap-2">
        {FORMATS.map((f) => (
          <button
            key={f.id}
            onClick={() => handleExport(f.id)}
            title={f.hint}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-2 text-xs font-medium text-neutral-200 transition hover:border-fuchsia-500 hover:text-fuchsia-400"
          >
            {f.label}
          </button>
        ))}
      </div>
    </section>
  );
}
