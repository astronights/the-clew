import { describe, expect, it } from 'vitest';
import { canTest, CLUE_COUNT, giveUp, guessesByRow, guessRule, newGame, next, observations, testItem } from '../src/lib/game';
import { chainToRule } from '../src/lib/chain';
import { getRule } from '../src/rules';

const r = getRule('num-contains-7')!;

describe('game flow', () => {
  it('starts with clue 1 showing', () => {
    const g = newGame(r, 's');
    expect(g.revealed).toBe(1);
    expect(g.entries).toHaveLength(1);
    expect(CLUE_COUNT).toBe(5);
  });
  it('testing an item pins it with its verdict and reveals the next clue', () => {
    const g = testItem(r, newGame(r, 's'), 70);
    expect(g.revealed).toBe(2);
    expect(g.entries.map((e) => e.kind)).toEqual(['clue', 'test', 'clue']);
    expect(g.entries[1]).toMatchObject({ kind: 'test', item: 70, pass: true, row: 1 });
    expect(g.outcomes).toEqual(['test']);
    expect(observations(g)).toHaveLength(3);
  });
  it('next opens the next clue without testing', () => {
    const g = next(r, newGame(r, 's'));
    expect(g.revealed).toBe(2);
    expect(g.outcomes).toEqual(['next']);
    expect(guessesByRow(g).size).toBe(0);
  });
  it('each guess is marked on the row it revealed', () => {
    let g = testItem(r, newGame(r, 's'), 70);
    g = testItem(r, g, 12);
    const byRow = guessesByRow(g);
    expect(byRow.get(1)).toMatchObject({ item: 70, pass: true });
    expect(byRow.get(2)).toMatchObject({ item: 12, pass: false });
  });
  it('on sequence days a guess is right only if it is the item it reveals', () => {
    const seq = chainToRule(50, {
      connection: 'Planets in order from the Sun',
      acceptedPhrasings: ['planets in order', 'planets from the sun', 'order of the planets'],
      clues: ['Mercury', 'Venus', 'Earth', 'Mars'],
      answer: 'Jupiter',
      acceptedAnswers: ['Jupiter', 'Planet Jupiter'],
      explanation: '',
      category: 'Science',
      difficulty: 1,
    });
    let g = testItem(seq, newGame(seq, 's'), 'venus');
    g = testItem(seq, g, 'Pluto');
    g = testItem(seq, g, 'Mars');
    g = testItem(seq, g, 'planet jupiter');
    const byRow = guessesByRow(g);
    expect([1, 2, 3, 4].map((i) => byRow.get(i)?.pass)).toEqual([true, false, true, true]);
    expect(g.revealed).toBe(5);
  });
  it('a right rule solves on the current clue', () => {
    const g = guessRule(r, newGame(r, 's'), 'contains a 7', true);
    expect(g.status).toBe('solved');
    expect(g.solvedOn).toBe(1);
    expect(g.outcomes).toEqual(['solved']);
  });
  it('a wrong rule also reveals the next clue', () => {
    const g = guessRule(r, newGame(r, 's'), 'is odd', false);
    expect(g.status).toBe('playing');
    expect(g.revealed).toBe(2);
    expect(g.outcomes).toEqual(['miss']);
    expect(observations(g)).toHaveLength(2); // rule guesses aren't items
  });
  it('no testing on the last clue; a wrong rule there ends the game', () => {
    let g = newGame(r, 's');
    for (let i = 1; i < CLUE_COUNT; i++) g = testItem(r, g, 100 + i);
    expect(canTest(g)).toBe(false);
    expect(testItem(r, g, 5)).toBe(g);
    const missed = guessRule(r, g, 'nope', false);
    expect(missed.status).toBe('failed');
    expect(missed.solvedOn).toBe(0);
    expect(giveUp(g).status).toBe('failed');
  });
  it('solving on clue 3 after a test and a wrong rule', () => {
    let g = testItem(r, newGame(r, 's'), 5);
    g = guessRule(r, g, 'odd', false);
    g = guessRule(r, g, 'has a seven', true);
    expect(g.solvedOn).toBe(3);
    expect(g.outcomes).toEqual(['test', 'miss', 'solved']);
  });
  it('ignores input once the game is over', () => {
    const done = guessRule(r, newGame(r, 's'), 'has a 7', true);
    expect(guessRule(r, done, 'x', false)).toBe(done);
    expect(testItem(r, done, 8)).toBe(done);
  });
});
