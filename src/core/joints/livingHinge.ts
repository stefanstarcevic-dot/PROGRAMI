import type { Path } from '../geometry/polygon';
import { v2 } from '../geometry/vector2';

export interface LivingHingeParams {
  thickness: number;
  kerf: number;
  /** Width of the hinge strip along the flex axis, mm. */
  length: number;
  /** Extent perpendicular to the flex axis (how much of the panel becomes
   * hinge), mm. */
  width: number;
}

export interface LivingHingeResult {
  /** Each element is an open polyline (a single slit) in the panel's local
   * frame, origin at the hinge strip's corner. Rendered on the cut layer. */
  slits: Path[];
  /** Human-readable note surfaced in the UI/validation panel. */
  warning?: string;
}

/**
 * Generates a "diagonal offset slit" living hinge pattern — the layout
 * popularised by Rich Fletcher / Adobe's "living hinge" community pattern
 * and used across Inkscape's laser-cut extensions: short parallel slits,
 * staggered between two rows, leaving thin uncut bridges that let the
 * sheet flex like a fabric hinge along the strip's long axis.
 *
 * Slit length and pitch scale with material thickness — thicker sheet
 * needs longer slits and a tighter pitch to flex at all, which is also
 * why living hinges are only offered for materials flagged
 * `supportsLivingHinge` (cardboard, thin plywood) in the material preset.
 */
export function generateLivingHingePattern(params: LivingHingeParams): LivingHingeResult {
  const { thickness, length, width } = params;
  const slitLength = Math.max(width * 0.55, thickness * 6);
  const pitch = Math.max(thickness * 1.6, 1.5);
  const rows = Math.max(2, Math.round(width / (slitLength * 0.6)));
  const rowSpacing = width / rows;

  const slits: Path[] = [];
  const columns = Math.max(1, Math.floor(length / pitch));

  for (let r = 0; r < rows; r++) {
    const y = rowSpacing * (r + 0.5);
    const stagger = r % 2 === 0 ? 0 : pitch / 2;
    for (let c = 0; c < columns; c++) {
      const x = c * pitch + stagger;
      if (x + slitLength * 0.4 > length) continue;
      const halfLen = Math.min(slitLength, length - x) ;
      slits.push([v2(x, y), v2(x + halfLen, y)]);
    }
  }

  const warning =
    thickness > 2.5
      ? `Living hinge kod debljine ${thickness}mm je rizičan — preporučuje se materijal tanji od 2.5mm (npr. karton ili tanka šperploča) za pouzdano savijanje.`
      : undefined;

  return { slits, warning };
}
