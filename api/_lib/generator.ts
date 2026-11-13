import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateChain, WEEKDAY_DIFFICULTY, type ChainPuzzle } from '../../src/lib/chain';
import { dateOfPuzzle } from '../../src/lib/daily';

/** The editable prompt lives in prompts/puzzle-generator.md; everything after the first `---` line is sent. */
export function loadPromptTemplate(): string {
  const md = readFileSync(join(process.cwd(), 'prompts', 'puzzle-generator.md'), 'utf8');
  const i = md.search(/^---\s*$/m);
  return (i >= 0 ? md.slice(i).replace(/^---\s*$/m, '') : md).trim();
}

export function fillPrompt(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (m, k: string) => (k in vars ? vars[k] : m));
}

export function promptFor(puzzleNo: number, avoid: string[], extra = ''): string {
  const date = dateOfPuzzle(puzzleNo);
  return fillPrompt(loadPromptTemplate(), {
    PUZZLE_NO: String(puzzleNo),
    DATE: date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
    DIFFICULTY: String(WEEKDAY_DIFFICULTY[date.getUTCDay()]),
    AVOID: avoid.length ? avoid.join('\n') : '(nothing yet)',
    EXTRA: extra.trim() ? extra.trim().slice(0, 500) : '(none)',
  });
}

/** Pull the first {...} JSON object out of a model reply (search-grounded replies can't use JSON mode). */
export function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('The model did not return JSON.');
  return JSON.parse(text.slice(start, end + 1));
}

/** Coerce the model's object into a ChainPuzzle shape (validation happens separately). */
export function coercePuzzle(raw: unknown): ChainPuzzle {
  const o = (raw ?? {}) as Record<string, unknown>;
  const strs = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : []);
  const topical = (o.topical ?? {}) as Record<string, unknown>;
  const answer = String(o.answer ?? '').trim();
  const accepted = strs(o.acceptedAnswers);
  return {
    connection: String(o.connection ?? '').trim(),
    acceptedPhrasings: strs(o.acceptedPhrasings).slice(0, 12),
    clues: strs(o.clues),
    answer,
    acceptedAnswers: answer && !accepted.includes(answer) ? [answer, ...accepted] : accepted,
    explanation: String(o.explanation ?? '').trim(),
    category: String(o.category ?? '').trim(),
    difficulty: Math.round(Number(o.difficulty)) || 0,
    topical: { used: topical.used === true, note: String(topical.note ?? '').trim() },
  };
}

export interface Generated {
  puzzle: ChainPuzzle;
  errors: string[];
}

/** Ask Gemini (with Google Search grounding) for one puzzle. */
export async function generatePuzzle(prompt: string): Promise<Generated> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set.');
  const model = process.env.GEMINI_GENERATOR_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 55_000);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.9 },
      }),
    });
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = (await res.json()) as {
      candidates?: {
        content?: { parts?: { text?: string }[] };
        groundingMetadata?: { groundingChunks?: { web?: { uri?: string; title?: string } }[] };
      }[];
    };
    const cand = data.candidates?.[0];
    const text = cand?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    const puzzle = coercePuzzle(extractJson(text));
    const sources = (cand?.groundingMetadata?.groundingChunks ?? [])
      .map((c) => c.web?.title || c.web?.uri || '')
      .filter(Boolean)
      .slice(0, 8);
    if (sources.length) puzzle.sources = sources;
    return { puzzle, errors: validateChain(puzzle) };
  } finally {
    clearTimeout(timer);
  }
}
