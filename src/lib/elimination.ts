import { decoysOf } from '../rules';
import type { Clue, Item, Rule, RuleDef } from '../rules/types';

export interface Observation {
  item: Item;
  pass: boolean;
}

/** A decoy is eliminated once it disagrees with any observed verdict. */
export function eliminates(decoy: RuleDef, obs: Observation): boolean {
  return decoy.predicate(obs.item) !== obs.pass;
}

export function aliveDecoys(rule: Rule, observations: Observation[]): RuleDef[] {
  return decoysOf(rule).filter((d) => !observations.some((o) => eliminates(d, o)));
}

/** For each clue: which decoys were still alive before it and were removed by it. */
export function eliminationTrace(rule: Rule, clues: Clue[] = rule.clues): string[][] {
  let alive = decoysOf(rule);
  return clues.map((c) => {
    const removed = alive.filter((d) => eliminates(d, c));
    alive = alive.filter((d) => !removed.includes(d));
    return removed.map((d) => d.id);
  });
}
