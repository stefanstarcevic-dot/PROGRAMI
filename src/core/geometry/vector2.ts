/**
 * 2D vector / point, in millimetres, in the panel's local coordinate frame.
 * All core geometry works in mm — the SVG layer is the only place that
 * knows about px/pt/user-units.
 */
export interface Vector2 {
  readonly x: number;
  readonly y: number;
}

export const v2 = (x: number, y: number): Vector2 => ({ x, y });

export const add = (a: Vector2, b: Vector2): Vector2 => v2(a.x + b.x, a.y + b.y);
export const sub = (a: Vector2, b: Vector2): Vector2 => v2(a.x - b.x, a.y - b.y);
export const scale = (a: Vector2, s: number): Vector2 => v2(a.x * s, a.y * s);
export const dot = (a: Vector2, b: Vector2): number => a.x * b.x + a.y * b.y;
export const cross = (a: Vector2, b: Vector2): number => a.x * b.y - a.y * b.x;
export const length = (a: Vector2): number => Math.hypot(a.x, a.y);
export const distance = (a: Vector2, b: Vector2): number => length(sub(a, b));

export function normalize(a: Vector2): Vector2 {
  const len = length(a);
  if (len < 1e-12) return v2(0, 0);
  return v2(a.x / len, a.y / len);
}

/** Rotate `a` by `radians` around the origin. */
export function rotate(a: Vector2, radians: number): Vector2 {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return v2(a.x * cos - a.y * sin, a.x * sin + a.y * cos);
}

/** Perpendicular vector, rotated 90° counter-clockwise. */
export function perpendicular(a: Vector2): Vector2 {
  return v2(-a.y, a.x);
}

export function lerp(a: Vector2, b: Vector2, t: number): Vector2 {
  return v2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
}

export function equalsEps(a: Vector2, b: Vector2, eps = 1e-6): boolean {
  return Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps;
}
