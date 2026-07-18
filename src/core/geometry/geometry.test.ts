import { describe, it, expect } from 'vitest';
import { v2 } from './vector2';
import { rectPath, offsetPolygon, boundingBox, signedArea } from './polygon';
import { pathsIntersect, findSelfIntersections } from './intersect';

describe('rectPath + offsetPolygon (kerf compensation)', () => {
  it('grows a rectangle outward by the offset distance on every side', () => {
    const rect = rectPath(100, 50);
    const grown = offsetPolygon(rect, 1); // e.g. +kerf/2
    const box = boundingBox(grown);
    expect(box.max.x - box.min.x).toBeCloseTo(102, 6);
    expect(box.max.y - box.min.y).toBeCloseTo(52, 6);
  });

  it('shrinks a rectangle inward with a negative offset', () => {
    const rect = rectPath(100, 50);
    const shrunk = offsetPolygon(rect, -1);
    const box = boundingBox(shrunk);
    expect(box.max.x - box.min.x).toBeCloseTo(98, 6);
    expect(box.max.y - box.min.y).toBeCloseTo(48, 6);
  });

  it('preserves area sign / orientation regardless of input winding', () => {
    const ccw = rectPath(10, 10);
    const cw = [...ccw].reverse();
    expect(signedArea(ccw)).toBeGreaterThan(0);
    expect(signedArea(cw)).toBeLessThan(0);
  });
});

describe('collision detection', () => {
  it('flags overlapping rectangles as intersecting', () => {
    const a = rectPath(10, 10, v2(0, 0));
    const b = rectPath(10, 10, v2(5, 5));
    expect(pathsIntersect(a, b)).toBe(true);
  });

  it('does not flag disjoint rectangles as intersecting', () => {
    const a = rectPath(10, 10, v2(0, 0));
    const b = rectPath(10, 10, v2(20, 20));
    expect(pathsIntersect(a, b)).toBe(false);
  });

  it('finds no self-intersections in a simple rectangle', () => {
    expect(findSelfIntersections(rectPath(10, 10))).toHaveLength(0);
  });

  it('detects a bowtie self-intersection', () => {
    const bowtie = [v2(0, 0), v2(10, 10), v2(10, 0), v2(0, 10)];
    expect(findSelfIntersections(bowtie).length).toBeGreaterThan(0);
  });
});
