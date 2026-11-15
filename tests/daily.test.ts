import { describe, expect, it } from 'vitest';
import { dateOfPuzzle, EPOCH_UTC, msUntilNextPuzzle, puzzleNumber } from '../src/lib/daily';

describe('daily picker', () => {
  it('numbers puzzles from the epoch and rolls over at 03:14:15 UTC for everyone', () => {
    expect(puzzleNumber(EPOCH_UTC)).toBe(1);
    expect(puzzleNumber(Date.UTC(2026, 10, 10, 3, 14, 15))).toBe(42);
    expect(puzzleNumber(Date.UTC(2026, 10, 11, 3, 14, 14))).toBe(42);
    expect(puzzleNumber(Date.UTC(2026, 10, 11, 3, 14, 15))).toBe(43);
    expect(puzzleNumber(Date.UTC(2026, 10, 11, 0, 0, 0))).toBe(42);
  });
  it('dates and countdown', () => {
    expect(dateOfPuzzle(1).getTime()).toBe(EPOCH_UTC);
    expect(dateOfPuzzle(42).toISOString().slice(0, 10)).toBe('2026-11-10');
    expect(msUntilNextPuzzle(Date.UTC(2026, 10, 10, 2, 14, 15))).toBe(3_600_000);
    expect(msUntilNextPuzzle(EPOCH_UTC - 60_000)).toBe(60_000);
  });
});
