import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { authAPI, notificationAPI } from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const output = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
    return output;
}

const supported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

/**
 * Register a native push subscription for the current device.
 * Called automatically after a successful login.
 * Silently no-ops if the browser doesn't support push or if VAPID keys aren't set.
 */
async function registerPushSubscription() {
    if (!supported) return;
    try {
        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();

        if (!sub) {
            // Ask for permission
            const perm = await Notification.requestPermission();
            if (perm !== 'granted') return;

            // Fetch VAPID public key
            const { data } = await notificationAPI.getVapidPublicKey();
            if (!data?.publicKey) return;

            sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(data.publicKey)
            });
        }

        // Register with backend (deduped server-side)
        await notificationAPI.subscribePush(sub.toJSON());
        console.log('[Push] Subscription registered');
    } catch (err) {
        console.warn('[Push] Registration failed:', err.message);
    }
}

/**
 * Remove the push subscription from the backend on logout.
 */
async function unregisterPushSubscription() {
    if (!supported) return;
    try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!sub) return;
        await notificationAPI.unsubscribePush(sub.endpoint);
        // Do NOT call sub.unsubscribe() — we want to keep the browser subscription
        // intact so we can re-register it on next login without asking again.
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

    useEffect(() => {
        checkAuth();
    }, []);

    // Auto-register push whenever user becomes authenticated
    useEffect(() => {
        if (user && !pushRegistered.current) {
            pushRegistered.current = true;
            // Small delay so the SW is guaranteed active after first page load
            setTimeout(registerPushSubscription, 2000);
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
        try {
            const response = await authAPI.login(credentials);
            localStorage.setItem('token', response.data.token);
            setUser(response.data);
            return response.data;
        } catch (error) {
            throw error;
        }
    };

    const logout = async () => {
        // Remove push subscription from backend before clearing session
        await unregisterPushSubscription();
        localStorage.removeItem('token');
        setUser(null);
    };

    const value = {
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};