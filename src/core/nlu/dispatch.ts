import { resolveMaterial } from '../materials/material';
import type { ParsedIntent } from './types';
import type { Design } from '../model/types';
import { generateBox } from '../shapes/box';
import { generateWineBox } from '../shapes/wineBox';
import { generateTestTubeRack } from '../shapes/testTubeRack';
import { generateToolOrganizer } from '../shapes/toolOrganizer';
import { generateShelf } from '../shapes/shelf';
import { generateBirdhouse } from '../shapes/birdhouse';
import { generatePhoneStand } from '../shapes/phoneStand';

/**
 * Translates a generator-agnostic `ParsedIntent` into an actual `Design`
 * by calling the matching shape generator with sensible fallbacks for
 * whatever the parser didn't find. This is the only place that couples
 * NLU output to specific generator APIs, so adding a new shape only means
 * adding one case here (plus a matcher in `heuristicParser.ts`) — the
 * generators themselves stay unaware NLU exists at all.
 */
export function generateFromIntent(intent: ParsedIntent): Design {
  const material = resolveMaterial(intent.materialId, intent.thickness, intent.kerf, intent.materialLabel);
  const { dimensions } = intent;

  switch (intent.shapeType) {
    case 'wine-box':
      return generateWineBox({
        bottleDiameter: intent.bottleDiameter,
        bottleHeight: intent.bottleHeight,
        material,
        tolerance: intent.tolerance,
        title: intent.title,
      });

    case 'test-tube-rack':
      return generateTestTubeRack({
        tubeCount: intent.count ?? 12,
        tubeDiameter: intent.tubeDiameter ?? 16,
        material,
        tolerance: intent.tolerance,
        title: intent.title,
      });

    case 'tool-organizer':
      return generateToolOrganizer({
        width: dimensions.width,
        depth: dimensions.depth,
        height: dimensions.height,
        compartments: intent.count,
        material,
        tolerance: intent.tolerance,
        title: intent.title,
      });

    case 'shelf':
      return generateShelf({
        levels: intent.count ?? 3,
        levelWidth: dimensions.width ?? 400,
        levelDepth: dimensions.depth ?? 250,
        levelHeight: dimensions.height ?? 300,
        material,
        tolerance: intent.tolerance,
        title: intent.title,
      });

    case 'birdhouse':
      return generateBirdhouse({
        width: dimensions.width,
        depth: dimensions.depth,
        wallHeight: dimensions.height,
        material,
        tolerance: intent.tolerance,
        title: intent.title,
      });

    case 'phone-stand':
      return generatePhoneStand({
        standWidth: dimensions.width,
        standDepth: dimensions.depth,
        backHeight: dimensions.height,
        material,
        tolerance: intent.tolerance,
        title: intent.title,
      });

    case 'box':
    default:
      return generateBox({
        width: dimensions.width ?? 300,
        depth: dimensions.depth ?? 200,
        height: dimensions.height ?? 150,
        material,
        tolerance: intent.tolerance,
        lidStyle: intent.lidStyle ?? 'closed',
        dividers: intent.count ? [{ axis: 'x', count: intent.count }] : undefined,
        title: intent.title,
      });
  }
}
