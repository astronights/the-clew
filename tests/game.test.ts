import { describe, expect, it } from 'vitest';
import { canGuess, giveUp, guessesByRow, guessNext, guessRule, newGame, next, ROWS } from '../src/lib/game';
import { fromChain, guessIsRight } from '../src/lib/puzzle';
import type { ChainPuzzle } from '../src/lib/chain';

const planets: ChainPuzzle = {
  connection: 'Planets in order from the Sun',
  acceptedPhrasings: ['planets in order', 'planets from the sun', 'order of the planets'],
  clues: ['Freddie Mercury', 'Venus flytrap', 'Earth Day', 'Mars bar'],
  clueAnswers: [['Mercury'], ['Venus'], ['Earth'], ['Mars']],
  answer: 'Jupiter',
  acceptedAnswers: ['Jupiter', 'Planet Jupiter'],
  explanation: '',
  category: 'Science',
  difficulty: 1,
};
const p = fromChain('lib:test', planets);

describe('puzzle rows', () => {
  it('are the 4 clues plus the answer', () => {
    expect(ROWS).toBe(5);
    expect(p.rows).toEqual(['Freddie Mercury', 'Venus flytrap', 'Earth Day', 'Mars bar', 'Jupiter']);
  });
  it('accept the underlying item for disguised clues, and every spelling of the answer', () => {
    expect(guessIsRight(p, 1, 'venus')).toBe(true);
    expect(guessIsRight(p, 1, 'Venus flytrap')).toBe(true);
    expect(guessIsRight(p, 2, 'Mars')).toBe(false);
    expect(guessIsRight(p, 4, 'planet jupiter')).toBe(true);
    expect(guessIsRight(p, 4, 'Saturn')).toBe(false);
  });
});

describe('game flow', () => {
  it('starts with only clue 1 open', () => {
    const g = newGame(p, 's');
    expect(g.revealed).toBe(1);
  });
  it('a guess opens the next row and is marked on it', () => {
    let g = guessNext(p, newGame(p, 's'), 'Venus');
    g = guessNext(p, g, 'Pluto');
    expect(g.revealed).toBe(3);
    const byRow = guessesByRow(g);
    expect(byRow.get(1)?.pass).toBe(true);
    expect(byRow.get(2)?.pass).toBe(false);
    expect(g.outcomes).toEqual(['test', 'test']);
  });
  it('next opens a row without guessing', () => {
    const g = next(newGame(p, 's'));
    expect(g.revealed).toBe(2);
    expect(g.outcomes).toEqual(['next']);
    expect(guessesByRow(g).size).toBe(0);
  });
  it('a right rule solves on the current row; a wrong one opens the next', () => {
    expect(guessRule(newGame(p, 's'), 'planets', true)).toMatchObject({ status: 'solved', solvedOn: 1, outcomes: ['solved'] });
    const g = guessRule(newGame(p, 's'), 'space things', false);
    expect(g.revealed).toBe(2);
    expect(g.outcomes).toEqual(['miss']);
  });
  it('no guessing on the last row; a wrong rule there ends the game', () => {
    let g = newGame(p, 's');
    for (let i = 1; i < ROWS; i++) g = next(g);
    expect(canGuess(g)).toBe(false);
    expect(guessNext(p, g, 'x')).toBe(g);
    expect(guessRule(g, 'nope', false)).toMatchObject({ status: 'failed', solvedOn: 0 });
    expect(giveUp(g).status).toBe('failed');
  });
  it('ignores input once the game is over', () => {
    const done = guessRule(newGame(p, 's'), 'planets', true);
    expect(guessRule(done, 'x', false)).toBe(done);
    expect(next(done)).toBe(done);
  });
});
