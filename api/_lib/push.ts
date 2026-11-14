import type { NeonQueryFunction } from '@neondatabase/serverless';
import webpush from 'web-push';

type Sql = NeonQueryFunction<false, false>;

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/** VAPID keys come from the environment; push is off when they're missing. */
export function vapid(): { publicKey: string; privateKey: string; subject: string } | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject: process.env.VAPID_SUBJECT || 'mailto:admin@theclew.fyi' };
}

export async function saveSubscription(sql: Sql, sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  await sql.query(
    `insert into push_subscriptions (endpoint, keys) values ($1, $2::jsonb)
     on conflict (endpoint) do update set keys = excluded.keys`,
    [sub.endpoint, JSON.stringify(sub.keys)],
  );
}

export async function removeSubscription(sql: Sql, endpoint: string) {
  await sql.query('delete from push_subscriptions where endpoint = $1', [endpoint]);
}

/** Send to every subscribed device; drops subscriptions the push service says are gone. */
export async function sendToAll(sql: Sql, payload: PushPayload): Promise<{ sent: number; removed: number }> {
  const keys = vapid();
  if (!keys) throw new Error('Push is not configured: set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.');
  webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
  const rows = (await sql.query('select endpoint, keys from push_subscriptions')) as { endpoint: string; keys: { p256dh: string; auth: string } }[];
  let sent = 0;
  let removed = 0;
  for (const r of rows) {
    try {
      await webpush.sendNotification({ endpoint: r.endpoint, keys: r.keys }, JSON.stringify(payload), { TTL: 60 * 60 * 24 });
      sent++;
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) {
        await removeSubscription(sql, r.endpoint);
        removed++;
      } else console.error('push failed', code, err);
    }
  }
  return { sent, removed };
}
