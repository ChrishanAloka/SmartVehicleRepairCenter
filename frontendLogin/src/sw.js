// ─── Smart Vehicle Repair Center — Service Worker ────────────────────────────
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// ─── Push Events ─────────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
    console.log('[SW] Push Received');
    event.waitUntil(handlePush(event));
});

async function handlePush(event) {
    let data = {};
    try {
        // Try to parse JSON from backend
        data = event.data ? event.data.json() : {};
    } catch (_) {
        // Fallback if it's just a string
        data = { title: 'New Message', body: event.data ? event.data.text() : 'You have a new notification.' };
    }

    const title = data.title || 'Smart Repair Center';
    const options = {
        body: data.body || data.message || 'New update available',
        icon: '/logo.png',
        badge: '/logo.png',
        tag: data.tag || 'svrc-general', // replacing same tags prevents spam
        renotify: true,
        requireInteraction: false,
        vibrate: [200, 100, 200],
        data: {
            url: data.data?.url || '/',
            notifId: data.data?.notifId
        }
    };

    // DEBUG: Always show something
    return self.registration.showNotification(title, options);
}

// ─── Notification Click ───────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (const client of windowClients) {
                const clientUrl = new URL(client.url);
                const target = new URL(targetUrl, self.location.origin);
                if (clientUrl.origin === target.origin) {
                    client.navigate(target.href).catch(() => { });
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
