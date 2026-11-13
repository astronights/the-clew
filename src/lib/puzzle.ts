import { matchesRow } from './answer';
import type { ChainPuzzle } from './chain';

/** Rows per puzzle: 4 clues + the answer. Row 1 is shown; each guess opens the next. */
export const ROWS = 5;

/** A playable "what comes next" puzzle, from the built-in library or an approved AI puzzle. */
export interface Puzzle {
  /** "lib:<id>" or "chain:<puzzleNo>" — also used by the judge and the verdict cache. */
  id: string;
  connection: string;
  acceptedPhrasings: string[];
  /** ROWS items in order. */
  rows: string[];
  /** What a player may type for each row. */
  rowAnswers: string[][];
  explanation: string;
  category: string;
  difficulty: number;
}

export function fromChain(id: string, c: ChainPuzzle): Puzzle {
  return {
    id,
    connection: c.connection,
    acceptedPhrasings: c.acceptedPhrasings,
    rows: [...c.clues, c.answer],
    rowAnswers: [...c.clues.map((clue, i) => [clue, ...(c.clueAnswers?.[i] ?? [])]), [c.answer, ...c.acceptedAnswers]],
    explanation: c.explanation,
    category: c.category,
    difficulty: c.difficulty,
  };
}

/** Did the player guess the item in `row`? Checked by code, never AI. */
export function guessIsRight(p: Puzzle, row: number, guess: string): boolean {
  const accepted = p.rowAnswers[row] ?? [p.rows[row]];
  const explicit = row === ROWS - 1 || accepted.length > 1;
  return matchesRow(accepted, guess, explicit);
}
