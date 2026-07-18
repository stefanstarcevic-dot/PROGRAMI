import type { Material } from '../materials/material';
import type { ToleranceSetting } from '../materials/tolerance';
import { resolveToleranceClearance } from '../materials/tolerance';
import type { FingerJointParams } from '../joints/finger';
import { buildRectPanel } from './panelBuilder';
import type { Design, Panel } from '../model/types';
import { validateDesign } from '../validation/rules';
import { circlePath } from '../geometry/polygon';
import { v2 } from '../geometry/vector2';

export interface TestTubeRackSpec {
  tubeCount: number;
  tubeDiameter: number; // mm, outer diameter of the tube body
  tubeTipDiameter?: number; // mm, diameter of the tapered bottom tip (defaults to 55% of tubeDiameter)
  rackHeight?: number; // mm, distance between the top and bottom plate
  material: Material;
  tolerance: ToleranceSetting;
  title?: string;
}

/**
 * A two-tier test tube rack: a top plate with loose-fit holes that the
 * tube body slides through, and a lower plate — held a fixed height below
 * it by two finger-jointed end panels — with smaller holes that seat the
 * tube's tapered tip so it can't slide all the way through. Tube count and
 * spacing decide the plate size and hole grid automatically; large counts
 * wrap into multiple rows the same way a real bench rack does.
 *
 * Both plates run in the width x depth plane; the two end panels stand
 * upright at the plates' left/right ends (depth x rackHeight), finger-
 * jointed to both plates at once — top edge to the top plate, bottom edge
 * to the bottom plate — so the whole thing is a fully triangulated,
 * glue-free ladder frame. Front and back stay open for easy access.
 */
export function generateTestTubeRack(spec: TestTubeRackSpec): Design {
  const { tubeCount, tubeDiameter, material } = spec;
  const tipDiameter = spec.tubeTipDiameter ?? tubeDiameter * 0.55;
  const rackHeight = spec.rackHeight ?? Math.max(tubeDiameter * 1.5, 40);
  const T = material.thickness;
  const params: FingerJointParams = {
    thickness: T,
    kerf: material.kerf,
    clearance: resolveToleranceClearance(spec.tolerance),
    minFingerWidthFactor: material.minFingerWidthFactor,
  };

  const cellPitch = tubeDiameter * 1.4; // center-to-center spacing, leaves a web of material between holes
  const cols = Math.min(tubeCount, Math.ceil(Math.sqrt(tubeCount * 1.6)));
  const rows = Math.ceil(tubeCount / cols);

  const margin = tubeDiameter * 0.7;
  const plateWidth = margin * 2 + (cols - 1) * cellPitch + tubeDiameter;
  const plateDepth = margin * 2 + (rows - 1) * cellPitch + tubeDiameter;

  const holeCenters: { x: number; y: number }[] = [];
  let placed = 0;
  for (let r = 0; r < rows && placed < tubeCount; r++) {
    for (let c = 0; c < cols && placed < tubeCount; c++, placed++) {
      holeCenters.push({
        x: margin + tubeDiameter / 2 + c * cellPitch,
        y: margin + tubeDiameter / 2 + r * cellPitch,
      });
    }
  }

  const topPlate = makePlate(
    'top-plate',
    'Gornja ploča (otvori za tijelo epruvete)',
    plateWidth,
    plateDepth,
    T,
    params,
    holeCenters,
    tubeDiameter / 2 + params.clearance / 2,
  );
  const bottomPlate = makePlate(
    'bottom-plate',
    'Donja ploča (oslonac za vrh epruvete)',
    plateWidth,
    plateDepth,
    T,
    params,
    holeCenters,
    tipDiameter / 2 + params.clearance / 2,
  );

  const endPanelA = makeEndPanel('end-a', 'Bočni nosač A', plateDepth, rackHeight, T, params);
  const endPanelB = makeEndPanel('end-b', 'Bočni nosač B', plateDepth, rackHeight, T, params);

  const panels: Panel[] = [topPlate, bottomPlate, endPanelA, endPanelB];

  const design: Design = {
    meta: {
      title: spec.title ?? `Stalak za ${tubeCount} epruveta`,
      shapeType: 'test-tube-rack',
      generatedAt: new Date().toISOString(),
      outerDimensionsMm: { width: plateWidth, depth: plateDepth, height: rackHeight + T * 2 },
    },
    material,
    tolerance: spec.tolerance,
    panels,
    warnings: [],
    assembly: [
      {
        order: 1,
        description: 'Spojite oba bočna nosača na Gornju ploču prstastim spojevima (gornja ivica nosača).',
        panelIds: ['end-a', 'end-b', 'top-plate'],
      },
      {
        order: 2,
        description: 'Spojite Donju ploču na donju ivicu istih bočnih nosača — dobija se kruta ljestvičasta konstrukcija.',
        panelIds: ['end-a', 'end-b', 'bottom-plate'],
      },
    ],
  };
  design.warnings = validateDesign(design);
  return design;
}

function makePlate(
  id: string,
  label: string,
  width: number,
  depth: number,
  thickness: number,
  params: FingerJointParams,
  holeCenters: { x: number; y: number }[],
  holeRadius: number,
): Panel {
  // Left/right edges (length = depth) finger-joint to the two end panels;
  // front/back (bottom/top, length = width) stay open for tube access.
  const outline = buildRectPanel(
    width,
    depth,
    {
      bottom: { type: 'flat' },
      top: { type: 'flat' },
      left: { type: 'finger', tabDepth: thickness, startsWithTab: false },
      right: { type: 'finger', tabDepth: thickness, startsWithTab: false },
    },
    params,
  );
  const holes = holeCenters.map((c) => circlePath(v2(c.x, c.y), holeRadius));
  return { id, label, outline, holes, scoreLines: [], engravings: [], thickness };
}

function makeEndPanel(
  id: string,
  label: string,
  depth: number,
  height: number,
  thickness: number,
  params: FingerJointParams,
): Panel {
  // Panel body is depth x height: top edge joints to the top plate, bottom
  // edge joints to the bottom plate (both length = depth, tab-first here
  // to complement the plates' notch-first left/right edges).
  const outline = buildRectPanel(
    depth,
    height,
    {
      bottom: { type: 'finger', tabDepth: thickness, startsWithTab: true },
      top: { type: 'finger', tabDepth: thickness, startsWithTab: true },
      left: { type: 'flat' },
      right: { type: 'flat' },
    },
    params,
  );
  return { id, label, outline, holes: [], scoreLines: [], engravings: [], thickness };
}
