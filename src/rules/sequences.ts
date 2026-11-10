import type { DecoySpec, RuleSpec } from './types';

type Seq = [number, number, number];
const sum = ([a, b, c]: Seq) => a + b + c;
const evens = (s: Seq) => s.filter((x) => x % 2 === 0).length;

export const sequenceRules: RuleSpec<'sequences'>[] = [
  {
    id: 'seq-sum-gt-30',
    description: 'The three numbers add up to more than 30.',
    predicate: (s) => sum(s) > 30,
    acceptedPhrasings: ['sum is more than 30', 'add up to more than 30', 'total greater than 30', 'sum over 30', 'sum bigger than 30'],
    decoys: ['seq-sum-gt-20', 'seq-sum-gt-40', 'seq-has-over-15', 'seq-last-largest', 'seq-sum-even', 'seq-increasing'],
  },
  {
    id: 'seq-two-plus-even',
    description: 'At least two of the numbers are even.',
    predicate: (s) => evens(s) >= 2,
    acceptedPhrasings: ['at least two even numbers', 'mostly even', 'two or more are even', 'majority even', 'more evens than odds'],
    decoys: ['seq-all-even', 'seq-sum-even', 'seq-first-even', 'seq-has-mult-5', 'seq-alternating-parity', 'seq-last-even'],
  },
  {
    id: 'seq-first-lt-last',
    description: 'The first number is smaller than the last number.',
    predicate: ([a, , c]) => a < c,
    acceptedPhrasings: [
      'first number smaller than the last',
      'last number bigger than the first',
      'ends higher than it starts',
      'first less than last',
      'goes up overall',
    ],
    decoys: ['seq-increasing', 'seq-last-largest', 'seq-first-smallest', 'seq-first-two-up', 'seq-sum-gt-30', 'seq-sum-even'],
  },
  {
    id: 'seq-middle-largest',
    description: 'The middle number is the largest.',
    predicate: ([a, b, c]) => b > a && b > c,
    acceptedPhrasings: ['middle number is the largest', 'middle is biggest', 'peak in the middle', 'goes up then down', 'middle number is highest'],
    decoys: ['seq-first-two-up', 'seq-has-over-15', 'seq-sum-gt-30', 'seq-middle-even', 'seq-first-lt-last', 'seq-last-largest'],
  },
  {
    id: 'seq-sum-even',
    description: 'The three numbers add up to an even number.',
    predicate: (s) => sum(s) % 2 === 0,
    acceptedPhrasings: ['sum is even', 'add up to an even number', 'even total', 'even number of odd numbers'],
    decoys: ['seq-all-even', 'seq-two-plus-even', 'seq-first-even', 'seq-sum-mult-3', 'seq-last-even', 'seq-sum-gt-30'],
  },
  {
    id: 'seq-alternating-parity',
    description: 'The numbers alternate between odd and even.',
    predicate: ([a, b, c]) => a % 2 !== b % 2 && b % 2 !== c % 2,
    acceptedPhrasings: ['alternates odd and even', 'odd and even take turns', 'parity alternates', 'alternating odd even', 'switches between odd and even'],
    decoys: ['seq-two-plus-even', 'seq-sum-even', 'seq-middle-even', 'seq-first-even', 'seq-has-mult-5', 'seq-sum-mult-3'],
  },
  {
    id: 'seq-sum-mult-3',
    description: 'The three numbers add up to a multiple of 3.',
    predicate: (s) => sum(s) % 3 === 0,
    acceptedPhrasings: ['sum is a multiple of 3', 'total divisible by 3', 'add up to a multiple of 3', 'sum divisible by 3'],
    decoys: ['seq-has-mult-3', 'seq-sum-even', 'seq-all-mult-3', 'seq-sum-gt-30', 'seq-two-plus-even', 'seq-has-mult-5'],
  },
  {
    id: 'seq-last-largest',
    description: 'The last number is the largest.',
    predicate: ([a, b, c]) => c > a && c > b,
    acceptedPhrasings: ['last number is the largest', 'ends with the biggest number', 'last is biggest', 'final number is highest'],
    decoys: ['seq-increasing', 'seq-first-lt-last', 'seq-has-over-15', 'seq-last-even', 'seq-first-two-up', 'seq-sum-gt-30'],
  },
  {
    id: 'seq-has-mult-5',
    description: 'At least one number is a multiple of 5.',
    predicate: (s) => s.some((x) => x % 5 === 0),
    acceptedPhrasings: ['contains a multiple of 5', 'one number divisible by 5', 'has a number ending in 0 or 5', 'includes a multiple of five'],
    decoys: ['seq-has-mult-10', 'seq-sum-mult-5', 'seq-has-mult-3', 'seq-two-plus-even', 'seq-has-over-15', 'seq-sum-even'],
  },
  {
    id: 'seq-first-smallest',
    description: 'The first number is the smallest.',
    predicate: ([a, b, c]) => a < b && a < c,
    acceptedPhrasings: ['first number is the smallest', 'starts with the smallest', 'first is lowest', 'begins with the smallest number'],
    decoys: ['seq-increasing', 'seq-first-two-up', 'seq-first-lt-last', 'seq-first-even', 'seq-last-largest', 'seq-sum-gt-30'],
  },
];

export const sequenceDecoys: DecoySpec<'sequences'>[] = [
  { id: 'seq-increasing', description: 'Each number is bigger than the one before.', predicate: ([a, b, c]) => a < b && b < c },
  { id: 'seq-all-even', description: 'All three numbers are even.', predicate: (s) => evens(s) === 3 },
  { id: 'seq-first-even', description: 'The first number is even.', predicate: ([a]) => a % 2 === 0 },
  { id: 'seq-last-even', description: 'The last number is even.', predicate: ([, , c]) => c % 2 === 0 },
  { id: 'seq-middle-even', description: 'The middle number is even.', predicate: ([, b]) => b % 2 === 0 },
  { id: 'seq-first-two-up', description: 'The second number is bigger than the first.', predicate: ([a, b]) => b > a },
  { id: 'seq-sum-gt-20', description: 'The numbers add up to more than 20.', predicate: (s) => sum(s) > 20 },
  { id: 'seq-sum-gt-40', description: 'The numbers add up to more than 40.', predicate: (s) => sum(s) > 40 },
  { id: 'seq-has-over-15', description: 'At least one number is bigger than 15.', predicate: (s) => s.some((x) => x > 15) },
  { id: 'seq-has-mult-3', description: 'At least one number is a multiple of 3.', predicate: (s) => s.some((x) => x % 3 === 0) },
  { id: 'seq-all-mult-3', description: 'Every number is a multiple of 3.', predicate: (s) => s.every((x) => x % 3 === 0) },
  { id: 'seq-has-mult-10', description: 'At least one number is a multiple of 10.', predicate: (s) => s.some((x) => x % 10 === 0) },
  { id: 'seq-sum-mult-5', description: 'The numbers add up to a multiple of 5.', predicate: (s) => sum(s) % 5 === 0 },
];
