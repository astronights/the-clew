import { describe, expect, it } from 'vitest';
import { matchesAnyPhrasing, normalizeGuess, similarity, tokenize } from '../src/lib/fuzzy';
const PHRASINGS: Record<string, string[]> = {
  'planets-disguised': ['Planets in order from the Sun', 'planets in order', 'planets from the sun', 'order of the planets'],
  'greek-letters': ['Greek letters in alphabetical order', 'greek letters', 'greek alphabet'],
  'bond-actors': ['James Bond actors in order', 'bond actors', 'actors who played james bond'],
  fibonacci: ['The Fibonacci sequence', 'fibonacci numbers', 'fibonacci sequence'],
  'powers-of-two': ['Powers of two', 'powers of 2', 'doubling'],
};
const phr = (id: string) => PHRASINGS[id];

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
});
