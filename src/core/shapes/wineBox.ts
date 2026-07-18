import type { Material } from '../materials/material';
import type { ToleranceSetting } from '../materials/tolerance';
import { resolveToleranceClearance } from '../materials/tolerance';
import { generateBox } from './box';
import type { Design } from '../model/types';
import { circlePath } from '../geometry/polygon';
import { v2 } from '../geometry/vector2';
import { buildRectPanel } from './panelBuilder';
import { validateDesign } from '../validation/rules';

/** Average dimensions of a standard 750ml Bordeaux-style wine bottle —
 * used as sensible defaults so "napravi kutiju za bocu vina" produces a
 * bottle-ready design without the user having to know or measure the
 * bottle. */
export const AVERAGE_WINE_BOTTLE = { diameter: 80, height: 320 };

export interface WineBoxSpec {
  bottleDiameter?: number;
  bottleHeight?: number;
  bottleClearance?: number; // extra radial clearance so the bottle isn't jammed
  material: Material;
  tolerance: ToleranceSetting;
  title?: string;
}

/**
 * A gift/presentation box sized to a wine bottle, with an internal collar
 * — a horizontal panel with a bottle-sized hole — that cradles the
 * bottle's neck/shoulder and stops it shifting or tipping in transit. The
 * collar is cut to a light press-fit against the box's inner walls (same
 * friction-fit principle as a drop-in lid) so it wedges at whatever
 * height it's pushed to during assembly — no extra joinery needed on the
 * walls themselves. Box is generated open-top for easy bottle insertion;
 * the front panel gets a suggested engraving placeholder for a label or
 * personalized text.
 */
export function generateWineBox(spec: WineBoxSpec): Design {
  const bottleDiameter = spec.bottleDiameter ?? AVERAGE_WINE_BOTTLE.diameter;
  const bottleHeight = spec.bottleHeight ?? AVERAGE_WINE_BOTTLE.height;
  const clearance = spec.bottleClearance ?? 6;
  const { material } = spec;
  const T = material.thickness;
  const padding = 14; // mm of material around the bottle for structural margin

  const width = bottleDiameter + clearance * 2 + padding * 2;
  const depth = width; // square footprint — a bottle doesn't prefer an axis
  const height = bottleHeight + padding;

  const design = generateBox({
    width,
    depth,
    height,
    material,
    tolerance: spec.tolerance,
    lidStyle: 'open',
    title: spec.title ?? `Kutija za bocu vina (Ø${bottleDiameter}×${bottleHeight}mm)`,
  });
  design.meta.shapeType = 'wine-box';

  const toleranceClearance = resolveToleranceClearance(spec.tolerance);
  const params = {
    thickness: T,
    kerf: material.kerf,
    clearance: toleranceClearance,
    minFingerWidthFactor: material.minFingerWidthFactor,
  };

  const innerWidth = width - 2 * T;
  const innerDepth = depth - 2 * T;
  // Press-fit: cut very slightly larger than the opening so the panel
  // wedges by friction; kerf removal brings it back down to a light
  // interference fit against the inner walls.
  const pressFitAllowance = 0.15;
  const collarOutline = buildRectPanel(
    innerWidth + pressFitAllowance,
    innerDepth + pressFitAllowance,
    { bottom: { type: 'flat' }, top: { type: 'flat' }, left: { type: 'flat' }, right: { type: 'flat' } },
    params,
  );
  const bottleHole = circlePath(v2((innerWidth + pressFitAllowance) / 2, (innerDepth + pressFitAllowance) / 2), bottleDiameter / 2 + clearance / 2);

  design.panels.push({
    id: 'collar',
    label: 'Kolar za bocu (friction-fit, fiksira bocu)',
    outline: collarOutline,
    holes: [bottleHole],
    scoreLines: [],
    engravings: [
      {
        kind: 'text',
        content: 'Predložena gravura: "Živjeli!" ili personalizovani tekst na Prednjoj strani',
        x: 5,
        y: 5,
        fontSize: 3,
        anchor: 'start',
      },
    ],
    thickness: T,
  });

  design.assembly.push({
    order: design.assembly.length + 1,
    description:
      'Umetnite Kolar u kutiju i pritisnite ga (friction-fit) do otprilike trećine visine — obavija vrat/rame boce i sprječava pomjeranje.',
    panelIds: ['collar'],
  });

  design.warnings = validateDesign(design);
  return design;
}
