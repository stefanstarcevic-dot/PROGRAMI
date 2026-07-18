import { describe, it, expect } from 'vitest';
import { generateLivingHingePattern } from './livingHinge';
import { generateMortiseSlot, generateTenonTab, layoutDividerSlots } from './mortiseTenon';
import { generateSnapFitTab, generateSnapFitCatchHole } from './snapFit';
import { computeKnuckleHingeLayout, knuckleHingePinBores, generateKnuckleHingeEdgePath, magnetHole, evenlySpacedHoles } from './hardware';
import type { FingerJointParams } from './finger';
import { findSelfIntersections } from '../geometry/intersect';

const params: FingerJointParams = { thickness: 3, kerf: 0.12, clearance: 0.05, minFingerWidthFactor: 2 };

describe('living hinge', () => {
  it('produces slits contained within the strip and warns above 2.5mm', () => {
    const result = generateLivingHingePattern({ thickness: 2, kerf: 0.1, length: 100, width: 30 });
    expect(result.slits.length).toBeGreaterThan(0);
    for (const slit of result.slits) {
      for (const p of slit) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(100.001);
      }
    }
    expect(result.warning).toBeUndefined();

    const thick = generateLivingHingePattern({ thickness: 4, kerf: 0.1, length: 100, width: 30 });
    expect(thick.warning).toBeDefined();
  });
});

describe('mortise/tenon', () => {
  it('tenon is wider than mortise by kerf-clearance so they fit after cutting', () => {
    const mortise = generateMortiseSlot({ center: 50, width: 10, depth: 3 }, 0, params);
    const tenon = generateTenonTab(50, 10, 3, 0, params);
    const mortiseWidth = mortise[1].x - mortise[0].x;
    const tenonWidth = tenon[1].x - tenon[0].x;
    expect(tenonWidth).toBeGreaterThan(mortiseWidth);
    expect(tenonWidth - mortiseWidth).toBeCloseTo(2 * (params.kerf - params.clearance), 6);
  });

  it('spaces divider slots evenly across the face', () => {
    const centers = layoutDividerSlots(120, 3, 5);
    expect(centers).toHaveLength(3);
    expect(centers[0]).toBeCloseTo(30, 6);
    expect(centers[2]).toBeCloseTo(90, 6);
  });
});

describe('snap-fit', () => {
  it('generates an outline and two freeing slots', () => {
    const { outline, freeingSlots } = generateSnapFitTab(
      { x: 10, y: 0 },
      { thickness: 3, armLength: 12, armWidth: 6, catchDepth: 1.2 },
    );
    expect(outline.length).toBeGreaterThan(4);
    expect(freeingSlots).toHaveLength(2);
  });

  it('catch hole is wide enough to admit the arm + catch', () => {
    const hole = generateSnapFitCatchHole(
      { x: 0, y: 0 },
      { thickness: 3, armLength: 12, armWidth: 6, catchDepth: 1.2 },
    );
    const width = hole[1].x - hole[0].x;
    expect(width).toBeGreaterThan(6);
  });
});

describe('hardware', () => {
  it('knuckle hinge layout gives panel A and B complementary, near-equal bore counts', () => {
    const layout = computeKnuckleHingeLayout({ length: 100, thickness: 4, pinDiameter: 2, kerf: 0.12 });
    const boresA = knuckleHingePinBores(layout, true);
    const boresB = knuckleHingePinBores(layout, false);
    expect(boresA.length + boresB.length).toBe(layout.count);
    expect(Math.abs(boresA.length - boresB.length)).toBeLessThanOrEqual(1);
  });

  it('fused knuckle-hinge edge path is a simple polyline (no self-intersection) for both panels', () => {
    const layout = computeKnuckleHingeLayout({ length: 200, thickness: 4, pinDiameter: 2, kerf: 0.15 });
    for (const isPanelA of [true, false]) {
      const edge = generateKnuckleHingeEdgePath(200, layout, isPanelA);
      // Close it into a simple rectangle-ish loop (edge + a flat return path)
      // to check for self-crossings the same way a real panel outline would.
      const closedLoop = [...edge, { x: 200, y: 20 }, { x: 0, y: 20 }];
      expect(findSelfIntersections(closedLoop)).toHaveLength(0);
      expect(edge[0]).toEqual({ x: 0, y: 0 });
      expect(edge[edge.length - 1].x).toBeCloseTo(200, 6);
    }
  });

  it('magnet hole shrinks for a snug press fit', () => {
    const hole = magnetHole({ x: 0, y: 0 }, 6, 0.12);
    expect(hole.radius * 2).toBeLessThan(6);
  });

  it('evenly spaces N holes with end inset', () => {
    const positions = evenlySpacedHoles(100, 3, 10);
    expect(positions[0]).toBeCloseTo(10, 6);
    expect(positions[2]).toBeCloseTo(90, 6);
  });
});
