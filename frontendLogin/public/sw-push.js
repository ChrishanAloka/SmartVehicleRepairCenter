/**
 * Custom Service Worker for Smart Vehicle Repair Center PWA
 * Handles push notification display using the Web Push API.
 *
 * This file is loaded by VitePWA's WorkboxPlugin via the importScripts option.
 */

self.addEventListener('push', function (event) {
    if (!event.data) return;

    let payload;
    try {
        payload = event.data.json();
    } catch (e) {
        payload = {
            title: 'Smart Repair Portal',
            body: event.data.text(),
            icon: '/logo.png',
            tag: 'general'
        };
    }

    const { title, body, icon = '/logo.png', tag = 'general', url = '/' } = payload;

    const options = {
        body,
        icon,
        badge: '/logo.png',
        tag,
        renotify: true,
        data: { url },
        vibrate: [200, 100, 200],
        actions: [
            { action: 'open', title: 'Open' },
            { action: 'dismiss', title: 'Dismiss' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    if (event.action === 'dismiss') return;

    const url = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            // Focus an existing open window if available
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            // Otherwise open a new tab
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});
