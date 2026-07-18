import { describe, it, expect } from 'vitest';
import { computeAssemblyPoses } from './assembly3d';
import { generateBox } from '../shapes/box';
import { generateShelf } from '../shapes/shelf';
import { resolveMaterial } from '../materials/material';

describe('computeAssemblyPoses', () => {
  it('places all 6 box panels with a pose', () => {
    const design = generateBox({
      width: 300,
      depth: 200,
      height: 150,
      material: resolveMaterial('sperploca', 4),
      tolerance: { mode: 'tight' },
      lidStyle: 'closed',
    });
    const poses = computeAssemblyPoses(design, 0);
    for (const panel of design.panels) {
      expect(poses[panel.id]).toBeDefined();
    }
  });

  it('separates panels further apart as explodeFactor increases', () => {
    const design = generateBox({
      width: 300,
      depth: 200,
      height: 150,
      material: resolveMaterial('sperploca', 4),
      tolerance: { mode: 'tight' },
      lidStyle: 'closed',
    });
    const assembled = computeAssemblyPoses(design, 0);
    const exploded = computeAssemblyPoses(design, 1);
    expect(exploded.front.position[1]).toBeLessThan(assembled.front.position[1]);
    expect(exploded.top.position[2]).toBeGreaterThan(assembled.top.position[2]);
  });

  it('falls back to a flat non-recognized layout for shapes without box panel ids', () => {
    const design = generateShelf({
      levels: 3,
      levelWidth: 400,
      levelDepth: 250,
      levelHeight: 300,
      material: resolveMaterial('sperploca', 12),
      tolerance: { mode: 'tight' },
    });
    const poses = computeAssemblyPoses(design, 0);
    for (const panel of design.panels) {
      expect(poses[panel.id]).toBeDefined();
    }
  });
});
