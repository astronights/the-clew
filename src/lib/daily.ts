import { LIBRARY, type LibraryPuzzle } from '../puzzles/library';
import { rngFor, shuffle } from './rng';

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

function cycleOrder(cycle: number): LibraryPuzzle[] {
  const order = shuffle(LIBRARY, rngFor(`library:cycle:${cycle}`));
  if (cycle > 0 && order.length > 1) {
    const prev = shuffle(LIBRARY, rngFor(`library:cycle:${cycle - 1}`));
    // never repeat a puzzle across a cycle boundary
    if (order[0].id === prev[prev.length - 1].id) [order[0], order[1]] = [order[1], order[0]];
  }
  return order;
}

/**
 * The built-in puzzle for day n, used when no AI puzzle is approved for that day.
 * Goes through the whole library in a seeded order before repeating.
 */
export function libraryPuzzleFor(n: number): LibraryPuzzle {
  const k = Math.max(0, n - 1);
  return cycleOrder(Math.floor(k / LIBRARY.length))[k % LIBRARY.length];
}

/** ms until the next 00:00 UTC. */
export function msUntilNextPuzzle(now = Date.now()): number {
  return DAY - ((now - EPOCH_UTC) % DAY);
}
