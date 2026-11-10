import { describe, expect, it } from 'vitest';
import { dateOfPuzzle, domainOfPuzzle, EPOCH_UTC, msUntilNextPuzzle, pastRules, puzzleNumber, ruleForPuzzle } from '../src/lib/daily';
import { rulesForDomain } from '../src/rules';

describe('daily picker', () => {
  it('numbers puzzles from the epoch and resets at 00:00 UTC', () => {
    expect(puzzleNumber(EPOCH_UTC)).toBe(1);
    expect(puzzleNumber(Date.UTC(2026, 10, 10, 0, 0, 0))).toBe(42);
    expect(puzzleNumber(Date.UTC(2026, 10, 10, 23, 59, 59))).toBe(42);
    expect(puzzleNumber(Date.UTC(2026, 10, 11, 0, 0, 0))).toBe(43);
  });
  it('maps weekdays to domains', () => {
    // 2026-11-09 is a Monday
    expect(domainOfPuzzle(puzzleNumber(Date.UTC(2026, 10, 9)))).toBe('numbers');
    expect(domainOfPuzzle(puzzleNumber(Date.UTC(2026, 10, 10)))).toBe('sequences');
    expect(domainOfPuzzle(puzzleNumber(Date.UTC(2026, 10, 11)))).toBe('tiles');
    expect(domainOfPuzzle(puzzleNumber(Date.UTC(2026, 10, 12)))).toBe('words');
  });
  it('is deterministic and matches the puzzle domain', () => {
    for (let n = 1; n < 200; n++) {
      const r = ruleForPuzzle(n);
      expect(r.id).toBe(ruleForPuzzle(n).id);
      expect(r.domain).toBe(domainOfPuzzle(n));
    }
  });
  it('cycles through every rule in a domain before repeating, never back-to-back', () => {
    const byDomain = new Map<string, string[]>();
    for (let n = 1; n <= 400; n++) {
      const r = ruleForPuzzle(n);
      byDomain.set(r.domain, [...(byDomain.get(r.domain) ?? []), r.id]);
    }
    for (const [domain, ids] of byDomain) {
      const size = rulesForDomain(domain as never).length;
      for (let start = 0; start + size <= ids.length; start += size) {
        expect(new Set(ids.slice(start, start + size)).size).toBe(size);
      }
      for (let i = 1; i < ids.length; i++) expect(ids[i]).not.toBe(ids[i - 1]);
    }
  });
  it('past rules exclude today', () => {
    const past = pastRules(42);
    expect(past.length).toBeGreaterThan(0);
    expect(past.some((p) => p.rule.id === ruleForPuzzle(42).id)).toBe(false);
    expect(past.every((p) => p.puzzleNo < 42)).toBe(true);
  });
  it('dates and countdown', () => {
    expect(dateOfPuzzle(1).getTime()).toBe(EPOCH_UTC);
    expect(msUntilNextPuzzle(Date.UTC(2026, 10, 10, 23, 0))).toBe(3_600_000);
  });
});
