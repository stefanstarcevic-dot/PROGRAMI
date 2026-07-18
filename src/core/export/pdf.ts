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
 * Writes a minimal single-page vector PDF (no external libraries): a
 * Catalog + Pages + Page object with a content stream of PDF path
 * operators (`m`/`l`/`h`/`S`). PDF's native unit is 1/72in, so mm
 * coordinates are scaled by 72/25.4; PDF is also Y-up like DXF, so the
 * same vertical flip applied there is applied here.
 */
export function renderSheetToPdf(sheet: FlattenedSheet): Uint8Array {
  const widthPt = sheet.widthMm * MM_TO_PT;
  const heightPt = sheet.heightMm * MM_TO_PT;
  const flipY = (p: { x: number; y: number }) => ({ x: p.x * MM_TO_PT, y: heightPt - p.y * MM_TO_PT });

  const streamParts: string[] = ['0.1 w'];
  streamParts.push(...colorAndPaths(COLORS.cut, sheet.cutPaths, true, flipY));
  streamParts.push(...colorAndPaths(COLORS.score, sheet.scorePaths, false, flipY));
  streamParts.push(...colorAndPaths(COLORS.engrave, sheet.engravePaths, true, flipY));

  for (const text of sheet.texts) {
    const p = flipY(text);
    const size = text.fontSize * MM_TO_PT;
    streamParts.push('BT', `${COLORS.text.join(' ')} rg`, `/F1 ${fmt(size)} Tf`, `${fmt(p.x)} ${fmt(p.y)} Td`, `(${escapePdfText(text.content)}) Tj`, 'ET');
  }

  const content = streamParts.join('\n');
  return assemblePdf(widthPt, heightPt, content);
}

function colorAndPaths(
  color: readonly [number, number, number],
  paths: Path[],
  closed: boolean,
  map: (p: { x: number; y: number }) => { x: number; y: number },
): string[] {
  if (paths.length === 0) return [];
  const parts = [`${color.join(' ')} RG`];
  for (const path of paths) {
    if (path.length < 2) continue;
    const pts = path.map(map);
    parts.push(`${fmt(pts[0].x)} ${fmt(pts[0].y)} m`);
    for (let i = 1; i < pts.length; i++) parts.push(`${fmt(pts[i].x)} ${fmt(pts[i].y)} l`);
    parts.push(closed ? 's' : 'S');
  }
  return parts;
}

function assemblePdf(widthPt: number, heightPt: number, content: string): Uint8Array {
  const objects: string[] = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>'); // 1
  objects.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'); // 2
  objects.push(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${fmt(widthPt)} ${fmt(heightPt)}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
  ); // 3
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'); // 4
  objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`); // 5

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}

function escapePdfText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function fmt(n: number): string {
  return (Math.round(n * 1000) / 1000).toString();
}
