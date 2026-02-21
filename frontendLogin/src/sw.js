// ─── Smart Vehicle Repair Center — Service Worker ────────────────────────────
// This file is processed by vite-plugin-pwa (injectManifest strategy).
// Workbox injects the precache manifest at the self.__WB_MANIFEST placeholder.
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

// Take control immediately after install
self.skipWaiting();
clientsClaim();

// Precache all build assets (injected by vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// ─── Push Events ─────────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
    // Guard: SW should always show a notification when it receives a push
    event.waitUntil(handlePush(event));
});

async function handlePush(event) {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (_) {
        data = { title: 'New Notification', body: event.data?.text() || '' };
    }

    const title = data.title || 'Smart Vehicle Repair';
    const options = {
        body: data.body || data.message || '',
        icon: '/logo.png',           // app icon shown in the notification
        badge: '/logo.png',          // small monochrome icon on Android status bar / launcher badge
        tag: data.tag || 'svrc-notif',  // same tag replaces the previous notification (no spam)
        renotify: true,              // vibrate/sound even if same tag
        requireInteraction: false,   // auto-dismiss on Android after a few seconds
        data: {
            url: data.data?.url || '/',
            notifId: data.data?.notifId,
            type: data.data?.type
        },
        // Actions shown on Android (ignored on iOS)
        actions: [
            { action: 'view', title: '👁 View' },
            { action: 'dismiss', title: '✕ Dismiss' }
        ],
        vibrate: [200, 100, 200]     // vibration pattern (ms) — Android only
    };

    await self.registration.showNotification(title, options);
}

// ─── Notification Click ───────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') return;

    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Focus an existing window if the app is already open
            for (const client of windowClients) {
                const clientUrl = new URL(client.url);
                const target = new URL(targetUrl, self.location.origin);
                if (clientUrl.origin === target.origin) {
                    client.navigate(target.href).catch(() => { });
                    return client.focus();
                }
            }
            // Otherwise open a new window
            return clients.openWindow(targetUrl);
        })
    );
});

// ─── Push Subscription Change ─────────────────────────────────────────────────
// Fires when the browser forcefully rotates the push subscription (rare but possible).
// Re-registers the new subscription with the backend automatically.

self.addEventListener('pushsubscriptionchange', (event) => {
    event.waitUntil(
        (async () => {
            const newSub = event.newSubscription
                || await self.registration.pushManager.subscribe(
                    event.oldSubscription
                        ? { userVisibleOnly: true, applicationServerKey: event.oldSubscription.options.applicationServerKey }
                        : { userVisibleOnly: true }
                );

            // Notify the backend about the new subscription
            await fetch('/api/notifications/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Note: we can't include the auth token here easily; backend should handle
                // unauthenticated sub updates by matching on endpoint
                body: JSON.stringify({ subscription: newSub.toJSON() })
            }).catch(() => { });
        })()
    );
});
