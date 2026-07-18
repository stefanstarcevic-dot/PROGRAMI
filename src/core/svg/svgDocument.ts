import type { Path } from '../geometry/polygon';
import type { Panel, Design } from '../model/types';
import { LAYER_COLORS, LAYER_LABELS } from './colors';
import { generateHatchLines } from './hatch';
import { layoutPanelsOnSheets } from './layout';
import { boundingBox } from '../geometry/polygon';

export interface SvgRenderOptions {
  sheetWidth: number;
  sheetHeight: number;
  margin: number;
  gap: number;
  /** Visual stroke width for cut/score/engrave lines, mm. Laser software
   * doesn't use this for power/speed (that's set per-layer-color in the
   * job itself) — it just needs to read as a hairline so vector edges
   * stay crisp when zoomed in Illustrator/Inkscape/CorelDraw. */
  hairlineWidth: number;
  showLabels: boolean;
  showCenterMarks: boolean;
}

export const DEFAULT_SVG_OPTIONS: SvgRenderOptions = {
  sheetWidth: 600,
  sheetHeight: 400,
  margin: 10,
  gap: 5,
  hairlineWidth: 0.05,
  showLabels: true,
  showCenterMarks: true,
};

export interface RenderedSheet {
  index: number;
  svg: string;
  widthMm: number;
  heightMm: number;
}

/** Renders a full design to one SVG document per sheet, laying panels out
 * with the built-in shelf packer. Each returned string is a complete,
 * self-contained SVG file. */
export function renderDesignToSvg(design: Design, options: Partial<SvgRenderOptions> = {}): RenderedSheet[] {
  const opts = { ...DEFAULT_SVG_OPTIONS, ...options };
  const sheets = layoutPanelsOnSheets(design.panels, opts);
  return sheets.map((sheet) => ({
    index: sheet.index,
    widthMm: sheet.width,
    heightMm: sheet.height,
    svg: renderSheetSvg(sheet.panels, sheet.width, sheet.height, opts, design),
  }));
}

