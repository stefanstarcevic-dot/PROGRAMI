import type { MaterialId } from '../materials/material';
import type { ToleranceSetting } from '../materials/tolerance';
import type { LidStyle } from '../shapes/box';
import type { ParsedIntent, ShapeType } from './types';

interface ShapeMatcher {
  shapeType: ShapeType;
  keywords: RegExp;
}

/** Ordered so more specific phrases are checked before the generic "kutija"
 * (box) catch-all — e.g. "kutija za bocu vina" must match wine-box, not box. */
const SHAPE_MATCHERS: ShapeMatcher[] = [
  { shapeType: 'wine-box', keywords: /vin[ao]|bocu?|bottle|wine/i },
  { shapeType: 'test-tube-rack', keywords: /epruvet|test[\s-]?tube/i },
  { shapeType: 'tool-organizer', keywords: /organizer|alat\w*|tool/i },
  { shapeType: 'shelf', keywords: /polic\w*|shelf|nivoa/i },
  { shapeType: 'birdhouse', keywords: /ptic\w*|bird\s*house|kućic\w*|kucic\w*/i },
  { shapeType: 'phone-stand', keywords: /telefon|mobiln\w*|phone\s*stand|držač|drzac/i },
  { shapeType: 'box', keywords: /kutij\w*|box|sanduč\w*/i },
];

const MATERIAL_KEYWORDS: { id: MaterialId; pattern: RegExp }[] = [
  { id: 'lesonit', pattern: /lesonit|hardboard|masonite/i },
  { id: 'hdf', pattern: /\bhdf\b/i },
  { id: 'mdf', pattern: /\bmdf\b/i },
  { id: 'sperploca', pattern: /šperploč\w*|sperploc\w*|plywood/i },
  { id: 'akril', pattern: /akril\w*|pleksiglas\w*|plexiglas\w*|acrylic|pmma/i },
  { id: 'pvc', pattern: /\bpvc\b/i },
  { id: 'karton', pattern: /karton\w*|cardboard/i },
];

const NUM = '(\\d+(?:[.,]\\d+)?)';

/**
 * Regex/keyword-based natural-language understanding for laser-cut design
 * requests. No external API required — this is the default `NluAdapter`
 * (see `types.ts`) and is intentionally generator-agnostic: it produces a
 * normalized `ParsedIntent`, not a specific generator's spec object.
 *
 * Extraction strategy: run a battery of independent regexes over the raw
 * text (dimensions, material, thickness, kerf, tolerance, lid style,
 * compartment/level/tube count), then apply shape-specific "house
 * knowledge" defaults (e.g. an average wine bottle, a sensible default box
 * size) for whatever wasn't stated explicitly — this is what lets
 * "napravi kutiju za bocu vina" work without the user specifying a single
 * dimension.
 */
export function parseUserPrompt(text: string): ParsedIntent {
  const assumptions: string[] = [];
  let hits = 0;
  let checks = 0;

  const shapeType = detectShape(text);
  checks++;
  if (shapeType) hits++;

  const dims = extractDimensions(text);
  checks++;
  if (dims) hits++;

  const material = extractMaterial(text);
  checks++;
  if (material) hits++;
  const materialId: MaterialId = material ?? 'sperploca';
  if (!material) assumptions.push('Materijal nije prepoznat — pretpostavljena šperploča.');

  const thickness = extractThickness(text);
  checks++;
  if (thickness) hits++;
  const finalThickness = thickness ?? 4;
  if (!thickness) assumptions.push(`Debljina materijala nije navedena — pretpostavljeno ${finalThickness}mm.`);

  const kerf = extractKerf(text);
  const tolerance = extractTolerance(text);
  const lidStyle = extractLidStyle(text);
  const count = extractCount(text);

  const resolvedShape = shapeType ?? 'box';
  if (!shapeType) assumptions.push('Tip predmeta nije prepoznat — pretpostavljena obična kutija.');

  const dimensions = applyShapeDefaults(resolvedShape, dims, assumptions);

  const confidence = Math.min(1, hits / checks + (shapeType ? 0.15 : 0));

  return {
    shapeType: resolvedShape,
    materialId,
    thickness: finalThickness,
    kerf,
    tolerance,
    dimensions,
    lidStyle,
    count,
    bottleDiameter: resolvedShape === 'wine-box' ? dims?.width : undefined,
    bottleHeight: resolvedShape === 'wine-box' ? dims?.height : undefined,
    tubeDiameter: resolvedShape === 'test-tube-rack' ? extractTubeDiameter(text) : undefined,
    rawText: text,
    assumptions,
    confidence,
  };
}

function detectShape(text: string): ShapeType | undefined {
  for (const matcher of SHAPE_MATCHERS) {
    if (matcher.keywords.test(text)) return matcher.shapeType;
  }
  return undefined;
}

