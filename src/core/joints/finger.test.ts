import { describe, it, expect } from 'vitest';
import type { FingerJointParams } from './finger';
import { computeFingerLayout, generateFingerEdgePath } from './finger';

const params: FingerJointParams = {
  thickness: 4,
  kerf: 0.15,
  clearance: 0, // tight fit
  minFingerWidthFactor: 2,
};

describe('computeFingerLayout', () => {
  it('picks an odd finger count', () => {
    const layout = computeFingerLayout(200, params);
    expect(layout.count % 2).toBe(1);
    expect(layout.count).toBeGreaterThanOrEqual(3);
  });

  it('nominal widths sum exactly to the edge length', () => {
    const layout = computeFingerLayout(197.3, params);
    expect(layout.count * layout.nominalWidth).toBeCloseTo(197.3, 6);
  });

  it('falls back to 3 fingers on a very short edge', () => {
    const layout = computeFingerLayout(10, params);
    expect(layout.count).toBe(3);
  });
});

describe('generateFingerEdgePath', () => {
  const edgeLength = 100;
  const layout = computeFingerLayout(edgeLength, params);

  it('starts and ends exactly at the edge endpoints', () => {
    const path = generateFingerEdgePath(edgeLength, params.thickness, layout, params, true);
    expect(path[0].x).toBeCloseTo(0, 6);
    expect(path[0].y).toBeCloseTo(0, 6);
    expect(path[path.length - 1].x).toBeCloseTo(edgeLength, 6);
    expect(path[path.length - 1].y).toBeCloseTo(0, 6);
  });

  it('notches recede to exactly tabDepth and back to 0', () => {
    const path = generateFingerEdgePath(edgeLength, params.thickness, layout, params, true);
    const ys = new Set(path.map((p) => Math.round(p.y * 1000) / 1000));
    expect(ys.has(0)).toBe(true);
    expect(ys.has(params.thickness)).toBe(true);
    // no y values outside {0, tabDepth}
    for (const y of ys) {
      expect(y === 0 || Math.abs(y - params.thickness) < 1e-6).toBe(true);
    }
  });

  it('produces complementary patterns for the two mating panels', () => {
    const a = generateFingerEdgePath(edgeLength, params.thickness, layout, params, true);
    const b = generateFingerEdgePath(edgeLength, params.thickness, layout, params, false);
    // panel A starts with a flush tab (first two points both y=0, second x > 0 small span)
    // panel B starts with a notch (goes to y=tabDepth quickly)
    const aStartsFlush = a[1].y === 0;
    const bStartsFlush = b[1].y === 0;
    expect(aStartsFlush).not.toBe(bStartsFlush);
  });

  it('monotonically increases in x (no backtracking / self-crossing along the edge)', () => {
    const path = generateFingerEdgePath(edgeLength, params.thickness, layout, params, true);
    for (let i = 1; i < path.length; i++) {
      expect(path[i].x).toBeGreaterThanOrEqual(path[i - 1].x - 1e-9);
    }
  });
});
