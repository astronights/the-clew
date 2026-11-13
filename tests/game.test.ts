import { describe, expect, it } from 'vitest';
import { CLUE_COUNT, isLastClue, newGame, observations, skip, submit } from '../src/lib/game';
import { getRule } from '../src/rules';

const r = getRule('num-contains-7')!;

describe('game flow', () => {
  it('starts with clue 1 showing', () => {
    const g = newGame(r, 's');
    expect(g.revealed).toBe(1);
    expect(g.entries).toHaveLength(1);
    expect(CLUE_COUNT).toBe(4);
  });
  it('a right rule solves on the current clue, whatever the 5th did', () => {
    const g = submit(r, newGame(r, 's'), 12, 'contains a 7', true);
    expect(g.status).toBe('solved');
    expect(g.solvedOn).toBe(1);
    expect(g.outcomes).toEqual(['solved']);
    const pinned = g.entries[1];
    expect(pinned.kind).toBe('attempt');
    expect(pinned.pass).toBe(false); // 12 has no 7: pinned as "doesn't fit"
  });
  it('a wrong rule pins the 5th and reveals the next clue', () => {
    const g = submit(r, newGame(r, 's'), 70, 'is odd', false);
    expect(g.status).toBe('playing');
    expect(g.revealed).toBe(2);
    expect(g.entries.map((e) => e.kind)).toEqual(['clue', 'attempt', 'clue']);
    expect(g.outcomes).toEqual(['miss']);
    expect(observations(g)).toHaveLength(3);
  });
  it('skip reveals the next clue without guessing', () => {
    const g = skip(r, newGame(r, 's'));
    expect(g.revealed).toBe(2);
    expect(g.outcomes).toEqual(['skip']);
  });
  it('after the last clue a miss or skip ends the game unsolved', () => {
    let g = newGame(r, 's');
    for (let i = 1; i < CLUE_COUNT; i++) g = skip(r, g);
    expect(isLastClue(g)).toBe(true);
    const missed = submit(r, g, 7, 'nope', false);
    expect(missed.status).toBe('failed');
    expect(missed.solvedOn).toBe(0);
    expect(skip(r, g).status).toBe('failed');
  });
  it('solving on clue 3 after a miss and a skip', () => {
    let g = submit(r, newGame(r, 's'), 5, 'odd', false);
    g = skip(r, g);
    g = submit(r, g, 77, 'has a seven', true);
    expect(g.solvedOn).toBe(3);
    expect(g.outcomes).toEqual(['miss', 'skip', 'solved']);
  });
  it('ignores input once the game is over', () => {
    const done = submit(r, newGame(r, 's'), 7, 'has a 7', true);
    expect(submit(r, done, 8, 'x', false)).toBe(done);
    expect(skip(r, done)).toBe(done);
  });
});
