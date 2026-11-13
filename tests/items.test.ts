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
