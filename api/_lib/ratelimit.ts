import type { NeonQueryFunction } from '@neondatabase/serverless';

/** Increments the hourly counter for this IP hash and returns whether it is within `limit`. */
export async function withinRateLimit(
  sql: NeonQueryFunction<false, false>,
  ipHash: string,
  bucket: string,
  limit: number,
  now = new Date(),
): Promise<boolean> {
  const window = `${bucket}:${now.toISOString().slice(0, 13)}`; // e.g. judge:2026-11-10T09
  const rows = (await sql.query(
    `insert into rate_limit (ip_hash, "window", count) values ($1, $2, 1)
     on conflict (ip_hash, "window") do update set count = rate_limit.count + 1, updated_at = now()
     returning count`,
    [ipHash, window],
  )) as { count: number }[];
  // occasional cleanup of old windows
  if (Math.random() < 0.02) await sql.query(`delete from rate_limit where updated_at < now() - interval '1 day'`);
  return Number(rows[0]?.count ?? 0) <= limit;
}
