import { puzzleNumber } from '../../src/lib/daily';
import { requireAdmin } from '../_lib/admin';
import { getSql } from '../_lib/db';
import { json } from '../_lib/http';
import { getPuzzle } from '../_lib/puzzles';

const RECENT = 200;

export interface ActivityGuess {
  id: number;
  at: string;
  row: number | null;
  guess: string;
  verdict: 'correct' | 'close' | 'wrong';
  model: string | null;
  reason: string | null;
  pCorrect: number | null;
  ms: number | null;
}

export interface ActivityDay {
  puzzleNo: number;
  plays: number;
  solved: number;
  guesses: number;
}

/**
 * GET ?no=N (default today) → one day's activity for the desk:
 * the puzzle, finished games by row, every rule guess (newest first) with the judge's verdict and
 * reasoning, the most common guesses, and a 14-day summary.
 */
export async function GET(req: Request): Promise<Response> {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const sql = getSql();
  if (!sql) return json({ error: 'DATABASE_URL is not set.' }, 503);
  const today = puzzleNumber();
  const asked = Number(new URL(req.url).searchParams.get('no'));
  const no = Number.isInteger(asked) && asked >= 1 && asked <= today ? asked : today;

  const q = async <T,>(text: string, params: unknown[]) => (await sql.query(text, params)) as T[];
  const [stored, results, guesses, top, days] = await Promise.all([
    getPuzzle(sql, no),
    q<{ solved_on_clue: number; count: number }>('select solved_on_clue, count from daily_results where puzzle_no = $1', [no]),
    q<Record<string, unknown>>(
      `select id, created_at, row_no, guess, verdict, model, reason, p_correct, ms from guess_log
       where puzzle_no = $1 order by created_at desc limit ${RECENT}`,
      [no],
    ),
    q<{ guess: string; n: number; correct: number; close: number }>(
      `select lower(trim(guess)) as guess, count(*)::int as n,
              sum((verdict = 'correct')::int)::int as correct, sum((verdict = 'close')::int)::int as close
       from guess_log where puzzle_no = $1 group by 1 order by n desc, 1 limit 15`,
      [no],
    ),
    q<{ puzzle_no: number; plays: number; solved: number; guesses: number }>(
      `with r as (select puzzle_no, sum(count)::int as plays, sum(case when solved_on_clue > 0 then count else 0 end)::int as solved
                  from daily_results where puzzle_no between $1 and $2 group by 1),
            g as (select puzzle_no, count(*)::int as guesses from guess_log where puzzle_no between $1 and $2 group by 1)
       select n as puzzle_no, coalesce(r.plays, 0) as plays, coalesce(r.solved, 0) as solved, coalesce(g.guesses, 0) as guesses
       from generate_series($1::int, $2::int) n left join r on r.puzzle_no = n left join g on g.puzzle_no = n
       order by n desc`,
      [Math.max(1, today - 13), today],
    ),
  ]);

  // index 0 = gave up / missed, 1..5 = solved on that row
  const counts = [0, 0, 0, 0, 0, 0];
  for (const r of results) if (r.solved_on_clue >= 0 && r.solved_on_clue <= 5) counts[r.solved_on_clue] += Number(r.count);

  return json({
    today,
    puzzleNo: no,
    puzzle: stored?.status === 'approved' ? { connection: stored.data.connection, clues: stored.data.clues } : null,
    counts,
    guesses: guesses.map(
      (g): ActivityGuess => ({
        id: Number(g.id),
        at: new Date(g.created_at as string).toISOString(),
        row: g.row_no == null ? null : Number(g.row_no),
        guess: String(g.guess),
        verdict: g.verdict as ActivityGuess['verdict'],
        model: (g.model as string) ?? null,
        reason: (g.reason as string) ?? null,
        pCorrect: g.p_correct == null ? null : Number(g.p_correct),
        ms: g.ms == null ? null : Number(g.ms),
      }),
    ),
    top,
    days: days.map((d): ActivityDay => ({ puzzleNo: Number(d.puzzle_no), plays: d.plays, solved: d.solved, guesses: d.guesses })),
  });
}
