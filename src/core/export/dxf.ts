import type { FlattenedSheet } from './flatten';
import type { Path } from '../geometry/polygon';

const LAYER_DEFS: { name: string; colorIndex: number }[] = [
  { name: 'CUT', colorIndex: 1 }, // red
  { name: 'SCORE', colorIndex: 3 }, // green
  { name: 'ENGRAVE', colorIndex: 5 }, // blue
];

/**
 * Writes a minimal, broadly-compatible DXF (AC1009 / "R12") file: a
 * HEADER + LAYERS table + an ENTITIES section of plain LINE entities
 * (every closed path emitted as a run of segments back to its start).
 * Plain LINEs rather than LWPOLYLINE/POLYLINE keep this readable by
 * essentially every DXF importer (AutoCAD, LibreCAD, Illustrator,
 * CorelDraw, LightBurn, RDWorks) without depending on a specific DXF
 * version's polyline entity quirks.
 */
export function renderSheetToDxf(sheet: FlattenedSheet): string {
  const lines: string[] = [];

  lines.push('0', 'SECTION', '2', 'HEADER');
  lines.push('9', '$INSUNITS', '70', '4'); // 4 = millimeters
  lines.push('0', 'ENDSEC');

  lines.push('0', 'SECTION', '2', 'TABLES');
  lines.push('0', 'TABLE', '2', 'LAYER', '70', String(LAYER_DEFS.length));
  for (const layer of LAYER_DEFS) {
    lines.push('0', 'LAYER', '2', layer.name, '70', '0', '62', String(layer.colorIndex), '6', 'CONTINUOUS');
  }
  lines.push('0', 'ENDTAB');
  lines.push('0', 'ENDSEC');

  // DXF's convention is Y-up (origin bottom-left); our geometry follows
  // SVG's Y-down convention throughout the core, so flip here to keep the
  // exported drawing right-side-up in CAD viewers instead of mirrored.
  const flipY = (p: { x: number; y: number }) => ({ x: p.x, y: sheet.heightMm - p.y });

  lines.push('0', 'SECTION', '2', 'ENTITIES');
  for (const path of sheet.cutPaths) emitClosedPolyAsLines(lines, path, 'CUT', flipY);
  for (const path of sheet.scorePaths) emitOpenPolyAsLines(lines, path, 'SCORE', flipY);
  for (const path of sheet.engravePaths) emitClosedPolyAsLines(lines, path, 'ENGRAVE', flipY);
  for (const text of sheet.texts) {
    const p = flipY(text);
    lines.push(
      '0', 'TEXT',
      '8', 'ENGRAVE',
      '10', fmt(p.x), '20', fmt(p.y), '30', '0',
      '40', fmt(text.fontSize),
      '1', text.content,
    );
  }
  lines.push('0', 'ENDSEC');
  lines.push('0', 'EOF');

  return lines.join('\n');
}

type PointMap = (p: { x: number; y: number }) => { x: number; y: number };

function emitClosedPolyAsLines(lines: string[], path: Path, layer: string, map: PointMap) {
  for (let i = 0; i < path.length; i++) {
    const a = map(path[i]);
    const b = map(path[(i + 1) % path.length]);
    emitLine(lines, a, b, layer);
  }
}

function emitOpenPolyAsLines(lines: string[], path: Path, layer: string, map: PointMap) {
  for (let i = 0; i + 1 < path.length; i++) {
    emitLine(lines, map(path[i]), map(path[i + 1]), layer);
  }
}

function emitLine(lines: string[], a: { x: number; y: number }, b: { x: number; y: number }, layer: string) {
  lines.push(
    '0', 'LINE',
    '8', layer,
    '10', fmt(a.x), '20', fmt(a.y), '30', '0',
    '11', fmt(b.x), '21', fmt(b.y), '31', '0',
  );
}

function fmt(n: number): string {
  return (Math.round(n * 1000) / 1000).toString();
}
