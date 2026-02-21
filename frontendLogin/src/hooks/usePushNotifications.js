import { useState, useEffect, useRef, useCallback } from 'react';
import { notificationAPI } from '../utils/api';

/**
 * Convert a base64-encoded VAPID public key string to a Uint8Array
 * (required by PushManager.subscribe)
 */
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * usePushNotifications
 *
 * Registers a Web Push subscription with the backend when the user is logged in.
 * - If the browser supports push & notifications, asks for permission and subscribes.
 * - If the user is not logged in, the subscription is deferred until they log in.
 * - Cleans up (unsubscribes from backend) when the user logs out.
 *
 * @param {boolean} isAuthenticated - from AuthContext
 * @returns {{ permission, supported, subscribe: fn, unsubscribe: fn }}
 */
export function usePushNotifications(isAuthenticated) {
    const [permission, setPermission] = useState(
        () => ('Notification' in window ? Notification.permission : 'unsupported')
    );
    const [supported] = useState(
        () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    );

    // Keep a ref to the current subscription so we can unsubscribe cleanly
    const subscriptionRef = useRef(null);
    // Prevent calling subscribe multiple times for the same session
    const subscribedRef = useRef(false);

    /**
     * Core: get an active SW registration, fetch VAPID key, call subscribe(), send to backend
     */
    const doSubscribe = useCallback(async () => {
        if (!supported || !isAuthenticated || subscribedRef.current) return;

        try {
            // Step 1: Get an active service worker registration
            const reg = await navigator.serviceWorker.ready;

            // Step 2: Check existing subscription
            let sub = await reg.pushManager.getSubscription();

            if (!sub) {
                // Step 3: Request permission if needed
                const perm = await Notification.requestPermission();
                setPermission(perm);
                if (perm !== 'granted') return;

                // Step 4: Get VAPID public key from backend
                const { data } = await notificationAPI.getVapidPublicKey();
                if (!data?.publicKey) {
                    console.warn('[Push] No VAPID public key returned from server');
                    return;
                }

                // Step 5: Subscribe
                sub = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(data.publicKey)
                });
            }

            subscriptionRef.current = sub;
            subscribedRef.current = true;

            // Step 6: Register with backend
            await notificationAPI.subscribePush(sub.toJSON());
            console.log('[Push] Subscribed and registered with backend');
        } catch (err) {
            console.warn('[Push] Subscribe failed:', err.message);
        }
    }, [supported, isAuthenticated]);

    /**
     * Manual unsubscribe (called on logout)
     */
    const doUnsubscribe = useCallback(async () => {
        if (!subscriptionRef.current) return;
        try {
            const endpoint = subscriptionRef.current.endpoint;
            await notificationAPI.unsubscribePush(endpoint);
            await subscriptionRef.current.unsubscribe();
            console.log('[Push] Unsubscribed');
        } catch (err) {
            console.warn('[Push] Unsubscribe failed:', err.message);
        } finally {
            subscriptionRef.current = null;
            subscribedRef.current = false;
        }
    }, []);

    // Trigger subscribe when user authenticates; unsubscribe when they log out
    useEffect(() => {
        if (isAuthenticated) {
            // Small delay so the service worker has time to become active on first load
            const t = setTimeout(doSubscribe, 1500);
            return () => clearTimeout(t);
        } else {
            // Reset flag so next login re-subscribes
            subscribedRef.current = false;
            subscriptionRef.current = null;
        }
    }, [isAuthenticated, doSubscribe]);

    return {
        permission,
        supported,
        requestSubscription: doSubscribe,
        unsubscribe: doUnsubscribe
    };
}
