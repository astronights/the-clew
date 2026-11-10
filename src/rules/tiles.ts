import type { Colour, DecoySpec, RuleSpec, Shape, TileItem } from './types';

const first = (t: TileItem) => t[0];
const last = (t: TileItem) => t[t.length - 1];
const hasColour = (c: Colour) => (t: TileItem) => t.some((x) => x.c === c);
const hasShape = (s: Shape) => (t: TileItem) => t.some((x) => x.s === s);

export const tileRules: RuleSpec<'tiles'>[] = [
  {
    id: 'tile-no-adjacent-colour',
    description: 'No two neighbouring tiles share a colour.',
    predicate: (t) => t.every((x, i) => i === 0 || x.c !== t[i - 1].c),
    acceptedPhrasings: [
      'no two adjacent tiles are the same colour',
      'neighbours are different colours',
      'no adjacent same colour',
      'colours never repeat next to each other',
      'touching tiles have different colours',
    ],
    decoys: ['tile-all-colours-different', 'tile-no-adjacent-shape', 'tile-has-red', 'tile-has-star', 'tile-even-length', 'tile-first-last-same-colour'],
  },
  {
    id: 'tile-one-star',
    description: 'There is exactly one star.',
    predicate: (t) => t.filter((x) => x.s === 'star').length === 1,
    acceptedPhrasings: ['exactly one star', 'only one star', 'a single star', 'one star and no more', 'just one star'],
    decoys: ['tile-has-star', 'tile-starts-with-star', 'tile-has-yellow-star', 'tile-one-red', 'tile-no-triangles', 'tile-has-circle'],
  },
  {
    id: 'tile-one-red',
    description: 'There is exactly one red tile.',
    predicate: (t) => t.filter((x) => x.c === 'R').length === 1,
    acceptedPhrasings: ['exactly one red', 'only one red tile', 'a single red tile', 'one red and no more', 'just one red'],
    decoys: ['tile-has-red', 'tile-starts-red', 'tile-has-red-circle', 'tile-one-star', 'tile-has-yellow', 'tile-no-green'],
  },
  {
    id: 'tile-first-last-same-shape',
    description: 'The first and last tiles are the same shape.',
    predicate: (t) => first(t).s === last(t).s,
    acceptedPhrasings: ['first and last are the same shape', 'starts and ends with the same shape', 'same shape at both ends', 'ends match in shape'],
    decoys: ['tile-first-last-same-colour', 'tile-all-same-shape', 'tile-palindrome', 'tile-starts-with-circle', 'tile-has-star', 'tile-even-length'],
  },
  {
    id: 'tile-starts-with-circle',
    description: 'The first tile is a circle.',
    predicate: (t) => first(t).s === 'circle',
    acceptedPhrasings: ['first tile is a circle', 'starts with a circle', 'begins with a circle', 'leftmost is a circle'],
    decoys: ['tile-has-circle', 'tile-ends-with-circle', 'tile-starts-red', 'tile-first-last-same-shape', 'tile-no-triangles', 'tile-has-star'],
  },
  {
    id: 'tile-even-length',
    description: 'There is an even number of tiles.',
    predicate: (t) => t.length % 2 === 0,
    acceptedPhrasings: ['even number of tiles', 'even length', 'two or four tiles', 'number of tiles is even'],
    decoys: ['tile-short', 'tile-has-star', 'tile-has-red', 'tile-no-adjacent-colour', 'tile-first-last-same-colour', 'tile-has-circle'],
  },
  {
    id: 'tile-ends-with-yellow',
    description: 'The last tile is yellow.',
    predicate: (t) => last(t).c === 'Y',
    acceptedPhrasings: ['last tile is yellow', 'ends with yellow', 'ends in a yellow tile', 'rightmost is yellow', 'final tile yellow'],
    decoys: ['tile-has-yellow', 'tile-starts-yellow', 'tile-first-last-same-colour', 'tile-has-yellow-star', 'tile-ends-with-circle', 'tile-even-length'],
  },
  {
    id: 'tile-all-shapes-different',
    description: 'Every tile is a different shape.',
    predicate: (t) => new Set(t.map((x) => x.s)).size === t.length,
    acceptedPhrasings: ['all shapes are different', 'no shape repeats', 'every tile a different shape', 'each shape appears once', 'no repeated shapes'],
    decoys: ['tile-all-colours-different', 'tile-no-adjacent-shape', 'tile-short', 'tile-has-star', 'tile-no-triangles', 'tile-first-last-same-shape'],
  },
  {
    id: 'tile-no-triangles',
    description: 'There are no triangles.',
    predicate: (t) => !hasShape('triangle')(t),
    acceptedPhrasings: ['no triangles', 'never a triangle', 'without triangles', 'contains no triangle', 'there are no triangles'],
    decoys: ['tile-no-stars', 'tile-has-circle', 'tile-has-star', 'tile-no-green', 'tile-short', 'tile-even-length'],
  },
  {
    id: 'tile-first-last-same-colour',
    description: 'The first and last tiles are the same colour.',
    predicate: (t) => first(t).c === last(t).c,
    acceptedPhrasings: ['first and last same colour', 'starts and ends with the same colour', 'same colour at both ends', 'ends match in colour'],
    decoys: ['tile-first-last-same-shape', 'tile-all-same-colour', 'tile-palindrome', 'tile-starts-red', 'tile-even-length', 'tile-has-yellow'],
  },
];

