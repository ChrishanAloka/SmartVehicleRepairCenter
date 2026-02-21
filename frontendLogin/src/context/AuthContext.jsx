import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { authAPI, notificationAPI } from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const output = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
    return output;
}

const pushSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

/**
 * Register a Web Push subscription for this device and save it to the backend.
 *
 * Flow:
 *  1. Wait for the Service Worker to be active (navigator.serviceWorker.ready)
 *  2. Get (or create) a PushSubscription from the browser
 *  3. POST it to /api/notifications/subscribe (backend dedupes by endpoint)
 *
 * Called automatically 1.5 s after the user is authenticated.
 * Also exported so NotificationBell can call it on explicit "Enable" click.
 */
export async function registerPushSubscription() {
    if (!pushSupported) {
        console.log('[Push] Not supported on this browser/OS');
        return { ok: false, reason: 'unsupported' };
    }

    // Check current permission state first
    const currentPerm = Notification.permission;
    if (currentPerm === 'denied') {
        console.log('[Push] Permission denied by user — cannot subscribe');
        return { ok: false, reason: 'denied' };
    }

    try {
        // 1. Wait for active service worker
        const reg = await navigator.serviceWorker.ready;
        console.log('[Push] Service worker ready. State:', reg.active?.state);

        // 2. Get VAPID public key from backend
        const { data: keyData } = await notificationAPI.getVapidPublicKey();

        if (!keyData?.publicKey) {
            console.warn('[Push] VAPID public key not set on server. Set VAPID_PUBLIC_KEY env var on Render.');
            return { ok: false, reason: 'no_vapid_key' };
        }

        // 3. Check existing browser subscription
        let sub = await reg.pushManager.getSubscription();

        if (!sub) {
            // 4. Ask for permission if not already granted
            if (currentPerm !== 'granted') {
                const perm = await Notification.requestPermission();
                if (perm !== 'granted') {
                    console.log('[Push] Permission not granted by user');
                    return { ok: false, reason: 'permission_denied' };
                }
            }

            // 5. Create new PushSubscription
            sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(keyData.publicKey)
            });
            console.log('[Push] New PushSubscription created:', sub.endpoint.substring(0, 50) + '...');
        } else {
            console.log('[Push] Existing PushSubscription found:', sub.endpoint.substring(0, 50) + '...');
        }

        // 6. Always POST to backend — it dedupes by endpoint server-side
        const { data: subData } = await notificationAPI.subscribePush(sub.toJSON());
        console.log('[Push] ✅ Registered with backend:', subData);
        return { ok: true, endpoint: sub.endpoint };

    } catch (err) {
        console.error('[Push] ❌ Registration failed:', err.message);
        return { ok: false, reason: 'error', message: err.message };
    }
}

async function unregisterPushSubscription() {
    if (!pushSupported) return;
    try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!sub) return;
        await notificationAPI.unsubscribePush(sub.endpoint);
        // Keep browser subscription intact — re-registration on next login won't need permission again
        console.log('[Push] Subscription removed from backend');
    } catch (err) {
        console.warn('[Push] Unregister failed:', err.message);
    }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const pushRegistered = useRef(false);

    useEffect(() => { checkAuth(); }, []);

    // Auto-register push whenever the user becomes authenticated
    useEffect(() => {
        if (user && !pushRegistered.current) {
            pushRegistered.current = true;
            // Small delay to ensure the SW is active on first page load
            setTimeout(() => registerPushSubscription(), 1500);
        }
        if (!user) {
            pushRegistered.current = false;
        }
    }, [user]);

    const checkAuth = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const response = await authAPI.getMe();
                setUser(response.data);
            } catch (error) {
                console.error('Auth check failed:', error);
                localStorage.removeItem('token');
            }
        }
        setLoading(false);
    };

    const login = async (credentials) => {
        const response = await authAPI.login(credentials);
        localStorage.setItem('token', response.data.token);
        setUser(response.data);
        return response.data;
    };

    const logout = async () => {
        await unregisterPushSubscription();
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};