import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeChain, validateChain, WEEKDAY_DIFFICULTY, type ChainPuzzle } from '../../src/lib/chain';
import { dateOfPuzzle } from '../../src/lib/daily';
import { describeGeminiError, sleep } from './geminiErrors';
import { generationSettings } from './modelConfig';

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

/**
 * Prompt for changing an existing puzzle: the house rules from the writer prompt, the current
 * puzzle, and the editor's instruction. The model returns the whole updated puzzle.
 */
export function revisePromptFor(puzzleNo: number, current: ChainPuzzle, instruction: string, avoid: string[]): string {
  const rules = promptFor(puzzleNo, avoid, '');
  return `${rules}

---

## Revision task

You already wrote the puzzle below. The editor wants a change. Apply **only** what they ask for and keep
everything else as it is, unless the change forces other fields to change (e.g. a new 5th item needs a new explanation). Keep every rule above.

Editor's instruction:
${instruction.trim().slice(0, 1000)}

Current puzzle:
${JSON.stringify(current, null, 2)}

Reply with the complete updated puzzle as a single JSON object, in exactly the same shape, and nothing else.`;
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
  const p = normalizeChain(raw);
  return { ...p, topical: p.topical ?? { used: false, note: '' } };
}

export interface Generated {
  puzzle: ChainPuzzle;
  errors: string[];
}

interface WriterReply {
  text: string;
  sources: string[];
  /** false when the Search allowance ran out and the reply was written without it */
  withSearch: boolean;
}

/**
 * One call to the writer model (with Google Search grounding). Short per-minute waits are retried
 * once; if the Search allowance is used up, it retries without Search instead of failing.
 */
async function callWriter(prompt: string, timeoutMs: number): Promise<WriterReply> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set.');
  const model = process.env.GEMINI_GENERATOR_MODEL || 'gemini-2.5-flash';
  const started = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const ask = (withSearch: boolean) =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        ...(withSearch ? { tools: [{ google_search: {} }] } : {}),
        generationConfig: generationSettings(model, 'writer'),
      }),
    });
  try {
    let withSearch = true;
    let res = await ask(withSearch);
    for (let attempt = 0; !res.ok && attempt < 2; attempt++) {
      const err = describeGeminiError(res.status, await res.text(), model);
      if (res.status !== 429) throw err;
      if (withSearch && /Search/.test(err.message)) withSearch = false;
      else if (err.window !== 'day' && (err.retryAfter ?? 0) <= 20 && Date.now() - started < timeoutMs / 2) await sleep(((err.retryAfter ?? 5) + 1) * 1000);
      else throw err;
      res = await ask(withSearch);
    }
    if (!res.ok) throw describeGeminiError(res.status, await res.text(), model);
    const data = (await res.json()) as {
      candidates?: {
        content?: { parts?: { text?: string }[] };
        groundingMetadata?: { groundingChunks?: { web?: { uri?: string; title?: string } }[] };
      }[];
    };
    const cand = data.candidates?.[0];
    const text = cand?.content?.parts?.map((x) => x.text ?? '').join('') ?? '';
    const sources = (cand?.groundingMetadata?.groundingChunks ?? [])
      .map((c) => c.web?.title || c.web?.uri || '')
      .filter(Boolean)
      .slice(0, 8);
    return { text, sources, withSearch };
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw new Error('Gemini took too long to answer. Try again, or write fewer days at once.');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

const NO_SEARCH_NOTE = { used: false, note: 'written without Google Search (its quota was used up)' };

/** Ask Gemini for one puzzle. */
export async function generatePuzzle(prompt: string): Promise<Generated> {
  const r = await callWriter(prompt, 55_000);
  const puzzle = coercePuzzle(extractJson(r.text));
  if (!r.withSearch) puzzle.topical = NO_SEARCH_NOTE;
  if (r.sources.length) puzzle.sources = r.sources;
  return { puzzle, errors: validateChain(puzzle) };
}

/* ---------- batch: several days in one request ---------- */

const dayLabel = (no: number) =>
  dateOfPuzzle(no).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/**
 * Prompt for writing several days at once: the same house rules, then the list of days, and an
 * output override (a JSON array, one puzzle per day, in order, each tagged with its puzzleNo).
 */
export function batchPromptFor(puzzleNos: number[], avoid: string[], extra = ''): string {
  const rules = fillPrompt(loadPromptTemplate(), {
    PUZZLE_NO: puzzleNos.join(', '),
    DATE: 'each day listed under "Batch task" below',
    DIFFICULTY: 'the one listed for each day below',
    AVOID: avoid.length ? avoid.join('\n') : '(nothing yet)',
    EXTRA: extra.trim() ? extra.trim().slice(0, 500) : '(none)',
  });
  const days = puzzleNos
    .map((n) => `- puzzleNo ${n}: ${dayLabel(n)}, difficulty ${WEEKDAY_DIFFICULTY[dateOfPuzzle(n).getUTCDay()]}`)
    .join('\n');
  return `${rules}

---

## Batch task

Write **${puzzleNos.length} puzzles**, one for each of these days:

${days}

- Follow every rule above for each puzzle.
- Make them all **different from each other**: different sequences and, where possible, different categories,
  and none of them on the avoid list.
- A topical hook should go on the day it fits best (and only if one fits naturally).

**This overrides the output format above:** reply with **only a JSON array** of ${puzzleNos.length} objects, in the
order listed. Each object has the exact fields described above **plus** \`"puzzleNo"\` (the number from the list).`;
}

/** Pull the first [...] JSON array out of a model reply. */
export function extractJsonArray(text: string): unknown[] {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start < 0 || end <= start) throw new Error('The model did not return a list of puzzles.');
  const parsed = JSON.parse(text.slice(start, end + 1));
  if (!Array.isArray(parsed)) throw new Error('The model did not return a list of puzzles.');
  return parsed;
}

export interface BatchItem {
  puzzleNo: number;
  puzzle: ChainPuzzle;
  errors: string[];
}

/** Ask Gemini for several days in one request (fits Vercel's 5-minute Hobby limit). */
export async function generateBatch(puzzleNos: number[], prompt: string): Promise<BatchItem[]> {
  const r = await callWriter(prompt, 280_000);
  const raw = extractJsonArray(r.text);
  return puzzleNos.flatMap((no, i) => {
    const obj = (raw.find((x) => Number((x as { puzzleNo?: unknown })?.puzzleNo) === no) ?? raw[i]) as Record<string, unknown> | undefined;
    if (!obj) return [];
    const puzzle = coercePuzzle(obj);
    if (!r.withSearch) puzzle.topical = NO_SEARCH_NOTE;
    if (r.sources.length) puzzle.sources = r.sources;
    return [{ puzzleNo: no, puzzle, errors: validateChain(puzzle) }];
  });
}
