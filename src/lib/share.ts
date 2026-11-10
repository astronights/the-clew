export const SITE = 'theclew.fyi';

/** counts[k] = players who solved on clue k (k = 1..5); counts[0] = unsolved. */
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

export function threadBar(solvedOn: number): string {
  if (solvedOn < 1) return '🧵🧵🧵🧵🧵 ✂️';
  return '🧵'.repeat(solvedOn) + '⬜'.repeat(5 - solvedOn);
}

export function shareText(puzzleNo: number, solvedOn: number, counts: number[] | null): string {
  const lines = [`🧶 The Clew #${puzzleNo} · ${threadBar(solvedOn)}`];
  if (solvedOn >= 1) {
    const pct = counts ? neededMorePercent(counts, solvedOn) : null;
    lines.push(`Solved on clue ${solvedOn}` + (pct !== null ? ` · ${pct}% needed more` : ''));
  } else {
    const pct = counts ? solvedPercent(counts) : null;
    lines.push('The thread snapped' + (pct !== null ? ` · ${pct}% solved it` : ''));
  }
  lines.push(SITE);
  return lines.join('\n');
}
