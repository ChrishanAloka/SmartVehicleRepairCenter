import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeToPush, updatePushRole, onLogoutUpdatePush } from '../utils/pushService';

/**
 * usePushNotifications
 *
 * This hook manages the full lifecycle of PWA push subscriptions:
 * - On mount: subscribes as 'public' (for logged-out users on the login page, etc.)
 * - On login: upgrades the subscription to the user's role (admin / office_staff)
 * - On logout: downgrades back to 'public'
 *
 * Usage: Add <UsePushNotifications /> or call this hook near the root of the app.
 */
const usePushNotifications = () => {
    const { user, isAuthenticated } = useAuth();
    const prevAuthState = useRef(null);
    const hasSubscribed = useRef(false);

    useEffect(() => {
        // Only run in browsers that support push
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
        // Don't act before the SW is ready
        if (!navigator.serviceWorker.controller && !hasSubscribed.current) return;

        const setupPush = async () => {
            if (isAuthenticated && user) {
                const role = user.role === 'admin' ? 'admin' : 'office_staff';
                if (prevAuthState.current !== role) {
                    await updatePushRole(role, user._id || user.id || null);
                    prevAuthState.current = role;
                    hasSubscribed.current = true;
                }
            } else if (prevAuthState.current !== 'public') {
                // User logged out or was never logged in
                if (hasSubscribed.current) {
                    await onLogoutUpdatePush();
                } else {
                    await subscribeToPush('public', null);
                    hasSubscribed.current = true;
                }
                prevAuthState.current = 'public';
            }
        };

        // Wait for service worker to be ready before interacting with push
        navigator.serviceWorker.ready.then(() => {
            setupPush();
        });
    }, [isAuthenticated, user]);

    // Initial subscription on first SW registration
    useEffect(() => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

        navigator.serviceWorker.ready.then(async () => {
            if (hasSubscribed.current) return;

            if (isAuthenticated && user) {
                const role = user.role === 'admin' ? 'admin' : 'office_staff';
                await subscribeToPush(role, user._id || user.id || null);
                prevAuthState.current = role;
            } else {
                await subscribeToPush('public', null);
                prevAuthState.current = 'public';
            }
            hasSubscribed.current = true;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
};

export default usePushNotifications;
