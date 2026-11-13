import { puzzleNumber } from '../src/lib/daily';
import { getSql } from './_lib/db';
import { json } from './_lib/http';
import { getPuzzle } from './_lib/puzzles';

/**
 * GET ?no=N → the approved AI puzzle for day N, or 404 (play the built-in rule).
 * Future days are never served, so upcoming puzzles can't be peeked at.
 */
export async function GET(req: Request): Promise<Response> {
  const no = Number(new URL(req.url).searchParams.get('no'));
  if (!Number.isInteger(no) || no < 1) return json({ error: 'bad puzzle' }, 400);
  if (no > puzzleNumber()) return json({ error: 'not yet' }, 404);
  const sql = getSql();
  if (!sql) return json({ error: 'none' }, 404);
  try {
    const p = await getPuzzle(sql, no);
    if (!p || p.status !== 'approved') return json({ error: 'none' }, 404);
    const { connection, acceptedPhrasings, clues, clueAnswers, answer, acceptedAnswers, explanation, category, difficulty } = p.data;
    return json(
      { puzzleNo: no, puzzle: { connection, acceptedPhrasings, clues, clueAnswers, answer, acceptedAnswers, explanation, category, difficulty } },
      200,
      { 'cache-control': 'public, s-maxage=300, stale-while-revalidate=600' },
    );
  } catch (err) {
    console.error('puzzle read failed', err);
    return json({ error: 'none' }, 404);
  }
}
