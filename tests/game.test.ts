import { describe, expect, it } from 'vitest';
import { canOpenNext, giveUp, guessRule, newGame, next, ROWS } from '../src/lib/game';
import { fromChain } from '../src/lib/puzzle';
import type { ChainPuzzle } from '../src/lib/chain';

const planets: ChainPuzzle = {
  connection: 'Planets in order from the Sun',
  clues: ['Freddie Mercury', 'Venus flytrap', 'Earth Day', 'Mars bar', 'Planet Jupiter'],
  explanation: '',
  category: 'Science',
  difficulty: 1,
};
const p = fromChain('lib:test', planets);

describe('puzzle rows', () => {
  it('are the 5 items, the last being the answer', () => {
    expect(ROWS).toBe(5);
    expect(p.rows).toEqual(['Freddie Mercury', 'Venus flytrap', 'Earth Day', 'Mars bar', 'Planet Jupiter']);
  });
});

describe('game flow', () => {
  it('starts with only clue 1 open', () => {
    const g = newGame(p, 's');
    expect(g.revealed).toBe(1);
  });
  it('next opens a row', () => {
    const g = next(newGame(p, 's'));
    expect(g.revealed).toBe(2);
    expect(g.outcomes).toEqual(['next']);
  });
  it('a right rule solves on the current row; a wrong one opens the next', () => {
    expect(guessRule(newGame(p, 's'), 'planets', true)).toMatchObject({ status: 'solved', solvedOn: 1, outcomes: ['solved'] });
    const g = guessRule(newGame(p, 's'), 'space things', false);
    expect(g.revealed).toBe(2);
    expect(g.outcomes).toEqual(['miss']);
  });
  it('no next clue on the last row; a wrong rule there ends the game', () => {
    let g = newGame(p, 's');
    for (let i = 1; i < ROWS; i++) g = next(g);
    expect(canOpenNext(g)).toBe(false);
    expect(next(g)).toBe(g);
    expect(guessRule(g, 'nope', false)).toMatchObject({ status: 'failed', solvedOn: 0 });
    expect(giveUp(g).status).toBe('failed');
  });
  it('ignores input once the game is over', () => {
    const done = guessRule(newGame(p, 's'), 'planets', true);
    expect(guessRule(done, 'x', false)).toBe(done);
    expect(next(done)).toBe(done);
  });
});
