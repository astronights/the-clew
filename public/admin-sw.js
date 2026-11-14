/* The Clew desk service worker: shows reminder notifications and opens the desk when tapped. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'The Clew desk', {
      body: data.body || 'Puzzles need your attention.',
      icon: '/icons/desk-192.png',
      badge: '/icons/desk-badge-96.png',
      tag: data.tag || 'clew-desk',
      data: { url: data.url || '/admin' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/admin';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const w of windows) if (w.url.includes('/admin') && 'focus' in w) return w.focus();
      return self.clients.openWindow(url);
    }),
  );
});
