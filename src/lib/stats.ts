import { load, save } from './storage';

export interface Stats {
  played: number;
  solved: number;
  currentStreak: number;
  maxStreak: number;
  /** dist[0] = unsolved, dist[k] = solved on clue k */
  dist: number[];
  lastPlayed: number | null;
  lastSolved: number | null;
}

const KEY = 'clew:stats:v1';
export const emptyStats = (): Stats => ({
  played: 0,
  solved: 0,
  currentStreak: 0,
  maxStreak: 0,
  dist: [0, 0, 0, 0, 0, 0],
  lastPlayed: null,
  lastSolved: null,
});

export function applyResult(s: Stats, puzzleNo: number, solvedOn: number): Stats {
  if (s.lastPlayed !== null && puzzleNo <= s.lastPlayed) return s; // already counted
  const dist = s.dist.slice();
  dist[solvedOn] = (dist[solvedOn] ?? 0) + 1;
  const solved = solvedOn > 0;
  const streak = solved ? (s.lastSolved === puzzleNo - 1 ? s.currentStreak + 1 : 1) : 0;
  return {
    played: s.played + 1,
    solved: s.solved + (solved ? 1 : 0),
    currentStreak: streak,
    maxStreak: Math.max(s.maxStreak, streak),
    dist,
    lastPlayed: puzzleNo,
    lastSolved: solved ? puzzleNo : s.lastSolved,
  };
}

/** Streak as displayed today: it lapses once a day is missed. */
export function displayedStreak(s: Stats, today: number): number {
  if (s.lastSolved === null) return 0;
  return s.lastSolved >= today - 1 ? s.currentStreak : 0;
}

export const loadStats = (): Stats => ({ ...emptyStats(), ...load<Partial<Stats>>(KEY, {}) });
export const saveStats = (s: Stats) => save(KEY, s);
