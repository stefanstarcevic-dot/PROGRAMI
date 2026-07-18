import type { Material } from '../materials/material';
import type { ToleranceSetting } from '../materials/tolerance';
import { generateBox } from './box';
import type { Design } from '../model/types';

export interface ToolOrganizerSpec {
  width?: number;
  depth?: number;
  height?: number;
  /** Number of storage compartments; compartments - 1 dividers are added
   * automatically, evenly spaced. */
  compartments?: number;
  material: Material;
  tolerance: ToleranceSetting;
  title?: string;
}

/**
 * An open-top compartment tray for hand tools/small parts — a thin,
 * purpose-named wrapper over the box generator: open lid (tools need to
 * be visible/reachable from above), a low height so tools don't disappear
 * from view, and evenly-spaced dividers sized from the requested
 * compartment count. Sensible defaults kick in when the user just says
 * "napravi organizer za alat" without dimensions.
 */
export function generateToolOrganizer(spec: ToolOrganizerSpec): Design {
  const width = spec.width ?? 350;
  const depth = spec.depth ?? 200;
  const height = spec.height ?? 60;
  const compartments = Math.max(1, spec.compartments ?? 4);

  const design = generateBox({
    width,
    depth,
    height,
    material: spec.material,
    tolerance: spec.tolerance,
    lidStyle: 'open',
    dividers: compartments > 1 ? [{ axis: 'x', count: compartments - 1 }] : [],
    title: spec.title ?? `Organizer za alat (${compartments} pregrade)`,
  });
  design.meta.shapeType = 'tool-organizer';
  return design;
}
