import { rulesForDomain } from '../rules';
import type { Domain, Rule } from '../rules/types';
import { rngFor, shuffle } from './rng';

const DAY = 86_400_000;
/** Puzzle #1 was 2026-09-30 (UTC). */
export const EPOCH_UTC = Date.UTC(2026, 8, 30);

/** UTC weekday (0 = Sunday) → domain. */
export const WEEKDAY_DOMAINS: Domain[] = ['words', 'numbers', 'sequences', 'tiles', 'words', 'numbers', 'tiles'];

export function puzzleNumber(now: Date | number = Date.now()): number {
  const t = typeof now === 'number' ? now : now.getTime();
  return Math.floor((t - EPOCH_UTC) / DAY) + 1;
}

export function dateOfPuzzle(n: number): Date {
  return new Date(EPOCH_UTC + (n - 1) * DAY);
}

export function domainOfPuzzle(n: number): Domain {
  return WEEKDAY_DOMAINS[dateOfPuzzle(n).getUTCDay()];
}

/** How many earlier puzzles (1..n-1) used the same domain as puzzle n. */
function occurrenceIndex(n: number): number {
  const domain = domainOfPuzzle(n);
  const perWeek = WEEKDAY_DOMAINS.filter((d) => d === domain).length;
  const before = n - 1;
  const weeks = Math.floor(before / 7);
  let k = weeks * perWeek;
  for (let i = weeks * 7 + 1; i <= before; i++) if (domainOfPuzzle(i) === domain) k++;
  return k;
}

function cycleOrder(domain: Domain, rules: Rule[], cycle: number): Rule[] {
  const order = shuffle(rules, rngFor(`${domain}:cycle:${cycle}`));
  if (cycle > 0 && order.length > 1) {
    const prev = shuffle(rules, rngFor(`${domain}:cycle:${cycle - 1}`));
    // never repeat a rule across a cycle boundary
    if (order[0].id === prev[prev.length - 1].id) [order[0], order[1]] = [order[1], order[0]];
  }
  return order;
}

/** Deterministic rule for puzzle n: each domain cycles through all its rules before repeating. */
export function ruleForPuzzle(n: number): Rule {
  const domain = domainOfPuzzle(n);
  const rules = rulesForDomain(domain);
  const k = occurrenceIndex(n);
  const cycle = Math.floor(k / rules.length);
  return cycleOrder(domain, rules, cycle)[k % rules.length];
}

/** ms until the next 00:00 UTC. */
export function msUntilNextPuzzle(now = Date.now()): number {
  return DAY - ((now - EPOCH_UTC) % DAY);
}
