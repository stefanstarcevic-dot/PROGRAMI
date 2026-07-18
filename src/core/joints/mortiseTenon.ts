import type { Path } from '../geometry/polygon';
import type { Vector2 } from '../geometry/vector2';
import { v2 } from '../geometry/vector2';
import type { FingerJointParams } from './finger';

export interface SlotSpec {
  /** Center position of the slot along the host edge/face, mm. */
  center: number;
  /** Nominal width of the slot (matches the tenon/tab thickness of the
   * mating panel), mm. */
  width: number;
  /** How deep the slot cuts into the panel, mm — typically the mating
   * panel's thickness for a through-slot, or less for a stopped slot. */
  depth: number;
}

/**
 * A mortise (slot) rectangle cut into a panel's face/interior, e.g. for a
 * shelf divider's tenon to pass through. Returned in the host panel's
 * local frame, centered at (spec.center, edgeY) growing to `depth`.
 *
 * Kerf compensation narrows the slot by `kerf - clearance` (same
 * convention as finger joints) so the mating tenon, drawn full nominal
 * width, ends up fitting to the requested tolerance once both parts are
 * actually cut.
 */
export function generateMortiseSlot(spec: SlotSpec, edgeY: number, params: FingerJointParams): Path {
  const adjust = params.kerf - params.clearance;
  const halfWidth = (spec.width - adjust) / 2;
  const x0 = spec.center - halfWidth;
  const x1 = spec.center + halfWidth;
  const y0 = edgeY;
  const y1 = edgeY + spec.depth;
  return [v2(x0, y0), v2(x1, y0), v2(x1, y1), v2(x0, y1)];
}

/**
 * A tenon (protruding tab) on a divider panel's edge, sized to pass
 * through the mating mortise. Widened by `kerf - clearance` so the two
 * kerf-widened cuts land on the intended nominal width after material
 * removal.
 */
export function generateTenonTab(
  center: number,
  nominalWidth: number,
  protrusion: number,
  edgeY: number,
  params: FingerJointParams,
): Path {
  const adjust = params.kerf - params.clearance;
  const halfWidth = (nominalWidth + adjust) / 2;
  const x0 = center - halfWidth;
  const x1 = center + halfWidth;
  return [v2(x0, edgeY), v2(x1, edgeY), v2(x1, edgeY + protrusion), v2(x0, edgeY + protrusion)];
}

/**
 * Lays out evenly-spaced mortise slots along a face for a set of divider
 * tenons (e.g. a shelf's vertical dividers slotting into the base), used
 * by the box/organizer/shelf generators to place internal partitions.
 */
export function layoutDividerSlots(faceLength: number, dividerCount: number, _slotWidth: number): number[] {
  if (dividerCount <= 0) return [];
  const spacing = faceLength / (dividerCount + 1);
  const centers: number[] = [];
  for (let i = 1; i <= dividerCount; i++) centers.push(spacing * i);
  return centers;
}

/** Every mortise/tenon helper above elongates along x, narrow along y (a
 * "bottom edge" tenon / "horizontal" slot). Swapping x<->y re-orients the
 * same shape for a left/right-edge tenon or a vertically-elongated slot,
 * without a second family of functions. */
export function rotatePath90(path: Path): Path {
  return path.map((p) => v2(p.y, p.x));
}

export type { Vector2 };
