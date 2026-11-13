import { decoysOf } from '../rules';
import { CLUE_COUNT, type Clue, type Item, type Rule } from '../rules/types';
import { eliminates } from './elimination';
import { candidatePool, itemKey } from './items';
import { hashString, rngFor } from './rng';

const T = true;
const F = false;
/** Pass/fail shapes for 4 clues: 2–3 ✅ and 1–2 ❌, always opening with a ✅. */
export const CLUE_PATTERNS: boolean[][] = [
  [T, T, F, T],
  [T, F, T, T],
  [T, T, T, F],
  [T, F, T, F],
  [T, T, F, F],
  [T, F, F, T],
];

/**
 * Pick CLUE_COUNT clues for a rule so that every clue removes at least one decoy that
 * was still alive, and all decoys are gone after the last clue. Early clues remove as
 * few decoys as possible (vague), later ones more (revealing).
 */
export function generateClues(rule: Rule, attempts = 60): Clue[] | null {
  const pool = candidatePool(rule.domain);
  const decoys = decoysOf(rule);
  const start = hashString(rule.id) % CLUE_PATTERNS.length;
  for (let a = 0; a < attempts; a++) {
    const pattern = CLUE_PATTERNS[(start + a) % CLUE_PATTERNS.length];
    const rand = rngFor(`${rule.id}:${a}`);
    let alive = decoys;
    const used = new Set<string>();
    const clues: Clue[] = [];
    for (let k = 0; k < CLUE_COUNT; k++) {
      const want = pattern[k];
      const left = CLUE_COUNT - k;
      const target = k === CLUE_COUNT - 1 ? alive.length : Math.max(1, Math.floor(alive.length / left));
      // sample to keep this fast on big pools
      let best: { item: Item; score: number }[] = [];
      let bestScore = Infinity;
      for (let i = 0; i < 1500; i++) {
        const item = pool[Math.floor(rand() * pool.length)];
        const key = itemKey(rule.domain, item);
        if (used.has(key) || rule.predicate(item) !== want) continue;
        const killed = alive.filter((d) => eliminates(d, { item, pass: want })).length;
        if (killed < 1) continue;
        if (k === CLUE_COUNT - 1 && killed !== alive.length) continue;
        // can the remaining clues still each remove one? need alive-after >= 0 and <= left-1 later choices
        const score = Math.abs(killed - target) + (killed < target ? 0.5 : 0);
        if (score < bestScore) {
          bestScore = score;
          best = [{ item, score }];
        } else if (score === bestScore) best.push({ item, score });
      }
      if (!best.length) break;
      const pick = best[Math.floor(rand() * best.length)].item;
      used.add(itemKey(rule.domain, pick));
      clues.push({ item: pick, pass: want });
      alive = alive.filter((d) => !eliminates(d, { item: pick, pass: want }));
      if (alive.length === 0 && k < CLUE_COUNT - 1) break; // ran out of decoys too early
    }
    if (clues.length === CLUE_COUNT && alive.length === 0) return clues;
  }
  return null;
}
