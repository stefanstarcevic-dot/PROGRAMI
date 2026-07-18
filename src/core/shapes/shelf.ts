import type { Material } from '../materials/material';
import type { ToleranceSetting } from '../materials/tolerance';
import { resolveToleranceClearance } from '../materials/tolerance';
import type { FingerJointParams } from '../joints/finger';
import { generateMortiseSlot, rotatePath90 } from '../joints/mortiseTenon';
import { buildRectPanel } from './panelBuilder';
import type { Design, Panel } from '../model/types';
import { validateDesign } from '../validation/rules';

export interface ShelfSpec {
  levels: number; // number of shelf surfaces, >= 2
  levelWidth: number; // mm, X — width of each shelf
  levelDepth: number; // mm, Y — depth of each shelf
  levelHeight: number; // mm, Z — vertical spacing between shelves
  material: Material;
  tolerance: ToleranceSetting;
  title?: string;
}

/**
 * A vertical N-level shelf: two side panels rise the full height, the
 * bottom and top shelves finger-joint to the side panels' own bottom/top
 * edges (as in the test tube rack), and any middle shelves (levels >= 3)
 * slot into horizontal mortises cut straight through the side panels'
 * faces at the correct height, each shelf carrying a matching tenon on
 * both its left and right edges. Fully self-supporting without a back
 * panel — a back can be glued on separately if wall-mounting is needed.
 */
export function generateShelf(spec: ShelfSpec): Design {
  const { levels, levelWidth, levelDepth, levelHeight, material } = spec;
  if (levels < 2) throw new Error('Polica mora imati bar 2 nivoa.');
  const T = material.thickness;
  const params: FingerJointParams = {
    thickness: T,
    kerf: material.kerf,
    clearance: resolveToleranceClearance(spec.tolerance),
    minFingerWidthFactor: material.minFingerWidthFactor,
  };

  const totalHeight = (levels - 1) * levelHeight + T;
  const tenonSpan = levelDepth * 0.6;

  const sideOutline = buildRectPanel(
    levelDepth,
    totalHeight,
    {
      bottom: { type: 'finger', tabDepth: T, startsWithTab: true },
      top: { type: 'finger', tabDepth: T, startsWithTab: true },
      left: { type: 'flat' },
      right: { type: 'flat' },
    },
    params,
  );

  const left: Panel = { id: 'left', label: 'Lijeva bočna stranica', outline: [...sideOutline], holes: [], scoreLines: [], engravings: [], thickness: T };
  const right: Panel = { id: 'right', label: 'Desna bočna stranica', outline: [...sideOutline], holes: [], scoreLines: [], engravings: [], thickness: T };

  const panels: Panel[] = [left, right];

  for (let i = 0; i < levels; i++) {
    const y = i * levelHeight;
    const isEdge = i === 0 || i === levels - 1;

    // Edge shelves (bottom/top) finger-joint into the side panels' own
    // tab-first bottom/top edges; middle shelves instead carry a tenon on
    // each side, fused directly into the outline, that plunges through a
    // matching mortise cut into the side panel's face.
    const sideEdge: import('./panelBuilder').EdgeSpec = isEdge
      ? { type: 'finger', tabDepth: T, startsWithTab: false }
      : { type: 'tenon', center: levelDepth / 2, width: tenonSpan, protrusion: T };

    const shelfOutline = buildRectPanel(
      levelWidth,
      levelDepth,
      { bottom: { type: 'flat' }, top: { type: 'flat' }, left: sideEdge, right: sideEdge },
      params,
    );

    if (!isEdge) {
      // Matching mortises cut through both side panels at height y,
      // spanning exactly the tenon's own footprint (centered on the
      // panel's depth axis) so the fit is snug rather than oversized.
      const slot = rotatePath90(
        generateMortiseSlot({ center: y, width: T, depth: tenonSpan }, levelDepth / 2 - tenonSpan / 2, params),
      );
      left.holes.push(slot);
      right.holes.push(slot);
    }

    panels.push({
      id: `shelf-${i}`,
      label: isEdge ? (i === 0 ? 'Donja polica' : 'Gornja polica') : `Polica nivo ${i + 1}`,
      outline: shelfOutline,
      holes: [],
      scoreLines: [],
      engravings: [],
      thickness: T,
    });
  }

  const design: Design = {
    meta: {
      title: spec.title ?? `Polica sa ${levels} nivoa`,
      shapeType: 'shelf',
      generatedAt: new Date().toISOString(),
      outerDimensionsMm: { width: levelWidth, depth: levelDepth, height: totalHeight },
    },
    material,
    tolerance: spec.tolerance,
    panels,
    warnings: [],
    assembly: [
      {
        order: 1,
        description: 'Umetnite Donju i Gornju policu u prstaste spojeve na krajevima bočnih stranica.',
        panelIds: ['left', 'right', 'shelf-0', `shelf-${levels - 1}`],
      },
      ...(levels > 2
        ? [
            {
              order: 2,
              description: 'Provucite jezičke srednjih polica kroz odgovarajuće utore na bočnim stranicama.',
              panelIds: panels.slice(2, -1).map((p) => p.id),
            },
          ]
        : []),
    ],
  };
  design.warnings = validateDesign(design);
  return design;
}
