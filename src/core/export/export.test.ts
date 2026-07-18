import { describe, it, expect } from 'vitest';
import { generateBox } from '../shapes/box';
import { resolveMaterial } from '../materials/material';
import { flattenDesignToSheets } from './flatten';
import { renderSheetToDxf } from './dxf';
import { renderSheetToPdf } from './pdf';
import { renderSheetToEps } from './eps';
import { renderSheetToLightburn } from './lightburn';

const design = generateBox({
  width: 200,
  depth: 120,
  height: 80,
  material: resolveMaterial('sperploca', 4),
  tolerance: { mode: 'tight' },
  lidStyle: 'closed',
});

describe('flattenDesignToSheets', () => {
  it('collects every panel outline into cutPaths', () => {
    const sheets = flattenDesignToSheets(design, { sheetWidth: 900, sheetHeight: 600 });
    const totalCutPaths = sheets.reduce((sum, s) => sum + s.cutPaths.length, 0);
    expect(totalCutPaths).toBeGreaterThanOrEqual(design.panels.length);
  });
});

describe('renderSheetToDxf', () => {
  it('produces a well-formed DXF with HEADER/TABLES/ENTITIES/EOF', () => {
    const [sheet] = flattenDesignToSheets(design, { sheetWidth: 900, sheetHeight: 600 });
    const dxf = renderSheetToDxf(sheet);
    expect(dxf).toContain('SECTION');
    expect(dxf).toContain('ENTITIES');
    expect(dxf).toContain('LAYER');
    expect(dxf.trim().endsWith('0\nEOF')).toBe(true);
    expect(dxf.match(/LINE/g)!.length).toBeGreaterThan(0);
  });
});

describe('renderSheetToPdf', () => {
  it('produces bytes starting with the PDF header and containing xref/trailer', () => {
    const [sheet] = flattenDesignToSheets(design, { sheetWidth: 900, sheetHeight: 600 });
    const bytes = renderSheetToPdf(sheet);
    const text = new TextDecoder().decode(bytes);
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain('xref');
    expect(text).toContain('trailer');
    expect(text).toContain('/Type /Catalog');
  });
});

describe('renderSheetToEps', () => {
  it('produces a valid EPS header and bounding box', () => {
    const [sheet] = flattenDesignToSheets(design, { sheetWidth: 900, sheetHeight: 600 });
    const eps = renderSheetToEps(sheet);
    expect(eps.startsWith('%!PS-Adobe-3.0 EPSF-3.0')).toBe(true);
    expect(eps).toMatch(/%%BoundingBox: 0 0 \d+ \d+/);
    expect(eps.trim().endsWith('%%EOF')).toBe(true);
  });
});

describe('renderSheetToLightburn', () => {
  it('produces valid-looking XML with CutSetting and Shape entries', () => {
    const [sheet] = flattenDesignToSheets(design, { sheetWidth: 900, sheetHeight: 600 });
    const lbrn = renderSheetToLightburn(sheet);
    expect(lbrn).toContain('<LightBurnProject');
    expect(lbrn).toContain('<CutSetting');
    expect(lbrn).toContain('<Shape Type="Path"');
    expect(lbrn.match(/<Shape/g)!.length).toBeGreaterThanOrEqual(design.panels.length);
  });
});
