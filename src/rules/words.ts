import type { DecoySpec, RuleSpec } from './types';

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);
const w = (s: string) => s.toLowerCase();
const vowelCount = (s: string) => [...w(s)].filter((c) => VOWELS.has(c)).length;

export const wordRules: RuleSpec<'words'>[] = [
  {
    id: 'word-double-letter',
    description: 'The word has a double letter (the same letter twice in a row).',
    predicate: (s) => /(.)\1/.test(w(s)),
    acceptedPhrasings: ['double letter', 'has a double letter', 'same letter twice in a row', 'two identical letters next to each other', 'repeated letter side by side'],
    decoys: ['word-repeated-letter', 'word-double-o-or-e', 'word-has-e', 'word-long', 'word-ends-vowel', 'word-same-first-last'],
  },
  {
    id: 'word-starts-two-consonants',
    description: 'The word starts with two consonants (Y counts as a consonant).',
    predicate: (s) => !VOWELS.has(w(s)[0]) && !VOWELS.has(w(s)[1] ?? 'a'),
    acceptedPhrasings: [
      'starts with two consonants',
      'first two letters are consonants',
      'begins with two consonants',
      'no vowel in the first two letters',
      'starts with a consonant cluster',
    ],
    decoys: ['word-starts-vowel', 'word-ends-vowel', 'word-first-half', 'word-short', 'word-has-a', 'word-two-vowels'],
  },
  {
    id: 'word-ends-vowel',
    description: 'The word ends with a vowel.',
    predicate: (s) => VOWELS.has(w(s)[w(s).length - 1]),
    acceptedPhrasings: ['ends with a vowel', 'last letter is a vowel', 'finishes with a vowel', 'vowel at the end'],
    decoys: ['word-ends-e', 'word-starts-vowel', 'word-has-e', 'word-three-vowels', 'word-even-length', 'word-double-letter'],
  },
  {
    id: 'word-five-letters',
    description: 'The word has exactly five letters.',
    predicate: (s) => s.length === 5,
    acceptedPhrasings: ['five letters', 'exactly five letters', '5 letter word', 'has 5 letters', 'five letters long'],
    decoys: ['word-long', 'word-two-vowels', 'word-has-e', 'word-ends-vowel', 'word-repeated-letter', 'word-has-a'],
  },
  {
    id: 'word-has-e',
    description: 'The word contains the letter E.',
    predicate: (s) => w(s).includes('e'),
    acceptedPhrasings: ['contains an e', 'has the letter e', 'has an e in it', 'includes e', 'letter e appears'],
    decoys: ['word-ends-e', 'word-has-a', 'word-double-o-or-e', 'word-three-vowels', 'word-two-vowels', 'word-long'],
  },
  {
    id: 'word-first-half',
    description: 'The word starts with a letter from A to M.',
    predicate: (s) => w(s)[0] >= 'a' && w(s)[0] <= 'm',
    acceptedPhrasings: [
      'starts with a letter from a to m',
      'first letter in the first half of the alphabet',
      'begins with a to m',
      'first letter before n',
      'starts in the first half of the alphabet',
    ],
    decoys: ['word-starts-vowel', 'word-first-before-last', 'word-has-a', 'word-starts-a', 'word-five-letters', 'word-short'],
  },
  {
    id: 'word-repeated-letter',
    description: 'Some letter appears more than once.',
    predicate: (s) => new Set(w(s)).size < s.length,
    acceptedPhrasings: ['a letter repeats', 'some letter appears twice', 'repeated letter', 'has the same letter more than once', 'not all letters different'],
    decoys: ['word-double-letter', 'word-long', 'word-three-vowels', 'word-has-e', 'word-same-first-last', 'word-even-length'],
  },
  {
    id: 'word-first-before-last',
    description: 'The first letter comes before the last letter in the alphabet.',
    predicate: (s) => w(s)[0] < w(s)[w(s).length - 1],
    acceptedPhrasings: [
      'first letter comes before the last letter in the alphabet',
      'first letter earlier in the alphabet than the last',
      'last letter later in the alphabet than the first',
      'first and last letters in alphabetical order',
    ],
    decoys: ['word-first-half', 'word-letters-alphabetical', 'word-starts-vowel', 'word-ends-vowel', 'word-short', 'word-has-e'],
  },
  {
    id: 'word-even-length',
    description: 'The word has an even number of letters.',
    predicate: (s) => s.length % 2 === 0,
    acceptedPhrasings: ['even number of letters', 'even length', 'length is even', 'letter count is even'],
    decoys: ['word-five-letters', 'word-short', 'word-long', 'word-two-vowels', 'word-ends-vowel', 'word-repeated-letter'],
  },
  {
    id: 'word-has-a',
    description: 'The word contains the letter A.',
    predicate: (s) => w(s).includes('a'),
    acceptedPhrasings: ['contains an a', 'has the letter a', 'has an a in it', 'includes a', 'letter a appears'],
    decoys: ['word-starts-a', 'word-has-e', 'word-starts-vowel', 'word-two-vowels', 'word-first-half', 'word-short'],
  },
];

export const wordDecoys: DecoySpec<'words'>[] = [
  { id: 'word-starts-vowel', description: 'The word starts with a vowel.', predicate: (s) => VOWELS.has(w(s)[0]) },
  { id: 'word-same-first-last', description: 'The word starts and ends with the same letter.', predicate: (s) => w(s)[0] === w(s)[w(s).length - 1] },
  { id: 'word-double-o-or-e', description: 'The word contains "oo" or "ee".', predicate: (s) => /oo|ee/.test(w(s)) },
  { id: 'word-starts-a', description: 'The word starts with A.', predicate: (s) => w(s)[0] === 'a' },
  { id: 'word-ends-e', description: 'The word ends with E.', predicate: (s) => w(s).endsWith('e') },
  { id: 'word-long', description: 'The word has more than five letters.', predicate: (s) => s.length > 5 },
  { id: 'word-short', description: 'The word has four letters or fewer.', predicate: (s) => s.length <= 4 },
  { id: 'word-two-vowels', description: 'The word has exactly two vowels.', predicate: (s) => vowelCount(s) === 2 },
  { id: 'word-three-vowels', description: 'The word has at least three vowels.', predicate: (s) => vowelCount(s) >= 3 },
  {
    id: 'word-letters-alphabetical',
    description: 'The letters are in alphabetical order.',
    predicate: (s) => [...w(s)].every((c, i, a) => i === 0 || c >= a[i - 1]),
  },
];
