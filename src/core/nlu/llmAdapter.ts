import type { NluAdapter, ParsedIntent } from './types';
import { parseUserPrompt } from './heuristicParser';

/** Default adapter: no network calls, no API key, works fully offline. */
export class HeuristicNluAdapter implements NluAdapter {
  async parse(text: string): Promise<ParsedIntent> {
    return parseUserPrompt(text);
  }
}

/**
 * Contract for wiring a real LLM (Claude, GPT, etc.) into the understanding
 * step in place of/on top of the heuristic parser. Intentionally the same
 * `NluAdapter` interface the heuristic adapter implements, so the rest of
 * the app (dispatch.ts, the UI) never needs to know which is active.
 *
 * To wire a real backend:
 *   1. Implement `parse(text)` by prompting the model to return a JSON
 *      object matching `ParsedIntent` (shapeType, dimensions, materialId,
 *      thickness, kerf, tolerance, lidStyle, count, ...) — give it the
 *      `ShapeType` union and the `MaterialId` union as its allowed enums.
 *   2. Validate/clamp the model's JSON before returning it (never trust
 *      numeric ranges from an LLM response directly into geometry code).
 *   3. Fall back to `HeuristicNluAdapter` on any parse/network failure so
 *      the app keeps working offline or if the API key is missing.
 *
 * This class is deliberately left unimplemented (throws) rather than
 * silently degrading to a fake network call — callers should either
 * provide a real implementation or use `HeuristicNluAdapter`.
 */
export interface LlmNluConfig {
  apiKey: string;
  model?: string;
  endpoint?: string;
}

export class LlmNluAdapter implements NluAdapter {
  private readonly config: LlmNluConfig;

  constructor(config: LlmNluConfig) {
    this.config = config;
  }

  async parse(_text: string): Promise<ParsedIntent> {
    throw new Error(
      `LlmNluAdapter (model: ${this.config.model ?? 'nepoznat'}) nije povezan ni sa jednim LLM servisom. ` +
        'Prosljedite pravu implementaciju (npr. poziv ka Anthropic/OpenAI API-ju koji vraća JSON u obliku ' +
        'ParsedIntent) ili koristite HeuristicNluAdapter.',
    );
  }
}

/**
 * Picks the best available adapter. `LlmNluAdapter` has no real backend
 * wired in yet (see the class doc above for the integration contract), so
 * this always returns the offline heuristic parser today — once a real
 * `parse()` implementation exists, swap the body to construct
 * `LlmNluAdapter` when `llmApiKey` is provided.
 */
export function createDefaultNluAdapter(_llmApiKey?: string): NluAdapter {
  return new HeuristicNluAdapter();
}
