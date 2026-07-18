import type { Design, Panel } from '../model/types';
import type { Path } from '../geometry/polygon';
import { layoutPanelsOnSheets, type SheetLayoutOptions } from '../svg/layout';
import { DEFAULT_SVG_OPTIONS } from '../svg/svgDocument';

export type ExportLayerName = 'cut' | 'score' | 'engrave' | 'text' | 'center' | 'reference';

export interface FlattenedText {
  x: number;
  y: number;
  content: string;
  fontSize: number;
}

export interface FlattenedSheet {
  index: number;
  widthMm: number;
  heightMm: number;
  /** Closed cut-through paths: panel outlines + holes. */
  cutPaths: Path[];
  /** Non-through score/fold lines (open polylines). */
  scorePaths: Path[];
  /** Vector engrave strokes/fills (outlines, hatch lines, halftone dots
   * pre-flattened to small polygons, QR/barcode modules as rectangles). */
  engravePaths: Path[];
  texts: FlattenedText[];
}

/**
 * Shared geometry-collection step for every non-SVG exporter (DXF, PDF,
 * EPS, LightBurn): lays panels out on sheets exactly like the SVG
 * renderer, then reduces each panel to plain per-layer path lists — no
 * markup, so each format-specific writer only has to turn coordinates
 * into its own file syntax.
 */
export function flattenDesignToSheets(design: Design, options: Partial<SheetLayoutOptions> = {}): FlattenedSheet[] {
  const opts = { ...DEFAULT_SVG_OPTIONS, ...options };
  const sheets = layoutPanelsOnSheets(design.panels, opts);

  return sheets.map((sheet) => {
    const cutPaths: Path[] = [];
    const scorePaths: Path[] = [];
    const engravePaths: Path[] = [];
    const texts: FlattenedText[] = [];

    for (const panel of sheet.panels) {
      collectPanel(panel, cutPaths, scorePaths, engravePaths, texts);
    }

    return { index: sheet.index, widthMm: sheet.width, heightMm: sheet.height, cutPaths, scorePaths, engravePaths, texts };
  });
}

function collectPanel(panel: Panel, cutPaths: Path[], scorePaths: Path[], engravePaths: Path[], texts: FlattenedText[]) {
  cutPaths.push(panel.outline, ...panel.holes);
  scorePaths.push(...panel.scoreLines);

  for (const eng of panel.engravings) {
    if (eng.kind === 'text') {
      texts.push({ x: eng.x, y: eng.y, content: eng.content, fontSize: eng.fontSize });
    } else if (eng.kind === 'vector') {
      engravePaths.push(...eng.paths);
    } else if (eng.kind === 'halftone') {
      for (const dot of eng.dots) engravePaths.push(circleApprox(dot.x, dot.y, dot.radius));
    } else if (eng.kind === 'qr') {
      const n = eng.modules.length;
      if (n === 0) continue;
      const cell = eng.sizeMm / n;
      for (let row = 0; row < n; row++) {
        for (let col = 0; col < n; col++) {
          if (!eng.modules[row][col]) continue;
          engravePaths.push(rectPathAt(eng.x + col * cell, eng.y + row * cell, cell, cell));
        }
      }
    } else if (eng.kind === 'barcode') {
      const totalUnits = eng.bars.reduce((sum, b) => sum + b.widthUnits, 0);
      const unitWidth = eng.widthMm / totalUnits;
      let x = eng.x;
      for (const bar of eng.bars) {
        const w = bar.widthUnits * unitWidth;
        if (bar.dark) engravePaths.push(rectPathAt(x, eng.y, w, eng.heightMm));
        x += w;
      }
    }
  }
}

function rectPathAt(x: number, y: number, w: number, h: number): Path {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
}

function circleApprox(cx: number, cy: number, r: number, steps = 16): Path {
  const pts: Path = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}
