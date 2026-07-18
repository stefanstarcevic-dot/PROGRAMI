import { describe, it, expect } from 'vitest';
import { generateBox } from './box';
import { resolveMaterial } from '../materials/material';
import { findSelfIntersections } from '../geometry/intersect';
import { boundingBox } from '../geometry/polygon';

describe('generateBox', () => {
  const material = resolveMaterial('sperploca', 4);

  it('generates 6 panels for a closed box with no geometry errors', () => {
    const design = generateBox({
      width: 300,
      depth: 200,
      height: 150,
      material,
      tolerance: { mode: 'tight' },
      lidStyle: 'closed',
    });

    expect(design.panels).toHaveLength(6);
    const errors = design.warnings.filter((w) => w.severity === 'error');
    expect(errors).toEqual([]);

    for (const panel of design.panels) {
      expect(findSelfIntersections(panel.outline)).toHaveLength(0);
    }
  });

  it('front/back panel bounding box matches outer width x height', () => {
    const design = generateBox({
      width: 300,
      depth: 200,
      height: 150,
      material,
      tolerance: { mode: 'tight' },
      lidStyle: 'closed',
    });
    const front = design.panels.find((p) => p.id === 'front')!;
    const box = boundingBox(front.outline);
    expect(box.max.x - box.min.x).toBeCloseTo(300, 0);
    expect(box.max.y - box.min.y).toBeCloseTo(150, 0);
  });

  it('left/right panels are inset by 2x thickness from the outer depth', () => {
    const design = generateBox({
      width: 300,
      depth: 200,
      height: 150,
      material,
      tolerance: { mode: 'tight' },
      lidStyle: 'closed',
    });
    const left = design.panels.find((p) => p.id === 'left')!;
    const box = boundingBox(left.outline);
    expect(box.max.x - box.min.x).toBeCloseTo(200 - 2 * material.thickness, 0);
  });

  it('open lid style produces 5 panels (no top)', () => {
    const design = generateBox({
      width: 300,
      depth: 200,
      height: 150,
      material,
      tolerance: { mode: 'tight' },
      lidStyle: 'open',
    });
    expect(design.panels.find((p) => p.id === 'top')).toBeUndefined();
    expect(design.panels).toHaveLength(5);
  });

  it('hinged lid style adds knuckle holes to the lid and back panel', () => {
    const design = generateBox({
      width: 300,
      depth: 200,
      height: 150,
      material,
      tolerance: { mode: 'tight' },
      lidStyle: 'hinged',
    });
    const top = design.panels.find((p) => p.id === 'top')!;
    const back = design.panels.find((p) => p.id === 'back')!;
    expect(top.holes.length).toBeGreaterThan(0);
    expect(back.holes.length).toBeGreaterThan(0);
  });

  it('dividers add extra panels and matching slots in the bottom', () => {
    const design = generateBox({
      width: 300,
      depth: 200,
      height: 150,
      material,
      tolerance: { mode: 'tight' },
      lidStyle: 'closed',
      dividers: [{ axis: 'x', count: 2 }],
    });
    const dividers = design.panels.filter((p) => p.id.startsWith('divider-'));
    expect(dividers).toHaveLength(2);
    const bottom = design.panels.find((p) => p.id === 'bottom')!;
    expect(bottom.holes.length).toBeGreaterThanOrEqual(2);
  });

  it('flags a too-thin panel warning when depth leaves almost no room for the side panels', () => {
    // width/height generous, but depth is barely more than 2x thickness,
    // so the left/right panels (inset by thickness on each end) come out
    // very narrow relative to the material thickness.
    const design = generateBox({
      width: 100,
      depth: 12,
      height: 100,
      material: resolveMaterial('akril', 4),
      tolerance: { mode: 'tight' },
      lidStyle: 'closed',
    });
    expect(design.warnings.length).toBeGreaterThan(0);
  });
});
