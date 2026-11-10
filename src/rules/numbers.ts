import type { DecoySpec, RuleSpec } from './types';

export const digits = (n: number): number[] => String(Math.abs(Math.trunc(n))).split('').map(Number);
const digitSum = (n: number) => digits(n).reduce((a, b) => a + b, 0);
const isPrime = (n: number) => {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
};

export const numberRules: RuleSpec<'numbers'>[] = [
  {
    id: 'num-odd-digit-sum',
    description: 'The digits add up to an odd number.',
    predicate: (n) => digitSum(n) % 2 === 1,
    acceptedPhrasings: [
      'digits add up to an odd number',
      'odd digit sum',
      'sum of the digits is odd',
      'digit total is odd',
    ],
    decoys: ['num-odd', 'num-even', 'num-multiple-of-3', 'num-contains-7', 'num-digit-sum-gt-12', 'num-starts-odd'],
  },
  {
    id: 'num-contains-7',
    description: 'The number contains the digit 7.',
    predicate: (n) => digits(n).includes(7),
    acceptedPhrasings: ['contains a 7', 'has the digit 7', 'has a seven in it', 'includes 7'],
    decoys: ['num-ends-in-7', 'num-odd', 'num-prime', 'num-big-digit', 'num-odd-digit-sum', 'num-over-500'],
  },
  {
    id: 'num-repeated-digit',
    description: 'Some digit appears more than once.',
    predicate: (n) => new Set(digits(n)).size < digits(n).length,
    acceptedPhrasings: [
      'a digit repeats',
      'repeated digit',
      'has a digit that appears twice',
      'some digit appears more than once',
      'contains the same digit twice',
    ],
    decoys: ['num-palindrome', 'num-multiple-of-11', 'num-even', 'num-multiple-of-3', 'num-contains-zero', 'num-over-500'],
  },
  {
    id: 'num-multiple-of-3',
    description: 'The number is a multiple of 3.',
    predicate: (n) => n % 3 === 0,
    acceptedPhrasings: ['multiple of 3', 'divisible by 3', 'in the 3 times table', 'digit sum divisible by 3'],
    decoys: ['num-multiple-of-9', 'num-multiple-of-6', 'num-odd', 'num-odd-digit-sum', 'num-contains-3', 'num-even'],
  },
  {
    id: 'num-multiple-of-4',
    description: 'The number is a multiple of 4.',
    predicate: (n) => n % 4 === 0,
    acceptedPhrasings: ['multiple of 4', 'divisible by 4', 'in the 4 times table'],
    decoys: ['num-even', 'num-multiple-of-8', 'num-multiple-of-6', 'num-multiple-of-3', 'num-repeated-digit', 'num-over-500'],
  },
  {
    id: 'num-starts-odd',
    description: 'The first digit is odd.',
    predicate: (n) => digits(n)[0] % 2 === 1,
    acceptedPhrasings: ['first digit is odd', 'starts with an odd digit', 'leading digit odd', 'begins with an odd number'],
    decoys: ['num-odd', 'num-odd-digit-sum', 'num-over-500', 'num-contains-7', 'num-repeated-digit', 'num-even'],
  },
  {
    id: 'num-last-gt-first',
    description: 'The last digit is bigger than the first digit.',
    predicate: (n) => {
      const d = digits(n);
      return d[d.length - 1] > d[0];
    },
    acceptedPhrasings: [
      'last digit bigger than first digit',
      'last digit greater than the first',
      'ends with a higher digit than it starts',
      'first digit smaller than last digit',
    ],
    decoys: ['num-digits-increasing', 'num-even', 'num-big-digit', 'num-under-100', 'num-starts-odd', 'num-odd'],
  },
  {
    id: 'num-over-500',
    description: 'The number is greater than 500.',
    predicate: (n) => n > 500,
    acceptedPhrasings: ['greater than 500', 'more than 500', 'over 500', 'bigger than 500', 'above 500'],
    decoys: ['num-over-300', 'num-over-700', 'num-big-digit', 'num-even', 'num-odd', 'num-three-digits'],
  },
  {
    id: 'num-big-digit',
    description: 'The number contains an 8 or a 9.',
    predicate: (n) => digits(n).some((d) => d >= 8),
    acceptedPhrasings: [
      'contains an 8 or a 9',
      'has a digit bigger than 7',
      'contains a digit greater than 7',
      'has an 8 or 9 in it',
      'a digit is 8 or more',
    ],
    decoys: ['num-contains-9', 'num-contains-8', 'num-over-500', 'num-digit-sum-gt-12', 'num-even', 'num-odd'],
  },
  {
    id: 'num-even',
    description: 'The number is even.',
    predicate: (n) => n % 2 === 0,
    acceptedPhrasings: ['even number', 'divisible by 2', 'even', 'ends in an even digit', 'multiple of 2'],
    decoys: ['num-multiple-of-4', 'num-multiple-of-6', 'num-odd-digit-sum', 'num-starts-odd', 'num-over-500', 'num-contains-zero'],
  },
];

export const numberDecoys: DecoySpec<'numbers'>[] = [
  { id: 'num-odd', description: 'The number is odd.', predicate: (n) => n % 2 === 1 },
  { id: 'num-prime', description: 'The number is prime.', predicate: isPrime },
  {
    id: 'num-palindrome',
    description: 'The number reads the same backwards.',
    predicate: (n) => String(n) === String(n).split('').reverse().join(''),
  },
  { id: 'num-multiple-of-6', description: 'The number is a multiple of 6.', predicate: (n) => n % 6 === 0 },
  { id: 'num-multiple-of-8', description: 'The number is a multiple of 8.', predicate: (n) => n % 8 === 0 },
  { id: 'num-multiple-of-9', description: 'The number is a multiple of 9.', predicate: (n) => n % 9 === 0 },
  { id: 'num-multiple-of-11', description: 'The number is a multiple of 11.', predicate: (n) => n % 11 === 0 },
  { id: 'num-ends-in-7', description: 'The number ends in 7.', predicate: (n) => n % 10 === 7 },
  { id: 'num-contains-3', description: 'The number contains a 3.', predicate: (n) => digits(n).includes(3) },
  { id: 'num-contains-8', description: 'The number contains an 8.', predicate: (n) => digits(n).includes(8) },
  { id: 'num-contains-9', description: 'The number contains a 9.', predicate: (n) => digits(n).includes(9) },
  { id: 'num-contains-zero', description: 'The number contains a 0.', predicate: (n) => digits(n).includes(0) },
  { id: 'num-digit-sum-gt-12', description: 'The digits add up to more than 12.', predicate: (n) => digitSum(n) > 12 },
  {
    id: 'num-digits-increasing',
    description: 'Each digit is bigger than the one before.',
    predicate: (n) => digits(n).every((d, i, a) => i === 0 || d > a[i - 1]),
  },
  { id: 'num-under-100', description: 'The number is less than 100.', predicate: (n) => n < 100 },
  { id: 'num-over-300', description: 'The number is greater than 300.', predicate: (n) => n > 300 },
  { id: 'num-over-700', description: 'The number is greater than 700.', predicate: (n) => n > 700 },
  { id: 'num-three-digits', description: 'The number has three digits.', predicate: (n) => n >= 100 },
];
