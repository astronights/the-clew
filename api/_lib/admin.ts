import { createHash, timingSafeEqual } from 'node:crypto';
import { json } from './http';

/** Returns an error response unless the request carries `Authorization: Bearer <ADMIN_TOKEN>`. */
export function requireAdmin(req: Request): Response | null {
  const token = process.env.ADMIN_TOKEN;
  if (!token || token.length < 12) return json({ error: 'Admin is disabled: set ADMIN_TOKEN (12+ characters).' }, 503);
  const given = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  // compare hashes so lengths always match
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(token).digest();
  return timingSafeEqual(a, b) ? null : json({ error: 'Wrong admin token.' }, 401);
}
