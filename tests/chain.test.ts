import { describe, expect, it } from 'vitest';
import { chainToRule, matchesAnswer, validateChain, type ChainPuzzle } from '../src/lib/chain';
import { normalizeAnswer } from '../src/lib/items';
import { coercePuzzle, extractJson, fillPrompt, loadPromptTemplate, promptFor } from '../api/_lib/generator';
import { requireAdmin } from '../api/_lib/admin';

const planets: ChainPuzzle = {
  connection: 'Planets in order from the Sun',
  acceptedPhrasings: ['planets in order', 'planets from the sun', 'order of the planets'],
  clues: ['Mercury', 'Venus', 'Earth', 'Mars'],
  answer: 'Jupiter',
  acceptedAnswers: ['Jupiter'],
  explanation: 'After Mars comes Jupiter.',
  category: 'Science',
  difficulty: 1,
};

describe('answers', () => {
  it('normalise case, accents, punctuation and a leading article, in any script', () => {
    expect(normalizeAnswer('  The Moon! ')).toBe('moon');
    expect(normalizeAnswer('Pokémon')).toBe('pokemon');
    expect(normalizeAnswer('Rock & Roll')).toBe('rock and roll');
    expect(normalizeAnswer('東京')).toBe('東京');
    expect(normalizeAnswer('Ελλάδα')).toBe('ελλαδα');
  });
  it('match any accepted spelling', () => {
    const p = { answer: 'Queen Elizabeth II', acceptedAnswers: ['Queen Elizabeth II', 'Elizabeth II', 'Elizabeth the Second'] };
    expect(matchesAnswer(p, 'elizabeth ii')).toBe(true);
    expect(matchesAnswer(p, 'Victoria')).toBe(false);
    expect(matchesAnswer(p, '   ')).toBe(false);
  });
  it('become a playable rule whose clues all fit and whose 5th is checked by code', () => {
    const r = chainToRule(50, planets);
    expect(r.id).toBe('chain:50');
    expect(r.clues).toHaveLength(5);
    expect(r.clues[4].item).toBe('Jupiter');
    expect(r.clues.every((c) => c.pass)).toBe(true);
    expect(r.predicate('jupiter')).toBe(true);
    expect(r.predicate('Saturn')).toBe(false);
  });
});

describe('puzzle checks', () => {
  it('accept a good puzzle', () => expect(validateChain(planets)).toEqual([]));
  it('catch the usual mistakes', () => {
    expect(validateChain({ ...planets, clues: ['Mercury', 'Venus', 'Earth'] }).join()).toMatch(/exactly 4 clues/);
    expect(validateChain({ ...planets, clues: ['Mercury', 'Venus', 'venus', 'Mars'] }).join()).toMatch(/different/);
    expect(validateChain({ ...planets, acceptedAnswers: ['Saturn'] }).join()).toMatch(/include the answer/);
    expect(validateChain({ ...planets, answer: 'Mars', acceptedAnswers: ['Mars'] }).join()).toMatch(/already be one of the clues/);
    expect(validateChain({ ...planets, acceptedPhrasings: ['x'] }).join()).toMatch(/3 accepted phrasings/);
    expect(validateChain({ ...planets, difficulty: 9 }).join()).toMatch(/difficulty/);
    expect(validateChain(null)).toEqual(['not a puzzle object']);
  });
});

describe('generator', () => {
  it('sends only the part of the prompt after ---, with every placeholder filled', () => {
    const t = loadPromptTemplate();
    expect(t).not.toMatch(/^# The Clew — puzzle writer prompt/);
    for (const k of ['PUZZLE_NO', 'DATE', 'DIFFICULTY', 'AVOID', 'EXTRA']) expect(t).toContain(`{{${k}}}`);
    const filled = promptFor(48, ['- Greek letters (Language)'], 'make it about music');
    expect(filled).not.toMatch(/\{\{\w+\}\}/);
    expect(filled).toContain('No. 48');
    expect(filled).toContain('Greek letters');
    expect(filled).toContain('make it about music');
    expect(filled).toMatch(/Monday,? 16 November 2026/);
  });
  it('leaves unknown placeholders alone', () => expect(fillPrompt('a {{X}} {{Y}}', { X: '1' })).toBe('a 1 {{Y}}'));
  it('pulls JSON out of a chatty reply and coerces it', () => {
    const raw = extractJson('Sure! Here it is:\n```json\n' + JSON.stringify({ ...planets, acceptedAnswers: [], difficulty: '2' }) + '\n```');
    const p = coercePuzzle(raw);
    expect(p.acceptedAnswers).toEqual(['Jupiter']);
    expect(p.difficulty).toBe(2);
    expect(validateChain(p)).toEqual([]);
    expect(() => extractJson('no json here')).toThrow();
  });
});

describe('admin auth', () => {
  const req = (auth?: string) => new Request('http://x/api/admin/puzzles', { headers: auth ? { authorization: auth } : {} });
  it('is disabled without a long ADMIN_TOKEN', () => {
    delete process.env.ADMIN_TOKEN;
    expect(requireAdmin(req('Bearer anything'))?.status).toBe(503);
  });
  it('checks the bearer token', () => {
    process.env.ADMIN_TOKEN = 'correct-horse-battery';
    expect(requireAdmin(req('Bearer correct-horse-battery'))).toBeNull();
    expect(requireAdmin(req('Bearer wrong'))?.status).toBe(401);
    expect(requireAdmin(req())?.status).toBe(401);
    delete process.env.ADMIN_TOKEN;
  });
});

import { matchesRow } from '../src/lib/chain';

describe('guessing a disguised row', () => {
  it('accepts the listed forms', () => {
    expect(matchesRow(['Beta version', 'Beta'], 'beta', true)).toBe(true);
    expect(matchesRow(['Beta version', 'Beta'], 'version', true)).toBe(false);
  });
  it('without a list, accepts whole words from the clue', () => {
    expect(matchesRow(['Beta version'], 'Beta', false)).toBe(true);
    expect(matchesRow(['Beta version'], 'bet', false)).toBe(false);
    expect(matchesRow(['Delta blues'], 'Gamma', false)).toBe(false);
  });
  it('puzzle check requires 4 lists when clueAnswers is given', () => {
    expect(validateChain({ ...planets, clueAnswers: [['Mercury']] }).join()).toMatch(/clueAnswers/);
    expect(validateChain({ ...planets, clueAnswers: [['Mercury'], ['Venus'], ['Earth'], ['Mars']] })).toEqual([]);
  });
});
