import { describe, it, expect } from 'vitest';
import { generateWineBox, AVERAGE_WINE_BOTTLE } from './wineBox';
import { resolveMaterial } from '../materials/material';
import { findSelfIntersections } from '../geometry/intersect';

describe('generateWineBox', () => {
  it('uses average bottle dimensions when none are given', () => {
    const design = generateWineBox({
      material: resolveMaterial('sperploca', 4),
      tolerance: { mode: 'tight' },
    });
    expect(design.meta.outerDimensionsMm.height).toBeGreaterThan(AVERAGE_WINE_BOTTLE.height);
    expect(design.panels.find((p) => p.id === 'top')).toBeUndefined(); // open top
  });

  it('adds a collar panel with a bottle-sized hole', () => {
    const design = generateWineBox({
      material: resolveMaterial('sperploca', 4),
      tolerance: { mode: 'tight' },
    });
    const collar = design.panels.find((p) => p.id === 'collar')!;
    expect(collar).toBeDefined();
    expect(collar.holes).toHaveLength(1);
  });

  it('produces no self-intersecting geometry', () => {
    const design = generateWineBox({
      bottleDiameter: 90,
      bottleHeight: 340,
      material: resolveMaterial('mdf', 5),
      tolerance: { mode: 'loose' },
    });
    for (const panel of design.panels) {
      expect(findSelfIntersections(panel.outline)).toHaveLength(0);
      for (const hole of panel.holes) expect(findSelfIntersections(hole)).toHaveLength(0);
    }
  });
});
