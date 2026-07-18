import type { Path } from '../geometry/polygon';
import type { Vector2 } from '../geometry/vector2';
import { v2 } from '../geometry/vector2';

export interface Circle {
  center: Vector2;
  radius: number;
}

/** Common metric screw clearance-hole diameters (loose enough for the
 * screw shank to pass freely), mm. */
export const SCREW_CLEARANCE_DIAMETER: Record<'M2' | 'M2.5' | 'M3' | 'M4' | 'M5' | 'M6' | 'M8', number> = {
  M2: 2.4,
  'M2.5': 2.9,
  M3: 3.4,
  M4: 4.5,
  M5: 5.5,
  M6: 6.6,
  M8: 9,
};

/** Standard round neodymium magnet diameters commonly used in laser-cut
 * assemblies (press-fit into a hole sized to the magnet + a hair of
 * clearance), mm. */
export const COMMON_MAGNET_DIAMETERS = [3, 4, 5, 6, 8, 10, 12] as const;

export function screwHole(center: Vector2, size: keyof typeof SCREW_CLEARANCE_DIAMETER): Circle {
  return { center, radius: SCREW_CLEARANCE_DIAMETER[size] / 2 };
}

/** Magnet holes are drawn slightly undersized (kerf-compensated) so the
 * laser-cut circle ends up a light press fit for the magnet. */
export function magnetHole(center: Vector2, magnetDiameter: number, kerf: number): Circle {
  const pressFitAllowance = 0.15; // mm, empirical: slightly tight so magnet doesn't rattle
  return { center, radius: (magnetDiameter - pressFitAllowance + kerf) / 2 };
}

export function evenlySpacedHoles(edgeLength: number, count: number, insetFromEnds: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [edgeLength / 2];
  const usable = edgeLength - insetFromEnds * 2;
  const spacing = usable / (count - 1);
  return Array.from({ length: count }, (_, i) => insetFromEnds + spacing * i);
}

export interface KnuckleHingeParams {
  /** Length of the hinge run along the shared edge, mm. */
  length: number;
  /** Panel thickness — knuckle diameter is derived from this. */
  thickness: number;
  /** Diameter of the pin/rod/filament passed through the knuckles, mm. */
  pinDiameter: number;
  kerf: number;
}

export interface KnuckleHingeResult {
  /** Knuckle outlines belonging to panel A (odd positions). */
  panelAKnuckles: Path[];
  /** Knuckle outlines belonging to panel B (even positions) — interleaves
   * with panel A's when assembled and the pin is threaded through. */
  panelBKnuckles: Path[];
  /** Pin bore, one per knuckle, centered on the hinge axis. */
  pinHoles: Circle[];
  pinDiameter: number;
}

/**
 * A real, physically assemblable laser-cut hinge: both panels' shared
 * edge is cut into a series of interleaved semicircular "knuckles" (like a
 * piano/barrel hinge), each with a bore hole on the hinge axis. After
 * cutting, a rod/filament/dowel is threaded through all the aligned bores,
 * letting the two panels pivot freely — a well-known technique in the
 * laser-cutting community for hinged lids that need a real pivot rather
 * than a flexing living hinge.
 */
export function generateKnuckleHinge(params: KnuckleHingeParams): KnuckleHingeResult {
  const { length, thickness, pinDiameter, kerf } = params;
  const knuckleDiameter = Math.max(thickness * 2.2, pinDiameter + thickness);
  const count = Math.max(3, Math.floor(length / knuckleDiameter));
  const pitch = length / count;
  const radius = knuckleDiameter / 2 - kerf / 2;
  const boreRadius = (pinDiameter + kerf) / 2;

  const panelAKnuckles: Path[] = [];
  const panelBKnuckles: Path[] = [];
  const pinHoles: Circle[] = [];

  for (let i = 0; i < count; i++) {
    const cx = pitch * (i + 0.5);
    const outline = semicircleOutline(cx, pitch, radius);
    if (i % 2 === 0) panelAKnuckles.push(outline);
    else panelBKnuckles.push(outline);
    pinHoles.push({ center: v2(cx, 0), radius: boreRadius });
  }

  return { panelAKnuckles, panelBKnuckles, pinHoles, pinDiameter };
}

function semicircleOutline(cx: number, segmentWidth: number, radius: number, steps = 16): Path {
  const half = segmentWidth / 2;
  const pts: Vector2[] = [v2(cx - half, 0), v2(cx + half, 0)];
  // Arc bulging outward (away from the panel edge) to form the knuckle.
  for (let i = 1; i < steps; i++) {
    const angle = Math.PI * (i / steps);
    pts.push(v2(cx + Math.cos(Math.PI - angle) * radius, -Math.sin(angle) * radius));
  }
  return pts;
}
