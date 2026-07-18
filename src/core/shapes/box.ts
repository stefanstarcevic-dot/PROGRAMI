import type { Material } from '../materials/material';
import type { ToleranceSetting } from '../materials/tolerance';
import { resolveToleranceClearance } from '../materials/tolerance';
import type { FingerJointParams } from '../joints/finger';
import { generateMortiseSlot, generateTenonTab, layoutDividerSlots } from '../joints/mortiseTenon';
import { generateKnuckleHinge } from '../joints/hardware';
import { buildRectPanel } from './panelBuilder';
import type { Design, Panel } from '../model/types';
import { validateDesign } from '../validation/rules';
import { v2 } from '../geometry/vector2';

export type LidStyle = 'closed' | 'open' | 'friction' | 'hinged';

export interface DividerSpec {
  /** 'x' = a vertical partition running across the box's width, splitting
   * it front-to-back into compartments along X; 'y' = splitting left-to-right
   * along Y. */
  axis: 'x' | 'y';
  count: number;
}

export interface BoxSpec {
  width: number; // outer X, mm
  depth: number; // outer Y, mm
  height: number; // outer Z, mm
  material: Material;
  tolerance: ToleranceSetting;
  lidStyle: LidStyle;
  dividers?: DividerSpec[];
  title?: string;
}

/**
 * Generates a complete parametric finger-jointed box.
 *
 * Construction convention (matches common laser-box practice — Boxes.py's
 * default box, MakerCase's basic box): Front/Back run the box's full outer
 * width W and finger-joint to Bottom/Top along their full width; Left/Right
 * are inset by the material thickness on each end so they nest between
 * Front and Back's inside faces, and finger-joint to Bottom/Top only
 * across their own (shorter) span — the floor/lid panel's left/right
 * edges are generated with `finger-partial` so the two end-caps (where
 * Front/Back's own thickness sits) stay flush. Every wall panel
 * (Front/Back/Left/Right) is "tab-first" on all its edges; every cap panel
 * (Bottom/Top) is "notch-first" — a fixed convention that guarantees every
 * mating pair is complementary without per-edge bookkeeping.
 */
export function generateBox(spec: BoxSpec): Design {
  const { width: W, depth: D, height: H, material, lidStyle } = spec;
  const T = material.thickness;
  const params: FingerJointParams = {
    thickness: T,
    kerf: material.kerf,
    clearance: resolveToleranceClearance(spec.tolerance),
    minFingerWidthFactor: material.minFingerWidthFactor,
  };

  const innerDepth = D - 2 * T;
  const innerWidth = W - 2 * T;

  const panels: Panel[] = [];

  const topJoint = lidStyle === 'closed' || lidStyle === 'hinged';

  // Front & Back: W x H
  panels.push(makeWallPanel('front', 'Prednja stranica', W, H, T, topJoint, params));
  panels.push(makeWallPanel('back', 'Zadnja stranica', W, H, T, topJoint, params));

  // Left & Right: innerDepth x H
  panels.push(makeWallPanel('left', 'Lijeva stranica', innerDepth, H, T, topJoint, params));
  panels.push(makeWallPanel('right', 'Desna stranica', innerDepth, H, T, topJoint, params));

  // Bottom: W x D, cap panel (notch-first), finger-partial on left/right
  panels.push(makeCapPanel('bottom', 'Dno', W, D, T, params));

  if (lidStyle === 'closed') {
    panels.push(makeCapPanel('top', 'Poklopac', W, D, T, params));
  } else if (lidStyle === 'friction') {
    panels.push(makeFrictionLid(innerWidth, innerDepth, T, params));
  } else if (lidStyle === 'hinged') {
    panels.push(...makeHingedLid(W, D, T, params));
    patchBackForHinge(panels, W, H, T, params);
  }
  // 'open': no top panel at all

  const dividerPanels = buildDividers(spec.dividers ?? [], innerWidth, innerDepth, H, T, params, panels);
  panels.push(...dividerPanels);

  const meta = {
    title: spec.title ?? `Kutija ${W}×${D}×${H}mm`,
    shapeType: 'box',
    generatedAt: new Date().toISOString(),
    outerDimensionsMm: { width: W, depth: D, height: H },
  };

  const design: Design = {
    meta,
    material,
    tolerance: spec.tolerance,
    panels,
    warnings: [],
    assembly: buildAssemblySteps(lidStyle, dividerPanels.length > 0),
  };

  design.warnings = validateDesign(design);
  return design;
}

