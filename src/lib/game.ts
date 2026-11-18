import { ROWS, type Puzzle } from './puzzle';

/**
 * What happened on each clue, for the result screen and the share text.
 * 'test' is from the old "guess what comes next" box; it only appears in games saved before it was removed.
 */
export type Outcome = 'next' | 'test' | 'miss' | 'solved';

export type Entry =
  | { kind: 'clue'; index: number }
  /** The player named the rule (judged). This is what's scored. */
  | { kind: 'guess'; rule: string; correct: boolean };

export type Status = 'playing' | 'solved' | 'failed';

export interface GameState {
  puzzleId: string;
  seed: string;
  /** Rows open (1–ROWS). */
  revealed: number;
  entries: Entry[];
  status: Status;
  /** Row the rule was named on (1–ROWS); 0 when failed. */
  solvedOn: number | null;
  /** outcomes[i] = what the player did while row i+1 was the latest. */
  outcomes: Outcome[];
}

export { ROWS };

export function newGame(p: Puzzle, seed: string): GameState {
  return { puzzleId: p.id, seed, revealed: 1, entries: [{ kind: 'clue', index: 0 }], status: 'playing', solvedOn: null, outcomes: [] };
}

export const isOver = (s: GameState) => s.status !== 'playing';
export const isLastRow = (s: GameState) => s.revealed >= ROWS;
/** Another clue can be opened. */
export const canOpenNext = (s: GameState) => s.status === 'playing' && s.revealed < ROWS;

function advance(s: GameState, outcome: Outcome): GameState {
  const outcomes = [...s.outcomes, outcome];
  if (s.revealed >= ROWS) return { ...s, outcomes, status: 'failed', solvedOn: 0 };
  return { ...s, outcomes, revealed: s.revealed + 1, entries: [...s.entries, { kind: 'clue', index: s.revealed }] };
}

/** Open the next clue (costs a row). */
export function next(s: GameState): GameState {
  return canOpenNext(s) ? advance(s, 'next') : s;
}

/** Name the rule. Right = solved on this row. Wrong = the next row (or the end, on the last one). */
export function guessRule(s: GameState, text: string, correct: boolean): GameState {
  if (s.status !== 'playing') return s;
  const next: GameState = { ...s, entries: [...s.entries, { kind: 'guess', rule: text, correct }] };
  if (correct) return { ...next, outcomes: [...s.outcomes, 'solved'], status: 'solved', solvedOn: s.revealed };
  return advance(next, 'miss');
}

/** Stop and reveal the answer. */
export function giveUp(s: GameState): GameState {
  return s.status === 'playing' ? { ...s, status: 'failed', solvedOn: 0 } : s;
}

/**
 * An appeal on a rejected rule guess was upheld: the game counts as solved on the row the guess was
 * made on (even if the player has opened more clues since, or the game had ended as a miss).
 */
export function upholdRule(s: GameState, row: number): GameState {
  if (s.status === 'solved' && (s.solvedOn ?? 0) <= row) return s;
  if (row < 1 || row > ROWS) return s;
  return { ...s, status: 'solved', solvedOn: row, outcomes: [...s.outcomes.slice(0, row - 1), 'solved'] };
}
