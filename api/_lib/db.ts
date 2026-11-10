import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let cached: NeonQueryFunction<false, false> | null | undefined;

/** Neon HTTP client, or null when DATABASE_URL is not configured. */
export function getSql(): NeonQueryFunction<false, false> | null {
  if (cached !== undefined) return cached;
  const url = process.env.DATABASE_URL;
  cached = url ? neon(url) : null;
  return cached;
}

export type Row = Record<string, unknown>;
