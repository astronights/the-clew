import { describe, expect, it } from 'vitest';
import { matchesAnyPhrasing } from '../src/lib/fuzzy';
import { normalizeWord, RULE_EXAMPLE, validateItem } from '../src/lib/items';
import { RULES } from '../src/rules';

describe('word input clean-up', () => {
  it('lowercases, drops accents and ignores spaces, hyphens and apostrophes', () => {
    expect(normalizeWord('Café')).toEqual({ word: 'cafe', rejected: [] });
    expect(normalizeWord('  NAÏVE ')).toEqual({ word: 'naive', rejected: [] });
    expect(normalizeWord("rock-'n roll")).toEqual({ word: 'rocknroll', rejected: [] });
    expect(normalizeWord('Straße').word).toBe('strasse');
  });
  it('reports characters it cannot use instead of silently dropping them', () => {
    expect(normalizeWord('b4by').rejected).toEqual(['4']);
    expect(normalizeWord('hi🙂').rejected).toEqual(['🙂']);
    expect(normalizeWord('日本').rejected.length).toBe(2);
  });
  it('cleaned words pass validation', () => {
    expect(validateItem('words', normalizeWord('Crème').word)).toBeNull();
  });
});

describe('rule placeholder examples', () => {
  it('never match a real rule of that domain', () => {
    for (const r of RULES) expect(matchesAnyPhrasing(RULE_EXAMPLE[r.domain], r.acceptedPhrasings), r.id).toBe(false);
  });
});

import { parseItem } from '../src/lib/items';

describe('free-text tests', () => {
  it('read numbers', () => {
    expect(parseItem('numbers', ' 35 ')).toEqual({ item: 35, error: null });
    expect(parseItem('numbers', '1,000').error).toMatch(/1 to 999/);
    expect(parseItem('numbers', 'abc').error).toMatch(/whole number/);
  });
  it('read three numbers however they are separated', () => {
    expect(parseItem('sequences', '3, 8, 12').item).toEqual([3, 8, 12]);
    expect(parseItem('sequences', '3 8 12').item).toEqual([3, 8, 12]);
    expect(parseItem('sequences', '3-8-12').item).toEqual([3, 8, 12]);
    expect(parseItem('sequences', '3, 8').error).toMatch(/three numbers/);
  });
  it('read tiles from words or emoji', () => {
    expect(parseItem('tiles', 'red star, blue circle').item).toEqual([
      { c: 'R', s: 'star' },
      { c: 'B', s: 'circle' },
    ]);
    expect(parseItem('tiles', '🔴★ 🟢■').item).toEqual([
      { c: 'R', s: 'star' },
      { c: 'G', s: 'square' },
    ]);
    expect(parseItem('tiles', 'Yellow Triangle and green square').item).toHaveLength(2);
    expect(parseItem('tiles', 'red').error).toMatch(/needs a shape/);
    expect(parseItem('tiles', 'star').error).toMatch(/colour first/);
    expect(parseItem('tiles', 'purple star').error).toMatch(/don't know/);
  });
  it('read words and free answers', () => {
    expect(parseItem('words', 'Café').item).toBe('cafe');
    expect(parseItem('words', 'b4by').error).toMatch(/Letters only/);
    expect(parseItem('chain', 'Apollo 11').item).toBe('Apollo 11');
  });
  it('treat an empty box as "nothing typed"', () => {
    for (const d of ['numbers', 'sequences', 'tiles', 'words', 'chain'] as const) expect(parseItem(d, '  ')).toEqual({ item: null, error: null });
  });
});
