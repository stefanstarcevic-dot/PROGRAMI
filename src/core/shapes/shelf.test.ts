import { describe, it, expect } from 'vitest';
import { generateShelf } from './shelf';
import { resolveMaterial } from '../materials/material';
import { findSelfIntersections } from '../geometry/intersect';

describe('generateShelf', () => {
  it('builds 2 side panels + N shelves for a 3-level shelf', () => {
    const design = generateShelf({
      levels: 3,
      levelWidth: 400,
      levelDepth: 250,
      levelHeight: 300,
      material: resolveMaterial('sperploca', 12),
      tolerance: { mode: 'tight' },
    });
    expect(design.panels).toHaveLength(5); // left, right, shelf-0, shelf-1, shelf-2
    const errors = design.warnings.filter((w) => w.severity === 'error');
    expect(errors).toEqual([]);
  });

  it('middle shelf outline includes fused tenons (no separate hole-tenon)', () => {
    const design = generateShelf({
      levels: 3,
      levelWidth: 400,
      levelDepth: 250,
      levelHeight: 300,
      material: resolveMaterial('sperploca', 12),
      tolerance: { mode: 'tight' },
    });
    const middle = design.panels.find((p) => p.id === 'shelf-1')!;
    expect(middle.holes).toHaveLength(0); // tenon is part of the outline now
    // outline should bulge past the nominal levelWidth on both sides (tenon protrusion)
    const xs = middle.outline.map((p) => p.x);
    expect(Math.min(...xs)).toBeLessThan(0);
    expect(Math.max(...xs)).toBeGreaterThan(400);
  });

  it('side panels gain interior mortise slots for middle shelves', () => {
    const design = generateShelf({
      levels: 4,
      levelWidth: 400,
      levelDepth: 250,
      levelHeight: 300,
      material: resolveMaterial('sperploca', 12),
      tolerance: { mode: 'tight' },
    });
    const left = design.panels.find((p) => p.id === 'left')!;
    expect(left.holes).toHaveLength(2); // 2 middle shelves (levels 2 and 3, 0-indexed 1 and 2)
  });

  it('produces no self-intersecting geometry across all panels', () => {
    const design = generateShelf({
      levels: 4,
      levelWidth: 500,
      levelDepth: 300,
      levelHeight: 280,
      material: resolveMaterial('mdf', 15),
      tolerance: { mode: 'loose' },
    });
    for (const panel of design.panels) {
      expect(findSelfIntersections(panel.outline)).toHaveLength(0);
      for (const hole of panel.holes) expect(findSelfIntersections(hole)).toHaveLength(0);
    }
  });

  it('rejects fewer than 2 levels', () => {
    expect(() =>
      generateShelf({
        levels: 1,
        levelWidth: 400,
        levelDepth: 250,
        levelHeight: 300,
        material: resolveMaterial('sperploca', 12),
        tolerance: { mode: 'tight' },
      }),
    ).toThrow();
  });
});
