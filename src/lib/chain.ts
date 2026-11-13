import { CLUE_COUNT, type Rule } from '../rules/types';
import { normalizeAnswer } from './items';

/**
 * An AI-written, admin-approved "what comes next" puzzle in the style of
 * Only Connect's Sequences round: four items in order, the player names the
 * fifth and the rule. Pass/fail of the player's 5th is decided by code:
 * it must match one of `acceptedAnswers` after normalisation.
 */
export interface ChainPuzzle {
  /** Player-facing statement of the rule, e.g. "Greek letters in alphabetical order". */
  connection: string;
  /** 6–10 ways a player might phrase the rule; used for instant local matching. */
  acceptedPhrasings: string[];
  /** Exactly CLUE_COUNT items, in order, vaguest first. */
  clues: string[];
  /** The 5th item. */
  answer: string;
  /** Every spelling of the 5th we accept (must include `answer`). */
  acceptedAnswers: string[];
  /** Shown after the game: why the 5th comes next. */
  explanation: string;
  category: string;
  /** 1 (gentle) to 5 (fiendish). */
  difficulty: number;
  topical?: { used: boolean; note?: string };
  sources?: string[];
}

export type PuzzleStatus = 'draft' | 'approved' | 'rejected';

export interface StoredPuzzle {
  puzzleNo: number;
  date: string;
  status: PuzzleStatus;
  data: ChainPuzzle;
  errors: string[];
  note: string | null;
  updatedAt: string;
}

/** Target difficulty by UTC weekday (0 = Sunday): gentle Monday, toughest Saturday. */
export const WEEKDAY_DIFFICULTY = [3, 1, 2, 2, 3, 4, 5];

export const chainRuleId = (puzzleNo: number) => `chain:${puzzleNo}`;

export function matchesAnswer(p: Pick<ChainPuzzle, 'answer' | 'acceptedAnswers'>, guess: string): boolean {
  const g = normalizeAnswer(guess);
  return !!g && [p.answer, ...p.acceptedAnswers].some((a) => normalizeAnswer(a) === g);
}

/** Deterministic checks a puzzle must pass before it can be approved. */
export function validateChain(p: Partial<ChainPuzzle> | null | undefined): string[] {
  const e: string[] = [];
  if (!p || typeof p !== 'object') return ['not a puzzle object'];
  const str = (v: unknown) => typeof v === 'string' && v.trim().length > 0;
  if (!str(p.connection)) e.push('connection is missing');
  else if (p.connection!.length > 120) e.push('connection is longer than 120 characters');
  if (!Array.isArray(p.clues) || p.clues.length !== CLUE_COUNT) e.push(`needs exactly ${CLUE_COUNT} clues`);
  else {
    if (!p.clues.every(str)) e.push('every clue must be non-empty text');
    if (p.clues.some((c) => String(c).length > 60)) e.push('clues must be 60 characters or fewer');
    const keys = p.clues.map((c) => normalizeAnswer(String(c)));
    if (new Set(keys).size !== keys.length) e.push('clues must all be different');
  }
  if (!str(p.answer)) e.push('answer is missing');
  else if (p.answer!.length > 60) e.push('answer must be 60 characters or fewer');
  if (!Array.isArray(p.acceptedAnswers) || !p.acceptedAnswers.every(str)) e.push('acceptedAnswers must be a list of text');
  else if (str(p.answer) && !p.acceptedAnswers.some((a) => normalizeAnswer(a) === normalizeAnswer(p.answer!)))
    e.push('acceptedAnswers must include the answer');
  if (str(p.answer) && Array.isArray(p.clues) && p.clues.some((c) => matchesAnswer({ answer: p.answer!, acceptedAnswers: p.acceptedAnswers ?? [] }, String(c))))
    e.push('the answer must not already be one of the clues');
  if (!Array.isArray(p.acceptedPhrasings) || p.acceptedPhrasings.filter(str).length < 3) e.push('needs at least 3 accepted phrasings');
  if (!str(p.explanation)) e.push('explanation is missing');
  if (!str(p.category)) e.push('category is missing');
  if (!Number.isInteger(p.difficulty) || p.difficulty! < 1 || p.difficulty! > 5) e.push('difficulty must be 1–5');
  return e;
}

/** Turn an approved puzzle into a Rule the game can play. */
export function chainToRule(puzzleNo: number, p: ChainPuzzle): Rule {
  return {
    id: chainRuleId(puzzleNo),
    domain: 'chain',
    description: p.connection,
    predicate: (item) => matchesAnswer(p, String(item)),
    acceptedPhrasings: p.acceptedPhrasings,
    decoyRuleIds: [],
    clues: p.clues.map((c) => ({ item: c, pass: true })),
  };
}
