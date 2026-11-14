import { describe, expect, it } from 'vitest';
import { dateOfPuzzle, EPOCH_UTC, msUntilNextPuzzle, puzzleNumber } from '../src/lib/daily';

describe('daily picker', () => {
  it('numbers puzzles from the epoch and resets at 00:00 UTC', () => {
    expect(puzzleNumber(EPOCH_UTC)).toBe(1);
    expect(puzzleNumber(Date.UTC(2026, 10, 10, 0, 0, 0))).toBe(42);
    expect(puzzleNumber(Date.UTC(2026, 10, 10, 23, 59, 59))).toBe(42);
    expect(puzzleNumber(Date.UTC(2026, 10, 11, 0, 0, 0))).toBe(43);
  });
  it('dates and countdown', () => {
    expect(dateOfPuzzle(1).getTime()).toBe(EPOCH_UTC);
    expect(msUntilNextPuzzle(Date.UTC(2026, 10, 10, 23, 0))).toBe(3_600_000);
  });
});