function extractDimensions(text: string): { width: number; depth: number; height: number } | undefined {
  const re = new RegExp(`${NUM}\\s*[x×X]\\s*${NUM}\\s*[x×X]\\s*${NUM}`);
  const m = re.exec(text);
  if (!m) return undefined;
  const unitIsCm = /\bcm\b/i.test(text.slice(m.index, m.index + m[0].length + 5));
  const scale = unitIsCm ? 10 : 1;
  return {
    width: toNumber(m[1]) * scale,
    depth: toNumber(m[2]) * scale,
    height: toNumber(m[3]) * scale,
  };
}

function extractMaterial(text: string): MaterialId | undefined {
  for (const { id, pattern } of MATERIAL_KEYWORDS) {
    if (pattern.test(text)) return id;
  }
  return undefined;
}

function extractThickness(text: string): number | undefined {
  let m = new RegExp(`debljin\\w*[^\\d]{0,10}${NUM}\\s*mm`, 'i').exec(text);
  if (m) return toNumber(m[1]);
  m = new RegExp(`${NUM}\\s*mm\\s*(?:debljin\\w*|thick\\w*)`, 'i').exec(text);
  if (m) return toNumber(m[1]);
  return undefined;
}

function extractTubeDiameter(text: string): number | undefined {
  const m = new RegExp(`prečnik\\w*[^\\d]{0,10}${NUM}\\s*mm`, 'i').exec(text) ??
    new RegExp(`precnik\\w*[^\\d]{0,10}${NUM}\\s*mm`, 'i').exec(text) ??
    new RegExp(`diameter[^\\d]{0,10}${NUM}\\s*mm`, 'i').exec(text);
  return m ? toNumber(m[1]) : undefined;
}

function extractKerf(text: string): number | undefined {
  const m = new RegExp(`kerf\\w*[^\\d]{0,10}${NUM}\\s*mm`, 'i').exec(text);
  return m ? toNumber(m[1]) : undefined;
}

function extractTolerance(text: string): ToleranceSetting {
  if (/press\s*fit/i.test(text)) return { mode: 'press' };
  if (/loose\s*fit/i.test(text)) return { mode: 'loose' };
  if (/tight\s*fit/i.test(text)) return { mode: 'tight' };
  const custom = new RegExp(`custom\\w*\\s*toleranc\\w*[^\\d]{0,10}${NUM}\\s*mm`, 'i').exec(text);
  if (custom) return { mode: 'custom', customValue: toNumber(custom[1]) };
  return { mode: 'tight' };
}

function extractLidStyle(text: string): LidStyle | undefined {
  if (/šark\w*|sark\w*|hinge\w*/i.test(text)) return 'hinged';
  if (/otvoren\w*|open\s*top/i.test(text)) return 'open';
  if (/friction|utisn\w*|press[\s-]?fit\s*poklop/i.test(text)) return 'friction';
  if (/poklop\w*|lid|zatvoren\w*/i.test(text)) return 'closed';
  return undefined;
}

function extractCount(text: string): number | undefined {
  const m = new RegExp(`${NUM}\\s*(pregrad\\w*|compartment\\w*|nivo\\w*|level\\w*|epruvet\\w*|tube\\w*)`, 'i').exec(
    text,
  );
  return m ? Math.round(toNumber(m[1])) : undefined;
}

function toNumber(s: string): number {
  return parseFloat(s.replace(',', '.'));
}

/** Shape-specific "intelligence": when the user gave a shape but not full
 * dimensions, fill in sensible, real-world-informed defaults instead of
 * leaving the design empty — this is the difference between a form and
 * something that understands what a wine box or a phone stand actually is. */
function applyShapeDefaults(
  shape: ShapeType,
  dims: { width: number; depth: number; height: number } | undefined,
  assumptions: string[],
): { width?: number; depth?: number; height?: number } {
  if (dims) return dims;

  switch (shape) {
    case 'wine-box':
      assumptions.push('Dimenzije nisu navedene — korištena prosječna veličina 750ml boce vina (Ø80×320mm).');
      return {};
    case 'box':
      assumptions.push('Dimenzije nisu navedene — pretpostavljeno 300×200×150mm.');
      return { width: 300, depth: 200, height: 150 };
    case 'tool-organizer':
      assumptions.push('Dimenzije nisu navedene — pretpostavljeno 350×200×60mm.');
      return {};
    case 'shelf':
      assumptions.push('Dimenzije nivoa nisu navedene — pretpostavljeno 400×250mm po nivou, razmak 300mm.');
      return {};
    case 'birdhouse':
      assumptions.push('Dimenzije nisu navedene — pretpostavljena standardna veličina za male ptice pjevačice (140×140×120mm).');
      return {};
    case 'phone-stand':
      assumptions.push('Dimenzije nisu navedene — pretpostavljene standardne za prosječan telefon u maski.');
      return {};
    case 'test-tube-rack':
      assumptions.push('Prečnik epruvete nije naveden — pretpostavljeno 16mm (standardna epruveta).');
      return {};
  }
}
