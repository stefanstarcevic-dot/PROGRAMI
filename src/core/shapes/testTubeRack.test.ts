import { describe, it, expect } from 'vitest';
import { generateTestTubeRack } from './testTubeRack';
import { resolveMaterial } from '../materials/material';
import { findSelfIntersections } from '../geometry/intersect';

describe('generateTestTubeRack', () => {
  it('builds 4 panels (2 plates + 2 end panels) with correct hole counts', () => {
    const design = generateTestTubeRack({
      tubeCount: 12,
      tubeDiameter: 16,
      material: resolveMaterial('sperploca', 4),
      tolerance: { mode: 'tight' },
    });
    expect(design.panels).toHaveLength(4);
    const top = design.panels.find((p) => p.id === 'top-plate')!;
    const bottom = design.panels.find((p) => p.id === 'bottom-plate')!;
    expect(top.holes).toHaveLength(12);
    expect(bottom.holes).toHaveLength(12);
  });

  it('bottom plate holes are smaller than top plate holes (tip vs body)', () => {
    const design = generateTestTubeRack({
      tubeCount: 8,
      tubeDiameter: 16,
      material: resolveMaterial('sperploca', 4),
      tolerance: { mode: 'tight' },
    });
    const top = design.panels.find((p) => p.id === 'top-plate')!;
    const bottom = design.panels.find((p) => p.id === 'bottom-plate')!;
    const radius = (path: typeof top.holes[number]) => Math.hypot(path[0].x - path[8].x, path[0].y - path[8].y) / 2;
    expect(radius(bottom.holes[0])).toBeLessThan(radius(top.holes[0]));
  });

  it('produces no self-intersecting geometry', () => {
    const design = generateTestTubeRack({
      tubeCount: 20,
      tubeDiameter: 12,
      material: resolveMaterial('mdf', 3),
      tolerance: { mode: 'loose' },
    });
    for (const panel of design.panels) {
      expect(findSelfIntersections(panel.outline)).toHaveLength(0);
      for (const hole of panel.holes) expect(findSelfIntersections(hole)).toHaveLength(0);
    }
  });
});