function makeWallPanel(
  id: string,
  label: string,
  w: number,
  h: number,
  thickness: number,
  topJoint: boolean,
  params: FingerJointParams,
): Panel {
  const outline = buildRectPanel(
    w,
    h,
    {
      bottom: { type: 'finger', tabDepth: thickness, startsWithTab: true },
      top: topJoint
        ? { type: 'finger', tabDepth: thickness, startsWithTab: true }
        : { type: 'flat' },
      left: { type: 'finger', tabDepth: thickness, startsWithTab: true },
      right: { type: 'finger', tabDepth: thickness, startsWithTab: true },
    },
    params,
  );
  return { id, label, outline, holes: [], scoreLines: [], engravings: [], thickness: params.thickness };
}

function makeCapPanel(id: string, label: string, w: number, d: number, thickness: number, params: FingerJointParams): Panel {
  const outline = buildRectPanel(
    w,
    d,
    {
      bottom: { type: 'finger', tabDepth: thickness, startsWithTab: false },
      top: { type: 'finger', tabDepth: thickness, startsWithTab: false },
      left: { type: 'finger-partial', tabDepth: thickness, startsWithTab: false, inset: thickness },
      right: { type: 'finger-partial', tabDepth: thickness, startsWithTab: false, inset: thickness },
    },
    params,
  );
  return { id, label, outline, holes: [], scoreLines: [], engravings: [], thickness: params.thickness };
}

function makeFrictionLid(innerWidth: number, innerDepth: number, thickness: number, params: FingerJointParams): Panel {
  // A flat inset panel sized to the inner opening, adjusted by the
  // tolerance clearance so it press-/loose-fits into the box mouth
  // without any joinery of its own.
  const w = innerWidth - params.clearance;
  const d = innerDepth - params.clearance;
  const outline = buildRectPanel(
    w,
    d,
    { bottom: { type: 'flat' }, top: { type: 'flat' }, left: { type: 'flat' }, right: { type: 'flat' } },
    params,
  );
  return { id: 'top', label: 'Poklopac (friction-fit)', outline, holes: [], scoreLines: [], engravings: [], thickness };
}

function makeHingedLid(w: number, d: number, thickness: number, params: FingerJointParams): Panel[] {
  // Lid sits flush over the opening; its back edge is left flat here and
  // patched with hinge knuckles afterwards (patchBackForHinge), front/left/
  // right stay flat so the lid can swing freely on the back hinge line.
  const outline = buildRectPanel(
    w,
    d,
    { bottom: { type: 'flat' }, top: { type: 'flat' }, left: { type: 'flat' }, right: { type: 'flat' } },
    params,
  );
  const lid: Panel = {
    id: 'top',
    label: 'Poklopac (šarke)',
    outline,
    holes: [],
    scoreLines: [],
    engravings: [],
    thickness,
  };
  const hinge = generateKnuckleHinge({ length: w, thickness, pinDiameter: 2, kerf: params.kerf });
  // Knuckles for the lid sit along its back edge (y = d), offset outward.
  lid.holes.push(...hinge.panelAKnuckles.map((k) => k.map((p) => v2(p.x, d - p.y))));
  lid.holes.push(...hinge.pinHoles.map((c) => circleAsPath({ x: c.center.x, y: d }, c.radius)));
  return [lid];
}

function patchBackForHinge(panels: Panel[], w: number, h: number, thickness: number, params: FingerJointParams) {
  const back = panels.find((p) => p.id === 'back');
  if (!back) return;
  const hinge = generateKnuckleHinge({ length: w, thickness, pinDiameter: 2, kerf: params.kerf });
  // Back panel's knuckles project outward (upward) from its top edge (y = h).
  back.holes.push(...hinge.panelBKnuckles.map((k) => k.map((p) => v2(p.x, h + p.y))));
  back.holes.push(...hinge.pinHoles.map((c) => circleAsPath({ x: c.center.x, y: h }, c.radius)));
}

function circleAsPath(center: { x: number; y: number }, radius: number, steps = 24) {
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    pts.push(v2(center.x + Math.cos(a) * radius, center.y + Math.sin(a) * radius));
  }
  return pts;
}

