import type { NeonQueryFunction } from '@neondatabase/serverless';
import { validateChain, type ChainPuzzle, type PuzzleStatus, type StoredPuzzle } from '../../src/lib/chain';
import { dateOfPuzzle } from '../../src/lib/daily';

type Sql = NeonQueryFunction<false, false>;
interface Row {
  puzzle_no: number;
  puzzle_date: string | Date;
  status: PuzzleStatus;
  data: ChainPuzzle;
  errors: string[];
  note: string | null;
  updated_at: string | Date;
}

const toStored = (r: Row): StoredPuzzle => ({
  puzzleNo: Number(r.puzzle_no),
  date: new Date(r.puzzle_date).toISOString().slice(0, 10),
  status: r.status,
  data: r.data,
  errors: r.errors ?? [],
  note: r.note,
  updatedAt: new Date(r.updated_at).toISOString(),
});

export async function getPuzzle(sql: Sql, puzzleNo: number): Promise<StoredPuzzle | null> {
  const rows = (await sql.query('select * from puzzles where puzzle_no = $1', [puzzleNo])) as Row[];
  return rows[0] ? toStored(rows[0]) : null;
}

export async function listPuzzles(sql: Sql, from: number, to: number): Promise<StoredPuzzle[]> {
  const rows = (await sql.query('select * from puzzles where puzzle_no between $1 and $2 order by puzzle_no', [from, to])) as Row[];
  return rows.map(toStored);
}

/** Save a puzzle (new or edited). Saving always re-runs the checks; approval is kept only if still valid. */
export async function savePuzzle(sql: Sql, puzzleNo: number, data: ChainPuzzle, status: PuzzleStatus, note: string | null = null) {
  const errors = validateChain(data);
  const finalStatus: PuzzleStatus = status === 'approved' && errors.length ? 'draft' : status;
  const date = dateOfPuzzle(puzzleNo).toISOString().slice(0, 10);
  await sql.query(
    `insert into puzzles (puzzle_no, puzzle_date, status, data, errors, note, updated_at)
     values ($1, $2, $3, $4::jsonb, $5::jsonb, $6, now())
     on conflict (puzzle_no) do update set status = excluded.status, data = excluded.data, errors = excluded.errors,
       note = coalesce(excluded.note, puzzles.note), updated_at = now()`,
    [puzzleNo, date, finalStatus, JSON.stringify(data), JSON.stringify(errors), note],
  );
  return { status: finalStatus, errors };
}

export async function setStatus(sql: Sql, puzzleNo: number, status: PuzzleStatus, note: string | null) {
  const p = await getPuzzle(sql, puzzleNo);
  if (!p) return { error: 'No puzzle saved for that day.' };
  if (status === 'approved' && p.errors.length) return { error: `Fix these first: ${p.errors.join('; ')}` };
  await sql.query('update puzzles set status = $2, note = coalesce($3, note), updated_at = now() where puzzle_no = $1', [puzzleNo, status, note]);
  return { ok: true };
}

/** Connections and categories to steer the generator away from repeats. */
export async function recentForAvoid(sql: Sql, around: number): Promise<string[]> {
  const rows = (await sql.query(
    `select puzzle_no, data->>'connection' as connection, data->>'category' as category from puzzles
     where puzzle_no between $1 and $2 and status <> 'rejected' order by puzzle_no`,
    [around - 60, around + 14],
  )) as { puzzle_no: number; connection: string; category: string }[];
  return rows.filter((r) => Number(r.puzzle_no) !== around).map((r) => `- ${r.connection} (${r.category})`);
}
