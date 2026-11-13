import { puzzleNumber } from '../src/lib/daily';
import { ROWS as CLUE_COUNT } from '../src/lib/puzzle';
import { getSql } from './_lib/db';
import { clientIp, hashIp, json, readJson } from './_lib/http';
import { withinRateLimit } from './_lib/ratelimit';

const RESULT_LIMIT_PER_HOUR = 20;

/** POST {puzzleNo, solvedOnClue}: count one anonymous result. */
export async function POST(req: Request): Promise<Response> {
  const body = await readJson<{ puzzleNo?: unknown; solvedOnClue?: unknown }>(req);
  const puzzleNo = Number(body?.puzzleNo);
  const clue = Number(body?.solvedOnClue);
  const today = puzzleNumber();
  // allow yesterday too, for players finishing around midnight UTC
  if (!Number.isInteger(puzzleNo) || puzzleNo < today - 1 || puzzleNo > today) return json({ error: 'bad puzzle' }, 400);
  if (!Number.isInteger(clue) || clue < 0 || clue > CLUE_COUNT) return json({ error: 'bad clue' }, 400);
  const sql = getSql();
  if (!sql) return json({ ok: false, reason: 'no database' });
  if (!(await withinRateLimit(sql, hashIp(clientIp(req)), 'result', RESULT_LIMIT_PER_HOUR))) return json({ error: 'rate limited' }, 429);
  await sql.query(
    `insert into daily_results (puzzle_no, solved_on_clue, count) values ($1, $2, 1)
     on conflict (puzzle_no, solved_on_clue) do update set count = daily_results.count + 1`,
    [puzzleNo, clue],
  );
  return json({ ok: true });
}

/** GET ?puzzle=N → {counts: [unsolved, clue1..clue5]} */
export async function GET(req: Request): Promise<Response> {
  const puzzleNo = Number(new URL(req.url).searchParams.get('puzzle'));
  if (!Number.isInteger(puzzleNo) || puzzleNo < 1) return json({ error: 'bad puzzle' }, 400);
  const sql = getSql();
  if (!sql) return json({ counts: null });
  const rows = (await sql.query('select solved_on_clue, count from daily_results where puzzle_no = $1', [puzzleNo])) as {
    solved_on_clue: number;
    count: number;
  }[];
  const counts = [0, 0, 0, 0, 0, 0];
  for (const r of rows) counts[Number(r.solved_on_clue)] = Number(r.count);
  return json({ counts }, 200, { 'cache-control': 'public, s-maxage=60, stale-while-revalidate=300' });
}
