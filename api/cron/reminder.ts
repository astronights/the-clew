import { dateOfPuzzle, puzzleNumber } from '../../src/lib/daily';
import { getSql } from '../_lib/db';
import { json } from '../_lib/http';
import { listPuzzles } from '../_lib/puzzles';
import { sendToAll, type PushPayload } from '../_lib/push';

/** Which reminder (if any) to send, given today's puzzle number and which upcoming days are approved. */
export function reminderFor(today: number, approved: Set<number>): PushPayload | null {
  const week = Array.from({ length: 7 }, (_, i) => today + 1 + i);
  const missing = week.filter((n) => !approved.has(n));
  const tomorrowMissing = missing.includes(today + 1);
  const isSunday = dateOfPuzzle(today).getUTCDay() === 0;
  const day = (n: number) => dateOfPuzzle(n).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' });
  if (tomorrowMissing)
    return {
      title: "Tomorrow's puzzle isn't approved",
      body: missing.length > 1 ? `Tomorrow and ${missing.length - 1} more day${missing.length > 2 ? 's' : ''} this week still need a puzzle.` : 'Open the desk to write or approve it.',
      url: '/admin',
      tag: 'urgent',
    };
  if (isSunday)
    return missing.length
      ? { title: 'Puzzles for the week', body: `${missing.length} of the next 7 days need a puzzle: ${missing.map(day).join(', ')}.`, url: '/admin', tag: 'weekly' }
      : { title: 'All set for the week', body: 'Every day for the next 7 days has an approved puzzle.', url: '/admin', tag: 'weekly' };
  return null;
}

/**
 * Daily check (Vercel Cron, see vercel.json). Vercel sends `Authorization: Bearer $CRON_SECRET`.
 * Sundays: a weekly summary. Any day: an urgent nudge if tomorrow has no approved puzzle.
 */
export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return json({ error: 'unauthorized' }, 401);
  const sql = getSql();
  if (!sql) return json({ error: 'DATABASE_URL is not set.' }, 503);
  const today = puzzleNumber();
  const rows = await listPuzzles(sql, today + 1, today + 7);
  const payload = reminderFor(today, new Set(rows.filter((r) => r.status === 'approved').map((r) => r.puzzleNo)));
  if (!payload) return json({ sent: 0, reason: 'nothing to remind' });
  try {
    return json({ ...(await sendToAll(sql, payload)), payload });
  } catch (err) {
    return json({ error: (err as Error).message }, 503);
  }
}
