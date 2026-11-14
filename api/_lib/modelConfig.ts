/**
 * Generation settings that depend on the Gemini model family.
 *
 * - Gemini 3.x: Google recommends leaving temperature at its default (1.0); lower values can cause
 *   looping. Thinking defaults to "high", which is slow and counts against maxOutputTokens, so we
 *   ask for a lighter thinking level and leave headroom.
 * - Gemini 2.5: deterministic temperature for judging; thinking off for the judge (a yes/no needs
 *   none, and it keeps the short answer from being cut off), light thinking for the writer.
 *
 * Override the thinking level with GEMINI_THINKING_LEVEL / GEMINI_GENERATOR_THINKING_LEVEL
 * (Gemini 3.x: minimal | low | medium | high, as supported by the model).
 */
export type Purpose = 'judge' | 'writer';

export function isGemini3(model: string): boolean {
  const major = /^gemini-(\d+)/.exec(model)?.[1];
  return major !== undefined && Number(major) >= 3;
}

export function generationSettings(model: string, purpose: Purpose): Record<string, unknown> {
  if (isGemini3(model)) {
    const level =
      (purpose === 'judge' ? process.env.GEMINI_THINKING_LEVEL : process.env.GEMINI_GENERATOR_THINKING_LEVEL) || 'low';
    return {
      maxOutputTokens: purpose === 'judge' ? 4096 : 16384,
      thinkingConfig: { thinkingLevel: level },
    };
  }
  return purpose === 'judge'
    ? { temperature: 0, maxOutputTokens: 512, thinkingConfig: { thinkingBudget: 0 } }
    : { temperature: 0.9, thinkingConfig: { thinkingBudget: 2048 } };
}
