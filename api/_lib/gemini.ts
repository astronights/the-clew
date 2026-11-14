import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Puzzle } from '../../src/lib/puzzle';
import { generationSettings } from './modelConfig';

export type Verdict = 'correct' | 'close' | 'wrong';
export interface Judgement {
  verdict: Verdict;
  hint: string;
}

let template: string | null = null;

/** The fixed judging instructions + worked examples (prompts/judge.md, after the first `---`). */
export function loadJudgeTemplate(): string {
  if (template) return template;
  const md = readFileSync(join(process.cwd(), 'prompts', 'judge.md'), 'utf8');
  const i = md.search(/^---\s*$/m);
  template = (i >= 0 ? md.slice(i).replace(/^---\s*$/m, '') : md).trim();
  return template;
}

/**
 * System prompt, ordered for Gemini's automatic prompt caching:
 * 1. the fixed instructions + examples (identical for every call, ~2,200 tokens),
 * 2. today's puzzle (identical for every player all day).
 * The player's guess goes in the user message, last.
 */
export function buildSystemPrompt(p: Puzzle): string {
  return `${loadJudgeTemplate()}

## Today's puzzle

The sequence, in order: ${p.rows.join(' → ')}
The official rule: ${p.connection}
Explanation: ${p.explanation}
Phrasings already known to be correct:
${p.acceptedPhrasings.map((a) => `- ${a}`).join('\n')}`;
}

/** Strip delimiter look-alikes and control characters from the guess. */
export function sanitizeGuess(guess: string): string {
  return guess
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/<\/?\s*guess\s*>/gi, ' ')
    .replace(/[<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  usageMetadata?: { promptTokenCount?: number; cachedContentTokenCount?: number };
}

/** Ask Gemini for a verdict on one rule guess. Every guess is judged (no shortcuts). */
export async function askGemini(p: Puzzle, guess: string): Promise<Judgement> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildSystemPrompt(p) }] },
        contents: [{ role: 'user', parts: [{ text: `<guess>${sanitizeGuess(guess)}</guess>` }] }],
        generationConfig: {
          ...generationSettings(model, 'judge'),
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              verdict: { type: 'STRING', enum: ['correct', 'close', 'wrong'] },
              hint: { type: 'STRING' },
            },
            required: ['verdict'],
          },
        },
      }),
    });
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
    const data = (await res.json()) as GeminiResponse;
    const u = data.usageMetadata;
    // shows in Vercel logs whether the shared prefix was served from Gemini's cache
    if (u) console.log(`judge tokens: prompt ${u.promptTokenCount ?? '?'}, cached ${u.cachedContentTokenCount ?? 0}`);
    const text = data.candidates?.[0]?.content?.parts?.map((x) => x.text ?? '').join('') ?? '';
    const parsed = JSON.parse(text) as { verdict?: string };
    const verdict: Verdict = parsed.verdict === 'correct' || parsed.verdict === 'close' ? parsed.verdict : 'wrong';
    return { verdict, hint: '' };
  } finally {
    clearTimeout(timer);
  }
}
