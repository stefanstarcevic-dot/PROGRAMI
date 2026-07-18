import type { FlattenedSheet } from './flatten';
import type { Path } from '../geometry/polygon';

const MM_TO_PT = 72 / 25.4;

const COLORS = {
  cut: [1, 0, 0] as const,
  score: [0, 0.6, 0] as const,
  engrave: [0, 0, 1] as const,
  text: [0, 0, 0] as const,
};

/**
 * Writes an EPS (Encapsulated PostScript) file — the same coordinate
 * handling as the PDF exporter (mm -> pt, Y-flip since PostScript is
 * Y-up), but as plain PostScript operators wrapped in the standard EPS
 * header, for the (still common, especially in print/sign shops) tools
 * that expect .eps over .pdf.
 */
export function renderSheetToEps(sheet: FlattenedSheet): string {
  const widthPt = sheet.widthMm * MM_TO_PT;
  const heightPt = sheet.heightMm * MM_TO_PT;
  const flipY = (p: { x: number; y: number }) => ({ x: p.x * MM_TO_PT, y: heightPt - p.y * MM_TO_PT });

  const body: string[] = ['0.1 setlinewidth'];
  body.push(...colorAndPaths(COLORS.cut, sheet.cutPaths, true, flipY));
  body.push(...colorAndPaths(COLORS.score, sheet.scorePaths, false, flipY));
  body.push(...colorAndPaths(COLORS.engrave, sheet.engravePaths, true, flipY));

  for (const text of sheet.texts) {
    const p = flipY(text);
    const size = text.fontSize * MM_TO_PT;
    body.push(`${COLORS.text.join(' ')} setrgbcolor`, `/Helvetica findfont ${fmt(size)} scalefont setfont`, `${fmt(p.x)} ${fmt(p.y)} moveto`, `(${escapePs(text.content)}) show`);
  }

  return [
    '%!PS-Adobe-3.0 EPSF-3.0',
    `%%BoundingBox: 0 0 ${Math.ceil(widthPt)} ${Math.ceil(heightPt)}`,
    `%%HiResBoundingBox: 0 0 ${fmt(widthPt)} ${fmt(heightPt)}`,
    '%%EndComments',
    ...body,
    '%%EOF',
  ].join('\n');
}

function colorAndPaths(
  color: readonly [number, number, number],
  paths: Path[],
  closed: boolean,
  map: (p: { x: number; y: number }) => { x: number; y: number },
): string[] {
  if (paths.length === 0) return [];
  const parts = [`${color.join(' ')} setrgbcolor`];
  for (const path of paths) {
    if (path.length < 2) continue;
    const pts = path.map(map);
    parts.push(`${fmt(pts[0].x)} ${fmt(pts[0].y)} moveto`);
    for (let i = 1; i < pts.length; i++) parts.push(`${fmt(pts[i].x)} ${fmt(pts[i].y)} lineto`);
    parts.push(closed ? 'closepath stroke' : 'stroke');
  }
  return parts;
}

function escapePs(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function fmt(n: number): string {
  return (Math.round(n * 1000) / 1000).toString();
}
