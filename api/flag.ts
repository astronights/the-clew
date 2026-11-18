import { normalizeGuess } from "../src/lib/fuzzy";
import { fromChain } from "../src/lib/puzzle";
import { chainRuleId } from "../src/lib/chain";
import { getSql } from "./_lib/db";
import { reviewAppeal } from "./_lib/gemini";
import { clientIp, hashIp, json, readJson } from "./_lib/http";
import { getPuzzle } from "./_lib/puzzles";
import { withinRateLimit } from "./_lib/ratelimit";

const FLAG_LIMIT_PER_HOUR = 10;

/**
 * POST {id}: a player thinks their rejected rule guess was right ("I think I was right").
 * Marks it for the editor, then asks a reviewer model to look again with an appeal prompt. If the
 * reviewer agrees, the wording is accepted for that puzzle from now on and `upheld` is true, so the
 * player's game can count it. Only guesses from the last two days that weren't judged correct qualify.
 */
export async function POST(req: Request): Promise<Response> {
  const body = await readJson<{ id?: unknown }>(req);
  const id = Number(body?.id);
  if (!Number.isInteger(id) || id < 1)
    return json({ error: "bad request" }, 400);
  const sql = getSql();
  if (!sql) return json({ ok: false, reason: "no database" });
  if (
    !(await withinRateLimit(
      sql,
      hashIp(clientIp(req)),
      "flag",
      FLAG_LIMIT_PER_HOUR,
    ))
  )
    return json({ error: "rate limited" }, 429);

  const rows = (await sql.query(
    `update guess_log set flagged_at = coalesce(flagged_at, now())
     where id = $1 and verdict <> 'correct' and created_at > now() - interval '2 days'
     returning puzzle_no, guess`,
    [id],
  )) as { puzzle_no: number; guess: string }[];
  if (!rows[0]) return json({ error: "not found" }, 404);
  const puzzleNo = Number(rows[0].puzzle_no);
  const guess = String(rows[0].guess);

  // second look; any failure here still leaves the flag for the editor
  let upheld = false;
  try {
    const stored = await getPuzzle(sql, puzzleNo);
    if (stored?.status === "approved") {
      const review = await reviewAppeal(
        fromChain(chainRuleId(puzzleNo), stored.data),
        guess,
      );
      upheld = review.verdict === "correct";
      console.log(
        `appeal ${id} (${review.model}): ${review.verdict} ${review.reason}`,
      );
      try {
        await sql.query(
          "update guess_log set review_verdict = $2, review_reason = $3 where id = $1",
          [id, review.verdict, `${review.reason} (${review.model})`.trim()],
        );
      } catch (err) {
        console.error(
          "saving review failed (run npm run db:migrate?)",
          (err as Error).message,
        );
      }
      const normalized = normalizeGuess(guess);
      if (upheld && normalized) {
        try {
          await sql.query(
            `insert into accepted_guesses (puzzle_no, normalized, source) values ($1, $2, 'review') on conflict do nothing`,
            [puzzleNo, normalized],
          );
        } catch (err) {
          console.error(
            "accepting reviewed wording failed (run npm run db:migrate?)",
            (err as Error).message,
          );
        }
      }
    }
  } catch (err) {
    console.error("appeal review failed", (err as Error).message);
  }
  return json({ ok: true, upheld });
}
