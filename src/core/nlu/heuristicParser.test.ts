import { describe, it, expect } from 'vitest';
import { parseUserPrompt } from './heuristicParser';
import { generateFromIntent } from './dispatch';
import { findSelfIntersections } from '../geometry/intersect';

describe('parseUserPrompt', () => {
  it('parses a fully-specified box request', () => {
    const intent = parseUserPrompt('Napravi kutiju dimenzija 300x200x150 mm od lesonita debljine 4 mm sa poklopcem na šarke.');
    expect(intent.shapeType).toBe('box');
    expect(intent.materialId).toBe('lesonit');
    expect(intent.dimensions).toEqual({ width: 300, depth: 200, height: 150 });
    expect(intent.thickness).toBe(4);
    expect(intent.lidStyle).toBe('hinged');
    expect(intent.confidence).toBeGreaterThan(0.8);
  });

  it('recognizes a wine box request with no dimensions given', () => {
    const intent = parseUserPrompt('Napravi kutiju za bocu vina.');
    expect(intent.shapeType).toBe('wine-box');
    expect(intent.assumptions.some((a) => a.includes('750ml'))).toBe(true);
  });

  it('recognizes a test tube rack request with an explicit count', () => {
    const intent = parseUserPrompt('Napravi stalak za 12 epruveta.');
    expect(intent.shapeType).toBe('test-tube-rack');
    expect(intent.count).toBe(12);
  });

  it('recognizes a tool organizer request', () => {
    const intent = parseUserPrompt('Napravi organizer za alat.');
    expect(intent.shapeType).toBe('tool-organizer');
  });

  it('recognizes a 3-level shelf request', () => {
    const intent = parseUserPrompt('Napravi policu sa tri nivoa.');
    expect(intent.shapeType).toBe('shelf');
  });

  it('recognizes a birdhouse request', () => {
    const intent = parseUserPrompt('Napravi kućicu za ptice.');
    expect(intent.shapeType).toBe('birdhouse');
  });

  it('recognizes a phone stand request', () => {
    const intent = parseUserPrompt('Napravi držač za mobilni telefon.');
    expect(intent.shapeType).toBe('phone-stand');
  });

  it('extracts kerf and tolerance', () => {
    const intent = parseUserPrompt('Kutija 200x150x100mm, akril 5mm, kerf 0.15mm, press fit.');
    expect(intent.kerf).toBe(0.15);
    expect(intent.tolerance).toEqual({ mode: 'press' });
    expect(intent.materialId).toBe('akril');
  });

  it('falls back to sensible defaults for an unrecognized shape', () => {
    const intent = parseUserPrompt('asdf qwerty 12345');
    expect(intent.shapeType).toBe('box');
    expect(intent.confidence).toBeLessThan(0.5);
    expect(intent.assumptions.length).toBeGreaterThan(0);
  });
});

describe('generateFromIntent (end-to-end NL -> Design)', () => {
  const prompts = [
    'Napravi kutiju dimenzija 300x200x150 mm od lesonita debljine 4 mm sa poklopcem na šarke.',
    'Napravi kutiju za bocu vina.',
    'Napravi stalak za 12 epruveta.',
    'Napravi organizer za alat.',
    'Napravi policu sa tri nivoa.',
    'Napravi kućicu za ptice.',
    'Napravi držač za mobilni telefon.',
  ];

  it.each(prompts)('produces a valid, error-free design for: %s', (prompt) => {
    const intent = parseUserPrompt(prompt);
    const design = generateFromIntent(intent);
    expect(design.panels.length).toBeGreaterThan(0);
    expect(design.warnings.filter((w) => w.severity === 'error')).toEqual([]);
    for (const panel of design.panels) {
      expect(findSelfIntersections(panel.outline)).toHaveLength(0);
    }
  });
});
