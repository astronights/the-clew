import { describe, expect, it } from 'vitest';
import { dateOfPuzzle, EPOCH_UTC, libraryPuzzleFor, msUntilNextPuzzle, puzzleNumber } from '../src/lib/daily';
import { LIBRARY } from '../src/puzzles/library';

describe('daily picker', () => {
  it('numbers puzzles from the epoch and resets at 00:00 UTC', () => {
    expect(puzzleNumber(EPOCH_UTC)).toBe(1);
    expect(puzzleNumber(Date.UTC(2026, 10, 10, 0, 0, 0))).toBe(42);
    expect(puzzleNumber(Date.UTC(2026, 10, 10, 23, 59, 59))).toBe(42);
    expect(puzzleNumber(Date.UTC(2026, 10, 11, 0, 0, 0))).toBe(43);
  });
  it('is deterministic', () => {
    for (let n = 1; n < 200; n++) expect(libraryPuzzleFor(n).id).toBe(libraryPuzzleFor(n).id);
  });
  it('plays every built-in puzzle before repeating, never back-to-back', () => {
    const ids = Array.from({ length: LIBRARY.length * 3 }, (_, i) => libraryPuzzleFor(i + 1).id);
    for (let start = 0; start < ids.length; start += LIBRARY.length) expect(new Set(ids.slice(start, start + LIBRARY.length)).size).toBe(LIBRARY.length);
    for (let i = 1; i < ids.length; i++) expect(ids[i]).not.toBe(ids[i - 1]);
  });
  it('dates and countdown', () => {
    expect(dateOfPuzzle(1).getTime()).toBe(EPOCH_UTC);
    expect(msUntilNextPuzzle(Date.UTC(2026, 10, 10, 23, 0))).toBe(3_600_000);
  });
});
