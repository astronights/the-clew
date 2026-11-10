import { describe, expect, it } from 'vitest';
import { aliveDecoys, eliminates } from '../src/lib/elimination';
import { selectExam } from '../src/lib/exam';
import { applyVerdict, guessItem, newGame, submitExam } from '../src/lib/game';
import { itemKey } from '../src/lib/items';
import { getRule, RULES } from '../src/rules';

describe('exam selection', () => {
  it('returns 3 unseen items with correct answers and a mix of ✅/❌', () => {
    for (const r of RULES) {
      for (let k = 1; k <= 5; k++) {
        const seen = r.clues.slice(0, k);
        const exam = selectExam(r, seen, 'test');
        expect(exam).toHaveLength(3);
        const seenKeys = new Set(seen.map((c) => itemKey(r.domain, c.item)));
        for (const q of exam) {
          expect(seenKeys.has(itemKey(r.domain, q.item))).toBe(false);
          expect(q.pass).toBe(r.predicate(q.item));
        }
        expect(new Set(exam.map((q) => itemKey(r.domain, q.item))).size).toBe(3);
        const passes = exam.filter((q) => q.pass).length;
        expect(passes).toBeGreaterThan(0);
        expect(passes).toBeLessThan(3);
      }
    }
  });
  it('breaks decoys that are still consistent with what the player has seen', () => {
    let broken = 0;
    let total = 0;
    for (const r of RULES) {
      const seen = r.clues.slice(0, 1);
      const alive = aliveDecoys(r, seen);
      const exam = selectExam(r, seen, 'x');
      for (const d of alive) {
        total++;
        if (exam.some((q) => eliminates(d, q))) broken++;
      }
    }
    // three items can't always break five decoys, but they should break most
    expect(broken / total).toBeGreaterThan(0.8);
  });
  it('is deterministic for a seed', () => {
    const r = getRule('word-has-e')!;
    expect(selectExam(r, r.clues.slice(0, 2), 's')).toEqual(selectExam(r, r.clues.slice(0, 2), 's'));
  });
});

describe('game flow', () => {
  const r = getRule('num-contains-7')!;
  it('guessing an item records it and reveals the next clue', () => {
    let g = newGame(r, 'seed');
    g = guessItem(r, g, 70);
    expect(g.revealed).toBe(2);
    expect(g.entries.map((e) => e.kind)).toEqual(['clue', 'guess', 'clue']);
  });
  it('correct verdict + perfect exam = solved on the current clue', () => {
    let g = newGame(r, 'seed');
    g = guessItem(r, g, 70);
    g = applyVerdict(r, g, 'contains a 7', 'correct');
    expect(g.status).toBe('exam');
    g = submitExam(r, g, g.exam!.map((q) => q.pass));
    expect(g.status).toBe('solved');
    expect(g.solvedOn).toBe(2);
  });
  it('a missed exam question reveals the next clue', () => {
    let g = applyVerdict(r, newGame(r, 'seed'), 'contains a 7', 'correct');
    g = submitExam(r, g, g.exam!.map((q, i) => (i === 0 ? !q.pass : q.pass)));
    expect(g.status).toBe('playing');
    expect(g.revealed).toBe(2);
  });
  it('"close" gets one free retry per clue, then counts as wrong', () => {
    let g = applyVerdict(r, newGame(r, 'seed'), 'has a big digit', 'close', 'warm');
    expect(g.revealed).toBe(1);
    g = applyVerdict(r, g, 'has a big digit', 'close');
    expect(g.revealed).toBe(2);
  });
  it('wrong after clue 5 fails the puzzle', () => {
    let g = newGame(r, 'seed');
    for (let i = 0; i < 4; i++) g = applyVerdict(r, g, 'nope', 'wrong');
    expect(g.revealed).toBe(5);
    expect(guessItem(r, g, 7)).toBe(g); // no item tests after clue 5
    g = applyVerdict(r, g, 'nope', 'wrong');
    expect(g.status).toBe('failed');
    expect(g.solvedOn).toBe(0);
  });
});
