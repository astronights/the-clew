/** Load .env / .env.local into process.env for CLI scripts (Node 22+). */
export function loadEnv(): void {
  for (const f of ['.env.local', '.env']) {
    try {
      process.loadEnvFile(f);
    } catch {
      /* file missing */
    }
  }
}
