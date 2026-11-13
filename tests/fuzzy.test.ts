import { describe, expect, it } from 'vitest';
import { matchesAnyPhrasing, normalizeGuess, similarity, tokenize } from '../src/lib/fuzzy';
import { LIBRARY } from '../src/puzzles/library';

const phr = (id: string) => {
  const p = LIBRARY.find((x) => x.id === id)!;
  return [p.connection, ...p.acceptedPhrasings];
};

describe('normalisation', () => {
  it('lowercases, drops stopwords and punctuation, maps number words', () => {
    expect(tokenize('The planets, in ORDER!')).toEqual(['planet', 'order']);
    expect(normalizeGuess('  Powers of TWO. ')).toBe('power 2');
  });
  it('keeps negations', () => {
    expect(tokenize("adjacent tiles can't be the same colour")).toContain('not');
  });
});

describe('matching accepted phrasings', () => {
  it('accepts paraphrases', () => {
    expect(matchesAnyPhrasing('the planets in order', phr('planets-disguised'))).toBe(true);
    expect(matchesAnyPhrasing('Greek alphabet', phr('greek-letters'))).toBe(true);
    expect(matchesAnyPhrasing('the bond actors in order', phr('bond-actors'))).toBe(true);
    expect(matchesAnyPhrasing('fibonacci numbers', phr('fibonacci'))).toBe(true);
  });
  it('tolerates small typos', () => {
    expect(matchesAnyPhrasing('fibonaci sequence', phr('fibonacci'))).toBe(true);
  });
  it('rejects different numbers and padding', () => {
    expect(matchesAnyPhrasing('powers of 3', phr('powers-of-two'))).toBe(false);
    expect(similarity('planets in order and also moons and stars', 'planets in order')).toBeLessThan(0.75);
  });
  it('every puzzle matches its own phrasings', () => {
    for (const p of LIBRARY) for (const a of p.acceptedPhrasings) expect(matchesAnyPhrasing(a, phr(p.id)), `${p.id}: ${a}`).toBe(true);
  });
});
