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
export const ITEM_NOUN: Record<Domain, string> = { numbers: 'number', sequences: 'sequence', tiles: 'row', words: 'word' };

/** Example rule guesses for the text box. None of them is a real rule. */
export const RULE_EXAMPLE: Record<Domain, string> = {
  numbers: 'e.g. it has a 5 in it',
  sequences: 'e.g. the numbers keep going up',
  tiles: 'e.g. it has a blue tile',
  words: "e.g. it's the name of an animal",
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
  } else {
    pool = Array.from(new Set(WORDS.map((w) => w.toLowerCase())));
  }
  poolCache.set(domain, pool);
  return pool;
}
