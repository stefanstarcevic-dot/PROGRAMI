import type { FlattenedSheet } from './flatten';
import { renderSheetToPdf } from './pdf';

/**
 * Adobe Illustrator's native .ai format has been PDF-compatible since
 * Illustrator 9 — an .ai file is a PDF with Illustrator-specific private
 * data appended, and Illustrator (and most other vector tools) opens a
 * plain PDF saved with an .ai extension without complaint. Rather than
 * reverse-engineer Illustrator's private PDF extensions for marginal
 * benefit, this reuses the same PDF writer and only exists as a distinct
 * export so the file lands on disk with the extension the user expects.
 */
export function renderSheetToAi(sheet: FlattenedSheet): Uint8Array {
  return renderSheetToPdf(sheet);
}
