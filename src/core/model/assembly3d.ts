import type { Design } from './types';
import { boundingBox } from '../geometry/polygon';
import { layoutPanelsOnSheets } from '../svg/layout';

export interface Pose3d {
  position: [number, number, number];
  rotationDeg: [number, number, number];
}

/**
 * Computes a 3D assembly pose per panel for the preview/exploded view.
 *
 * Every generator built on the box carcass (box, wine-box, tool-organizer,
 * birdhouse) reuses the same panel ids (front/back/left/right/bottom/top),
 * so one set of rules — derived from the box's own construction
 * convention in `shapes/box.ts` (Front/Back full width, Left/Right inset,
 * Bottom/Top full footprint) — places all of them correctly in world
 * space. Panels this doesn't recognize (shelf levels, rack plates, roof
 * panels, dividers, stand parts, ...) fall back to a flat, non-overlapping
 * ground-plane layout reusing the same shelf-packing algorithm as the 2D
 * sheet view, so every design still gets a sensible 3D preview.
 *
 * `explodeFactor` (0 = assembled, 1 = fully separated) offsets each panel
 * along a per-role direction — outward surface normal for recognized box
 * panels, upward stacking for the generic fallback.
 */
export function computeAssemblyPoses(design: Design, explodeFactor: number): Record<string, Pose3d> {
  const { width: W, depth: D, height: H } = design.meta.outerDimensionsMm;
  const T = design.material.thickness;
  const poses: Record<string, Pose3d> = {};
  const recognized = new Set(['front', 'back', 'left', 'right', 'bottom', 'top', 'collar']);

  const explodeDist = explodeFactor * Math.max(W, D, H) * 0.6;

  if (design.panels.some((p) => recognized.has(p.id))) {
    // Front: XZ plane at y=0, panel-local (x,y) = (world x, world z).
    poses.front = { position: [0, -explodeDist, 0], rotationDeg: [90, 0, 0] };
    // Back: XZ plane at y=D.
    poses.back = { position: [0, D + explodeDist, 0], rotationDeg: [90, 0, 0] };
    // Left: YZ plane at x=0, panel-local (x,y) = (world y - T, world z).
    poses.left = { position: [-explodeDist, T, 0], rotationDeg: [90, 0, 90] };
    // Right: YZ plane at x=W.
    poses.right = { position: [W + explodeDist, T, 0], rotationDeg: [90, 0, 90] };
    // Bottom: XY plane at z=0.
    poses.bottom = { position: [0, 0, -explodeDist], rotationDeg: [0, 0, 0] };
    // Top / collar: XY plane, raised.
    const topZ = H - T;
    poses.top = { position: [0, 0, topZ + explodeDist], rotationDeg: [0, 0, 0] };
    poses.collar = { position: [0, 0, H * 0.35 + explodeDist * 0.5], rotationDeg: [0, 0, 0] };
  }

  const fallbackPanels = design.panels.filter((p) => !poses[p.id]);
  if (fallbackPanels.length > 0) {
    const sheets = layoutPanelsOnSheets(fallbackPanels, { sheetWidth: 100000, sheetHeight: 100000, margin: 10, gap: 10 });
    const placed = sheets[0]?.panels ?? [];
    placed.forEach((panel, i) => {
      const box = boundingBox(panel.outline);
      const cx = (box.min.x + box.max.x) / 2;
      const cy = (box.min.y + box.max.y) / 2;
      poses[panel.id] = {
        position: [cx - 0, cy - 0, i * explodeDist * 0.3],
        rotationDeg: [0, 0, 0],
      };
    });
  }

  return poses;
}
