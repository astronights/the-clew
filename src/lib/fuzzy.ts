/** Fuzzy matching of free-text rule guesses against a rule's accepted phrasings. */

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
};

const SYNONYMS: Record<string, string> = {};
const group = (canon: string, words: string[]) => words.forEach((w) => (SYNONYMS[w] = canon));
group('greater', ['bigger', 'larger', 'greater', 'higher', 'more', 'over', 'above', 'exceeds', 'exceed', 'exceeding']);
group('less', ['smaller', 'less', 'lower', 'fewer', 'under', 'below']);
group('largest', ['biggest', 'largest', 'greatest', 'highest', 'max', 'maximum', 'peak']);
group('smallest', ['smallest', 'lowest', 'least', 'minimum', 'min']);
group('start', ['start', 'starts', 'starting', 'begin', 'begins', 'beginning', 'leading', 'leftmost', 'opens']);
group('end', ['end', 'ends', 'ending', 'finish', 'finishes', 'finishing', 'final', 'rightmost', 'trailing']);
group('contain', ['contain', 'contains', 'containing', 'has', 'have', 'having', 'include', 'includes', 'including', 'features']);
group('multiple', ['multiple', 'multiples', 'divisible', 'divides', 'factor']);
group('color', ['colour', 'colours', 'color', 'colors', 'coloured', 'colored']);
group('adjacent', ['adjacent', 'neighbouring', 'neighboring', 'neighbour', 'neighbours', 'neighbor', 'neighbors', 'touching', 'next', 'beside', 'consecutive']);
group('same', ['same', 'identical', 'matching', 'match', 'matches', 'equal']);
group('different', ['different', 'distinct', 'unique', 'differ']);
group('exactly', ['exactly', 'only', 'just', 'single']);
group('not', ['not', 'no', 'never', 'none', 'without', 'nothing', 'neither', 'nor', 'cant', 'dont', 'doesnt', 'isnt', 'arent', 'wont', 'cannot', 'lacks', 'lacking']);
group('add', ['add', 'adds', 'added', 'sum', 'sums', 'total', 'totals', 'summing']);
group('repeat', ['repeat', 'repeats', 'repeated', 'repeating', 'duplicate', 'duplicates', 'again']);
group('double', ['double', 'doubled', 'doubles']);
group('digit', ['digit', 'digits', 'figure', 'figures']);
group('shape', ['shape', 'shapes', 'symbol', 'symbols']);
group('alternate', ['alternate', 'alternates', 'alternating', 'alternation', 'switches', 'swaps']);
group('even', ['even', 'evens']);
group('odd', ['odd', 'odds']);

const STOPWORDS = new Set(
  'the a an is are be it its of to in on at by for and or that this these those there their which who as than then so all any each every some item items thing things rule secret number numbers value values tile tiles row word words letter letters me you we i one'.split(' '),
);

const NEGATION_CANON = 'not';

/** Edit distance counting an adjacent swap as one edit (optimal string alignment). */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

function stem(t: string): string {
  if (SYNONYMS[t]) return SYNONYMS[t];
  let s = t;
  if (s.length > 4 && s.endsWith('ies')) s = s.slice(0, -3) + 'y';
  else if (s.length > 3 && s.endsWith('s') && !s.endsWith('ss')) s = s.slice(0, -1);
  return SYNONYMS[s] ?? s;
}

/**
 * Key tokens must match exactly between guess and phrasing: numbers, specific
 * letters, and the words that flip a rule's meaning (colours, shapes, parity,
 * comparisons, positions).
 */
const KEY_WORDS = new Set(
  'red blue green yellow circle triangle square star color shape odd even vowel consonant greater less largest smallest first last middle start end double repeat'.split(' '),
);
const isKey = (t: string) => /^\d+$/.test(t) || /^L_[a-z]$/.test(t) || KEY_WORDS.has(t);

export function tokenize(text: string): string[] {
  let s = text
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/n't\b/g, ' not')
    .replace(/\bcannot\b/g, 'can not');
  // single letters: "letter e", 'e', "an a", trailing " a"
  s = s.replace(/\bletters? ['"“]?([a-z])['"”]?(?![a-z])/g, ' L_$1 ');
  s = s.replace(/["“']([a-z])["”']/g, ' L_$1 ');
  s = s.replace(/\ban ([a-z])\b/g, ' L_$1 ');
  s = s.replace(/\b([b-hj-z])\b/g, ' L_$1 ');
  s = s.replace(/\ba(\s+(in it|in there|anywhere|somewhere))?\s*[.!?]*\s*$/g, ' L_a ');
  const raw = s.replace(/[^a-zA-Z0-9_ ]+/g, ' ').split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    let t = raw[i];
    if (t.startsWith('L_')) {
      out.push(t);
      continue;
    }
    if (t in NUMBER_WORDS) {
      let n = NUMBER_WORDS[t];
      if (raw[i + 1] === 'hundred') {
        n *= 100;
        i++;
      }
      t = String(n);
    } else if (t === 'hundred') t = '100';
    if (STOPWORDS.has(t)) continue;
    out.push(/^\d+$/.test(t) ? String(Number(t)) : stem(t));
  }
  return out;
}

/** Canonical form used for the verdict cache. */
export function normalizeGuess(text: string): string {
  return tokenize(text).join(' ').slice(0, 200);
}

function tokenMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (isKey(a) || isKey(b)) return false;
  return a.length >= 5 && b.length >= 5 && editDistance(a, b) <= 1;
}

/** Overlap score in [0, 1]. */
export function similarity(guess: string, phrasing: string): number {
  const g = [...new Set(tokenize(guess))];
  const p = [...new Set(tokenize(phrasing))];
  if (!g.length || !p.length) return 0;
  if (g.includes(NEGATION_CANON) !== p.includes(NEGATION_CANON)) return 0;
  const gKeys = g.filter(isKey).sort().join('|');
  const pKeys = p.filter(isKey).sort().join('|');
  if (gKeys !== pKeys) return 0;
  const matched = p.filter((pt) => g.some((gt) => tokenMatch(gt, pt))).length;
  return matched / Math.max(g.length, p.length);
}

export const MATCH_THRESHOLD = 0.75;

export function matchesAnyPhrasing(guess: string, phrasings: string[], threshold = MATCH_THRESHOLD): boolean {
  return phrasings.some((p) => similarity(guess, p) >= threshold);
}
