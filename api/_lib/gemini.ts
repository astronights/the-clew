import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Puzzle } from '../../src/lib/puzzle';
import { describeGeminiError } from './geminiErrors';
import { generationSettings } from './modelConfig';

export type Verdict = 'correct' | 'close' | 'wrong';
export interface Judgement {
  verdict: Verdict;
  hint: string;
}

/** A verdict plus what the desk's Activity page shows about how it was reached (never sent to players). */
export interface JudgeResult extends Judgement {
  model: string;
  /** One short sentence from a text model; empty for decision models. */
  reason: string;
  /** Decision models: P(correct). */
  pCorrect?: number;
  /** Set when the configured model failed and the fallback answered. */
  fallbackFrom?: string;
}

type Raw = { verdict: Verdict; reason: string; pCorrect?: number };

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
Explanation: ${p.explanation}`;
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

/* ---------- Decisions API (e.g. gemini-decision-1) ---------- */

export const isDecisionModel = (model: string) => /^(models\/)?gemini-decision/i.test(model);

/** Probability of "correct" at or above which a guess counts (decision models give a calibrated P(true)). */
export const DECISION_THRESHOLD = 0.5;

/**
 * The judging rules for a yes/no decision: the same rules and examples as judge.md, without its
 * output-format section (the Decisions API returns a probability, not JSON).
 */
export function decisionInstructions(): string {
  const rules = loadJudgeTemplate().replace(/\n## Output[\s\S]*$/, '').trim();
  return `${rules}

## Decision

Answer **true** only if your verdict would be "correct". A "close" or "wrong" guess is **false**.`;
}

/** What the decision is about: today's puzzle, then the player's guess (last, as untrusted data). */
export function decisionInput(p: Puzzle, guess: string): string {
  return `## Today's puzzle

The sequence, in order: ${p.rows.join(' → ')}
The official rule: ${p.connection}
Explanation: ${p.explanation}

## The player's guess

<guess>${sanitizeGuess(guess)}</guess>`;
}

interface DecisionResponse {
  answers?: Record<string, { type?: string; noul?: number; confidence?: number }>;
  usage?: { total_input_tokens?: number; total_cached_tokens?: number; [k: string]: unknown };
}

/** Ask a decision model "does this guess correctly name the sequence?" via POST /v1beta/decisions. */
async function decideWith(model: string, key: string, p: Puzzle, guess: string): Promise<Raw> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/decisions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'content-type': 'application/json', accept: 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        model,
        input: decisionInput(p, guess),
        questions: {
          correct: {
            type: 'noul',
            instructions: decisionInstructions(),
            criteria: {
              true_description: "The guess correctly names today's sequence (a quizmaster would accept it).",
              false_description: 'The guess is too vague, describes a different sequence, gets a key detail wrong, or is not a real answer.',
            },
          },
        },
      }),
    });
    if (!res.ok) throw describeGeminiError(res.status, await res.text(), model);
    const data = (await res.json()) as DecisionResponse;
    const a = data.answers?.correct;
    if (typeof a?.noul !== 'number') throw new Error(`${model} gave no decision`);
    console.log(`judge ${model}: P(correct)=${a.noul.toFixed(2)}${data.usage ? ` usage ${JSON.stringify(data.usage)}` : ''}`);
    const verdict: Verdict = a.noul >= DECISION_THRESHOLD ? 'correct' : a.noul >= 0.25 ? 'close' : 'wrong';
    return { verdict, reason: '', pCorrect: a.noul };
  } finally {
    clearTimeout(timer);
  }
}

/** Used when the configured judge model can't answer (unknown model, unsupported request, quota). */
export const FALLBACK_JUDGE_MODEL = 'gemini-2.5-flash';

/** Ask one model for a verdict. Throws on any failure (HTTP error, unusable reply, timeout). */
async function judgeWith(model: string, key: string, p: Puzzle, guess: string): Promise<Raw> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
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
              reason: { type: 'STRING' },
            },
            required: ['verdict'],
          },
        },
      }),
    });
    if (!res.ok) throw describeGeminiError(res.status, await res.text(), model);
    const data = (await res.json()) as GeminiResponse;
    const u = data.usageMetadata;
    // shows in Vercel logs which model answered and whether the shared prefix came from Gemini's cache
    if (u) console.log(`judge ${model} tokens: prompt ${u.promptTokenCount ?? '?'}, cached ${u.cachedContentTokenCount ?? 0}`);
    const text = data.candidates?.[0]?.content?.parts?.map((x) => x.text ?? '').join('') ?? '';
    const parsed = JSON.parse(text) as { verdict?: string; reason?: unknown };
    if (parsed.verdict !== 'correct' && parsed.verdict !== 'close' && parsed.verdict !== 'wrong') throw new Error(`${model} gave no verdict`);
    return { verdict: parsed.verdict, reason: typeof parsed.reason === 'string' ? parsed.reason.slice(0, 400) : '' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Judge one rule guess. Every guess is judged (no shortcuts). Decision models (gemini-decision-*) go
 * through the Decisions API as one yes/no question; other models through generateContent.
 * If the configured model (GEMINI_MODEL)
 * fails for any reason, the guess is judged by the fallback model instead, so a bad setting or a
 * model that doesn't support this kind of request can't break the game.
 */
export async function askGemini(p: Puzzle, guess: string): Promise<JudgeResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');
  const model = process.env.GEMINI_MODEL || FALLBACK_JUDGE_MODEL;
  try {
    const r = isDecisionModel(model) ? await decideWith(model, key, p, guess) : await judgeWith(model, key, p, guess);
    return { ...r, hint: '', model };
  } catch (err) {
    if (model === FALLBACK_JUDGE_MODEL) throw err;
    console.error(`judge model ${model} failed, using ${FALLBACK_JUDGE_MODEL}:`, (err as Error).message);
    const r = await judgeWith(FALLBACK_JUDGE_MODEL, key, p, guess);
    return { ...r, hint: '', model: FALLBACK_JUDGE_MODEL, fallbackFrom: model };
  }
}
