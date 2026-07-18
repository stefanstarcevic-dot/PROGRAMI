import { describe, it, expect } from 'vitest';
import { generatePhoneStand } from './phoneStand';
import { resolveMaterial } from '../materials/material';
import { findSelfIntersections } from '../geometry/intersect';

describe('generatePhoneStand', () => {
  it('builds a rail + 2 identical side panels', () => {
    const design = generatePhoneStand({
      material: resolveMaterial('sperploca', 4),
      tolerance: { mode: 'tight' },
    });
    expect(design.panels).toHaveLength(3);
    const errors = design.warnings.filter((w) => w.severity === 'error');
    expect(errors).toEqual([]);
  });

  it('produces no self-intersecting geometry', () => {
    const design = generatePhoneStand({
      phoneThickness: 15,
      material: resolveMaterial('akril', 5),
      tolerance: { mode: 'loose' },
    });
    for (const panel of design.panels) {
      expect(findSelfIntersections(panel.outline)).toHaveLength(0);
    }
  });
});
