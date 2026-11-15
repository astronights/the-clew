import { describe, expect, it } from 'vitest';
import { normalizeChain, validateChain, type ChainPuzzle } from '../src/lib/chain';
import { matchesRow, normalizeAnswer } from '../src/lib/answer';
import { coercePuzzle, extractJson, fillPrompt, loadPromptTemplate, promptFor } from '../api/_lib/generator';
import { requireAdmin } from '../api/_lib/admin';

const planets: ChainPuzzle = {
  connection: 'Planets in order from the Sun',
  clues: ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter'],
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
  it('match an item or a whole word of it', () => {
    expect(matchesRow(['Queen Elizabeth II'], 'elizabeth ii', false)).toBe(true);
    expect(matchesRow(['Queen Elizabeth II'], 'Victoria', false)).toBe(false);
    expect(matchesRow(['Queen Elizabeth II'], '   ', false)).toBe(false);
  });
});

describe('puzzle checks', () => {
  it('accept a good puzzle', () => expect(validateChain(planets)).toEqual([]));
  it('catch the usual mistakes', () => {
    expect(validateChain({ ...planets, clues: ['Mercury', 'Venus', 'Earth', 'Mars'] }).join()).toMatch(/exactly 5 items/);
    expect(validateChain({ ...planets, clues: ['Mercury', 'Venus', 'venus', 'Mars', 'Jupiter'] }).join()).toMatch(/different/);
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
    const raw = extractJson('Sure! Here it is:\n```json\n' + JSON.stringify({ ...planets, difficulty: '2' }) + '\n```');
    const p = coercePuzzle(raw);
    expect(p.clues).toHaveLength(5);
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
  it('older puzzles with a separate answer are folded into 5 items', () => {
    const old = { connection: 'x', acceptedPhrasings: ['a'], clues: ['Mercury', 'Venus', 'Earth', 'Mars'], clueAnswers: [], answer: 'Jupiter', acceptedAnswers: ['Jupiter'], explanation: 'e', category: 'c', difficulty: 1 };
    const p = normalizeChain(old);
    expect(p.clues).toEqual(['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter']);
    expect(Object.keys(p)).not.toContain('answer');
    expect(validateChain(p)).toEqual([]);
  });
});

import { revisePromptFor } from '../api/_lib/generator';

describe('AI revision prompt', () => {
  it('keeps the house rules and includes the instruction and current puzzle', () => {
    const t = revisePromptFor(48, planets, 'make clue 1 harder', ['- Greek letters (Language)']);
    expect(t).toContain('make clue 1 harder');
    expect(t).toContain('"Jupiter"');
    expect(t).toContain('Greek letters');
    expect(t).toMatch(/Apply \*\*only\*\* what they ask for/);
    expect(t).not.toMatch(/\{\{\w+\}\}/);
  });
});

import { generationSettings, isGemini3 } from '../api/_lib/modelConfig';

describe('model settings', () => {
  it('detects Gemini 3.x models', () => {
    expect(isGemini3('gemini-3.8-flash')).toBe(true);
    expect(isGemini3('gemini-3-flash-preview')).toBe(true);
    expect(isGemini3('gemini-2.5-flash')).toBe(false);
  });
  it('leaves temperature alone and lowers thinking on Gemini 3.x', () => {
    const s = generationSettings('gemini-3.8-flash', 'judge');
    expect(s).not.toHaveProperty('temperature');
    expect(s.thinkingConfig).toEqual({ thinkingLevel: 'low' });
    expect(s.maxOutputTokens).toBeGreaterThanOrEqual(4096);
  });
  it('keeps 2.5 deterministic for judging with thinking off', () => {
    expect(generationSettings('gemini-2.5-flash', 'judge')).toEqual({ temperature: 0, maxOutputTokens: 512, thinkingConfig: { thinkingBudget: 0 } });
  });
});

import { batchPromptFor, extractJsonArray } from '../api/_lib/generator';

describe('writing a week in one request', () => {
  it('lists every day with its difficulty and asks for a JSON array', () => {
    const t = batchPromptFor([48, 49, 50], ['- Greek letters (Language)']);
    expect(t).toContain('Write **3 puzzles**');
    expect(t).toMatch(/puzzleNo 48: Monday,? 16 November 2026, difficulty 1/);
    expect(t).toMatch(/puzzleNo 50: Wednesday,? 18 November 2026, difficulty 2/);
    expect(t).toContain('only a JSON array');
    expect(t).toContain('Greek letters');
    expect(t).not.toMatch(/\{\{\w+\}\}/);
  });
  it('pulls the array out of a chatty reply', () => {
    const arr = extractJsonArray('Here you go:\n```json\n[' + JSON.stringify({ ...planets, puzzleNo: 48 }) + ']\n```');
    expect(arr).toHaveLength(1);
    expect(() => extractJsonArray('{"not":"a list"}')).toThrow();
  });
});
