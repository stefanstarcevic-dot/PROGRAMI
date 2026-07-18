import type { Vector2 } from './vector2';
import { v2, sub, add, scale, normalize, perpendicular, length } from './vector2';

/** An open or closed polyline in mm. Closed paths repeat no vertex — the
 * implicit segment from the last point back to the first closes the loop. */
export type Path = Vector2[];

export function signedArea(path: Path): number {
  let sum = 0;
  for (let i = 0; i < path.length; i++) {
    const a = path[i];
    const b = path[(i + 1) % path.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

export function isClockwise(path: Path): boolean {
  return signedArea(path) < 0;
}

/** Returns a copy of `path` wound in the requested orientation. */
export function withOrientation(path: Path, clockwise: boolean): Path {
  return isClockwise(path) === clockwise ? [...path] : [...path].reverse();
}

export function boundingBox(path: Path): { min: Vector2; max: Vector2 } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of path) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { min: v2(minX, minY), max: v2(maxX, maxY) };
}

export function translate(path: Path, delta: Vector2): Path {
  return path.map((p) => add(p, delta));
}

/**
 * Offsets a closed simple polygon outward (positive distance) or inward
 * (negative distance) along each edge's normal, then re-intersects
 * consecutive offset edges to form mitered corners.
 *
 * This is the classic "offset by edge translation + re-intersection"
 * algorithm. It is exact for convex polygons and for the mild concavities
 * seen in laser-cut panels (finger-joint notches, engraving strokes,
 * entrance holes). It is not a general Minkowski-sum solver: highly
 * concave or self-intersecting inputs can produce local self-intersections
 * at the offset corners, which is an accepted trade-off for the rectilinear
 * geometry this CAD engine produces.
 */
export function offsetPolygon(path: Path, distance: number): Path {
  const n = path.length;
  if (n < 3 || Math.abs(distance) < 1e-9) return [...path];

  // Winding-independent: always offset to the "outside" of the given
  // orientation for positive distance.
  const oriented = withOrientation(path, false); // CCW
  const edges: { p0: Vector2; p1: Vector2; normal: Vector2 }[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = oriented[i];
    const p1 = oriented[(i + 1) % n];
    const dir = normalize(sub(p1, p0));
    // Outward normal for a CCW polygon is the direction rotated -90°.
    const normal = v2(dir.y, -dir.x);
    edges.push({ p0: add(p0, scale(normal, distance)), p1: add(p1, scale(normal, distance)), normal });
  }

  const result: Path = [];
  for (let i = 0; i < n; i++) {
    const prev = edges[(i - 1 + n) % n];
    const curr = edges[i];
    const intersection = lineIntersection(prev.p0, prev.p1, curr.p0, curr.p1);
    result.push(intersection ?? curr.p0);
  }
  return result;
}

/** Intersection of two infinite lines defined by two points each. */
export function lineIntersection(a0: Vector2, a1: Vector2, b0: Vector2, b1: Vector2): Vector2 | null {
  const d1 = sub(a1, a0);
  const d2 = sub(b1, b0);
  const denom = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(denom) < 1e-9) return null; // parallel
  const t = ((b0.x - a0.x) * d2.y - (b0.y - a0.y) * d2.x) / denom;
  return add(a0, scale(d1, t));
}

export function perimeter(path: Path, closed = true): number {
  let total = 0;
  const count = closed ? path.length : path.length - 1;
  for (let i = 0; i < count; i++) {
    total += length(sub(path[(i + 1) % path.length], path[i]));
  }
  return total;
}

export function pointInPolygon(point: Vector2, path: Path): boolean {
  let inside = false;
  for (let i = 0, j = path.length - 1; i < path.length; j = i++) {
    const pi = path[i];
    const pj = path[j];
    const intersects =
      pi.y > point.y !== pj.y > point.y &&
      point.x < ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y) + pi.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** Builds a rectangle path (CCW), centered at origin unless `origin` given. */
export function rectPath(width: number, height: number, origin: Vector2 = v2(0, 0)): Path {
  return [
    v2(origin.x, origin.y),
    v2(origin.x + width, origin.y),
    v2(origin.x + width, origin.y + height),
    v2(origin.x, origin.y + height),
  ];
}

export { perpendicular };
