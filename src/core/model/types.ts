import type { Path } from '../geometry/polygon';
import type { Material } from '../materials/material';
import type { ToleranceSetting } from '../materials/tolerance';

/** A text engraving element, kept as real text (not outlined to paths) so
 * exported SVGs stay editable in Illustrator/Inkscape/CorelDraw. */
export interface TextEngraving {
  kind: 'text';
  content: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily?: string;
  anchor?: 'start' | 'middle' | 'end';
  rotationDeg?: number;
}

/** A vector engraving (logo, ornament, imported shape) — a filled/stroked
 * path drawn on the engrave layer instead of cut through. */
export interface VectorEngraving {
  kind: 'vector';
  paths: Path[];
  fillMode: 'outline' | 'filled-hatch';
  /** Hatch line spacing, mm, used when fillMode = 'filled-hatch' (the
   * standard way to "shade" an area for engraving rather than a raster
   * scan, so it stays a pure vector layer). */
  hatchSpacing?: number;
}

/** A halftone raster engraving (photo). Stored as a dot/line pattern of
 * short vector strokes so the whole pipeline — and every export format —
 * stays vector-only; no embedded raster image is required. */
export interface HalftoneEngraving {
  kind: 'halftone';
  /** Grid of dot radii (mm), already mapped from source pixel luminance by
   * the caller. Rendered as filled circles on the engrave layer. */
  dots: { x: number; y: number; radius: number }[];
}

export interface QrEngraving {
  kind: 'qr';
  x: number;
  y: number;
  sizeMm: number;
  /** Module matrix (true = dark module) produced by the QR encoder. */
  modules: boolean[][];
}

export interface BarcodeEngraving {
  kind: 'barcode';
  x: number;
  y: number;
  widthMm: number;
  heightMm: number;
  /** Code128 bar widths in encoder units (1 unit = narrowest bar). */
  bars: { widthUnits: number; dark: boolean }[];
  text?: string;
}

export type Engraving = TextEngraving | VectorEngraving | HalftoneEngraving | QrEngraving | BarcodeEngraving;

export interface SheetPlacement {
  x: number;
  y: number;
  rotationDeg: number;
}

/** One physical piece to be cut from sheet stock. `outline` is the outer
 * cut path (already kerf/joint compensated); `holes` are interior cut
 * paths (finger-joint through-holes, screw/magnet holes, mortise slots,
 * snap-fit catch holes); `scoreLines` are non-through score/fold cuts
 * (light-power pass, e.g. for cardboard fold lines). */
export interface Panel {
  id: string;
  label: string;
  outline: Path;
  holes: Path[];
  scoreLines: Path[];
  engravings: Engraving[];
  /** Panel thickness, mm — normally equals the design material thickness,
   * but kept per-panel so a future mixed-material design can vary it. */
  thickness: number;
  placement?: SheetPlacement;
  /** 3D pose for the assembled/exploded preview: position of the panel's
   * local origin in the assembled model, plus a rotation (degrees) around
   * each axis. */
  pose3d?: { position: [number, number, number]; rotationDeg: [number, number, number] };
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  panelId?: string;
}

export interface AssemblyStep {
  order: number;
  description: string;
  panelIds: string[];
}

export interface DesignMeta {
  title: string;
  shapeType: string;
  generatedAt: string;
  outerDimensionsMm: { width: number; depth: number; height: number };
}

export interface Design {
  meta: DesignMeta;
  material: Material;
  tolerance: ToleranceSetting;
  panels: Panel[];
  warnings: ValidationIssue[];
  assembly: AssemblyStep[];
}
