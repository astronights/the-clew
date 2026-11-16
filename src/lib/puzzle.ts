import type { ChainPuzzle } from './chain';

/** Rows per puzzle: 5 items, the last is the answer. Row 1 is shown; each guess opens the next. */
export const ROWS = 5;

/** A playable "what comes next" puzzle, from the built-in library or an approved AI puzzle. */
export interface Puzzle {
  /** "lib:<id>" or "chain:<puzzleNo>" — also used by the judge and the verdict cache. */
  id: string;
  connection: string;
  /** ROWS items in order. */
  rows: string[];
  explanation: string;
  category: string;
  difficulty: number;
}

export function fromChain(id: string, c: ChainPuzzle): Puzzle {
  return {
    id,
    connection: c.connection,
    rows: [...c.clues],
    explanation: c.explanation,
    category: c.category,
    difficulty: c.difficulty,
  };
}

