import { requireAdmin } from '../_lib/admin';
import { getSql } from '../_lib/db';
import { json, readJson } from '../_lib/http';
import { removeSubscription, saveSubscription, sendToAll, vapid } from '../_lib/push';

/** GET → the public VAPID key the desk needs to subscribe (null when push isn't set up). */
export async function GET(req: Request): Promise<Response> {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return json({ publicKey: vapid()?.publicKey ?? null });
}

type Body =
  | { action: 'subscribe'; subscription: { endpoint: string; keys: { p256dh: string; auth: string } } }
  | { action: 'unsubscribe'; endpoint: string }
  | { action: 'test' };

/** POST: subscribe / unsubscribe this device, or send a test notification to every device. */
export async function POST(req: Request): Promise<Response> {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const sql = getSql();
  if (!sql) return json({ error: 'DATABASE_URL is not set.' }, 503);
  if (!vapid()) return json({ error: 'Push is not configured: set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.' }, 503);
  const body = await readJson<Body>(req, 4000);
  if (!body) return json({ error: 'bad request' }, 400);
  if (body.action === 'subscribe') {
    const s = body.subscription;
    if (!s?.endpoint?.startsWith('https://') || !s.keys?.p256dh || !s.keys?.auth) return json({ error: 'bad subscription' }, 400);
    await saveSubscription(sql, s);
    return json({ ok: true });
  }
  if (body.action === 'unsubscribe') {
    await removeSubscription(sql, String(body.endpoint ?? ''));
    return json({ ok: true });
  }
  if (body.action === 'test') {
    const r = await sendToAll(sql, { title: 'The Clew desk', body: 'Reminders are on. You’ll hear from me when puzzles are due.', url: '/admin', tag: 'test' });
    return json(r);
  }
  return json({ error: 'unknown action' }, 400);
}
