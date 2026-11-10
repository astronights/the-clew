import { describe, expect, it } from 'vitest';
import { DEFS, getRule, RULES } from '../src/rules';
import type { Item } from '../src/rules/types';

const p = (id: string) => {
  const d = DEFS.get(id);
  if (!d) throw new Error(id);
  return (x: Item) => d.predicate(x);
};

describe('number predicates', () => {
  it('odd digit sum', () => {
    expect(p('num-odd-digit-sum')(12)).toBe(true);
    expect(p('num-odd-digit-sum')(11)).toBe(false);
    expect(p('num-odd-digit-sum')(999)).toBe(true);
  });
  it('contains 7 / repeated digit / last > first', () => {
    expect(p('num-contains-7')(170)).toBe(true);
    expect(p('num-contains-7')(168)).toBe(false);
    expect(p('num-repeated-digit')(121)).toBe(true);
    expect(p('num-repeated-digit')(123)).toBe(false);
    expect(p('num-last-gt-first')(18)).toBe(true);
    expect(p('num-last-gt-first')(7)).toBe(false);
    expect(p('num-last-gt-first')(515)).toBe(false);
  });
  it('decoys: prime and palindrome', () => {
    expect([2, 3, 5, 7, 97].every(p('num-prime'))).toBe(true);
    expect([1, 4, 91, 999].some(p('num-prime'))).toBe(false);
    expect(p('num-palindrome')(121)).toBe(true);
    expect(p('num-palindrome')(120)).toBe(false);
  });
});

describe('sequence predicates', () => {
  it('works on triples', () => {
    expect(p('seq-sum-gt-30')([10, 10, 11])).toBe(true);
    expect(p('seq-sum-gt-30')([10, 10, 10])).toBe(false);
    expect(p('seq-middle-largest')([1, 5, 2])).toBe(true);
    expect(p('seq-middle-largest')([5, 5, 2])).toBe(false);
    expect(p('seq-alternating-parity')([1, 2, 3])).toBe(true);
    expect(p('seq-alternating-parity')([1, 3, 2])).toBe(false);
    expect(p('seq-increasing')([1, 2, 3])).toBe(true);
    expect(p('seq-increasing')([1, 1, 3])).toBe(false);
  });
});

describe('tile predicates', () => {
  const R = (s: 'circle' | 'star' = 'circle') => ({ c: 'R' as const, s });
  const B = (s: 'circle' | 'star' = 'circle') => ({ c: 'B' as const, s });
  it('no adjacent colour', () => {
    expect(p('tile-no-adjacent-colour')([R(), B(), R()])).toBe(true);
    expect(p('tile-no-adjacent-colour')([R(), R(), B()])).toBe(false);
    expect(p('tile-no-adjacent-colour')([R()])).toBe(true);
  });
  it('exactly one star', () => {
    expect(p('tile-one-star')([R('star'), B()])).toBe(true);
    expect(p('tile-one-star')([R('star'), B('star')])).toBe(false);
    expect(p('tile-one-star')([R(), B()])).toBe(false);
  });
});

describe('word predicates', () => {
  it('double letter, two consonants, first before last', () => {
    expect(p('word-double-letter')('apple')).toBe(true);
    expect(p('word-double-letter')('Apple')).toBe(true);
    expect(p('word-double-letter')('plane')).toBe(false);
    expect(p('word-starts-two-consonants')('train')).toBe(true);
    expect(p('word-starts-two-consonants')('tea')).toBe(false);
    expect(p('word-first-before-last')('art')).toBe(true);
    expect(p('word-first-before-last')('zoo')).toBe(false);
  });
});

describe('registry', () => {
  it('has ~40 playable rules across all domains with unique ids', () => {
    expect(RULES.length).toBeGreaterThanOrEqual(40);
    expect(new Set(RULES.map((r) => r.id)).size).toBe(RULES.length);
    for (const d of ['numbers', 'sequences', 'tiles', 'words']) expect(RULES.filter((r) => r.domain === d).length).toBeGreaterThanOrEqual(10);
  });
  it('predicates are deterministic', () => {
    const r = getRule('num-contains-7')!;
    for (let i = 0; i < 50; i++) expect(r.predicate(777)).toBe(true);
  });
});
