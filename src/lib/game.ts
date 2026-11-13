import { CLUE_COUNT, type Item, type Rule } from '../rules/types';
import { matchesRow } from './chain';
import type { Observation } from './elimination';

/** What happened on each clue, for the result screen and the share text. */
export type Outcome = 'next' | 'test' | 'miss' | 'solved';

export type Entry =
  | { kind: 'clue'; index: number; item: Item; pass: boolean }
  /**
   * The player guessed; the next clue (row `row`, 0-based) was revealed with it.
   * `pass`: on sequence days, did they guess that row's item; on rule days, does their item fit.
   */
  | { kind: 'test'; item: Item; pass: boolean; row: number }
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

/** Was this guess right for the row it reveals? Checked by code, never AI. */
export function guessIsRight(rule: Rule, row: number, item: Item): boolean {
  if (rule.domain !== 'chain') return rule.predicate(item);
  // sequence: the guess must be the item that row reveals
  if (row === CLUE_COUNT - 1) return rule.predicate(item);
  const accepted = rule.rowAnswers?.[row] ?? [String(rule.clues[row].item)];
  return matchesRow(accepted, String(item), accepted.length > 1);
}

/** Guess / test: reveals the next row, marked right or wrong for this guess. Not scored. */
export function testItem(rule: Rule, s: GameState, item: Item): GameState {
  if (!canTest(s)) return s;
  const row = s.revealed;
  const next: GameState = { ...s, entries: [...s.entries, { kind: 'test', item, pass: guessIsRight(rule, row, item), row }] };
  return advance(rule, next, 'test');
}

/** Open the next clue without testing anything. */
export function next(rule: Rule, s: GameState): GameState {
  if (!canTest(s)) return s;
  return advance(rule, s, 'next');
}

/** The guess that revealed each row, by row index. */
export function guessesByRow(s: GameState): Map<number, Extract<Entry, { kind: 'test' }>> {
  const m = new Map<number, Extract<Entry, { kind: 'test' }>>();
  for (const e of s.entries) if (e.kind === 'test') m.set(e.row, e);
  return m;
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
