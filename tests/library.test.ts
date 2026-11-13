import { describe, expect, it } from 'vitest';
import { validateChain } from '../src/lib/chain';
import { fromChain, guessIsRight, ROWS } from '../src/lib/puzzle';
import { LIBRARY } from '../src/puzzles/library';

describe('built-in puzzle library', () => {
  it('has plenty of valid, unique puzzles', () => {
    expect(LIBRARY.length).toBeGreaterThanOrEqual(30);
    expect(new Set(LIBRARY.map((p) => p.id)).size).toBe(LIBRARY.length);
    for (const p of LIBRARY) expect(validateChain(p), p.id).toEqual([]);
  });
  it('every row accepts its own text and the answer is accepted in the last row', () => {
    for (const lib of LIBRARY) {
      const p = fromChain(`lib:${lib.id}`, lib);
      expect(p.rows).toHaveLength(ROWS);
      for (let r = 1; r < ROWS; r++) expect(guessIsRight(p, r, p.rows[r]), `${lib.id} row ${r + 1}`).toBe(true);
      for (const a of lib.acceptedAnswers) expect(guessIsRight(p, ROWS - 1, a), `${lib.id}: ${a}`).toBe(true);
    }
  });
  it('a row never accepts the previous row', () => {
    for (const lib of LIBRARY) {
      const p = fromChain(`lib:${lib.id}`, lib);
      for (let r = 1; r < ROWS; r++) expect(guessIsRight(p, r, p.rows[r - 1]), `${lib.id} row ${r + 1}`).toBe(false);
    }
  });
});
