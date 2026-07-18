import type { Path } from '../geometry/polygon';
import { v2 } from '../geometry/vector2';

export interface SnapFitParams {
  thickness: number;
  /** How far the cantilever arm extends before the catch, mm. */
  armLength: number;
  /** Width of the cantilever arm, mm. */
  armWidth: number;
  /** How far the catch hooks out sideways, mm — small for flat sheet
   * material (limited by achievable elastic deflection). */
  catchDepth: number;
}

/**
 * A cantilever snap-fit tab cut from the panel itself: a slot on either
 * side frees a flexible arm which flares into a catch at its tip. When
 * pressed through a matching rectangular hole in the mating panel, the
 * catch springs back out and locks the two panels together without glue
 * or hardware.
 *
 * Practical for thin, resilient sheet goods (thin plywood, acrylic >=2mm
 * with generous radii, PVC); the validation engine warns when used on
 * brittle/thick material where the arm is unlikely to survive repeated
 * deflection.
 */
export function generateSnapFitTab(origin: { x: number; y: number }, params: SnapFitParams): {
  outline: Path;
  freeingSlots: Path[];
} {
  const { armLength, armWidth, catchDepth } = params;
  const { x, y } = origin;
  const halfW = armWidth / 2;

  const outline: Path = [
    v2(x - halfW, y),
    v2(x + halfW, y),
    v2(x + halfW, y + armLength * 0.7),
    v2(x + halfW + catchDepth, y + armLength * 0.85),
    v2(x, y + armLength),
    v2(x - halfW - catchDepth, y + armLength * 0.85),
    v2(x - halfW, y + armLength * 0.7),
  ];

  // Slots on either side of the arm free it to flex; drawn as thin
  // rectangles slightly longer than the arm so the surrounding material is
  // fully separated.
  const slotGap = 0.6; // mm clearance between arm and surrounding material
  const freeingSlots: Path[] = [
    [
      v2(x - halfW - slotGap, y - 1),
      v2(x - halfW, y - 1),
      v2(x - halfW, y + armLength * 0.72),
      v2(x - halfW - slotGap, y + armLength * 0.72),
    ],
    [
      v2(x + halfW, y - 1),
      v2(x + halfW + slotGap, y - 1),
      v2(x + halfW + slotGap, y + armLength * 0.72),
      v2(x + halfW, y + armLength * 0.72),
    ],
  ];

  return { outline, freeingSlots };
}

/** Rectangular catch-hole cut in the mating panel that the snap-fit tab
 * above locks into once pushed through. */
export function generateSnapFitCatchHole(center: { x: number; y: number }, params: SnapFitParams): Path {
  const width = params.armWidth + params.catchDepth * 2 + 1;
  const height = params.armWidth * 0.9;
  const { x, y } = center;
  return [
    v2(x - width / 2, y - height / 2),
    v2(x + width / 2, y - height / 2),
    v2(x + width / 2, y + height / 2),
    v2(x - width / 2, y + height / 2),
  ];
}
