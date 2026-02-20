/**
 * PWA Push Notification Service
 * Handles subscribing, unsubscribing, and syncing role-based subscriptions.
 */

const VAPID_PUBLIC_KEY = 'BAC-zSASPuJWHJH3DhC7No1xOeNTLq5c76zCqPKrVFgKRTSK1_LrqDUXm2S5peYbYqdZCy0-kfCKJeBvQWdY4Yo';

/**
 * Convert a base64 URL-safe string to a Uint8Array (required by the browser push API).
 */
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

/**
 * Request notification permission from the browser.
 * Returns true if granted.
 */
export async function requestNotificationPermission() {
    if (!('Notification' in window)) return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
}

/**
 * Subscribe this browser to push notifications and register the subscription
 * with the backend, tagged with the given user role.
 *
 * @param {string} role - 'admin' | 'office_staff' | 'public'
 * @param {string|null} userId - Mongo user ID if authenticated
 */
export async function subscribeToPush(role = 'public', userId = null) {
    try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.warn('[Push] Push not supported in this browser');
            return null;
        }

        const granted = await requestNotificationPermission();
        if (!granted) {
            console.warn('[Push] Notification permission denied');
            return null;
        }

        const registration = await navigator.serviceWorker.ready;

        // Try to use existing subscription first
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
        }

        // Register with backend
        await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription, role, userId })
        });

        console.log(`[Push] Subscribed as ${role}`);
        return subscription;
    } catch (error) {
        console.error('[Push] Subscribe failed:', error);
        return null;
    }
}

/**
 * Update the stored role/userId for this browser's subscription.
 * Called when the user logs in (to upgrade from 'public' to their actual role).
 */
export async function updatePushRole(role, userId = null) {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
            // No subscription yet — create one
            await subscribeToPush(role, userId);
            return;
        }
        // Update role on backend
        await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription, role, userId })
        });
        console.log(`[Push] Role updated to ${role}`);
    } catch (error) {
        console.error('[Push] Update role failed:', error);
    }
}

/**
 * On logout — downgrade this browser's role to 'public' so it no longer
 * receives staff-only notifications, but remains subscribed for logout/generic alerts.
 */
export async function onLogoutUpdatePush() {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) return;

        await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription, role: 'public', userId: null })
        });
        console.log('[Push] Downgraded to public on logout');
    } catch (error) {
        console.error('[Push] Logout push update failed:', error);
    }
}

/**
 * Fully unsubscribe this browser from push notifications.
 */
export async function unsubscribeFromPush() {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) return;

        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        await fetch('/api/push/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint })
        });
        console.log('[Push] Fully unsubscribed');
    } catch (error) {
        console.error('[Push] Unsubscribe failed:', error);
    }
}