/**
 * Each divider gets one full-length tenon along its bottom edge (rather
 * than several small ones) that plunges through a single matching mortise
 * slot cut in the Bottom panel — the simplest robust slot-and-tab used by
 * real compartment-tray generators (e.g. Boxes.py's `TypeTray`). The
 * divider's own outline carries the protruding tenon directly (drawn as
 * part of its bottom edge), and the Bottom panel receives one rectangular
 * through-slot per divider, oriented along the divider's own span.
 */
function buildDividers(
  dividers: DividerSpec[],
  innerWidth: number,
  innerDepth: number,
  H: number,
  T: number,
  params: FingerJointParams,
  panels: Panel[],
): Panel[] {
  const bottom = panels.find((p) => p.id === 'bottom')!;
  const result: Panel[] = [];
  let counter = 1;

  for (const div of dividers) {
    if (div.count <= 0) continue;
    const isX = div.axis === 'x';
    // Divider stands full height H and spans the inner cross-dimension.
    const span = isX ? innerDepth : innerWidth;
    const positions = layoutDividerSlots(isX ? innerWidth : innerDepth, div.count, span);

    for (const posAlongMainAxis of positions) {
      const id = `divider-${div.axis}-${counter}`;
      // Panel body: span (width) x H, with a full-length tenon along the
      // bottom edge protruding by T so it plunges through the Bottom panel.
      const tenon = generateTenonTab(span / 2, span, T, -T, params);
      const outline = buildRectPanel(
        span,
        H,
        { bottom: { type: 'flat' }, top: { type: 'flat' }, left: { type: 'flat' }, right: { type: 'flat' } },
        params,
      );
      const panel: Panel = {
        id,
        label: `Pregrada ${counter}`,
        outline,
        holes: [tenon],
        scoreLines: [],
        engravings: [],
        thickness: T,
      };
      result.push(panel);

      // Matching mortise slot cut into the bottom panel: a rectangle
      // running the full inner span in the divider's own axis, narrow
      // (thickness T, kerf/tolerance compensated by generateMortiseSlot)
      // in the cross axis. Bottom panel's local frame has its outer edge
      // at (0,0), so the inner well starts at T on every side.
      const center = posAlongMainAxis + T;
      const baseSlot = generateMortiseSlot({ center, width: T, depth: span }, T, params);
      const slot = isX ? baseSlot : rotateSlot90(baseSlot);
      bottom.holes.push(slot);
      counter++;
    }
  }
  return result;
}

/** generateMortiseSlot always elongates along x; for a Y-axis divider the
 * slot must instead elongate along y, narrow along x — swap coordinates. */
function rotateSlot90(path: { x: number; y: number }[]) {
  return path.map((p) => ({ x: p.y, y: p.x }));
}

function buildAssemblySteps(lidStyle: LidStyle, hasDividers: boolean) {
  const steps = [
    { order: 1, description: 'Sastavite Prednju, Zadnju, Lijevu i Desnu stranicu spajanjem prstastih (finger) spojeva na sva četiri ugla.', panelIds: ['front', 'back', 'left', 'right'] },
    { order: 2, description: 'Umetnite Dno u utore na donjim ivicama sastavljenih stranica.', panelIds: ['bottom'] },
  ];
  let order = 3;
  if (hasDividers) {
    steps.push({ order, description: 'Umetnite pregrade kroz jezičke (tenon) u odgovarajuće utore na Dnu.', panelIds: [] });
    order++;
  }
  if (lidStyle === 'closed') {
    steps.push({ order, description: 'Zatvorite konstrukciju umetanjem Poklopca na gornje ivice (trajno prstasti spoj).', panelIds: ['top'] });
  } else if (lidStyle === 'friction') {
    steps.push({ order, description: 'Poklopac se pritisne (friction-fit) u gornji otvor kutije.', panelIds: ['top'] });
  } else if (lidStyle === 'hinged') {
    steps.push({ order, description: 'Provucite osovinu (žica/štapić prečnika 2mm) kroz zglobove šarke između Poklopca i Zadnje stranice.', panelIds: ['top', 'back'] });
  } else {
    steps.push({ order, description: 'Kutija je otvorenog tipa — nema poklopca.', panelIds: [] });
  }
  return steps;
}
