import { createHash } from 'node:crypto';

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

export async function readJson<T>(req: Request, maxBytes = 2048): Promise<T | null> {
  try {
    const text = await req.text();
    if (text.length > maxBytes) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  return (fwd?.split(',')[0] ?? req.headers.get('x-real-ip') ?? 'unknown').trim();
}

/** One-way hash so no raw IPs are stored. */
export function hashIp(ip: string): string {
  return createHash('sha256')
    .update(`${process.env.IP_HASH_SALT ?? 'the-clew'}:${ip}`)
    .digest('hex')
    .slice(0, 32);
}
