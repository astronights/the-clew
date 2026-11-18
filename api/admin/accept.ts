import { normalizeGuess } from "../../src/lib/fuzzy";
import { requireAdmin } from "../_lib/admin";
import { getSql } from "../_lib/db";
import { json, readJson } from "../_lib/http";

/**
 * POST {id}: the editor agrees a rejected guess was right (usually a flagged one). Its wording is
 * accepted for that puzzle from now on, for every player, without asking the judge.
 */
export async function POST(req: Request): Promise<Response> {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const sql = getSql();
  if (!sql) return json({ error: "DATABASE_URL is not set." }, 503);
  const body = await readJson<{ id?: unknown }>(req);
  const id = Number(body?.id);
  if (!Number.isInteger(id) || id < 1)
    return json({ error: "bad request" }, 400);
  try {
    const rows = (await sql.query(
      "select puzzle_no, guess from guess_log where id = $1",
      [id],
    )) as { puzzle_no: number; guess: string }[];
    if (!rows[0]) return json({ error: "Guess not found." }, 404);
    const normalized = normalizeGuess(rows[0].guess);
    if (!normalized)
      return json({ error: "Nothing to accept in that guess." }, 400);
    await sql.query(
      `insert into accepted_guesses (puzzle_no, normalized, source) values ($1, $2, 'editor')
       on conflict (puzzle_no, normalized) do update set source = 'editor'`,
      [Number(rows[0].puzzle_no), normalized],
    );
    await sql.query(
      "update guess_log set accepted_at = coalesce(accepted_at, now()) where id = $1",
      [id],
    );
    return json({ ok: true, normalized });
  } catch (err) {
    const m = (err as Error).message ?? "";
    if (/accepted/.test(m))
      return json(
        {
          error: "Run npm run db:migrate first (accepted_guesses is missing).",
        },
        503,
      );
    console.error("accept failed", err);
    return json({ error: `Accept failed: ${m}` }, 500);
  }
}
