import type { FlattenedSheet } from './flatten';
import type { Path } from '../geometry/polygon';

/**
 * Writes a best-effort LightBurn project file (.lbrn2): one CutSetting
 * per layer (Cut/red, Scan-Engrave/blue, Score/green) and one Shape per
 * path, using LightBurn's plain-line VertList/PrimList shape encoding (no
 * beziers needed for this engine's rectilinear + circular geometry).
 *
 * LightBurn's native format isn't officially published, so treat this as
 * a convenience export rather than the primary path — the layered SVG
 * this app also produces is guaranteed to import cleanly (LightBurn reads
 * SVG natively and auto-assigns Cut/Scan by stroke color), so that's the
 * recommended fallback if a given LightBurn version rejects this file.
 */
export function renderSheetToLightburn(sheet: FlattenedSheet): string {
  const shapes: string[] = [];
  let cutIndexCounter = 0;
  const cutIndex = { cut: cutIndexCounter++, score: cutIndexCounter++, engrave: cutIndexCounter++ };

  for (const path of sheet.cutPaths) shapes.push(shapeXml(path, cutIndex.cut, true));
  for (const path of sheet.scorePaths) shapes.push(shapeXml(path, cutIndex.score, false));
  for (const path of sheet.engravePaths) shapes.push(shapeXml(path, cutIndex.engrave, true));

  return `<?xml version="1.0" encoding="UTF-8"?>
<LightBurnProject AppVersion="1.2.04" FormatVersion="1" MaterialHeight="0" MirrorX="false" MirrorY="false">
  <Thumbnail Source="0"/>
  <UIState CurrentLayer="0" CameraViewFullPage="1"/>
  ${cutSettingXml(cutIndex.cut, 'Cut', 0xff0000, 10, 80)}
  ${cutSettingXml(cutIndex.score, 'Score', 0x00ff00, 300, 15)}
  ${cutSettingXml(cutIndex.engrave, 'Engrave', 0x0000ff, 300, 40)}
  ${shapes.join('\n  ')}
</LightBurnProject>`;
}

function cutSettingXml(index: number, name: string, colorHex: number, speed: number, power: number): string {
  return `<CutSetting type="${name === 'Engrave' ? 'Scan' : 'Cut'}">
    <index Value="${index}"/>
    <name Value="${name}"/>
    <Speed Value="${speed}"/>
    <MaxPower Value="${power}"/>
    <numPasses Value="1"/>
    <Color Value="${colorHex}"/>
  </CutSetting>`;
}

function shapeXml(path: Path, cutIndex: number, closed: boolean): string {
  const verts = path.map((p) => `V${fmt(p.x)} ${fmt(p.y)}`).join('');
  const segCount = closed ? path.length : path.length - 1;
  const prims: string[] = [];
  for (let i = 0; i < segCount; i++) {
    const next = (i + 1) % path.length;
    prims.push(`L${i} ${next}`);
  }
  return `<Shape Type="Path" CutIndex="${cutIndex}">
    <XForm>1 0 0 1 0 0</XForm>
    <VertList>${verts}</VertList>
    <PrimList>${prims.join('')}</PrimList>
  </Shape>`;
}

function fmt(n: number): string {
  return (Math.round(n * 1000) / 1000).toString();
}
