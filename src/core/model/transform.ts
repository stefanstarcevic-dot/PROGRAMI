import type { Engraving } from './types';
import { translate } from '../geometry/polygon';

export function translateEngraving(e: Engraving, dx: number, dy: number): Engraving {
  switch (e.kind) {
    case 'text':
      return { ...e, x: e.x + dx, y: e.y + dy };
    case 'vector':
      return { ...e, paths: e.paths.map((p) => translate(p, { x: dx, y: dy })) };
    case 'halftone':
      return { ...e, dots: e.dots.map((d) => ({ ...d, x: d.x + dx, y: d.y + dy })) };
    case 'qr':
      return { ...e, x: e.x + dx, y: e.y + dy };
    case 'barcode':
      return { ...e, x: e.x + dx, y: e.y + dy };
  }
}
