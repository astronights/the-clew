import type { Colour, Domain, Item, SequenceItem, Shape, Tile, TileItem } from '../rules/types';
import { WORDS } from '../rules/wordlist';
import { rngFor } from './rng';

export const COLOURS: Colour[] = ['R', 'B', 'G', 'Y'];
export const SHAPES: Shape[] = ['circle', 'triangle', 'square', 'star'];
export const COLOUR_NAMES: Record<Colour, string> = { R: 'red', B: 'blue', G: 'green', Y: 'yellow' };
export const COLOUR_EMOJI: Record<Colour, string> = { R: '🔴', B: '🔵', G: '🟢', Y: '🟡' };
export const SHAPE_GLYPH: Record<Shape, string> = { circle: '●', triangle: '▲', square: '■', star: '★' };
const SHAPE_CODE: Record<Shape, string> = { circle: 'c', triangle: 't', square: 's', star: 'x' };
const CODE_SHAPE: Record<string, Shape> = { c: 'circle', t: 'triangle', s: 'square', x: 'star' };

export const MAX_TILES = 5;
export const SEQ_MIN = 0;
export const SEQ_MAX = 99;
export const NUM_MIN = 1;
export const NUM_MAX = 999;
export const WORD_MIN = 2;
export const WORD_MAX = 12;

/** What one item is called on each kind of day. */
export const ITEM_NOUN: Record<Domain, string> = { numbers: 'number', sequences: 'sequence', tiles: 'row', words: 'word', chain: 'answer' };

/** Example rule guesses for the text box. None of them is a real rule. */
export const RULE_EXAMPLE: Record<Domain, string> = {
  numbers: 'e.g. it has a 5 in it',
  sequences: 'e.g. they keep going up',
  tiles: 'e.g. it has a blue tile',
  words: "e.g. it's the name of an animal",
  chain: 'e.g. Bond films in order',
};

/**
 * Turns whatever the player typed into a plain a–z word: trims, lowercases,
 * drops accents (Café → cafe) and ignores spaces, hyphens and apostrophes.
 * Returns the cleaned word and any characters that can't be used.
 */
export function normalizeWord(raw: string): { word: string; rejected: string[] } {
  const base = raw.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ß/g, 'ss').replace(/æ/g, 'ae').replace(/œ/g, 'oe');
  const rejected: string[] = [];
  let word = '';
  for (const ch of base) {
    if (ch >= 'a' && ch <= 'z') word += ch;
    else if (/[\s'’`\-.]/.test(ch)) continue;
    else if (!rejected.includes(ch)) rejected.push(ch);
  }
  return { word, rejected };
}

/**
 * Canonical form of a free-text answer, so "The Moon", "moon" and "Moon!" match:
 * accents dropped, lowercase, a leading "the/a/an" dropped, only letters, digits and
 * single spaces kept. Works for any script (letters are kept by Unicode class).
 */
export function normalizeAnswer(raw: string): string {
  return raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/^(the|a|an) /, '')
    .replace(/\s+/g, ' ');
}

/** Stable string key for an item, used for de-duplication and caching. */
export function itemKey(domain: Domain, item: Item): string {
  switch (domain) {
    case 'numbers':
      return String(item);
    case 'sequences':
      return (item as SequenceItem).join(',');
    case 'tiles':
      return (item as TileItem).map((t) => t.c + SHAPE_CODE[t.s]).join('-');
    case 'words':
      return (item as string).toLowerCase();
    case 'chain':
      return normalizeAnswer(item as string);
  }
}

export function parseTileKey(key: string): TileItem {
  return key.split('-').map((p) => ({ c: p[0] as Colour, s: CODE_SHAPE[p[1]] }));
}

/** Human-readable text (also used for screen readers). */
export function describeItem(domain: Domain, item: Item): string {
  switch (domain) {
    case 'numbers':
      return String(item);
    case 'sequences':
      return (item as SequenceItem).join(', ');
    case 'tiles':
      return (item as TileItem).map((t) => `${COLOUR_NAMES[t.c]} ${t.s}`).join(', ');
    case 'words':
      return (item as string).toUpperCase();
    case 'chain':
      return String(item);
  }
}

/** Returns an error message, or null when the item is valid for its domain. */
export function validateItem(domain: Domain, item: Item): string | null {
  switch (domain) {
    case 'numbers': {
      const n = item as number;
      if (!Number.isInteger(n) || n < NUM_MIN || n > NUM_MAX) return `Pick a whole number from ${NUM_MIN} to ${NUM_MAX}.`;
      return null;
    }
    case 'sequences': {
      const s = item as number[];
      if (!Array.isArray(s) || s.length !== 3) return 'Enter exactly three numbers.';
      if (s.some((x) => !Number.isInteger(x) || x < SEQ_MIN || x > SEQ_MAX)) return `Each number must be ${SEQ_MIN}–${SEQ_MAX}.`;
      return null;
    }
    case 'tiles': {
      const t = item as Tile[];
      if (!Array.isArray(t) || t.length < 1 || t.length > MAX_TILES) return `Build a row of 1–${MAX_TILES} tiles.`;
      if (t.some((x) => !COLOURS.includes(x.c) || !SHAPES.includes(x.s))) return 'Unknown tile.';
      return null;
    }
    case 'words': {
      const w = item as string;
      if (typeof w !== 'string' || !/^[a-z]+$/i.test(w)) return 'Use letters only.';
      if (w.length < WORD_MIN || w.length > WORD_MAX) return `Words must be ${WORD_MIN}–${WORD_MAX} letters.`;
      return null;
    }
    case 'chain': {
      const t = String(item ?? '').trim();
      if (!t) return 'Type your answer.';
      if (t.length > 60) return 'Keep it under 60 characters.';
      if (!normalizeAnswer(t)) return 'Use at least one letter or number.';
      return null;
    }
  }
}

