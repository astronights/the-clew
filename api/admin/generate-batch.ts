import { puzzleNumber } from '../../src/lib/daily';
import { requireAdmin } from '../_lib/admin';
import { getSql } from '../_lib/db';
import { batchPromptFor, generateBatch } from '../_lib/generator';
import { json, readJson } from '../_lib/http';
import { listPuzzles, recentForAvoid, savePuzzle } from '../_lib/puzzles';

const MAX_DAYS = 8;

/**
 * POST {puzzleNos: number[], extra?, replace?} → writes all of those days in ONE Gemini request and saves
 * each as a draft. Approved days are skipped unless `replace` is true (then they go back to draft).
 * Today's puzzle is never replaced: it may already be live. Allowed up to 300 s (vercel.json).
 */
export async function POST(req: Request): Promise<Response> {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const sql = getSql();
  if (!sql) return json({ error: 'DATABASE_URL is not set.' }, 503);
  const body = await readJson<{ puzzleNos?: unknown; extra?: string; replace?: boolean }>(req);
  const today = puzzleNumber();
  const wanted = Array.isArray(body?.puzzleNos) ? [...new Set(body.puzzleNos.map(Number))].filter((n) => Number.isInteger(n) && n >= today && n <= today + 60) : [];
  if (!wanted.length) return json({ error: 'Pick at least one day from today onwards.' }, 400);
  if (wanted.length > MAX_DAYS) return json({ error: `At most ${MAX_DAYS} days per request.` }, 400);
  const existing = await listPuzzles(sql, Math.min(...wanted), Math.max(...wanted));
  const approved = new Set(existing.filter((p) => p.status === 'approved').map((p) => p.puzzleNo));
  const locked = (n: number) => (body?.replace === true ? n === today && approved.has(n) : approved.has(n));
  const days = wanted.filter((n) => !locked(n)).sort((a, b) => a - b);
  if (!days.length) return json({ written: [], skipped: wanted, message: 'Those days are already approved.' });
  try {
    const items = await generateBatch(days, batchPromptFor(days, await recentForAvoid(sql, days[0], days), body?.extra ?? ''));
    const written = [];
    for (const it of items) written.push({ puzzleNo: it.puzzleNo, ...(await savePuzzle(sql, it.puzzleNo, it.puzzle, 'draft', null)) });
    const missing = days.filter((n) => !items.some((it) => it.puzzleNo === n));
    return json({ written, missing });
  } catch (err) {
    console.error('batch generate failed', err);
    return json({ error: err instanceof Error ? err.message : 'Writing failed.' }, 502);
  }
}
