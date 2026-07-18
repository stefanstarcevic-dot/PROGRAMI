import { describe, it, expect } from 'vitest';
import { generateBox } from '../shapes/box';
import { resolveMaterial } from '../materials/material';
import { renderDesignToSvg } from './svgDocument';

describe('renderDesignToSvg', () => {
  const design = generateBox({
    width: 300,
    depth: 200,
    height: 150,
    material: resolveMaterial('sperploca', 4),
    tolerance: { mode: 'tight' },
    lidStyle: 'closed',
  });

  it('produces at least one well-formed SVG sheet with mm units', () => {
    const sheets = renderDesignToSvg(design, { sheetWidth: 900, sheetHeight: 600 });
    expect(sheets.length).toBeGreaterThan(0);
    const svg = sheets[0].svg;
    expect(svg).toContain('<?xml');
    expect(svg).toMatch(/width="\d+(\.\d+)?mm"/);
    expect(svg).toContain('viewBox="0 0');
  });

  it('includes all professional layers', () => {
    const sheets = renderDesignToSvg(design, { sheetWidth: 900, sheetHeight: 600 });
    const svg = sheets[0].svg;
    for (const label of ['Cut', 'Score', 'Engrave', 'Text', 'Center', 'Reference']) {
      expect(svg).toContain(`inkscape:label="${label}"`);
    }
  });

  it('places every panel outline as a cut-layer polygon', () => {
    const sheets = renderDesignToSvg(design, { sheetWidth: 900, sheetHeight: 600 });
    const totalPolygons = sheets.reduce((sum, s) => sum + (s.svg.match(/<polygon/g)?.length ?? 0), 0);
    // at least one polygon per panel (outline) + any holes
    expect(totalPolygons).toBeGreaterThanOrEqual(design.panels.length);
  });

  it('splits across multiple sheets when panels do not fit one', () => {
    const sheets = renderDesignToSvg(design, { sheetWidth: 100, sheetHeight: 100 });
    expect(sheets.length).toBeGreaterThan(1);
  });
});
