import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { neon } from '@neondatabase/serverless';
import { loadEnv } from './env';

loadEnv();
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set (put it in .env or the environment).');
  process.exit(1);
}
const sql = neon(url);
const dir = join(process.cwd(), 'db', 'migrations');

async function main() {
  await sql.query('create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())');
  const applied = new Set(((await sql.query('select name from schema_migrations')) as { name: string }[]).map((r) => r.name));
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`· ${file} (already applied)`);
      continue;
    }
    const text = readFileSync(join(dir, file), 'utf8')
      .split('\n')
      .filter((l) => !l.trim().startsWith('--'))
      .join('\n');
    const statements = text.split(/;\s*(?:\n|$)/).map((s) => s.trim()).filter(Boolean);
    for (const st of statements) await sql.query(st);
    await sql.query('insert into schema_migrations (name) values ($1)', [file]);
    console.log(`✓ ${file}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
