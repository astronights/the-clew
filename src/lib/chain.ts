
/**
 * An AI-written, admin-approved "what comes next" puzzle in the style of
 * Only Connect's Sequences round: five items in a fixed order. Players see them one by one,
 * guess what comes next, and score by naming the rule.
 */
export interface ChainPuzzle {
  /** Player-facing statement of the rule, e.g. "Greek letters in alphabetical order". */
  connection: string;
  /** Exactly CHAIN_CLUES items, in order, vaguest first. The last one is the answer. */
  clues: string[];
  /** Shown after the game: why the 5th comes next. */
  explanation: string;
  category: string;
  /** 1 (gentle) to 5 (fiendish). */
  difficulty: number;
  topical?: { used: boolean; note?: string };
  sources?: string[];
}

/** A sequence puzzle is 5 items, one per row; the 5th is the answer. */
export const CHAIN_CLUES = 5;

/**
 * Bring a stored or model-written object into the current shape. Older puzzles kept the 5th item
 * in a separate `answer` field (with 4 clues) plus accepted phrasings/answers; those are folded in.
 */
export function normalizeChain(raw: unknown): ChainPuzzle {
  const o = (raw ?? {}) as Record<string, unknown>;
  const strs = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : []);
  let clues = strs(o.clues);
  const answer = typeof o.answer === 'string' ? o.answer.trim() : '';
  if (answer && clues.length === CHAIN_CLUES - 1) clues = [...clues, answer];
  const t = o.topical as Record<string, unknown> | undefined;
  return {
    connection: String(o.connection ?? '').trim(),
    clues,
    explanation: String(o.explanation ?? '').trim(),
    category: String(o.category ?? '').trim(),
    difficulty: Math.round(Number(o.difficulty)) || 0,
    ...(t && typeof t === 'object' ? { topical: { used: t.used === true, note: String(t.note ?? '').trim() } } : {}),
    ...(Array.isArray(o.sources) ? { sources: strs(o.sources) } : {}),
  };
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

/** Deterministic checks a puzzle must pass before it can be approved. */
export function validateChain(p: Partial<ChainPuzzle> | null | undefined): string[] {
  const e: string[] = [];
  if (!p || typeof p !== 'object') return ['not a puzzle object'];
  const str = (v: unknown) => typeof v === 'string' && v.trim().length > 0;
  if (!str(p.connection)) e.push('connection is missing');
  else if (p.connection!.length > 120) e.push('connection is longer than 120 characters');
  if (!Array.isArray(p.clues) || p.clues.length !== CHAIN_CLUES) e.push(`needs exactly ${CHAIN_CLUES} items (the last is the answer)`);
  else {
    if (!p.clues.every(str)) e.push('every item must be non-empty text');
    if (p.clues.some((c) => String(c).length > 60)) e.push('items must be 60 characters or fewer');
  }
  if (!str(p.explanation)) e.push('explanation is missing');
  if (!str(p.category)) e.push('category is missing');
  if (!Number.isInteger(p.difficulty) || p.difficulty! < 1 || p.difficulty! > 5) e.push('difficulty must be 1–5');
  return e;
}
