/**
 * Seeds the verdict cache with every rule's accepted phrasings (as "correct"),
 * so common guesses never hit Gemini.
 *   npm run db:seed            # phrasings only
 *   npm run db:seed -- --demo  # also fake results for today's puzzle (local testing)
 */
import { neon } from '@neondatabase/serverless';
import { RULES } from '../src/rules';
import { normalizeGuess } from '../src/lib/fuzzy';
import { puzzleNumber } from '../src/lib/daily';
import { loadEnv } from './env';

loadEnv();
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}
const sql = neon(url);

async function main() {
  let n = 0;
  for (const rule of RULES) {
    for (const phrase of [rule.description, ...rule.acceptedPhrasings]) {
      const norm = normalizeGuess(phrase);
      if (!norm) continue;
      await sql.query(
        `insert into verdict_cache (rule_id, normalized_guess, verdict, hint) values ($1, $2, 'correct', 'Nice thinking — prove it!')
         on conflict (rule_id, normalized_guess) do nothing`,
        [rule.id, norm],
      );
      n++;
    }
  }
  console.log(`✓ seeded ${n} cached verdicts`);
  if (process.argv.includes('--demo')) {
    const p = puzzleNumber();
    const demo = [14, 6, 19, 27, 21, 13];
    for (let k = 0; k <= 5; k++)
      await sql.query(
        `insert into daily_results (puzzle_no, solved_on_clue, count) values ($1, $2, $3)
         on conflict (puzzle_no, solved_on_clue) do update set count = excluded.count`,
        [p, k, demo[k]],
      );
    console.log(`✓ demo results for puzzle #${p}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
