import { describe, it, expect } from 'vitest';
import { generateBirdhouse } from './birdhouse';
import { resolveMaterial } from '../materials/material';
import { findSelfIntersections } from '../geometry/intersect';

describe('generateBirdhouse', () => {
  it('builds floor + 4 walls + 2 roof panels with an entrance hole', () => {
    const design = generateBirdhouse({
      material: resolveMaterial('sperploca', 6),
      tolerance: { mode: 'tight' },
    });
    expect(design.panels).toHaveLength(7); // front, back, left, right, bottom, roof-a, roof-b
    const front = design.panels.find((p) => p.id === 'front')!;
    expect(front.holes.length).toBeGreaterThanOrEqual(2); // entrance + perch peg hole
  });

  it('produces no self-intersecting geometry', () => {
    const design = generateBirdhouse({
      width: 160,
      depth: 150,
      wallHeight: 130,
      roofPitchDeg: 40,
      material: resolveMaterial('mdf', 8),
      tolerance: { mode: 'loose' },
    });
    for (const panel of design.panels) {
      expect(findSelfIntersections(panel.outline)).toHaveLength(0);
      for (const hole of panel.holes) expect(findSelfIntersections(hole)).toHaveLength(0);
    }
  });
});
