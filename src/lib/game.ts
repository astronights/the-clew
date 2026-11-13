import { guessIsRight, ROWS, type Puzzle } from './puzzle';

/** What happened on each clue, for the result screen and the share text. */
export type Outcome = 'next' | 'test' | 'miss' | 'solved';

export type Entry =
  | { kind: 'clue'; index: number }
  /** The player guessed what comes next; row `row` (0-based) opened with it. */
  | { kind: 'test'; item: string; pass: boolean; row: number }
  /** The player named the rule (judged). Only this is scored. */
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
/** Guessing needs a row left to open. */
export const canGuess = (s: GameState) => s.status === 'playing' && s.revealed < ROWS;

function advance(s: GameState, outcome: Outcome): GameState {
  const outcomes = [...s.outcomes, outcome];
  if (s.revealed >= ROWS) return { ...s, outcomes, status: 'failed', solvedOn: 0 };
  return { ...s, outcomes, revealed: s.revealed + 1, entries: [...s.entries, { kind: 'clue', index: s.revealed }] };
}

/** Open the next row without guessing. */
export function next(s: GameState): GameState {
  return canGuess(s) ? advance(s, 'next') : s;
}

/** Guess what comes next: opens the next row, marked right or wrong. Not scored. */
export function guessNext(p: Puzzle, s: GameState, item: string): GameState {
  if (!canGuess(s)) return s;
  const row = s.revealed;
  return advance({ ...s, entries: [...s.entries, { kind: 'test', item, pass: guessIsRight(p, row, item), row }] }, 'test');
}

/** The guess that opened each row, by row index. */
export function guessesByRow(s: GameState): Map<number, Extract<Entry, { kind: 'test' }>> {
  const m = new Map<number, Extract<Entry, { kind: 'test' }>>();
  for (const e of s.entries) if (e.kind === 'test') m.set(e.row, e);
  return m;
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
