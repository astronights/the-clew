import { afterEach, describe, expect, it, vi } from 'vitest';
import { askGemini, decisionInstructions, FALLBACK_JUDGE_MODEL } from '../api/_lib/gemini';
import { fromChain } from '../src/lib/puzzle';
import { LIBRARY } from '../src/puzzles/library';

const puzzle = fromChain('chain:1', LIBRARY[0]);
const ok = (verdict: string, reason = 'because') =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ verdict, reason }) }] } }] }), { status: 200 });

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GEMINI_MODEL;
  delete process.env.GEMINI_API_KEY;
});

const decision = (noul: number) =>
  new Response(JSON.stringify({ answers: { correct: { type: 'noul', noul, confidence: Math.max(noul, 1 - noul) } } }), { status: 200 });

describe('judging with a decision model (Decisions API)', () => {
  it('sends one yes/no question to /v1beta/decisions and reads P(correct)', async () => {
    process.env.GEMINI_API_KEY = 'test';
    process.env.GEMINI_MODEL = 'gemini-decision-1';
    let sent: { url: string; body: Record<string, unknown>; headers: Record<string, string> } | null = null;
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      sent = { url, body: JSON.parse(String(init.body)), headers: init.headers as Record<string, string> };
      return decision(0.93);
    });
    vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(await askGemini(puzzle, 'the planets in order')).toMatchObject({ verdict: 'correct', model: 'gemini-decision-1', pCorrect: 0.93 });
    expect(sent!.url).toBe('https://generativelanguage.googleapis.com/v1beta/decisions');
    expect(sent!.headers['x-goog-api-key']).toBe('test');
    expect(sent!.body.model).toBe('gemini-decision-1');
    expect(String(sent!.body.input)).toContain('<guess>the planets in order</guess>');
    const q = (sent!.body.questions as Record<string, { type: string; instructions: string }>).correct;
    expect(q.type).toBe('noul');
    expect(q.instructions).toBe(decisionInstructions());
  });
  it('maps low probabilities to close / wrong', async () => {
    process.env.GEMINI_API_KEY = 'test';
    process.env.GEMINI_MODEL = 'gemini-decision-1';
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.stubGlobal('fetch', async () => decision(0.3));
    expect((await askGemini(puzzle, 'space')).verdict).toBe('close');
    vi.stubGlobal('fetch', async () => decision(0.05));
    expect((await askGemini(puzzle, 'cheese')).verdict).toBe('wrong');
  });
  it('the decision instructions keep the rules but drop the JSON output section', () => {
    const t = decisionInstructions();
    expect(t).toContain('## Worked examples');
    expect(t).not.toContain('Respond with JSON');
    expect(t).toMatch(/Answer \*\*true\*\* only if your verdict would be "correct"/);
  });
});

describe('judge model fallback', () => {
  it('uses the fallback model when the configured one rejects the request', async () => {
    process.env.GEMINI_API_KEY = 'test';
    process.env.GEMINI_MODEL = 'gemini-decision-1';
    const calls: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      calls.push(url);
      return url.includes('/decisions') ? new Response('{"error":{"code":400,"message":"unsupported"}}', { status: 400 }) : ok('correct');
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await askGemini(puzzle, 'planets')).toMatchObject({ verdict: 'correct', model: FALLBACK_JUDGE_MODEL, fallbackFrom: 'gemini-decision-1' });
    expect(calls).toHaveLength(2);
    expect(calls[1]).toContain(FALLBACK_JUDGE_MODEL);
  });
  it('uses the configured model when it works', async () => {
    process.env.GEMINI_API_KEY = 'test';
    process.env.GEMINI_MODEL = 'gemini-3.8-flash';
    const calls: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      calls.push(url);
      return ok('close');
    });
    expect(await askGemini(puzzle, 'space')).toMatchObject({ verdict: 'close', reason: 'because', model: 'gemini-3.8-flash' });
    expect(calls).toHaveLength(1);
  });
});
