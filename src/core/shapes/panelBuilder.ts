import type { Vector2 } from '../geometry/vector2';
import { v2 } from '../geometry/vector2';
import type { Path } from '../geometry/polygon';
import type { FingerJointParams } from '../joints/finger';
import { computeFingerLayout, generateFingerEdgePath } from '../joints/finger';
import type { KnuckleHingeLayout } from '../joints/hardware';
import { generateKnuckleHingeEdgePath } from '../joints/hardware';

export type RectSide = 'bottom' | 'right' | 'top' | 'left';

export type EdgeSpec =
  | { type: 'flat' }
  | { type: 'finger'; tabDepth: number; startsWithTab: boolean }
  /** Finger pattern only across the middle span [inset, length-inset]; the
   * two end segments stay flush — used by "through" panels whose edge is
   * longer than the inset panel it partially mates with (e.g. a box
   * floor's side edge, which only interlocks with the inset side wall
   * across the wall's own length, not the full floor edge). */
  | { type: 'finger-partial'; tabDepth: number; startsWithTab: boolean; inset: number }
  /** A single protruding tenon fused into an otherwise flat edge, centered
   * at `center` with nominal `width`, plunging outward by `protrusion`.
   * Kerf/tolerance-widened like a finger-joint tab so it fits a mating
   * `generateMortiseSlot` cut. Unlike pushing a tenon shape into a panel's
   * `holes` list, this is stitched directly into the outline path, so the
   * tab is physically continuous with the rest of the panel instead of
   * cutting free as a disconnected scrap. */
  | { type: 'tenon'; center: number; width: number; protrusion: number }
  /** Rounded hinge knuckles fused into the edge, alternating with the
   * mating panel per `isPanelA` — see `joints/hardware.ts`. Like `tenon`,
   * this must be part of the outline (not a separate hole) since the
   * knuckle bumps extend past the panel's flat boundary. */
  | { type: 'knuckle-hinge'; layout: KnuckleHingeLayout; isPanelA: boolean };

/**
 * Builds one closed panel outline (CCW, starting at the origin corner) for
 * a `width` x `height` rectangle, walking bottom -> right -> top -> left.
 * Each side's edge is either a straight line or a castellated finger-joint
 * edge, transformed from the finger generator's edge-local frame (x along
 * the edge, y = 0 boundary / y > 0 = inward notch) into panel space.
 */
export function buildRectPanel(
  width: number,
  height: number,
  sides: Record<RectSide, EdgeSpec>,
  params: FingerJointParams,
): Path {
  const bottom = edgePoints(width, sides.bottom, params, 'bottom', width, height);
  const right = edgePoints(height, sides.right, params, 'right', width, height);
  const top = edgePoints(width, sides.top, params, 'top', width, height);
  const left = edgePoints(height, sides.left, params, 'left', width, height);

  const all = [...bottom, ...right, ...top, ...left];
  return dedupeClosed(all);
}

function edgePoints(
  length: number,
  spec: EdgeSpec,
  params: FingerJointParams,
  side: RectSide,
  width: number,
  height: number,
): Vector2[] {
  let localPoints: Vector2[];

  if (spec.type === 'flat') {
    localPoints = [v2(0, 0), v2(length, 0)];
  } else if (spec.type === 'finger') {
    const layout = computeFingerLayout(length, params);
    localPoints = generateFingerEdgePath(length, spec.tabDepth, layout, params, spec.startsWithTab);
  } else if (spec.type === 'tenon') {
    const adjust = params.kerf - params.clearance;
    const halfWidth = (spec.width + adjust) / 2;
    const start = spec.center - halfWidth;
    const end = spec.center + halfWidth;
    localPoints = [
      v2(0, 0),
      v2(start, 0),
      v2(start, -spec.protrusion),
      v2(end, -spec.protrusion),
      v2(end, 0),
      v2(length, 0),
    ];
  } else if (spec.type === 'finger-partial') {
    const midLength = length - spec.inset * 2;
    const layout = computeFingerLayout(midLength, params);
    const mid = generateFingerEdgePath(midLength, spec.tabDepth, layout, params, spec.startsWithTab).map((p) =>
      v2(p.x + spec.inset, p.y),
    );
    localPoints = [v2(0, 0), ...mid, v2(length, 0)];
  } else {
    localPoints = generateKnuckleHingeEdgePath(length, spec.layout, spec.isPanelA);
  }

  return localPoints.map((p) => placeOnSide(p, side, width, height));
}

/** Maps a point in an edge-local frame (x: 0..edgeLength along the edge,
 * y: 0 = boundary, y > 0 = inward) onto the rectangle's own coordinate
 * space, per side. */
function placeOnSide(p: Vector2, side: RectSide, width: number, height: number): Vector2 {
  switch (side) {
    case 'bottom':
      return v2(p.x, p.y); // inward = +y, correct as-is
    case 'right':
      return v2(width - p.y, p.x); // inward = -x
    case 'top':
      return v2(width - p.x, height - p.y); // inward = -y
    case 'left':
      return v2(p.y, height - p.x); // inward = +x
  }
}

function dedupeClosed(points: Vector2[]): Path {
  const out: Vector2[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(last.x - p.x, last.y - p.y) > 1e-9) out.push(p);
  }
  // drop closing point if it duplicates the start
  if (out.length > 1 && Math.hypot(out[0].x - out[out.length - 1].x, out[0].y - out[out.length - 1].y) < 1e-9) {
    out.pop();
  }
  return out;
}
