import type { Item, Rule } from '../rules/types';
import type { Observation } from './elimination';
import { selectExam, type ExamQuestion } from './exam';

export type Verdict = 'correct' | 'close' | 'wrong';

export type Entry =
  | { kind: 'clue'; index: number; item: Item; pass: boolean }
  | { kind: 'guess'; item: Item; pass: boolean }
  | { kind: 'rule'; text: string; verdict: Verdict; hint?: string }
  | { kind: 'exam'; passed: boolean; score: number };

export type Status = 'playing' | 'exam' | 'solved' | 'failed';

export interface GameState {
  ruleId: string;
  seed: string;
  /** Number of clues revealed (1–5). */
  revealed: number;
  entries: Entry[];
  status: Status;
  /** Clue number solved on (1–5); 0 when failed. */
  solvedOn: number | null;
  /** Clue numbers on which the free retry after a "close" verdict was used. */
  closeRetries: number[];
  exam: ExamQuestion[] | null;
}

export const MAX_CLUES = 5;

export function newGame(rule: Rule, seed: string): GameState {
  return {
    ruleId: rule.id,
    seed,
    revealed: 1,
    entries: [{ kind: 'clue', index: 0, item: rule.clues[0].item, pass: rule.clues[0].pass }],
    status: 'playing',
    solvedOn: null,
    closeRetries: [],
    exam: null,
  };
}

export function observations(state: GameState): Observation[] {
  return state.entries.flatMap((e) => (e.kind === 'clue' || e.kind === 'guess' ? [{ item: e.item, pass: e.pass }] : []));
}

/** Can the player still test their own item? Not after the 5th clue: only a final rule guess remains. */
export function canGuessItem(state: GameState): boolean {
  return state.status === 'playing' && state.revealed < MAX_CLUES;
}

function advance(rule: Rule, s: GameState): GameState {
  if (s.revealed >= MAX_CLUES) return { ...s, status: 'failed', solvedOn: 0, exam: null };
  const c = rule.clues[s.revealed];
  return {
    ...s,
    status: 'playing',
    exam: null,
    revealed: s.revealed + 1,
    entries: [...s.entries, { kind: 'clue', index: s.revealed, item: c.item, pass: c.pass }],
  };
}

export function guessItem(rule: Rule, s: GameState, item: Item): GameState {
  if (!canGuessItem(s)) return s;
  const next = { ...s, entries: [...s.entries, { kind: 'guess' as const, item, pass: rule.predicate(item) }] };
  return advance(rule, next);
}

export function applyVerdict(rule: Rule, s: GameState, text: string, verdict: Verdict, hint?: string): GameState {
  if (s.status !== 'playing') return s;
  const withEntry: GameState = { ...s, entries: [...s.entries, { kind: 'rule', text, verdict, hint }] };
  if (verdict === 'correct') {
    const attempt = s.entries.filter((e) => e.kind === 'rule').length;
    return { ...withEntry, status: 'exam', exam: selectExam(rule, observations(s), `${s.seed}:${s.revealed}:${attempt}`) };
  }
  if (verdict === 'close' && !s.closeRetries.includes(s.revealed)) {
    return { ...withEntry, closeRetries: [...s.closeRetries, s.revealed] };
  }
  return advance(rule, withEntry);
}

/** Player answers to the confirmation questions, in exam order. */
export function submitExam(rule: Rule, s: GameState, answers: boolean[]): GameState {
  if (s.status !== 'exam' || !s.exam) return s;
  const score = s.exam.filter((q, i) => answers[i] === q.pass).length;
  const passed = score === s.exam.length;
  // reveal what the exam items actually were, so the player learns from it
  const examObs: Entry[] = s.exam.map((q) => ({ kind: 'guess', item: q.item, pass: q.pass }));
  const next: GameState = { ...s, entries: [...s.entries, { kind: 'exam', passed, score }, ...(passed ? [] : examObs)] };
  if (passed) return { ...next, status: 'solved', solvedOn: s.revealed, exam: null };
  return advance(rule, next);
}

export function giveUp(s: GameState): GameState {
  if (s.status === 'solved' || s.status === 'failed') return s;
  return { ...s, status: 'failed', solvedOn: 0, exam: null };
}

export const isOver = (s: GameState) => s.status === 'solved' || s.status === 'failed';
