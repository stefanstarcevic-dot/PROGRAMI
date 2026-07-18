import type { Panel } from '../model/types';
import { boundingBox, translate } from '../geometry/polygon';
import { translateEngraving } from '../model/transform';

export interface SheetLayoutOptions {
  sheetWidth: number;
  sheetHeight: number;
  margin: number;
  gap: number;
}

export interface Sheet {
  index: number;
  width: number;
  height: number;
  panels: Panel[];
}

/**
 * Greedy shelf (row-based) bin packing: panels are sorted tallest-first
 * and placed left-to-right, wrapping to a new row when the current row
 * runs out of width, and to a new sheet when the current sheet runs out
 * of height. Not a true nesting solver (no rotation search, no irregular
 * polygon nesting) — that's flagged as a future upgrade point — but it's
 * a correct, collision-free, deterministic layout for the rectilinear
 * panels this engine produces.
 */
export function layoutPanelsOnSheets(panels: Panel[], options: SheetLayoutOptions): Sheet[] {
  const { sheetWidth, sheetHeight, margin, gap } = options;
  const sorted = [...panels].sort((a, b) => panelHeight(b) - panelHeight(a));

  const sheets: Sheet[] = [];
  let current: Sheet = { index: 0, width: sheetWidth, height: sheetHeight, panels: [] };
  let cursorX = margin;
  let cursorY = margin;
  let rowHeight = 0;

  const placedPanels: Panel[] = [];

  for (const panel of sorted) {
    const box = boundingBox(panel.outline);
    const w = box.max.x - box.min.x;
    const h = box.max.y - box.min.y;

    if (cursorX + w + margin > sheetWidth) {
      cursorX = margin;
      cursorY += rowHeight + gap;
      rowHeight = 0;
    }
    if (cursorY + h + margin > sheetHeight) {
      sheets.push(current);
      current = { index: sheets.length, width: sheetWidth, height: sheetHeight, panels: [] };
      cursorX = margin;
      cursorY = margin;
      rowHeight = 0;
    }

    const dx = cursorX - box.min.x;
    const dy = cursorY - box.min.y;
    const placed: Panel = {
      ...panel,
      outline: translate(panel.outline, { x: dx, y: dy }),
      holes: panel.holes.map((h2) => translate(h2, { x: dx, y: dy })),
      scoreLines: panel.scoreLines.map((s) => translate(s, { x: dx, y: dy })),
      engravings: panel.engravings.map((e) => translateEngraving(e, dx, dy)),
      placement: { x: dx, y: dy, rotationDeg: 0 },
    };
    current.panels.push(placed);
    placedPanels.push(placed);

    cursorX += w + gap;
    rowHeight = Math.max(rowHeight, h);
  }
  sheets.push(current);
  return sheets;
}

function panelHeight(panel: Panel): number {
  const box = boundingBox(panel.outline);
  return box.max.y - box.min.y;
}
