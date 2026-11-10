import { decoysOf } from '../rules';
import type { Item, Rule, RuleDef } from '../rules/types';
import { aliveDecoys, eliminates, type Observation } from './elimination';
import { candidatePool, itemKey } from './items';
import { rngFor, shuffle } from './rng';

export interface ExamQuestion {
  item: Item;
  /** The correct answer (not shown to the player). */
  pass: boolean;
}

/**
 * Choose 3 unseen items that best separate the rule from the decoys a player
 * could still believe, given everything they have seen. Always mixes ✅ and ❌.
 */
export function selectExam(rule: Rule, seen: Observation[], seed: string, size = 3): ExamQuestion[] {
  const rand = rngFor(`exam:${rule.id}:${seed}`);
  const seenKeys = new Set(seen.map((o) => itemKey(rule.domain, o.item)));
  const alive = aliveDecoys(rule, seen);
  const all = decoysOf(rule);
  const targets: RuleDef[] = alive.length ? alive : all;

  const pool = shuffle(candidatePool(rule.domain), rand)
    .filter((item) => !seenKeys.has(itemKey(rule.domain, item)))
    .slice(0, 2500)
    .map((item) => ({ item, pass: rule.predicate(item) }));

  const breaks = (q: ExamQuestion, ds: RuleDef[]) => ds.filter((d) => eliminates(d, q));

  const chosen: ExamQuestion[] = [];
  let uncovered = targets.slice();
  const take = (filter: (q: ExamQuestion) => boolean) => {
    let best: ExamQuestion | null = null;
    let bestScore = -1;
    for (const q of pool) {
      if (chosen.includes(q) || !filter(q)) continue;
      const score = breaks(q, uncovered).length * 100 + breaks(q, targets).length * 10 + breaks(q, all).length;
      if (score > bestScore) {
        best = q;
        bestScore = score;
      }
    }
    if (best) {
      chosen.push(best);
      const b = breaks(best, uncovered);
      uncovered = uncovered.filter((d) => !b.includes(d));
      if (!uncovered.length) uncovered = targets.slice();
    }
  };

  while (chosen.length < size - 1) take(() => true);
  const passes = chosen.filter((q) => q.pass).length;
  if (passes === chosen.length) take((q) => !q.pass);
  else if (passes === 0) take((q) => q.pass);
  else take(() => true);
  return shuffle(chosen, rand);
}
