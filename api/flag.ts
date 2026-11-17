import { getSql } from './_lib/db';
import { clientIp, hashIp, json, readJson } from './_lib/http';
import { withinRateLimit } from './_lib/ratelimit';

const FLAG_LIMIT_PER_HOUR = 10;

/**
 * POST {id}: a player thinks their rejected rule guess was right. Marks it for review on the desk's
 * Activity page. Only guesses from the last two days that weren't judged correct can be flagged.
 */
export async function POST(req: Request): Promise<Response> {
  const body = await readJson<{ id?: unknown }>(req);
  const id = Number(body?.id);
  if (!Number.isInteger(id) || id < 1) return json({ error: 'bad request' }, 400);
  const sql = getSql();
  if (!sql) return json({ ok: false, reason: 'no database' });
  if (!(await withinRateLimit(sql, hashIp(clientIp(req)), 'flag', FLAG_LIMIT_PER_HOUR))) return json({ error: 'rate limited' }, 429);
  const rows = (await sql.query(
    `update guess_log set flagged_at = coalesce(flagged_at, now())
     where id = $1 and verdict <> 'correct' and created_at > now() - interval '2 days'
     returning id`,
    [id],
  )) as { id: number }[];
  return rows.length ? json({ ok: true }) : json({ error: 'not found' }, 404);
}
