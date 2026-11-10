import { describe, expect, it } from 'vitest';
import { matchesAnyPhrasing, normalizeGuess, similarity, tokenize } from '../src/lib/fuzzy';
import { getRule, RULES } from '../src/rules';

const phr = (id: string) => getRule(id)!.acceptedPhrasings;

describe('normalisation', () => {
  it('lowercases, drops stopwords and punctuation, maps number words', () => {
    expect(tokenize('The digits add up to an ODD number!')).toEqual(['digit', 'add', 'up', 'odd']);
    expect(tokenize('greater than five hundred')).toEqual(['greater', '500']);
    expect(normalizeGuess('  Contains a SEVEN. ')).toBe('contain 7');
  });
  it('keeps negations and turns contractions into "not"', () => {
    expect(tokenize("adjacent tiles can't be the same colour")).toContain('not');
    expect(tokenize('no two neighbours match')).toContain('not');
  });
  it('recognises single letters', () => {
    expect(tokenize('contains the letter e')).toEqual(['contain', 'L_e']);
    expect(tokenize('has an a in it')).toEqual(['contain', 'L_a']);
  });
});

describe('matching accepted phrasings', () => {
  it('accepts paraphrases at ≥ 0.75 overlap', () => {
    expect(matchesAnyPhrasing('the sum of the digits is odd', phr('num-odd-digit-sum'))).toBe(true);
    expect(matchesAnyPhrasing('Digit sum is odd', phr('num-odd-digit-sum'))).toBe(true);
    expect(matchesAnyPhrasing('number contains seven', phr('num-contains-7'))).toBe(true);
    expect(matchesAnyPhrasing('bigger than 500', phr('num-over-500'))).toBe(true);
    expect(matchesAnyPhrasing('neighbouring tiles are never the same colour', phr('tile-no-adjacent-colour'))).toBe(true);
    expect(matchesAnyPhrasing('word has a double letter', phr('word-double-letter'))).toBe(true);
  });
  it('tolerates small typos', () => {
    expect(matchesAnyPhrasing('contians a 7', phr('num-contains-7'))).toBe(true);
    expect(matchesAnyPhrasing('mulitple of 3', phr('num-multiple-of-3'))).toBe(true);
  });
  it('rejects different numbers, letters and negations', () => {
    expect(matchesAnyPhrasing('multiple of 5', phr('num-multiple-of-3'))).toBe(false);
    expect(matchesAnyPhrasing('contains an e', phr('word-has-a'))).toBe(false);
    expect(matchesAnyPhrasing('adjacent tiles are the same colour', phr('tile-no-adjacent-colour'))).toBe(false);
    expect(matchesAnyPhrasing('odd number', phr('num-even'))).toBe(false);
    expect(matchesAnyPhrasing('greater than 300', phr('num-over-500'))).toBe(false);
  });
  it('penalises padding with unrelated words', () => {
    expect(similarity('contains a 7 and is prime and odd', 'contains a 7')).toBeLessThan(0.75);
  });
  it('every rule matches its own phrasings and description-like text', () => {
    for (const r of RULES) for (const p of r.acceptedPhrasings) expect(matchesAnyPhrasing(p, r.acceptedPhrasings)).toBe(true);
  });
  it("a rule's phrasings do not match its decoys' rules", () => {
    for (const r of RULES) {
      for (const id of r.decoyRuleIds) {
        const other = getRule(id);
        if (!other) continue;
        for (const p of other.acceptedPhrasings) expect(matchesAnyPhrasing(p, r.acceptedPhrasings), `${p} vs ${r.id}`).toBe(false);
      }
    }
  });
});
