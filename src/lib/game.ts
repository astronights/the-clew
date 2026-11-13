import { CLUE_COUNT, type Item, type Rule } from '../rules/types';
import type { Observation } from './elimination';

/** What happened on each clue, for the result screen and the share text. */
export type Outcome = 'test' | 'miss' | 'solved';

export type Entry =
  | { kind: 'clue'; index: number; item: Item; pass: boolean }
  /** The player tested their own item: checked by code, then the next clue is shown. */
  | { kind: 'test'; item: Item; pass: boolean }
  /** The player named the rule (judged). Only this is scored. */
  | { kind: 'guess'; rule: string; correct: boolean };

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

/** Every item with a known verdict: the clues plus the player's tested items. */
export function observations(state: GameState): Observation[] {
  return state.entries.flatMap((e) => (e.kind === 'guess' ? [] : [{ item: e.item, pass: e.pass }]));
}

/** Testing needs a next clue to reveal, so it isn't offered on the last clue. */
export const canTest = (s: GameState) => s.status === 'playing' && s.revealed < CLUE_COUNT;

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

/** Test an item: it's pinned with ✓/✗ and the next clue is revealed. Not scored. */
export function testItem(rule: Rule, s: GameState, item: Item): GameState {
  if (!canTest(s)) return s;
  const next: GameState = { ...s, entries: [...s.entries, { kind: 'test', item, pass: rule.predicate(item) }] };
  return advance(rule, next, 'test');
}

/** Name the rule. Right = solved on this clue. Wrong = the next clue (or the end, on the last one). */
export function guessRule(rule: Rule, s: GameState, text: string, correct: boolean): GameState {
  if (s.status !== 'playing') return s;
  const next: GameState = { ...s, entries: [...s.entries, { kind: 'guess', rule: text, correct }] };
  if (correct) return { ...next, outcomes: [...s.outcomes, 'solved'], status: 'solved', solvedOn: s.revealed };
  return advance(rule, next, 'miss');
}

/** Stop and reveal the answer. */
export function giveUp(s: GameState): GameState {
  if (s.status !== 'playing') return s;
  return { ...s, status: 'failed', solvedOn: 0 };
}
