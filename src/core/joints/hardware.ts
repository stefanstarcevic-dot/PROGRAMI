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

export interface KnuckleHingeLayout {
  count: number;
  pitch: number;
  /** Knuckle bump radius (already kerf-compensated), mm. */
  radius: number;
  /** Pin bore radius (already kerf-compensated), mm. */
  boreRadius: number;
}

/**
 * Lays out a laser-cut "piano hinge": both panels' shared edge is divided
 * into equal-width slots, alternating between the two panels — one
 * panel's material bulges into a rounded knuckle at even slots and stays
 * flush at odd slots, the other panel is the exact complement — so the
 * two edges interleave into a single row of knuckles when assembled, and
 * a rod/filament/dowel threads through the bores to form a real pivoting
 * hinge (as opposed to a flexing living hinge).
 *
 * This only computes the layout numbers; `panelBuilder.ts`'s
 * `knuckle-hinge` edge type turns it into an actual fused outline (the
 * bumps must be part of the panel's own cut path, not a separate hole, or
 * they'd cut free as disconnected scrap — the same lesson learned from
 * the tenon/mortise joints), and `pinBoreHoles` below gives the bore
 * circles to add as ordinary interior holes once the bumps exist.
 */
export function computeKnuckleHingeLayout(params: KnuckleHingeParams): KnuckleHingeLayout {
  const { length, thickness, pinDiameter, kerf } = params;
  const knuckleDiameter = Math.max(thickness * 2.2, pinDiameter + thickness);
  const count = Math.max(3, Math.floor(length / knuckleDiameter));
  const pitch = length / count;
  const radius = knuckleDiameter / 2 - kerf / 2;
  const boreRadius = (pinDiameter + kerf) / 2;
  return { count, pitch, radius, boreRadius };
}

/**
 * The fused edge path for one side of the hinge: walks the edge slot by
 * slot, emitting a rounded knuckle bump (protruding to -y, the same
 * "outward" convention `panelBuilder`'s `tenon` edge type uses) at every
 * slot this panel owns, and a flush flat segment at every slot the other
 * panel owns.
 */
export function generateKnuckleHingeEdgePath(edgeLength: number, layout: KnuckleHingeLayout, isPanelA: boolean, steps = 16): Vector2[] {
  const { count, pitch, radius } = layout;
  const points: Vector2[] = [v2(0, 0)];

  for (let i = 0; i < count; i++) {
    const isThisPanel = isPanelA ? i % 2 === 0 : i % 2 === 1;
    const start = i * pitch;
    const end = start + pitch;
    const cx = start + pitch / 2;

    if (!isThisPanel) {
      points.push(v2(end, 0));
      continue;
    }
    for (let s = 1; s < steps; s++) {
      const angle = Math.PI * (s / steps);
      points.push(v2(cx + Math.cos(Math.PI - angle) * radius, -Math.sin(angle) * radius));
    }
    points.push(v2(end, 0));
  }

  const last = points[points.length - 1];
  points[points.length - 1] = v2(edgeLength, last.y);
  return points;
}

/** Bore holes for the panel that owns the knuckle at the given parity
 * (`isPanelA` selects even vs. odd slots) — one per knuckle, centered
 * inside the bump's solid material so it's a legitimate interior hole. */
export function knuckleHingePinBores(layout: KnuckleHingeLayout, isPanelA: boolean): Circle[] {
  const bores: Circle[] = [];
  for (let i = 0; i < layout.count; i++) {
    const isThisPanel = isPanelA ? i % 2 === 0 : i % 2 === 1;
    if (!isThisPanel) continue;
    const cx = layout.pitch * (i + 0.5);
    bores.push({ center: v2(cx, -layout.radius * 0.55), radius: layout.boreRadius });
  }
  return bores;
}
