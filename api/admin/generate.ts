import { puzzleNumber } from '../../src/lib/daily';
import { requireAdmin } from '../_lib/admin';
import { getSql } from '../_lib/db';
import { generatePuzzle, promptFor } from '../_lib/generator';
import { json, readJson } from '../_lib/http';
import { getPuzzle, recentForAvoid, savePuzzle } from '../_lib/puzzles';

/**
 * POST {puzzleNo, extra?, replace?} → drafts one puzzle with Gemini + Google Search and saves it.
 * One puzzle per call keeps each request well inside function time limits; the admin page loops over the week.
 * Approved puzzles are never overwritten unless `replace` is true.
 */
export async function POST(req: Request): Promise<Response> {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const sql = getSql();
  if (!sql) return json({ error: 'DATABASE_URL is not set.' }, 503);
  const body = await readJson<{ puzzleNo?: number; extra?: string; replace?: boolean }>(req);
  const no = Number(body?.puzzleNo);
  if (!Number.isInteger(no) || no < puzzleNumber() || no > puzzleNumber() + 60) return json({ error: 'Pick a day from today up to 60 days ahead.' }, 400);
  const existing = await getPuzzle(sql, no);
  if (existing?.status === 'approved' && !body?.replace) return json({ error: 'Already approved. Unapprove it first to regenerate.' }, 409);
  try {
    const prompt = promptFor(no, await recentForAvoid(sql, no), body?.extra ?? '');
    const { puzzle } = await generatePuzzle(prompt);
    const saved = await savePuzzle(sql, no, puzzle, 'draft', null);
    return json({ puzzleNo: no, puzzle, ...saved });
  } catch (err) {
    console.error('generate failed', err);
    return json({ error: err instanceof Error ? err.message : 'Generation failed.' }, 502);
  }
}
