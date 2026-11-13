import { CLUE_COUNT } from '../rules/types';
import type { Outcome } from './game';

export const SITE = 'theclew.fyi';

export const OUTCOME_EMOJI: Record<Outcome, string> = { miss: '❌', skip: '⏭️', solved: '✅' };

/** counts[k] = players who solved on clue k (1..CLUE_COUNT); counts[0] = unsolved. */
export function neededMorePercent(counts: number[], solvedOn: number): number | null {
  const total = counts.reduce((a, b) => a + b, 0);
  if (!total || solvedOn < 1) return null;
  const more = counts[0] + counts.slice(solvedOn + 1).reduce((a, b) => a + b, 0);
  return Math.round((more / total) * 100);
}

export function solvedPercent(counts: number[]): number | null {
  const total = counts.reduce((a, b) => a + b, 0);
  if (!total) return null;
  return Math.round(((total - counts[0]) / total) * 100);
}

/** One friendly line that changes with how the day went. */
export function resultLine(solvedOn: number): string {
  if (solvedOn === 1) return 'Got it on the first clue 🤯';
  if (solvedOn === CLUE_COUNT) return `Got there on clue ${CLUE_COUNT}, phew 😅`;
  if (solvedOn > 1) return `Untangled it on clue ${solvedOn} of ${CLUE_COUNT} 🎉`;
  return 'Totally tangled today 🙈';
}

export function shareText(puzzleNo: number, solvedOn: number, outcomes: Outcome[]): string {
  return [`🧶 The Clew #${puzzleNo}`, resultLine(solvedOn), outcomes.map((o) => OUTCOME_EMOJI[o]).join(' '), SITE].join('\n');
}
