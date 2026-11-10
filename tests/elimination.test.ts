import { describe, expect, it } from 'vitest';
import { aliveDecoys, eliminationTrace } from '../src/lib/elimination';
import { generateClues } from '../src/lib/cluegen';
import { validateAll, validateRule } from '../src/lib/validate';
import { getRule, RULES } from '../src/rules';

describe('clue / decoy elimination', () => {
  it('every rule passes validation (clues match predicates, decoys all eliminated, pass rate 20–60%)', () => {
    const bad = validateAll().filter((r) => r.errors.length);
    expect(bad).toEqual([]);
  });
  it('each clue removes at least one still-alive decoy', () => {
    for (const r of RULES) {
      const trace = eliminationTrace(r);
      expect(trace).toHaveLength(5);
      for (const removed of trace) expect(removed.length).toBeGreaterThan(0);
      expect(aliveDecoys(r, r.clues)).toEqual([]);
    }
  });
  it('clues have 3–4 passes and open with a pass', () => {
    for (const r of RULES) {
      const passes = r.clues.filter((c) => c.pass).length;
      expect(passes).toBeGreaterThanOrEqual(3);
      expect(passes).toBeLessThanOrEqual(4);
      expect(r.clues[0].pass).toBe(true);
    }
  });
  it('decoys narrow down as clues are revealed', () => {
    const r = getRule('num-odd-digit-sum')!;
    const counts = [0, 1, 2, 3, 4, 5].map((k) => aliveDecoys(r, r.clues.slice(0, k)).length);
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeLessThan(counts[i - 1]);
    expect(counts[5]).toBe(0);
  });
  it('validator flags a clue whose verdict disagrees with the predicate', () => {
    const r = getRule('num-even')!;
    const broken = { ...r, clues: r.clues.map((c, i) => (i === 0 ? { ...c, pass: !c.pass } : c)) };
    expect(validateRule(broken).errors.join(' ')).toMatch(/predicate disagrees/);
  });
  it('generator reproduces valid clues', () => {
    const r = getRule('seq-middle-largest')!;
    const clues = generateClues(r);
    expect(clues).not.toBeNull();
    expect(validateRule({ ...r, clues: clues! }).errors).toEqual([]);
  });
});
