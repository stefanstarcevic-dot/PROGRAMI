import type { Vector2 } from '../geometry/vector2';
import { v2 } from '../geometry/vector2';

export interface FingerJointParams {
  thickness: number;
  kerf: number;
  /** Resolved from ToleranceSetting via resolveToleranceClearance(). */
  clearance: number;
  minFingerWidthFactor: number;
}

export interface FingerLayout {
  /** Always odd, so both ends of the edge start and end with a tab — this
   * keeps corners symmetric and avoids a sliver-thin corner finger. */
  count: number;
  /** Nominal (pre-kerf, pre-tolerance) width of one finger, mm. */
  nominalWidth: number;
}

/**
 * Chooses how many fingers to cut along an edge of the given length.
 *
 * Industry rule of thumb (Boxes.py, MakerCase and hand-cut joinery all
 * converge here): finger width should sit around 2-3x material thickness —
 * narrow enough for a strong interlock, wide enough that the finger
 * doesn't snap during assembly. We start from
 * `thickness * minFingerWidthFactor` (material-specific, brittle materials
 * get a larger factor) as the nominal width, then pick the nearest odd
 * divisor of the edge length.
 */
export function computeFingerLayout(edgeLength: number, params: FingerJointParams): FingerLayout {
  const target = Math.max(params.thickness * params.minFingerWidthFactor, 3);
  let count = Math.round(edgeLength / target);
  if (count % 2 === 0) count += 1; // force odd
  if (count < 3) count = 3;
  const nominalWidth = edgeLength / count;
  return { count, nominalWidth };
}

/**
 * Two mating edges meet at a corner and together must physically fill the
 * joint: where panel A has a solid tab flush with the nominal boundary,
 * panel B is notched inward by the tab depth (A's material occupies that
 * stripe); where A is notched, B has the flush tab. This is the classic
 * "castellated edge" box joint used by every laser-cut box generator.
 *
 * `startsWithTab` picks which of the two complementary patterns this call
 * produces — the mating panel's edge must be generated with the opposite
 * value so the combs interlock.
 */
export function fingerVariant(startsWithTab: boolean): boolean {
  return startsWithTab;
}

/**
 * Generates the castellated edge path for a finger/box joint, in an
 * edge-local frame: the edge runs from (0,0) to (edgeLength,0). y=0 is the
 * nominal outer boundary; notches recede to y=+tabDepth (into the panel —
 * the caller rotates/translates/flips this into panel/sheet space).
 *
 * Kerf + tolerance compensation: each notch is drawn narrower than nominal
 * by (kerf - clearance), split across its two side walls, so that after
 * the laser removes `kerf` of material the physical gap equals
 * `nominal + clearance` — and the flush tabs (bounded by those same cuts)
 * come out physically `nominal - clearance` wide. Positive clearance
 * (loose fit) => easier assembly; negative (press fit) => interference.
 */
export function generateFingerEdgePath(
  edgeLength: number,
  tabDepth: number,
  layout: FingerLayout,
  params: FingerJointParams,
  startsWithTab: boolean,
): Vector2[] {
  const { count, nominalWidth } = layout;
  const adjust = params.kerf - params.clearance; // total shrink applied to each notch

  const points: Vector2[] = [];
  points.push(v2(0, 0));

  for (let i = 0; i < count; i++) {
    const isTab = startsWithTab ? i % 2 === 0 : i % 2 === 1;
    const nominalStart = i * nominalWidth;
    const nominalEnd = nominalStart + nominalWidth;
    const isFirst = i === 0;
    const isLast = i === count - 1;

    if (!isTab) {
      // Notch: recede inward, narrowed on each interior wall by adjust/2
      // (boundary walls at the very start/end of the panel are not
      // narrowed — the panel's own corner point is fixed by neighbouring
      // geometry, not by this joint's kerf compensation).
      const start = nominalStart + (isFirst ? 0 : adjust / 2);
      const end = nominalEnd - (isLast ? 0 : adjust / 2);
      points.push(v2(start, 0));
      points.push(v2(start, tabDepth));
      points.push(v2(end, tabDepth));
      points.push(v2(end, 0));
    } else {
      // Tab: flush with the nominal boundary; its true width is whatever
      // remains once the flanking notches are narrowed, so nothing to draw
      // here beyond the boundary points themselves.
      points.push(v2(nominalStart, 0));
      points.push(v2(nominalEnd, 0));
    }
  }

  // count * nominalWidth reconstructs edgeLength by definition (see
  // computeFingerLayout); snap the final point exactly onto it so
  // downstream code can rely on the path terminating precisely at the
  // nominal edge length even after floating-point drift.
  const last = points[points.length - 1];
  points[points.length - 1] = v2(edgeLength, last.y);

  return dedupe(points);
}

function dedupe(points: Vector2[]): Vector2[] {
  const out: Vector2[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(last.x - p.x, last.y - p.y) > 1e-9) out.push(p);
  }
  return out;
}
