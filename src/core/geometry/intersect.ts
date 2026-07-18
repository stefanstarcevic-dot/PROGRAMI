import type { Vector2 } from './vector2';
import { sub, cross } from './vector2';
import type { Path } from './polygon';
import { boundingBox } from './polygon';

export interface Segment {
  a: Vector2;
  b: Vector2;
}

/** Returns the intersection point of two finite segments, or null if they
 * don't cross (touching at a shared endpoint does not count as crossing). */
export function segmentIntersection(s1: Segment, s2: Segment): Vector2 | null {
  const r = sub(s1.b, s1.a);
  const s = sub(s2.b, s2.a);
  const denom = cross(r, s);
  const qp = sub(s2.a, s1.a);
  if (Math.abs(denom) < 1e-12) return null; // parallel or collinear

  const t = cross(qp, s) / denom;
  const u = cross(qp, r) / denom;
  const eps = 1e-9;
  if (t > eps && t < 1 - eps && u > eps && u < 1 - eps) {
    return { x: s1.a.x + t * r.x, y: s1.a.y + t * r.y };
  }
  return null;
}

function edges(path: Path): Segment[] {
  return path.map((p, i) => ({ a: p, b: path[(i + 1) % path.length] }));
}

/** Detects self-intersection in a closed polygon — non-adjacent edges
 * crossing indicates the panel outline is malformed (e.g. finger joints
 * generated with a width larger than the available edge length). */
export function findSelfIntersections(path: Path): Vector2[] {
  const segs = edges(path);
  const hits: Vector2[] = [];
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const adjacent = j === i + 1 || (i === 0 && j === segs.length - 1);
      if (adjacent) continue;
      const hit = segmentIntersection(segs[i], segs[j]);
      if (hit) hits.push(hit);
    }
  }
  return hits;
}

export function aabbOverlap(a: Path, b: Path): boolean {
  const boxA = boundingBox(a);
  const boxB = boundingBox(b);
  return boxA.min.x < boxB.max.x && boxA.max.x > boxB.min.x && boxA.min.y < boxB.max.y && boxA.max.y > boxB.min.y;
}

/** True if any edge of `a` crosses any edge of `b`. A fast, exact-enough
 * collision test for the axis-aligned/rectilinear panels this engine lays
 * out on the cutting sheet — full polygon-clipping boolean ops are
 * unnecessary overhead for that case. */
export function pathsIntersect(a: Path, b: Path): boolean {
  if (!aabbOverlap(a, b)) return false;
  const edgesA = edges(a);
  const edgesB = edges(b);
  for (const ea of edgesA) {
    for (const eb of edgesB) {
      if (segmentIntersection(ea, eb)) return true;
    }
  }
  return false;
}
