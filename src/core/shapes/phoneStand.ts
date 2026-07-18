import type { Material } from '../materials/material';
import type { ToleranceSetting } from '../materials/tolerance';
import { resolveToleranceClearance } from '../materials/tolerance';
import type { FingerJointParams } from '../joints/finger';
import { computeFingerLayout, generateFingerEdgePath } from '../joints/finger';
import { buildRectPanel } from './panelBuilder';
import type { Design, Panel } from '../model/types';
import { validateDesign } from '../validation/rules';
import { v2 } from '../geometry/vector2';

export interface PhoneStandSpec {
  /** Phone (+ case) thickness the resting slot must accept, mm. */
  phoneThickness?: number;
  standWidth?: number; // mm, how wide the stand is (front-to-front rail length)
  standDepth?: number; // mm, front-to-back footprint of each side panel
  backHeight?: number; // mm, height of the back support
  material: Material;
  tolerance: ToleranceSetting;
  title?: string;
}

/**
 * A minimalist two-panel phone stand: two identical wedge-shaped side
 * panels — a right-triangle profile with a closed-bottom slot notched
 * into the top-back corner sized to the phone's thickness — connected by
 * a finger-jointed base rail for stability. The phone's bottom edge drops
 * into the two slots and leans back against the wedge's sloped face.
 */
export function generatePhoneStand(spec: PhoneStandSpec): Design {
  const phoneThickness = spec.phoneThickness ?? 12;
  const standWidth = spec.standWidth ?? 80;
  const standDepth = spec.standDepth ?? 70;
  const backHeight = spec.backHeight ?? 100;
  const { material } = spec;
  const T = material.thickness;
  const params: FingerJointParams = {
    thickness: T,
    kerf: material.kerf,
    clearance: resolveToleranceClearance(spec.tolerance),
    minFingerWidthFactor: material.minFingerWidthFactor,
  };

  const notchOffset = 8;
  const slotWidth = phoneThickness + params.clearance;
  const slotDepth = 25;

  const railOutline = buildRectPanel(
    standWidth,
    standDepth,
    {
      bottom: { type: 'flat' },
      top: { type: 'flat' },
      left: { type: 'finger', tabDepth: T, startsWithTab: false },
      right: { type: 'finger', tabDepth: T, startsWithTab: false },
    },
    params,
  );
  const rail: Panel = { id: 'rail', label: 'Osnovna letva', outline: railOutline, holes: [], scoreLines: [], engravings: [], thickness: T };

  const sideOutline = buildWedgeSideOutline(standDepth, backHeight, notchOffset, slotWidth, slotDepth, params);
  const sideA: Panel = { id: 'side-a', label: 'Bočni nosač A', outline: sideOutline, holes: [], scoreLines: [], engravings: [], thickness: T };
  const sideB: Panel = { id: 'side-b', label: 'Bočni nosač B', outline: [...sideOutline], holes: [], scoreLines: [], engravings: [], thickness: T };

  const design: Design = {
    meta: {
      title: spec.title ?? 'Držač za mobilni telefon',
      shapeType: 'phone-stand',
      generatedAt: new Date().toISOString(),
      outerDimensionsMm: { width: standWidth, depth: standDepth, height: backHeight },
    },
    material,
    tolerance: spec.tolerance,
    panels: [rail, sideA, sideB],
    warnings: [],
    assembly: [
      {
        order: 1,
        description: 'Spojite oba bočna nosača na Osnovnu letvu prstastim spojevima na oba kraja.',
        panelIds: ['side-a', 'side-b', 'rail'],
      },
      {
        order: 2,
        description: 'Uvucite donju ivicu telefona u proreze na vrhu bočnih nosača — telefon se naslanja na kosu površinu.',
        panelIds: ['side-a', 'side-b'],
      },
    ],
  };
  design.warnings = validateDesign(design);
  return design;
}

function buildWedgeSideOutline(
  depth: number,
  backHeight: number,
  notchOffset: number,
  slotWidth: number,
  slotDepth: number,
  params: FingerJointParams,
) {
  const layout = computeFingerLayout(depth, params);
  const bottom = generateFingerEdgePath(depth, params.thickness, layout, params, true);

  const backTop = v2(depth, backHeight);
  const notchOuter = v2(depth - notchOffset, backHeight);
  const notchInnerTop = v2(depth - notchOffset - slotWidth, backHeight);
  const notchBottomOuter = v2(depth - notchOffset, backHeight - slotDepth);
  const notchBottomInner = v2(depth - notchOffset - slotWidth, backHeight - slotDepth);

  return [
    ...bottom,
    backTop,
    notchOuter,
    notchBottomOuter,
    notchBottomInner,
    notchInnerTop,
    // hypotenuse back down to the origin, closing the polygon
  ];
}
