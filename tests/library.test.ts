import { describe, expect, it } from 'vitest';
import { validateChain } from '../src/lib/chain';
import { fromChain, ROWS } from '../src/lib/puzzle';
import { LIBRARY } from '../src/puzzles/library';

describe('built-in puzzle library', () => {
  it('has plenty of valid, unique puzzles', () => {
    expect(LIBRARY.length).toBeGreaterThanOrEqual(30);
    expect(new Set(LIBRARY.map((p) => p.id)).size).toBe(LIBRARY.length);
    for (const p of LIBRARY) expect(validateChain(p), p.id).toEqual([]);
  });
  it('every puzzle has 5 rows', () => {
    for (const lib of LIBRARY) expect(fromChain(`lib:${lib.id}`, lib).rows, lib.id).toHaveLength(ROWS);
  });
});
