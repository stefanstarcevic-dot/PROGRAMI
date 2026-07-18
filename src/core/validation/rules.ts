import type { Design, Panel, ValidationIssue } from '../model/types';
import { findSelfIntersections, pathsIntersect } from '../geometry/intersect';
import { boundingBox, signedArea, translate } from '../geometry/polygon';

const MIN_STRUCTURAL_SPAN_RATIO = 160; // span:thickness beyond this risks sagging
const MIN_ELEMENT_SIZE_FACTOR = 1.2; // smallest panel dimension vs thickness

/**
 * Runs the full geometric + structural sanity pass over a generated
 * design. This is what turns the tool from "a script that emits SVG" into
 * a CAD system: it actively looks for reasons the design would fail to
 * cut cleanly or fail to go together, before the user ever fires the
 * laser.
 */
export function validateDesign(design: Design): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const panel of design.panels) {
    issues.push(...validatePanelGeometry(panel));
    issues.push(...validatePanelStructure(panel, design));
  }

  issues.push(...checkCollisions(design.panels));

  return issues;
}

function validatePanelGeometry(panel: Panel): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const selfHits = findSelfIntersections(panel.outline);
  if (selfHits.length > 0) {
    issues.push({
      severity: 'error',
      panelId: panel.id,
      message: `Panel "${panel.label}" ima ${selfHits.length} samopresijecanje konture — geometrija spoja je neispravna i neće se ispravno rezati.`,
    });
  }

  const area = Math.abs(signedArea(panel.outline));
  if (area < 1) {
    issues.push({
      severity: 'error',
      panelId: panel.id,
      message: `Panel "${panel.label}" ima zanemarljivu površinu (${area.toFixed(2)} mm²) — provjerite dimenzije.`,
    });
  }

  for (const hole of panel.holes) {
    if (findSelfIntersections(hole).length > 0) {
      issues.push({
        severity: 'error',
        panelId: panel.id,
        message: `Panel "${panel.label}" ima neispravan unutrašnji otvor (samopresijecanje).`,
      });
    }
    if (!isFullyInside(hole, panel.outline)) {
      issues.push({
        severity: 'warning',
        panelId: panel.id,
        message: `Panel "${panel.label}": unutrašnji rez djelimično izlazi izvan konture panela.`,
      });
    }
  }

  return issues;
}

function validatePanelStructure(panel: Panel, design: Design): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const box = boundingBox(panel.outline);
  const width = box.max.x - box.min.x;
  const height = box.max.y - box.min.y;
  const shortest = Math.min(width, height);
  const longest = Math.max(width, height);
  const thickness = panel.thickness;

  if (shortest < thickness * MIN_ELEMENT_SIZE_FACTOR) {
    issues.push({
      severity: 'warning',
      panelId: panel.id,
      message: `Panel "${panel.label}" je vrlo uzak (${shortest.toFixed(1)}mm) u odnosu na debljinu materijala (${thickness}mm) — element može biti krhak.`,
    });
  }

  if (longest / thickness > MIN_STRUCTURAL_SPAN_RATIO) {
    issues.push({
      severity: 'warning',
      panelId: panel.id,
      message: `Panel "${panel.label}" ima raspon ${longest.toFixed(
        0,
      )}mm naspram debljine ${thickness}mm (odnos ${(longest / thickness).toFixed(
        0,
      )}:1) — razmislite o dodatnoj pregradi ili debljem materijalu radi krutosti.`,
    });
  }

  if (design.material.id === 'akril' && thickness < 3 && longest > 200) {
    issues.push({
      severity: 'warning',
      panelId: panel.id,
      message: `Veliki akrilni panel (${longest.toFixed(0)}mm) debljine ${thickness}mm — akril je krt, razmotrite deblju ploču (≥4mm) za noseće panele.`,
    });
  }

  return issues;
}

function checkCollisions(panels: Panel[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const placed = panels.filter((p) => p.placement);
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i];
      const b = placed[j];
      const outlineA = translate(a.outline, { x: a.placement!.x, y: a.placement!.y });
      const outlineB = translate(b.outline, { x: b.placement!.x, y: b.placement!.y });
      if (pathsIntersect(outlineA, outlineB)) {
        issues.push({
          severity: 'error',
          message: `Paneli "${a.label}" i "${b.label}" se sudaraju u rasporedu na ploči (sheet layout) — pomjerite ih ili smanjite razmak.`,
        });
      }
    }
  }
  return issues;
}

function isFullyInside(inner: import('../geometry/polygon').Path, outer: import('../geometry/polygon').Path): boolean {
  const innerBox = boundingBox(inner);
  const outerBox = boundingBox(outer);
  return (
    innerBox.min.x >= outerBox.min.x - 1e-6 &&
    innerBox.min.y >= outerBox.min.y - 1e-6 &&
    innerBox.max.x <= outerBox.max.x + 1e-6 &&
    innerBox.max.y <= outerBox.max.y + 1e-6
  );
}
