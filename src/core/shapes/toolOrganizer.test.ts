import { describe, it, expect } from 'vitest';
import { generateToolOrganizer } from './toolOrganizer';
import { resolveMaterial } from '../materials/material';

describe('generateToolOrganizer', () => {
  it('uses sensible defaults and creates compartments-1 dividers', () => {
    const design = generateToolOrganizer({
      compartments: 4,
      material: resolveMaterial('sperploca', 4),
      tolerance: { mode: 'tight' },
    });
    const dividers = design.panels.filter((p) => p.id.startsWith('divider-'));
    expect(dividers).toHaveLength(3);
    expect(design.panels.find((p) => p.id === 'top')).toBeUndefined(); // open lid
  });

  it('has no geometry errors', () => {
    const design = generateToolOrganizer({
      material: resolveMaterial('mdf', 5),
      tolerance: { mode: 'loose' },
    });
    expect(design.warnings.filter((w) => w.severity === 'error')).toEqual([]);
  });
});
