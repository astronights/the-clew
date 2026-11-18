import { puzzleNumber } from "../../src/lib/daily";
import { requireAdmin } from "../_lib/admin";
import { getSql } from "../_lib/db";
import { json } from "../_lib/http";
import { getPuzzle } from "../_lib/puzzles";

const RECENT = 200;

export interface ActivityGuess {
  id: number;
  at: string;
  row: number | null;
  guess: string;
  verdict: "correct" | "close" | "wrong";
  model: string | null;
  reason: string | null;
  pCorrect: number | null;
  ms: number | null;
  /** When a player said "I think I was right". */
  flaggedAt: string | null;
  /** The editor accepted this wording. */
  accepted: boolean;
  /** The reviewer's second look after a player's flag. */
  review: { verdict: string; reason: string } | null;
}

export interface ActivityDay {
  puzzleNo: number;
  plays: number;
  solved: number;
  guesses: number;
  flags: number;
}

const GUESS_COLS =
  "id, created_at, row_no, guess, verdict, model, reason, p_correct, ms";

/**
 * GET ?no=N (default today) → one day's activity for the desk:
 * the puzzle, finished games by row, every rule guess (newest first) with the judge's verdict and
 * reasoning, the most common guesses, and a 14-day summary.
 */
export async function GET(req: Request): Promise<Response> {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const sql = getSql();
  if (!sql) return json({ error: "DATABASE_URL is not set." }, 503);
  const today = puzzleNumber();
  const asked = Number(new URL(req.url).searchParams.get("no"));
  const no =
    Number.isInteger(asked) && asked >= 1 && asked <= today ? asked : today;

  const q = async <T>(text: string, params: unknown[]) =>
    (await sql.query(text, params)) as T[];
  // guess_log arrives with migration 004; until it's run, show plays and say what's missing
  let logMissing = false;
  const fromLog = async <T>(text: string, params: unknown[]): Promise<T[]> => {
    try {
      return await q<T>(text, params);
    } catch (err) {
      if (
        /guess_log/.test(String((err as Error)?.message)) ||
        (err as { code?: string })?.code === "42P01"
      ) {
        logMissing = true;
        return [];
      }
      throw err;
    }
  };
  // flagged_at arrives with migration 005; until then, show no flags
  let flagsMissing = false;
  const fromFlags = async <T>(
    text: string,
    params: unknown[],
  ): Promise<T[]> => {
    try {
      return await fromLog<T>(text, params);
    } catch (err) {
      if (
        /flagged_at/.test(String((err as Error)?.message)) ||
        (err as { code?: string })?.code === "42703"
      ) {
        flagsMissing = true;
        return [];
      }
      throw err;
    }
  };
  // accepted_at arrives with migration 006; until then nothing shows as accepted
  const optional = async <T>(text: string, params: unknown[]): Promise<T[]> => {
    try {
      return await fromLog<T>(text, params);
    } catch (err) {
      if (
        (err as { code?: string })?.code === "42703" ||
        /accepted_at|review_/.test(String((err as Error)?.message))
      )
        return [];
      throw err;
    }
  };
  const from = Math.max(1, today - 13);

  try {
    const [
      stored,
      results,
      guesses,
      top,
      dayResults,
      dayGuesses,
      flagged,
      dayFlags,
      accepted,
      reviews,
    ] = await Promise.all([
      getPuzzle(sql, no),
      q<{ solved_on_clue: number; count: number }>(
        "select solved_on_clue, count from daily_results where puzzle_no = $1",
        [no],
      ),
      fromLog<Record<string, unknown>>(
        `select ${GUESS_COLS} from guess_log
         where puzzle_no = $1 order by created_at desc limit ${RECENT}`,
        [no],
      ),
      fromLog<{ guess: string; n: number; correct: number; close: number }>(
        `select lower(trim(guess)) as guess, count(*)::int as n,
                sum(case when verdict = 'correct' then 1 else 0 end)::int as correct,
                sum(case when verdict = 'close' then 1 else 0 end)::int as close
         from guess_log where puzzle_no = $1 group by 1 order by 2 desc, 1 limit 15`,
        [no],
      ),
      q<{ puzzle_no: number; solved_on_clue: number; count: number }>(
        "select puzzle_no, solved_on_clue, count from daily_results where puzzle_no between $1 and $2",
        [from, today],
      ),
      fromLog<{ puzzle_no: number; n: number }>(
        "select puzzle_no, count(*)::int as n from guess_log where puzzle_no between $1 and $2 group by puzzle_no",
        [from, today],
      ),
      fromFlags<Record<string, unknown>>(
        `select ${GUESS_COLS}, flagged_at from guess_log
           where puzzle_no = $1 and flagged_at is not null order by flagged_at desc limit 100`,
        [no],
      ),
      fromFlags<{ puzzle_no: number; n: number }>(
        `select puzzle_no, count(*)::int as n from guess_log
           where puzzle_no between $1 and $2 and flagged_at is not null group by puzzle_no`,
        [from, today],
      ),
      optional<{ id: number }>(
        "select id from guess_log where puzzle_no = $1 and accepted_at is not null",
        [no],
      ),
      optional<{
        id: number;
        review_verdict: string;
        review_reason: string | null;
      }>(
        "select id, review_verdict, review_reason from guess_log where puzzle_no = $1 and review_verdict is not null",
        [no],
      ),
    ]);
    const reviewOf = new Map(
      reviews.map((v) => [
        Number(v.id),
        { verdict: v.review_verdict, reason: v.review_reason ?? "" },
      ]),
    );
    const acceptedIds = new Set(accepted.map((a) => Number(a.id)));
    const flaggedAt = new Map(
      flagged.map((g) => [
        Number(g.id),
        new Date(g.flagged_at as string).toISOString(),
      ]),
    );
    const toGuess = (g: Record<string, unknown>): ActivityGuess => ({
      id: Number(g.id),
      at: new Date(g.created_at as string).toISOString(),
      row: g.row_no == null ? null : Number(g.row_no),
      guess: String(g.guess),
      verdict: g.verdict as ActivityGuess["verdict"],
      model: (g.model as string) ?? null,
      reason: (g.reason as string) ?? null,
      pCorrect: g.p_correct == null ? null : Number(g.p_correct),
      ms: g.ms == null ? null : Number(g.ms),
      flaggedAt: flaggedAt.get(Number(g.id)) ?? null,
      accepted: acceptedIds.has(Number(g.id)),
      review: reviewOf.get(Number(g.id)) ?? null,
    });

    // index 0 = gave up / missed, 1..5 = solved on that row
    const counts = [0, 0, 0, 0, 0, 0];
    for (const r of results) {
      const row = Number(r.solved_on_clue);
      if (row >= 0 && row <= 5) counts[row] += Number(r.count);
    }
    const days: ActivityDay[] = [];
    for (let n = today; n >= from; n--) {
      const rs = dayResults.filter((r) => Number(r.puzzle_no) === n);
      days.push({
        puzzleNo: n,
        plays: rs.reduce((a, r) => a + Number(r.count), 0),
        solved: rs
          .filter((r) => Number(r.solved_on_clue) > 0)
          .reduce((a, r) => a + Number(r.count), 0),
        guesses: Number(
          dayGuesses.find((g) => Number(g.puzzle_no) === n)?.n ?? 0,
        ),
        flags: Number(dayFlags.find((g) => Number(g.puzzle_no) === n)?.n ?? 0),
      });
    }

    return json({
      logMissing,
      today,
      puzzleNo: no,
      puzzle:
        stored?.status === "approved"
          ? { connection: stored.data.connection, clues: stored.data.clues }
          : null,
      counts,
      guesses: guesses.map(toGuess),
      flagged: flagged.map(toGuess),
      flagsMissing,
      top: top.map((t) => ({
        guess: t.guess,
        n: Number(t.n),
        correct: Number(t.correct),
        close: Number(t.close),
      })),
      days,
    });
  } catch (err) {
    console.error("activity failed", err);
    return json(
      {
        error: `Activity query failed: ${(err as Error)?.message ?? "unknown error"}`,
      },
      500,
    );
  }
}
