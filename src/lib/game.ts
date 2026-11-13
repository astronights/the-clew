import { CLUE_COUNT, type Item, type Rule } from '../rules/types';
import type { Observation } from './elimination';

/** What happened on each clue, for the result screen and the share text. */
export type Outcome = 'miss' | 'skip' | 'solved';

export type Entry =
  | { kind: 'clue'; index: number; item: Item; pass: boolean }
  /** One submit: the player's own 5th item (checked by code) and their rule (judged). */
  | { kind: 'attempt'; item: Item; pass: boolean; rule: string; correct: boolean };

export type Status = 'playing' | 'solved' | 'failed';

export interface GameState {
  ruleId: string;
  seed: string;
  /** Number of clues revealed (1–CLUE_COUNT). */
  revealed: number;
  entries: Entry[];
  status: Status;
  /** Clue number the rule was named on (1–CLUE_COUNT); 0 when failed. */
  solvedOn: number | null;
  /** outcomes[i] = what the player did while clue i+1 was the latest. */
  outcomes: Outcome[];
}

export { CLUE_COUNT };

export function newGame(rule: Rule, seed: string): GameState {
  const c = rule.clues[0];
  return {
    ruleId: rule.id,
    seed,
    revealed: 1,
    entries: [{ kind: 'clue', index: 0, item: c.item, pass: c.pass }],
    status: 'playing',
    solvedOn: null,
    outcomes: [],
  };
}

/** Every item with a known verdict: the clues plus the player's own 5ths. */
export function observations(state: GameState): Observation[] {
  return state.entries.map((e) => ({ item: e.item, pass: e.pass }));
}

export const isOver = (s: GameState) => s.status !== 'playing';
export const isLastClue = (s: GameState) => s.revealed >= CLUE_COUNT;

function advance(rule: Rule, s: GameState, outcome: Outcome): GameState {
  const outcomes = [...s.outcomes, outcome];
  if (s.revealed >= CLUE_COUNT) return { ...s, outcomes, status: 'failed', solvedOn: 0 };
  const c = rule.clues[s.revealed];
  return {
    ...s,
    outcomes,
    revealed: s.revealed + 1,
    entries: [...s.entries, { kind: 'clue', index: s.revealed, item: c.item, pass: c.pass }],
  };
}

/**
 * Submit the player's 5th item and their rule. The rule decides the result;
 * the 5th is their own test and is pinned on the thread either way.
 */
export function submit(rule: Rule, s: GameState, item: Item, ruleText: string, correct: boolean): GameState {
  if (s.status !== 'playing') return s;
  const attempt: Entry = { kind: 'attempt', item, pass: rule.predicate(item), rule: ruleText, correct };
  const next: GameState = { ...s, entries: [...s.entries, attempt] };
  if (correct) return { ...next, outcomes: [...s.outcomes, 'solved'], status: 'solved', solvedOn: s.revealed };
  return advance(rule, next, 'miss');
}

/** Reveal the next clue without guessing. On the last clue this gives up. */
export function skip(rule: Rule, s: GameState): GameState {
  if (s.status !== 'playing') return s;
  return advance(rule, s, 'skip');
}