const poolCache = new Map<Domain, Item[]>();

/**
 * The candidate pool per domain. Used to pick clues and exam items, and as the
 * reference distribution for pass rates in `npm run validate-rules`.
 *  - numbers: every integer 1–999
 *  - sequences: every triple with values 1–20
 *  - tiles: 4000 seeded random rows (may repeat), length 2–5 uniform, tiles uniform
 *  - words: the built-in word list
 */
export function candidatePool(domain: Domain): Item[] {
  const cached = poolCache.get(domain);
  if (cached) return cached;
  let pool: Item[] = [];
  if (domain === 'numbers') {
    for (let n = 1; n <= 999; n++) pool.push(n);
  } else if (domain === 'sequences') {
    for (let a = 1; a <= 20; a++) for (let b = 1; b <= 20; b++) for (let c = 1; c <= 20; c++) pool.push([a, b, c]);
  } else if (domain === 'tiles') {
    const rand = rngFor('tile-pool-v1');
    while (pool.length < 4000) {
      const len = 2 + Math.floor(rand() * (MAX_TILES - 1));
      const row: TileItem = Array.from({ length: len }, () => ({
        c: COLOURS[Math.floor(rand() * 4)],
        s: SHAPES[Math.floor(rand() * 4)],
      }));
      pool.push(row);
    }
  } else if (domain === 'words') {
    pool = Array.from(new Set(WORDS.map((w) => w.toLowerCase())));
  }
  poolCache.set(domain, pool);
  return pool;
}

const COLOUR_WORDS: Record<string, Colour> = {
  red: 'R', r: 'R', '🔴': 'R', '🟥': 'R',
  blue: 'B', b: 'B', '🔵': 'B', '🟦': 'B',
  green: 'G', g: 'G', '🟢': 'G', '🟩': 'G',
  yellow: 'Y', y: 'Y', '🟡': 'Y', '🟨': 'Y',
};
const SHAPE_WORDS: Record<string, Shape> = {
  circle: 'circle', circles: 'circle', round: 'circle', dot: 'circle', '●': 'circle', o: 'circle',
  triangle: 'triangle', triangles: 'triangle', tri: 'triangle', '▲': 'triangle', '△': 'triangle',
  square: 'square', squares: 'square', box: 'square', '■': 'square', '□': 'square',
  star: 'star', stars: 'star', '★': 'star', '☆': 'star', '*': 'star',
};

/** "red star, blue circle" / "🔴★ 🔵●" / "red-star blue-circle" → tiles. */
function parseTiles(text: string): { item: TileItem | null; error: string | null } {
  const tokens = [...text.toLowerCase().matchAll(/[a-z]+|\p{Extended_Pictographic}|[●▲△■□★☆*]/gu)].map((m) => m[0]).filter((t) => t !== 'and');
  const row: Tile[] = [];
  let colour: Colour | null = null;
  for (const t of tokens) {
    if (COLOUR_WORDS[t] && !(t in SHAPE_WORDS)) {
      if (colour) return { item: null, error: `“${t}” follows another colour. Use colour then shape, like “red star”.` };
      colour = COLOUR_WORDS[t];
    } else if (SHAPE_WORDS[t]) {
      if (!colour) return { item: null, error: 'Give each tile a colour first, like “red star, blue circle”.' };
      row.push({ c: colour, s: SHAPE_WORDS[t] });
      colour = null;
    } else return { item: null, error: `I don't know “${t}”. Colours: red, blue, green, yellow. Shapes: circle, triangle, square, star.` };
  }
  if (colour) return { item: null, error: 'The last tile needs a shape, like “red star”.' };
  if (!row.length) return { item: null, error: null };
  return { item: row, error: validateItem('tiles', row) };
}

/**
 * Read free text as an item of the day's kind. Returns `item: null` with no error
 * for an empty box, so the button can fall back to "Next".
 */
export function parseItem(domain: Domain, text: string): { item: Item | null; error: string | null } {
  const t = text.trim();
  if (!t) return { item: null, error: null };
  switch (domain) {
    case 'numbers': {
      const m = t.replace(/[,\s_]/g, '').match(/^\d+$/);
      if (!m) return { item: null, error: 'Type a whole number, like 35.' };
      const n = Number(m[0]);
      return { item: n, error: validateItem('numbers', n) };
    }
    case 'sequences': {
      const nums = t.match(/\d+/g) ?? [];
      if (nums.length !== 3 || /[a-z]/i.test(t)) return { item: null, error: 'Type three numbers, like 3, 8, 12.' };
      const s = nums.map(Number) as SequenceItem;
      return { item: s, error: validateItem('sequences', s) };
    }
    case 'tiles':
      return parseTiles(t);
    case 'words': {
      const { word, rejected } = normalizeWord(t);
      if (rejected.length) return { item: null, error: `Letters only, please. Can't use ${rejected.map((c) => `“${c}”`).join(' ')}.` };
      return { item: word || null, error: word ? validateItem('words', word) : null };
    }
    case 'chain':
      return { item: t, error: validateItem('chain', t) };
  }
}

/** Placeholder for the free-text test box. */
export const TEST_EXAMPLE: Record<Domain, string> = {
  numbers: 'e.g. 35',
  sequences: 'e.g. 3, 8, 12',
  tiles: 'e.g. red star, blue circle',
  words: 'e.g. puzzle',
  chain: 'what comes 5th?',
};
