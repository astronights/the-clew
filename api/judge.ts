import { chainToRule } from '../src/lib/chain';
import { puzzleNumber } from '../src/lib/daily';
import { getRule } from '../src/rules';
import type { Rule } from '../src/rules/types';
import { matchesAnyPhrasing, normalizeGuess } from '../src/lib/fuzzy';
import { getSql } from './_lib/db';
import { askGemini, type JudgeContext, type Judgement } from './_lib/gemini';
import { clientIp, hashIp, json, readJson } from './_lib/http';
import { getPuzzle } from './_lib/puzzles';
import { withinRateLimit } from './_lib/ratelimit';

const JUDGE_LIMIT_PER_HOUR = 30;

/** A built-in rule id, or "chain:N" for the approved AI puzzle of day N (never a future day). */
async function findRule(ruleId: string): Promise<{ rule: Rule; ctx: JudgeContext } | null> {
  const m = ruleId.match(/^chain:(\d+)$/);
  if (!m) {
    const rule = getRule(ruleId);
    return rule ? { rule, ctx: {} } : null;
  }
  const no = Number(m[1]);
  const sql = getSql();
  if (!sql || no > puzzleNumber()) return null;
  const p = await getPuzzle(sql, no);
  if (!p || p.status !== 'approved') return null;
  const d = p.data;
  return {
    rule: chainToRule(no, d),
    ctx: { detail: `Sequence shown to the player, in order: ${d.clues.join(' → ')}. The 5th item is ${d.answer}. ${d.explanation}` },
  };
}

export async function POST(req: Request): Promise<Response> {
  const body = await readJson<{ ruleId?: unknown; guess?: unknown }>(req);
  if (!body || typeof body.ruleId !== 'string' || typeof body.guess !== 'string') return json({ error: 'bad request' }, 400);
  const found = await findRule(body.ruleId);
  if (!found) return json({ error: 'unknown rule' }, 404);
  const { rule, ctx } = found;
  const guess = body.guess.trim().slice(0, 200);
  const normalized = normalizeGuess(guess);
  if (!normalized) return json({ verdict: 'wrong', hint: 'Describe a pattern the ✅ items share.' } satisfies Judgement);

  // Accepted phrasings never need the model.
  if (matchesAnyPhrasing(guess, rule.acceptedPhrasings)) return json({ verdict: 'correct', hint: 'Nice thinking — prove it!' });

  const sql = getSql();
  if (sql) {
    try {
      if (!(await withinRateLimit(sql, hashIp(clientIp(req)), 'judge', JUDGE_LIMIT_PER_HOUR)))
        return json({ error: 'rate limited' }, 429, { 'retry-after': '3600' });
      const hit = (await sql.query('select verdict, hint from verdict_cache where rule_id = $1 and normalized_guess = $2', [
        rule.id,
        normalized,
      ])) as Judgement[];
      if (hit[0]) return json({ verdict: hit[0].verdict, hint: hit[0].hint, cached: true });
    } catch (err) {
      console.error('db read failed', err);
    }
  }

  let judgement: Judgement;
  try {
    judgement = await askGemini(rule, guess, ctx);
  } catch (err) {
    console.error('judge failed', err);
    return json({ error: 'judge unavailable' }, 503);
  }

  if (sql) {
    try {
      await sql.query(
        `insert into verdict_cache (rule_id, normalized_guess, verdict, hint) values ($1, $2, $3, $4)
         on conflict (rule_id, normalized_guess) do nothing`,
        [rule.id, normalized, judgement.verdict, judgement.hint],
      );
    } catch (err) {
      console.error('cache write failed', err);
    }
  }
  return json(judgement);
}
