import type { Path } from '../geometry/polygon';
import { boundingBox } from '../geometry/polygon';
import { v2 } from '../geometry/vector2';

/**
 * Fills a simple polygon with parallel horizontal scanline segments — the
 * standard way to "shade" an engraved area with pure vector strokes
 * instead of a raster fill, so every export format (SVG/DXF/PDF/EPS)
 * stays vector-only. Uses the even-odd rule: at each scanline, edge
 * crossings are sorted and paired up into filled spans.
 */
export function generateHatchLines(path: Path, spacing: number): Path[] {
  if (path.length < 3 || spacing <= 0) return [];
  const box = boundingBox(path);
  const lines: Path[] = [];

  for (let y = box.min.y + spacing / 2; y < box.max.y; y += spacing) {
    const xs: number[] = [];
    for (let i = 0; i < path.length; i++) {
      const a = path[i];
      const b = path[(i + 1) % path.length];
      if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) {
        const t = (y - a.y) / (b.y - a.y);
        xs.push(a.x + t * (b.x - a.x));
      }
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      lines.push([v2(xs[i], y), v2(xs[i + 1], y)]);
    }
  }
  return lines;
}
