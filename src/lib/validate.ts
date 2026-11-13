import { DEFS, RULES } from '../rules';
import { CLUE_COUNT, type Rule } from '../rules/types';
import { eliminationTrace } from './elimination';
import { candidatePool, itemKey, validateItem } from './items';

export interface RuleReport {
  id: string;
  passRate: number;
  errors: string[];
}

export const PASS_RATE_MIN = 0.2;
export const PASS_RATE_MAX = 0.6;

export function passRate(rule: Rule): number {
  const pool = candidatePool(rule.domain);
  return pool.filter((i) => rule.predicate(i)).length / pool.length;
}

export function validateRule(rule: Rule): RuleReport {
  const errors: string[] = [];
  const rate = passRate(rule);
  if (rate < PASS_RATE_MIN || rate > PASS_RATE_MAX)
    errors.push(`pass rate ${(rate * 100).toFixed(1)}% outside ${PASS_RATE_MIN * 100}–${PASS_RATE_MAX * 100}%`);
  if (!rule.acceptedPhrasings.length) errors.push('no accepted phrasings');
  if (rule.decoyRuleIds.length < CLUE_COUNT) errors.push(`needs at least ${CLUE_COUNT} decoys`);
  for (const id of rule.decoyRuleIds) {
    const d = DEFS.get(id);
    if (!d) errors.push(`unknown decoy ${id}`);
    else if (d.domain !== rule.domain) errors.push(`decoy ${id} is from another domain`);
    else if (id === rule.id) errors.push('rule lists itself as a decoy');
  }
  if (rule.clues.length !== CLUE_COUNT) {
    errors.push(`has ${rule.clues.length} clues, expected ${CLUE_COUNT}`);
    return { id: rule.id, passRate: rate, errors };
  }
  const keys = new Set<string>();
  rule.clues.forEach((c, i) => {
    const bad = validateItem(rule.domain, c.item);
    if (bad) errors.push(`clue ${i + 1}: invalid item (${bad})`);
    if (rule.predicate(c.item) !== c.pass) errors.push(`clue ${i + 1}: marked ${c.pass ? '✅' : '❌'} but predicate disagrees`);
    const k = itemKey(rule.domain, c.item);
    if (keys.has(k)) errors.push(`clue ${i + 1}: duplicate item`);
    keys.add(k);
  });
  const passes = rule.clues.filter((c) => c.pass).length;
  if (passes < 2 || passes > 3) errors.push(`${passes} passing clues, expected 2–3`);
  if (!rule.clues[0].pass) errors.push('clue 1 should pass');
  if (errors.length) return { id: rule.id, passRate: rate, errors };
  const trace = eliminationTrace(rule);
  trace.forEach((removed, i) => {
    if (!removed.length) errors.push(`clue ${i + 1} removes no remaining decoy`);
  });
  const removedAll = new Set(trace.flat());
  const survivors = rule.decoyRuleIds.filter((id) => !removedAll.has(id));
  if (survivors.length) errors.push(`decoys alive after the last clue: ${survivors.join(', ')}`);
  return { id: rule.id, passRate: rate, errors };
}

export function validateAll(rules: Rule[] = RULES): RuleReport[] {
  const reports = rules.map(validateRule);
  const ids = new Set<string>();
  for (const id of DEFS.keys()) {
    if (ids.has(id)) reports.push({ id, passRate: 0, errors: ['duplicate id'] });
    ids.add(id);
  }
  return reports;
}
