import { puzzleNumber } from '../src/lib/daily';
import { fromChain, type Puzzle } from '../src/lib/puzzle';
import { normalizeGuess } from '../src/lib/fuzzy';
import { getSql } from './_lib/db';
import { askGemini, type Judgement } from './_lib/gemini';
import { clientIp, hashIp, json, readJson } from './_lib/http';
import { getPuzzle } from './_lib/puzzles';
import { withinRateLimit } from './_lib/ratelimit';

const JUDGE_LIMIT_PER_HOUR = 30;

/** "chain:N" → the approved puzzle of day N (never a future day). */
async function findPuzzle(id: string): Promise<Puzzle | null> {
  const m = id.match(/^chain:(\d+)$/);
  if (!m) return null;
  const no = Number(m[1]);
  const sql = getSql();
  if (!sql || no > puzzleNumber()) return null;
  const stored = await getPuzzle(sql, no);
  return stored?.status === 'approved' ? fromChain(id, stored.data) : null;
}

export async function POST(req: Request): Promise<Response> {
  const body = await readJson<{ ruleId?: unknown; guess?: unknown }>(req);
  if (!body || typeof body.ruleId !== 'string' || typeof body.guess !== 'string') return json({ error: 'bad request' }, 400);
  const puzzle = await findPuzzle(body.ruleId);
  if (!puzzle) return json({ error: 'unknown puzzle' }, 404);
  const guess = body.guess.trim().slice(0, 200);
  const normalized = normalizeGuess(guess);
  if (!guess || !normalized) return json({ verdict: 'wrong', hint: '' } satisfies Judgement);

  // Every guess is judged by the model. Only the rate limit runs first.
  const sql = getSql();
  if (sql) {
    try {
      if (!(await withinRateLimit(sql, hashIp(clientIp(req)), 'judge', JUDGE_LIMIT_PER_HOUR)))
        return json({ error: 'rate limited' }, 429, { 'retry-after': '3600' });
    } catch (err) {
      console.error('rate limit check failed', err);
    }
  }

  let judgement: Judgement;
  try {
    judgement = await askGemini(puzzle, guess);
  } catch (err) {
    console.error('judge failed', err);
    return json({ error: 'judge unavailable' }, 503);
  }

  // a record of what players typed and how it was judged (for reviewing the judge); never read back to skip a call
  if (sql) {
    try {
      await sql.query(
        `insert into verdict_cache (rule_id, normalized_guess, verdict, hint) values ($1, $2, $3, '')
         on conflict (rule_id, normalized_guess) do update set verdict = excluded.verdict, created_at = now()`,
        [puzzle.id, normalized, judgement.verdict],
      );
    } catch (err) {
      console.error('verdict log failed', err);
    }
  }
  return json(judgement);
}
