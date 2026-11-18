import { puzzleNumber } from "../src/lib/daily";
import { fromChain, type Puzzle } from "../src/lib/puzzle";
import { normalizeGuess } from "../src/lib/fuzzy";
import { getSql } from "./_lib/db";
import { askGemini, type JudgeResult, type Judgement } from "./_lib/gemini";
import { clientIp, hashIp, json, readJson } from "./_lib/http";
import { getPuzzle } from "./_lib/puzzles";
import { withinRateLimit } from "./_lib/ratelimit";

const JUDGE_LIMIT_PER_HOUR = 30;

/** "chain:N" → the approved puzzle of day N (never a future day). */
async function findPuzzle(id: string): Promise<Puzzle | null> {
  const m = id.match(/^chain:(\d+)$/);
  if (!m) return null;
  const no = Number(m[1]);
  const sql = getSql();
  if (!sql || no > puzzleNumber()) return null;
  const stored = await getPuzzle(sql, no);
  return stored?.status === "approved" ? fromChain(id, stored.data) : null;
}

export async function POST(req: Request): Promise<Response> {
  const body = await readJson<{
    ruleId?: unknown;
    guess?: unknown;
    row?: unknown;
  }>(req);
  if (
    !body ||
    typeof body.ruleId !== "string" ||
    typeof body.guess !== "string"
  )
    return json({ error: "bad request" }, 400);
  const puzzle = await findPuzzle(body.ruleId);
  if (!puzzle) return json({ error: "unknown puzzle" }, 404);
  const guess = body.guess.trim().slice(0, 200);
  const normalized = normalizeGuess(guess);
  if (!guess || !normalized)
    return json({ verdict: "wrong", hint: "" } satisfies Judgement);

  // The rate limit runs first; then a wording already known to be right is accepted without a model call.
  const sql = getSql();
  const puzzleNo = Number(puzzle.id.split(":")[1]);
  if (sql) {
    try {
      if (
        !(await withinRateLimit(
          sql,
          hashIp(clientIp(req)),
          "judge",
          JUDGE_LIMIT_PER_HOUR,
        ))
      )
        return json({ error: "rate limited" }, 429, { "retry-after": "3600" });
    } catch (err) {
      console.error("rate limit check failed", err);
    }
  }

  let judgement: JudgeResult | null = null;
  const started = Date.now();
  // Same puzzle, same wording (case, punctuation, plurals ignored) → same answer. Only "correct" is
  // remembered, so a wording judged wrong is always judged again.
  if (sql) {
    try {
      const known = (await sql.query(
        "select source from accepted_guesses where puzzle_no = $1 and normalized = $2",
        [puzzleNo, normalized],
      )) as {
        source: string;
      }[];
      if (known[0])
        judgement = {
          verdict: "correct",
          hint: "",
          model:
            known[0].source === "editor"
              ? "accepted by editor"
              : "accepted earlier",
          reason:
            known[0].source === "editor"
              ? "You accepted this wording."
              : "Same wording as a guess already judged correct.",
        };
    } catch (err) {
      console.error(
        "accepted lookup failed (run npm run db:migrate?)",
        (err as Error).message,
      );
    }
  }
  if (!judgement) {
    try {
      judgement = await askGemini(puzzle, guess);
    } catch (err) {
      console.error("judge failed", err);
      return json({ error: "judge unavailable" }, 503);
    }
    if (sql && judgement.verdict === "correct") {
      try {
        await sql.query(
          `insert into accepted_guesses (puzzle_no, normalized, source) values ($1, $2, 'judge') on conflict do nothing`,
          [puzzleNo, normalized],
        );
      } catch (err) {
        console.error("remember accepted failed", (err as Error).message);
      }
    }
  }

  // the desk's Activity page reads this
  let logId: number | undefined;
  if (sql) {
    const row = Number(body.row);
    try {
      const rows = (await sql.query(
        `insert into guess_log (puzzle_no, row_no, guess, verdict, model, reason, p_correct, ms) values ($1, $2, $3, $4, $5, $6, $7, $8)
         returning id`,
        [
          puzzleNo,
          Number.isInteger(row) && row >= 1 && row <= 5 ? row : null,
          guess,
          judgement.verdict,
          judgement.fallbackFrom
            ? `${judgement.model} (fallback from ${judgement.fallbackFrom})`
            : judgement.model,
          judgement.reason || null,
          judgement.pCorrect ?? null,
          Date.now() - started,
        ],
      )) as { id: number | string }[];
      logId = rows[0] ? Number(rows[0].id) : undefined;
    } catch (err) {
      console.error("guess log failed", err);
    }
  }
  // `id` lets the player flag a rejected guess for review (/api/flag)
  return json({
    verdict: judgement.verdict,
    hint: "",
    ...(logId ? { id: logId } : {}),
  } satisfies Judgement & { id?: number });
}
