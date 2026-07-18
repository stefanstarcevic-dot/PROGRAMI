import { describe, it, expect } from 'vitest';
import { buildRectPanel } from './panelBuilder';
import { boundingBox } from '../geometry/polygon';
import { findSelfIntersections } from '../geometry/intersect';
import type { FingerJointParams } from '../joints/finger';

const params: FingerJointParams = { thickness: 4, kerf: 0.12, clearance: 0, minFingerWidthFactor: 2 };

describe('buildRectPanel', () => {
  it('builds a plain rectangle with all-flat edges', () => {
    const panel = buildRectPanel(100, 50, {
      bottom: { type: 'flat' },
      right: { type: 'flat' },
      top: { type: 'flat' },
      left: { type: 'flat' },
    }, params);
    const box = boundingBox(panel);
    expect(box.max.x - box.min.x).toBeCloseTo(100, 6);
    expect(box.max.y - box.min.y).toBeCloseTo(50, 6);
    expect(findSelfIntersections(panel)).toHaveLength(0);
  });

  it('builds a 4-sided finger-jointed panel with no self-intersections and correct bbox', () => {
    const panel = buildRectPanel(100, 80, {
      bottom: { type: 'finger', tabDepth: 4, startsWithTab: true },
      right: { type: 'finger', tabDepth: 4, startsWithTab: false },
      top: { type: 'finger', tabDepth: 4, startsWithTab: true },
      left: { type: 'finger', tabDepth: 4, startsWithTab: false },
    }, params);
    expect(findSelfIntersections(panel)).toHaveLength(0);
    const box = boundingBox(panel);
    // notches recede inward, so bbox should still match nominal (tabs sit at the boundary)
    expect(box.max.x - box.min.x).toBeCloseTo(100, 1);
    expect(box.max.y - box.min.y).toBeCloseTo(80, 1);
  });

  it('supports finger-partial edges with flush end caps', () => {
    const panel = buildRectPanel(100, 60, {
      bottom: { type: 'finger-partial', tabDepth: 4, startsWithTab: true, inset: 4 },
      right: { type: 'flat' },
      top: { type: 'flat' },
      left: { type: 'flat' },
    }, params);
    expect(findSelfIntersections(panel)).toHaveLength(0);
  });
});