export const tileDecoys: DecoySpec<'tiles'>[] = [
  { id: 'tile-has-star', description: 'There is at least one star.', predicate: hasShape('star') },
  { id: 'tile-has-red', description: 'There is at least one red tile.', predicate: hasColour('R') },
  { id: 'tile-all-colours-different', description: 'Every tile is a different colour.', predicate: (t) => new Set(t.map((x) => x.c)).size === t.length },
  { id: 'tile-no-adjacent-shape', description: 'No two neighbouring tiles share a shape.', predicate: (t) => t.every((x, i) => i === 0 || x.s !== t[i - 1].s) },
  { id: 'tile-has-circle', description: 'There is at least one circle.', predicate: hasShape('circle') },
  { id: 'tile-has-yellow', description: 'There is at least one yellow tile.', predicate: hasColour('Y') },
  { id: 'tile-no-stars', description: 'There are no stars.', predicate: (t) => !hasShape('star')(t) },
  { id: 'tile-no-green', description: 'There are no green tiles.', predicate: (t) => !hasColour('G')(t) },
  { id: 'tile-has-yellow-star', description: 'There is a yellow star.', predicate: (t) => t.some((x) => x.c === 'Y' && x.s === 'star') },
  { id: 'tile-has-red-circle', description: 'There is a red circle.', predicate: (t) => t.some((x) => x.c === 'R' && x.s === 'circle') },
  { id: 'tile-starts-with-star', description: 'The first tile is a star.', predicate: (t) => first(t).s === 'star' },
  { id: 'tile-ends-with-circle', description: 'The last tile is a circle.', predicate: (t) => last(t).s === 'circle' },
  { id: 'tile-starts-red', description: 'The first tile is red.', predicate: (t) => first(t).c === 'R' },
  { id: 'tile-starts-yellow', description: 'The first tile is yellow.', predicate: (t) => first(t).c === 'Y' },
  { id: 'tile-all-same-shape', description: 'All tiles are the same shape.', predicate: (t) => t.every((x) => x.s === t[0].s) },
  { id: 'tile-all-same-colour', description: 'All tiles are the same colour.', predicate: (t) => t.every((x) => x.c === t[0].c) },
  {
    id: 'tile-palindrome',
    description: 'The row reads the same backwards.',
    predicate: (t) => t.every((x, i) => x.c === t[t.length - 1 - i].c && x.s === t[t.length - 1 - i].s),
  },
  { id: 'tile-short', description: 'There are at most three tiles.', predicate: (t) => t.length <= 3 },
];
