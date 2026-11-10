import { getRule } from '../src/rules';
import { matchesAnyPhrasing, normalizeGuess } from '../src/lib/fuzzy';
import { getSql } from './_lib/db';
import { askGemini, type Judgement } from './_lib/gemini';
import { clientIp, hashIp, json, readJson } from './_lib/http';
import { withinRateLimit } from './_lib/ratelimit';

const JUDGE_LIMIT_PER_HOUR = 30;

export async function POST(req: Request): Promise<Response> {
  const body = await readJson<{ ruleId?: unknown; guess?: unknown }>(req);
  if (!body || typeof body.ruleId !== 'string' || typeof body.guess !== 'string') return json({ error: 'bad request' }, 400);
  const rule = getRule(body.ruleId);
  if (!rule) return json({ error: 'unknown rule' }, 404);
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
    judgement = await askGemini(rule, guess);
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
