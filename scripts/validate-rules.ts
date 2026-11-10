import { RULES } from '../src/rules';
import { eliminationTrace } from '../src/lib/elimination';
import { validateAll } from '../src/lib/validate';

const verbose = process.argv.includes('--verbose');
const reports = validateAll();
let failed = 0;
for (const r of reports) {
  const ok = r.errors.length === 0;
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${r.id.padEnd(30)} pass rate ${(r.passRate * 100).toFixed(1).padStart(5)}%`);
  for (const e of r.errors) console.log(`    - ${e}`);
  if (verbose && ok) {
    const rule = RULES.find((x) => x.id === r.id)!;
    eliminationTrace(rule).forEach((ids, i) => console.log(`    clue ${i + 1} removes ${ids.join(', ')}`));
  }
}
console.log(`\n${RULES.length} rules, ${failed} with problems.`);
process.exit(failed ? 1 : 0);
