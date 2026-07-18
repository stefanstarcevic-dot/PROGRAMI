import type { Material } from '../materials/material';
import type { ToleranceSetting } from '../materials/tolerance';
import { generateBox } from './box';
import type { Design } from '../model/types';
import { circlePath } from '../geometry/polygon';
import { v2 } from '../geometry/vector2';
import { buildRectPanel } from './panelBuilder';
import { resolveToleranceClearance } from '../materials/tolerance';
import { validateDesign } from '../validation/rules';

export interface BirdhouseSpec {
  width?: number;
  depth?: number;
  wallHeight?: number;
  /** Roof slope, degrees from horizontal — steeper sheds rain better. */
  roofPitchDeg?: number;
  /** How far the roof overhangs the walls on every side, mm. */
  roofOverhang?: number;
  /** Entrance hole diameter, mm — ~32mm suits small songbirds (chickadees,
   * wrens); larger species need a larger hole. */
  entranceHoleDiameter?: number;
  /** Height of the entrance hole's center above the floor, mm. */
  entranceHeightFromFloor?: number;
  material: Material;
  tolerance: ToleranceSetting;
  title?: string;
}

/**
 * A simple A-roof birdhouse: four straight walls and a floor (reusing the
 * box generator's finger-jointed carcass, open-top), a circular entrance
 * hole with a perch peg hole beneath it cut into the front wall, and two
 * flat sloped roof panels sized from the requested pitch angle that
 * overhang the walls for weather protection. The roof panels meet at the
 * ridge in a simple overlapping lap (one panel a touch longer) — glued or
 * screwed, since a mitred ridge joint isn't worth the complexity for a
 * hobby birdhouse.
 */
export function generateBirdhouse(spec: BirdhouseSpec): Design {
  const width = spec.width ?? 140;
  const depth = spec.depth ?? 140;
  const wallHeight = spec.wallHeight ?? 120;
  const pitchDeg = spec.roofPitchDeg ?? 35;
  const overhang = spec.roofOverhang ?? 20;
  const entranceDiameter = spec.entranceHoleDiameter ?? 32;
  const entranceHeight = spec.entranceHeightFromFloor ?? wallHeight * 0.75;
  const { material } = spec;
  const T = material.thickness;

  const design = generateBox({
    width,
    depth,
    height: wallHeight,
    material,
    tolerance: spec.tolerance,
    lidStyle: 'open',
    title: spec.title ?? `Kućica za ptice ${width}×${depth}×${wallHeight}mm`,
  });
  design.meta.shapeType = 'birdhouse';

  const front = design.panels.find((p) => p.id === 'front')!;
  const entranceCenter = v2(width / 2, entranceHeight);
  front.holes.push(circlePath(entranceCenter, entranceDiameter / 2));
  // Perch peg hole (for a small dowel) just below the entrance.
  front.holes.push(circlePath(v2(width / 2, entranceHeight - entranceDiameter / 2 - 6), 1.6));

  const params = {
    thickness: T,
    kerf: material.kerf,
    clearance: resolveToleranceClearance(spec.tolerance),
    minFingerWidthFactor: material.minFingerWidthFactor,
  };

  const pitchRad = (pitchDeg * Math.PI) / 180;
  const roofRun = depth / 2 + overhang;
  const roofPanelDepth = roofRun / Math.cos(pitchRad);
  const roofPanelWidth = width + overhang * 2;

  const roofA = buildRectPanel(
    roofPanelWidth,
    roofPanelDepth,
    { bottom: { type: 'flat' }, top: { type: 'flat' }, left: { type: 'flat' }, right: { type: 'flat' } },
    params,
  );
  const roofB = buildRectPanel(
    roofPanelWidth,
    roofPanelDepth + T, // slightly longer so it laps over roof A at the ridge
    { bottom: { type: 'flat' }, top: { type: 'flat' }, left: { type: 'flat' }, right: { type: 'flat' } },
    params,
  );

  design.panels.push(
    { id: 'roof-a', label: 'Krov — strana A', outline: roofA, holes: [], scoreLines: [], engravings: [], thickness: T },
    { id: 'roof-b', label: 'Krov — strana B (preklapa se na sljemenu)', outline: roofB, holes: [], scoreLines: [], engravings: [], thickness: T },
  );

  design.assembly.push({
    order: design.assembly.length + 1,
    description: `Zalijepite ili zašrafite oba krovna panela pod uglom od ${pitchDeg}° tako da se spajaju na sljemenu (strana B preklapa stranu A).`,
    panelIds: ['roof-a', 'roof-b'],
  });

  design.warnings = validateDesign(design);
  return design;
}
