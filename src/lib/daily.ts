const DAY = 86_400_000;
/** Every player gets the next puzzle at the same instant: 03:14:15 UTC (π o'clock). */
export const ROLLOVER_UTC = { hour: 3, minute: 14, second: 15 };
/** Puzzle #1 went live 2026-09-30 at 03:14:15 UTC. */
export const EPOCH_UTC = Date.UTC(2026, 8, 30, ROLLOVER_UTC.hour, ROLLOVER_UTC.minute, ROLLOVER_UTC.second);

export function puzzleNumber(now: Date | number = Date.now()): number {
  const t = typeof now === 'number' ? now : now.getTime();
  return Math.floor((t - EPOCH_UTC) / DAY) + 1;
}

/** The moment puzzle n goes live (its UTC calendar date is the puzzle's date). */
export function dateOfPuzzle(n: number): Date {
  return new Date(EPOCH_UTC + (n - 1) * DAY);
}

/** ms until the next 03:14:15 UTC. */
export function msUntilNextPuzzle(now = Date.now()): number {
  return DAY - ((((now - EPOCH_UTC) % DAY) + DAY) % DAY);
}

/** The daily rollover in the viewer's own clock, e.g. "8:44:15 am". */
export function rolloverLocalTime(locale?: string): string {
  return new Date(EPOCH_UTC).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}
