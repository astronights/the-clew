const DAY = 86_400_000;
/** Puzzle #1 was 2026-09-30 (UTC). */
export const EPOCH_UTC = Date.UTC(2026, 8, 30);

export function puzzleNumber(now: Date | number = Date.now()): number {
  const t = typeof now === 'number' ? now : now.getTime();
  return Math.floor((t - EPOCH_UTC) / DAY) + 1;
}

export function dateOfPuzzle(n: number): Date {
  return new Date(EPOCH_UTC + (n - 1) * DAY);
}

/** ms until the next 00:00 UTC. */
export function msUntilNextPuzzle(now = Date.now()): number {
  return DAY - ((now - EPOCH_UTC) % DAY);
}
