import { puzzleNumber } from '../src/lib/daily';
import { fromChain, type Puzzle } from '../src/lib/puzzle';
import { normalizeGuess } from '../src/lib/fuzzy';
import { getSql } from './_lib/db';
import { askGemini, type JudgeResult, type Judgement } from './_lib/gemini';
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
  const body = await readJson<{ ruleId?: unknown; guess?: unknown; row?: unknown }>(req);
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

  let judgement: JudgeResult;
  const started = Date.now();
  try {
    judgement = await askGemini(puzzle, guess);
  } catch (err) {
    console.error('judge failed', err);
    return json({ error: 'judge unavailable' }, 503);
  }

  // the desk's Activity page reads this; it is never used to skip judging a guess
  let logId: number | undefined;
  if (sql) {
    const row = Number(body.row);
    try {
      const rows = (await sql.query(
        `insert into guess_log (puzzle_no, row_no, guess, verdict, model, reason, p_correct, ms) values ($1, $2, $3, $4, $5, $6, $7, $8)
         returning id`,
        [
          Number(puzzle.id.split(':')[1]),
          Number.isInteger(row) && row >= 1 && row <= 5 ? row : null,
          guess,
          judgement.verdict,
          judgement.fallbackFrom ? `${judgement.model} (fallback from ${judgement.fallbackFrom})` : judgement.model,
          judgement.reason || null,
          judgement.pCorrect ?? null,
          Date.now() - started,
        ],
      )) as { id: number | string }[];
      logId = rows[0] ? Number(rows[0].id) : undefined;
    } catch (err) {
      console.error('guess log failed', err);
    }
  }
  // `id` lets the player flag a rejected guess for review (/api/flag)
  return json({ verdict: judgement.verdict, hint: '', ...(logId ? { id: logId } : {}) } satisfies Judgement & { id?: number });
}
