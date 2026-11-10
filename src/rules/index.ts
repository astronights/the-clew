import { CLUES } from './clues';
import { numberDecoys, numberRules } from './numbers';
import { sequenceDecoys, sequenceRules } from './sequences';
import { tileDecoys, tileRules } from './tiles';
import type { DecoySpec, Domain, Item, Rule, RuleDef, RuleSpec } from './types';
import { wordDecoys, wordRules } from './words';

export * from './types';

type AnySpec = RuleSpec<Domain> | DecoySpec<Domain>;

function toDef(domain: Domain, s: AnySpec): RuleDef {
  return { id: s.id, domain, description: s.description, predicate: s.predicate as (i: Item) => boolean };
}

function toRule(domain: Domain, s: RuleSpec<Domain>): Rule {
  return {
    ...toDef(domain, s),
    acceptedPhrasings: s.acceptedPhrasings,
    decoyRuleIds: s.decoys,
    clues: CLUES[s.id] ?? [],
  };
}

const groups: [Domain, RuleSpec<Domain>[], DecoySpec<Domain>[]][] = [
  ['numbers', numberRules as RuleSpec<Domain>[], numberDecoys as DecoySpec<Domain>[]],
  ['sequences', sequenceRules as RuleSpec<Domain>[], sequenceDecoys as DecoySpec<Domain>[]],
  ['tiles', tileRules as RuleSpec<Domain>[], tileDecoys as DecoySpec<Domain>[]],
  ['words', wordRules as RuleSpec<Domain>[], wordDecoys as DecoySpec<Domain>[]],
];

/** Playable rules, in authoring order. */
export const RULES: Rule[] = groups.flatMap(([d, rules]) => rules.map((r) => toRule(d, r)));

/** Every predicate (playable + decoy-only), by id. */
export const DEFS: Map<string, RuleDef> = new Map(
  groups.flatMap(([d, rules, decoys]) => [...rules, ...decoys].map((s) => [s.id, toDef(d, s)] as const)),
);

export const RULES_BY_ID: Map<string, Rule> = new Map(RULES.map((r) => [r.id, r]));

export function rulesForDomain(domain: Domain): Rule[] {
  return RULES.filter((r) => r.domain === domain);
}

export function getRule(id: string): Rule | undefined {
  return RULES_BY_ID.get(id);
}

export function decoysOf(rule: Rule): RuleDef[] {
  return rule.decoyRuleIds.map((id) => {
    const d = DEFS.get(id);
    if (!d) throw new Error(`Unknown decoy ${id} on ${rule.id}`);
    return d;
  });
}