function renderSheetSvg(
  panels: Panel[],
  sheetWidth: number,
  sheetHeight: number,
  opts: SvgRenderOptions,
  design: Design,
): string {
  const cutPaths: string[] = [];
  const scorePaths: string[] = [];
  const engravePaths: string[] = [];
  const textEls: string[] = [];
  const centerEls: string[] = [];
  const referenceEls: string[] = [];

  for (const panel of panels) {
    cutPaths.push(polygonEl(panel.outline));
    for (const hole of panel.holes) cutPaths.push(polygonEl(hole));
    for (const score of panel.scoreLines) scorePaths.push(polylineEl(score));

    for (const eng of panel.engravings) {
      if (eng.kind === 'text') {
        textEls.push(
          `<text x="${fmt(eng.x)}" y="${fmt(eng.y)}" font-size="${fmt(eng.fontSize)}" font-family="${escapeAttr(
            eng.fontFamily ?? 'sans-serif',
          )}" text-anchor="${eng.anchor ?? 'middle'}"${
            eng.rotationDeg ? ` transform="rotate(${fmt(eng.rotationDeg)} ${fmt(eng.x)} ${fmt(eng.y)})"` : ''
          } fill="${LAYER_COLORS.text}">${escapeText(eng.content)}</text>`,
        );
      } else if (eng.kind === 'vector') {
        for (const p of eng.paths) engravePaths.push(polylineEl(p, true));
        if (eng.fillMode === 'filled-hatch') {
          const spacing = eng.hatchSpacing ?? 0.5;
          for (const p of eng.paths) {
            for (const line of generateHatchLines(p, spacing)) engravePaths.push(polylineEl(line));
          }
        }
      } else if (eng.kind === 'halftone') {
        for (const dot of eng.dots) {
          engravePaths.push(
            `<circle cx="${fmt(dot.x)}" cy="${fmt(dot.y)}" r="${fmt(dot.radius)}" fill="${LAYER_COLORS.engrave}" stroke="none"/>`,
          );
        }
      } else if (eng.kind === 'qr') {
        engravePaths.push(...qrModulesToRects(eng));
      } else if (eng.kind === 'barcode') {
        engravePaths.push(...barcodeToRects(eng));
      }
    }

    if (opts.showCenterMarks) {
      const box = boundingBox(panel.outline);
      const cx = (box.min.x + box.max.x) / 2;
      const cy = (box.min.y + box.max.y) / 2;
      const s = 2;
      centerEls.push(
        `<path d="M ${fmt(cx - s)} ${fmt(cy)} L ${fmt(cx + s)} ${fmt(cy)} M ${fmt(cx)} ${fmt(cy - s)} L ${fmt(cx)} ${fmt(
          cy + s,
        )}" stroke="${LAYER_COLORS.center}" stroke-width="${opts.hairlineWidth}" fill="none"/>`,
      );
    }
    if (opts.showLabels) {
      const box = boundingBox(panel.outline);
      referenceEls.push(
        `<text x="${fmt(box.min.x + 2)}" y="${fmt(box.min.y + 5)}" font-size="3" font-family="sans-serif" fill="${
          LAYER_COLORS.reference
        }">${escapeText(panel.label)}</text>`,
      );
    }
  }

  const layer = (name: keyof typeof LAYER_COLORS, content: string[], strokeOnly = true) => `
  <g id="layer-${name}" inkscape:groupmode="layer" inkscape:label="${LAYER_LABELS[name]}"${
    strokeOnly ? ` stroke="${LAYER_COLORS[name]}" fill="none" stroke-width="${opts.hairlineWidth}"` : ''
  }>
    ${content.join('\n    ')}
  </g>`;

  const meta = `Generisano: ${design.meta.title} | Materijal: ${design.material.label} ${design.material.thickness}mm | Kerf: ${design.material.kerf}mm`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
     width="${fmt(sheetWidth)}mm" height="${fmt(sheetHeight)}mm" viewBox="0 0 ${fmt(sheetWidth)} ${fmt(sheetHeight)}">
  <title>${escapeText(design.meta.title)}</title>
  <desc>${escapeText(meta)}</desc>
  ${layer('cut', cutPaths)}
  ${layer('score', scorePaths)}
  ${layer('engrave', engravePaths, false)}
  ${layer('text', textEls, false)}
  ${layer('center', centerEls)}
  ${layer('reference', referenceEls, false)}
</svg>`;
}

function polygonEl(path: Path): string {
  return `<polygon points="${pointsAttr(path)}"/>`;
}

function polylineEl(path: Path, closed = false): string {
  const tag = closed ? 'polygon' : 'polyline';
  return `<${tag} points="${pointsAttr(path)}"/>`;
}

function pointsAttr(path: Path): string {
  return path.map((p) => `${fmt(p.x)},${fmt(p.y)}`).join(' ');
}

function fmt(n: number): string {
  return Math.round(n * 1000) / 1000 + '';
}

function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(s: string): string {
  return escapeText(s).replace(/"/g, '&quot;');
}

function qrModulesToRects(eng: Extract<import('../model/types').Engraving, { kind: 'qr' }>): string[] {
  const n = eng.modules.length;
  if (n === 0) return [];
  const cell = eng.sizeMm / n;
  const rects: string[] = [];
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (!eng.modules[row][col]) continue;
      rects.push(
        `<rect x="${fmt(eng.x + col * cell)}" y="${fmt(eng.y + row * cell)}" width="${fmt(cell)}" height="${fmt(
          cell,
        )}" fill="${LAYER_COLORS.engrave}" stroke="none"/>`,
      );
    }
  }
  return rects;
}

function barcodeToRects(eng: Extract<import('../model/types').Engraving, { kind: 'barcode' }>): string[] {
  const totalUnits = eng.bars.reduce((sum, b) => sum + b.widthUnits, 0);
  const unitWidth = eng.widthMm / totalUnits;
  const rects: string[] = [];
  let x = eng.x;
  for (const bar of eng.bars) {
    const w = bar.widthUnits * unitWidth;
    if (bar.dark) {
      rects.push(
        `<rect x="${fmt(x)}" y="${fmt(eng.y)}" width="${fmt(w)}" height="${fmt(eng.heightMm)}" fill="${
          LAYER_COLORS.engrave
        }" stroke="none"/>`,
      );
    }
    x += w;
  }
  return rects;
}
