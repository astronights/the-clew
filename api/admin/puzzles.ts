import { puzzleNumber } from '../../src/lib/daily';
import type { ChainPuzzle, PuzzleStatus } from '../../src/lib/chain';
import { requireAdmin } from '../_lib/admin';
import { getSql } from '../_lib/db';
import { json, readJson } from '../_lib/http';
import { listPuzzles, savePuzzle, setStatus } from '../_lib/puzzles';

/** GET ?from=N&days=7 → saved puzzles in that range (default: today + 6 days). */
export async function GET(req: Request): Promise<Response> {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const sql = getSql();
  if (!sql) return json({ error: 'DATABASE_URL is not set.' }, 503);
  const url = new URL(req.url);
  const today = puzzleNumber();
  const from = Number(url.searchParams.get('from')) || today;
  const days = Math.min(Math.max(Number(url.searchParams.get('days')) || 7, 1), 31);
  return json({ today, from, days, puzzles: await listPuzzles(sql, from, from + days - 1) });
}

type Body =
  | { action: 'approve' | 'reject' | 'unapprove'; puzzleNo: number; note?: string }
  | { action: 'save'; puzzleNo: number; data: ChainPuzzle; note?: string };

/** POST {action, puzzleNo, …}: approve / reject / unapprove, or save edited JSON (as a draft). */
export async function POST(req: Request): Promise<Response> {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const sql = getSql();
  if (!sql) return json({ error: 'DATABASE_URL is not set.' }, 503);
  const body = await readJson<Body>(req, 20_000);
  if (!body || !Number.isInteger(body.puzzleNo)) return json({ error: 'bad request' }, 400);
  if (body.puzzleNo < puzzleNumber()) return json({ error: "Past puzzles can't be changed." }, 400);
  const note = typeof body.note === 'string' ? body.note.slice(0, 500) : null;
  if (body.action === 'save') return json(await savePuzzle(sql, body.puzzleNo, body.data, 'draft', note));
  const next: Record<string, PuzzleStatus> = { approve: 'approved', reject: 'rejected', unapprove: 'draft' };
  if (!(body.action in next)) return json({ error: 'unknown action' }, 400);
  const r = await setStatus(sql, body.puzzleNo, next[body.action], note);
  return 'error' in r ? json(r, 400) : json(r);
}
