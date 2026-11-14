import { puzzleNumber } from '../../src/lib/daily';
import type { ChainPuzzle } from '../../src/lib/chain';
import { requireAdmin } from '../_lib/admin';
import { getSql } from '../_lib/db';
import { generatePuzzle, revisePromptFor } from '../_lib/generator';
import { json, readJson } from '../_lib/http';
import { getPuzzle, recentForAvoid, savePuzzle } from '../_lib/puzzles';

/**
 * POST {puzzleNo, instruction, data?} → asks Gemini to change the puzzle as instructed
 * ("make clue 1 harder", "use football instead") and saves the result as a draft.
 * `data` lets the desk send unsaved edits; otherwise the stored puzzle is used.
 */
export async function POST(req: Request): Promise<Response> {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const sql = getSql();
  if (!sql) return json({ error: 'DATABASE_URL is not set.' }, 503);
  const body = await readJson<{ puzzleNo?: number; instruction?: string; data?: ChainPuzzle }>(req, 20_000);
  const no = Number(body?.puzzleNo);
  const instruction = String(body?.instruction ?? '').trim();
  if (!Number.isInteger(no) || no < puzzleNumber()) return json({ error: "Past puzzles can't be changed." }, 400);
  if (instruction.length < 3) return json({ error: 'Say what to change.' }, 400);
  const current = body?.data ?? (await getPuzzle(sql, no))?.data;
  if (!current) return json({ error: 'Nothing to revise yet. Write or copy a puzzle for this day first.' }, 404);
  try {
    const { puzzle } = await generatePuzzle(revisePromptFor(no, current, instruction, await recentForAvoid(sql, no)));
    const saved = await savePuzzle(sql, no, puzzle, 'draft', null);
    return json({ puzzleNo: no, puzzle, ...saved });
  } catch (err) {
    console.error('revise failed', err);
    return json({ error: err instanceof Error ? err.message : 'Revision failed.' }, 502);
  }
}
