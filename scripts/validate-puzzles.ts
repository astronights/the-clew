/** Checks every built-in puzzle: `npm run validate-puzzles`. */
import { validateChain } from '../src/lib/chain';
import { normalizeAnswer } from '../src/lib/answer';
import { LIBRARY } from '../src/puzzles/library';

let failed = 0;
const ids = new Set<string>();
const connections = new Set<string>();
for (const p of LIBRARY) {
  const errors = validateChain(p);
  if (!/^[a-z0-9-]+$/.test(p.id)) errors.push('id must be lowercase letters, digits and dashes');
  if (ids.has(p.id)) errors.push('duplicate id');
  const c = normalizeAnswer(p.connection);
  if (connections.has(c)) errors.push('duplicate connection');
  ids.add(p.id);
  connections.add(c);
  if (errors.length) failed++;
  console.log(`${errors.length ? '✗' : '✓'} ${p.id.padEnd(24)} ${p.clues.join(' → ')} → ${p.answer}`);
  for (const e of errors) console.log(`    - ${e}`);
}
console.log(`\n${LIBRARY.length} puzzles, ${failed} with problems.`);
process.exit(failed ? 1 : 0);
