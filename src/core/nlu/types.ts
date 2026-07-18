import type { MaterialId } from '../materials/material';
import type { ToleranceSetting } from '../materials/tolerance';
import type { LidStyle } from '../shapes/box';

export type ShapeType =
  | 'box'
  | 'wine-box'
  | 'test-tube-rack'
  | 'tool-organizer'
  | 'shelf'
  | 'birdhouse'
  | 'phone-stand';

/**
 * The normalized result of understanding a user's natural-language
 * request — deliberately generator-agnostic (it doesn't know about
 * `BoxSpec` vs `WineBoxSpec`) so parsing stays decoupled from the specific
 * shape generators. `core/nlu/dispatch.ts` is the only place that
 * translates this into a concrete generator call.
 */
export interface ParsedIntent {
  shapeType: ShapeType;
  materialId: MaterialId;
  materialLabel?: string; // only meaningful when materialId === 'custom'
  thickness: number;
  kerf?: number; // undefined => generator falls back to the material's default
  tolerance: ToleranceSetting;
  dimensions: { width?: number; depth?: number; height?: number };
  lidStyle?: LidStyle;
  /** Meaning depends on shapeType: divider/compartment count for box and
   * tool-organizer, level count for shelf, tube count for test-tube-rack. */
  count?: number;
  bottleDiameter?: number;
  bottleHeight?: number;
  tubeDiameter?: number;
  title?: string;
  /** Original user text, kept for display/debugging and for a future LLM
   * adapter to re-process with more context. */
  rawText: string;
  /** Things the parser guessed rather than found explicitly — surfaced to
   * the user so they can correct them instead of silently trusting a
   * default. */
  assumptions: string[];
  /** 0-1: how much of the request the heuristic parser actually
   * recognized (shape keyword + dimensions + material all found = 1.0). */
  confidence: number;
}

/**
 * Pluggable understanding backend. `HeuristicNluAdapter` (regex/keyword
 * based) is the default and requires no external service. A real LLM
 * backend can implement this same interface — swap it in without
 * touching the dispatcher or any generator — see `llmAdapter.ts` for the
 * wiring contract and an example stub.
 */
export interface NluAdapter {
  parse(text: string): Promise<ParsedIntent>;
}
