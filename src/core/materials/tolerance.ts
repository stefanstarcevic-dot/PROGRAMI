export type ToleranceMode = 'press' | 'loose' | 'tight' | 'custom';

export interface ToleranceSetting {
  mode: ToleranceMode;
  /** Only used when mode === 'custom'. Positive = extra clearance (looser),
   * negative = interference (tighter/press). mm. */
  customValue?: number;
}

/**
 * Additional per-side clearance (mm) applied to a joint slot *beyond* kerf
 * compensation. Positive widens the slot / narrows the tab (easier to
 * assemble); negative does the opposite (interference fit, holds without
 * glue).
 *
 * These defaults follow common laser-cut joinery practice:
 *  - press fit:  small interference so parts need light force and then stay
 *                put without glue (good for structural boxes).
 *  - tight fit:  minimal clearance, snug by hand, still removable.
 *  - loose fit:  easy hand assembly/disassembly, intended to be glued.
 */
const TOLERANCE_DEFAULTS: Record<Exclude<ToleranceMode, 'custom'>, number> = {
  press: -0.04,
  tight: 0.0,
  loose: 0.08,
};

export function resolveToleranceClearance(setting: ToleranceSetting): number {
  if (setting.mode === 'custom') return setting.customValue ?? 0;
  return TOLERANCE_DEFAULTS[setting.mode];
}

export const TOLERANCE_LABELS: Record<ToleranceMode, string> = {
  press: 'Press fit (utisni spoj, bez ljepila)',
  tight: 'Tight fit (čvrst, ali rastavljiv)',
  loose: 'Loose fit (lagano sastavljanje, uz ljepilo)',
  custom: 'Prilagođena tolerancija',
};
