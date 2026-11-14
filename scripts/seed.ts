/**
 * Local testing helper: fake results for today's puzzle so the
 * "x% of players needed more clues" line has data.
 *   npm run db:seed -- --demo
 */
import { neon } from '@neondatabase/serverless';
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
  if (!process.argv.includes('--demo')) {
    console.log('Nothing to seed. Use --demo to add fake results for today.');
    return;
  }
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

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
