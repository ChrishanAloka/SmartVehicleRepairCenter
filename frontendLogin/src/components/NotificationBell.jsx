import React, { useState, useEffect, useRef, useCallback } from 'react';
import { notificationAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
    FaBell, FaCheckDouble, FaCheck, FaCalendarCheck,
    FaStar, FaTools, FaEye, FaEyeSlash, FaTimes, FaBellSlash
} from 'react-icons/fa';
import moment from 'moment';

const POLL_INTERVAL = 10000; // 10 seconds

// Icon and colour per notification type
const TYPE_CONFIG = {
    new_booking: {
        icon: <FaCalendarCheck size={14} />,
        color: '#3b82f6',
        bg: '#eff6ff'
    },
    new_review: {
        icon: <FaStar size={14} />,
        color: '#f59e0b',
        bg: '#fffbeb'
    },
    job_done: {
        icon: <FaTools size={14} />,
        color: '#10b981',
        bg: '#ecfdf5'
    }
};

// ─── Push permission banner ───────────────────────────────────────────────────

const PushPermissionBanner = ({ onEnable, onDismiss }) => (
    <div className="push-banner">
        <FaBell size={15} style={{ flexShrink: 0, color: '#f59e0b' }} />
        <div className="push-banner-text">
            <strong>Enable push notifications</strong>
            <span>Get alerts on your device even when the app is closed.</span>
        </div>
        <button className="push-banner-enable" onClick={onEnable}>Enable</button>
        <button className="push-banner-dismiss" onClick={onDismiss} title="Dismiss">
            <FaTimes size={11} />
        </button>
    </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

const NotificationBell = () => {
    const { isAuthenticated } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);
    const [showRead, setShowRead] = useState(false);
    const [loading, setLoading] = useState(false);

    // Push permission state
    const [pushPermission, setPushPermission] = useState(
        () => 'Notification' in window ? Notification.permission : 'unsupported'
    );
    const [showBanner, setShowBanner] = useState(false);
    const bannerDismissedKey = 'svrc_push_banner_dismissed';

    const panelRef = useRef(null);
    const pollRef = useRef(null);

    // ─── Fetch ────────────────────────────────────────────────────────────────
    const fetchNotifications = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const { data } = await notificationAPI.getAll();
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
        } catch (_) {
            // silently fail — user may be on login page briefly
        }
    }, [isAuthenticated]);

    // Initial fetch + polling every 10 s
    useEffect(() => {
        fetchNotifications();
        pollRef.current = setInterval(fetchNotifications, POLL_INTERVAL);
        return () => clearInterval(pollRef.current);
    }, [fetchNotifications]);

    // Show push banner when user is authenticated and hasn't granted/denied yet
    useEffect(() => {
        if (!isAuthenticated) { setShowBanner(false); return; }
        const dismissed = sessionStorage.getItem(bannerDismissedKey);
        if (pushPermission === 'default' && !dismissed) {
            // Show after a brief delay so it's not jarring on login
            const t = setTimeout(() => setShowBanner(true), 3000);
            return () => clearTimeout(t);
        }
    }, [isAuthenticated, pushPermission]);

    // Close panel on outside click
    useEffect(() => {
        const handler = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        document.addEventListener('touchstart', handler);
        return () => {
            document.removeEventListener('mousedown', handler);
            document.removeEventListener('touchstart', handler);
        };
    }, []);

    // ─── Push helpers ─────────────────────────────────────────────────────────

    const handleEnablePush = async () => {
        setShowBanner(false);
        if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
        try {
            const perm = await Notification.requestPermission();
            setPushPermission(perm);
            if (perm === 'granted') {
                // Trigger subscription via the same logic in AuthContext
                // (AuthContext already handles registration; this just ensures
                //  it runs if the user granted permission after initial load)
                const { getVapidPublicKey, subscribePush } = notificationAPI;
                const reg = await navigator.serviceWorker.ready;
                let sub = await reg.pushManager.getSubscription();
                if (!sub) {
                    const { data } = await getVapidPublicKey();
                    if (data?.publicKey) {
                        const padding = '='.repeat((4 - (data.publicKey.length % 4)) % 4);
                        const base64 = (data.publicKey + padding).replace(/-/g, '+').replace(/_/g, '/');
                        const rawData = window.atob(base64);
                        const key = new Uint8Array(rawData.length);
                        for (let i = 0; i < rawData.length; ++i) key[i] = rawData.charCodeAt(i);
                        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
                    }
                }
                if (sub) await subscribePush(sub.toJSON());
            }
        } catch (err) {
            console.warn('[Push] Manual enable failed:', err.message);
        }
    };

    const handleDismissBanner = () => {
        setShowBanner(false);
        sessionStorage.setItem(bannerDismissedKey, '1');
    };

    // ─── Actions ──────────────────────────────────────────────────────────────
    const handleMarkOne = async (id, e) => {
        e.stopPropagation();
        try {
            await notificationAPI.markRead(id);
            setNotifications(prev =>
                prev.map(n => n._id === id ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (_) { }
    };

    const handleMarkAll = async () => {
        setLoading(true);
        try {
            await notificationAPI.markAllRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (_) { }
        setLoading(false);
    };

    // ─── Derived list ─────────────────────────────────────────────────────────
    const displayed = showRead ? notifications : notifications.filter(n => !n.isRead);

    if (!isAuthenticated) return null;

    return (
        <>
            {/* Push permission banner (shown outside the bell dropdown) */}
            {showBanner && (
                <PushPermissionBanner
                    onEnable={handleEnablePush}
                    onDismiss={handleDismissBanner}
                />
            )}

            <div ref={panelRef} style={{ position: 'relative' }}>
                {/* Bell button */}
                <button
                    className="notif-bell-btn"
                    onClick={() => setOpen(o => !o)}
                    title="Notifications"
                >
                    {pushPermission === 'denied'
                        ? <FaBellSlash size={18} style={{ color: '#94a3b8' }} />
                        : <FaBell size={18} className={unreadCount > 0 ? 'notif-bell-ring' : ''} />
                    }
                    {unreadCount > 0 && (
                        <span className="notif-count-badge">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>

                {/* Dropdown panel */}
                {open && (
                    <div className="notif-panel">
                        {/* Header */}
                        <div className="notif-panel-header">
                            <div>
                                <span className="notif-panel-title">Notifications</span>
                                {unreadCount > 0 && (
                                    <span className="notif-unread-chip">{unreadCount} unread</span>
                                )}
                            </div>
                            <div className="notif-header-actions">
                                {/* Toggle show/hide read */}
                                <button
                                    className="notif-action-btn"
                                    onClick={() => setShowRead(s => !s)}
                                    title={showRead ? 'Hide read' : 'Show all'}
                                >
                                    {showRead ? <FaEyeSlash size={13} /> : <FaEye size={13} />}
                                    <span>{showRead ? 'Hide read' : 'Show all'}</span>
                                </button>
                                {/* Mark all read */}
                                {unreadCount > 0 && (
                                    <button
                                        className="notif-action-btn mark-all"
                                        onClick={handleMarkAll}
                                        disabled={loading}
                                        title="Mark all as read"
                                    >
                                        <FaCheckDouble size={13} />
                                        <span>All read</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Push permission nudge inside panel (if denied) */}
                        {pushPermission === 'denied' && (
                            <div className="notif-push-denied">
                                <FaBellSlash size={13} />
                                <span>Push notifications blocked. Enable them in your browser settings to receive alerts.</span>
                            </div>
                        )}

                        {/* Push enable prompt inside panel (if default) */}
                        {pushPermission === 'default' && (
                            <div className="notif-push-prompt">
                                <FaBell size={13} />
                                <span>Want realtime alerts on your device?</span>
                                <button onClick={handleEnablePush} className="notif-push-prompt-btn">
                                    Enable Push
                                </button>
                            </div>
                        )}

                        {/* List */}
                        <div className="notif-list">
                            {displayed.length === 0 ? (
                                <div className="notif-empty">
                                    <FaBell size={28} className="notif-empty-icon" />
                                    <p>{showRead ? 'No notifications yet' : 'You\'re all caught up! 🎉'}</p>
                                </div>
                            ) : (
                                displayed.map(n => {
                                    const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.new_booking;
                                    return (
                                        <div
                                            key={n._id}
                                            className={`notif-item ${n.isRead ? 'read' : 'unread'}`}
                                        >
                                            {/* Type icon */}
                                            <div
                                                className="notif-item-icon"
                                                style={{ color: cfg.color, background: cfg.bg }}
                                            >
                                                {cfg.icon}
                                            </div>

                                            {/* Content */}
                                            <div className="notif-item-body">
                                                <div className="notif-item-title">{n.title}</div>
                                                <div className="notif-item-msg">{n.message}</div>
                                                <div className="notif-item-time">
                                                    {moment(n.createdAt).fromNow()}
                                                </div>
                                            </div>

                                            {/* Mark read button (only if unread) */}
                                            {!n.isRead && (
                                                <button
                                                    className="notif-mark-btn"
                                                    onClick={(e) => handleMarkOne(n._id, e)}
                                                    title="Mark as read"
                                                >
                                                    <FaCheck size={10} />
                                                </button>
                                            )}

                                            {/* Unread dot */}
                                            {!n.isRead && <span className="notif-unread-dot" />}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                            <div className="notif-panel-footer">
                                Showing {displayed.length} of {notifications.length} notifications
                            </div>
                        )}
                    </div>
                )}

                <style>{`
                    /* Bell button */
                    .notif-bell-btn {
                        position: relative;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 38px;
                        height: 38px;
                        background: #f1f5f9;
                        border: none;
                        border-radius: 50%;
                        cursor: pointer;
                        color: #475569;
                        transition: background 0.2s, color 0.2s;
                        box-shadow: 0 1px 4px rgba(0,0,0,0.07);
                        flex-shrink: 0;
                    }
                    .notif-bell-btn:hover {
                        background: #e2e8f0;
                        color: #1e293b;
                    }
                    @keyframes bell-ring {
                        0%, 100% { transform: rotate(0deg); }
                        10%, 30%, 50% { transform: rotate(-15deg); }
                        20%, 40% { transform: rotate(15deg); }
                    }
                    .notif-bell-ring {
                        animation: bell-ring 2.5s ease infinite;
                        color: #3b82f6;
                    }
                    .notif-count-badge {
                        position: absolute;
                        top: -2px;
                        right: -2px;
                        min-width: 18px;
                        height: 18px;
                        background: #ef4444;
                        border: 2px solid #fff;
                        border-radius: 50rem;
                        color: #fff;
                        font-size: 0.6rem;
                        font-weight: 700;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 0 3px;
                        animation: badge-pop 0.3s ease;
                    }
                    @keyframes badge-pop {
                        from { transform: scale(0.5); }
                        to { transform: scale(1); }
                    }

                    /* Panel */
                    .notif-panel {
                        position: absolute;
                        top: calc(100% + 10px);
                        right: 0;
                        width: 360px;
                        max-width: calc(100vw - 24px);
                        background: #fff;
                        border-radius: 1rem;
                        box-shadow: 0 12px 48px rgba(0,0,0,0.18);
                        border: 1px solid rgba(0,0,0,0.06);
                        z-index: 2100;
                        overflow: hidden;
                        animation: panel-in 0.2s ease;
                    }
                    @keyframes panel-in {
                        from { opacity: 0; transform: translateY(-10px) scale(0.97); }
                        to { opacity: 1; transform: translateY(0) scale(1); }
                    }

                    /* Header */
                    .notif-panel-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 14px 16px 12px;
                        border-bottom: 1px solid #f1f5f9;
                        background: #fafbfc;
                    }
                    .notif-panel-title {
                        font-weight: 700;
                        font-size: 0.9rem;
                        color: #1e293b;
                        margin-right: 8px;
                    }
                    .notif-unread-chip {
                        font-size: 0.65rem;
                        font-weight: 700;
                        background: #dbeafe;
                        color: #2563eb;
                        border-radius: 50rem;
                        padding: 2px 7px;
                        vertical-align: middle;
                    }
                    .notif-header-actions {
                        display: flex;
                        gap: 6px;
                    }
                    .notif-action-btn {
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        font-size: 0.72rem;
                        font-weight: 600;
                        padding: 4px 9px;
                        border: 1px solid #e2e8f0;
                        border-radius: 50rem;
                        background: #fff;
                        color: #475569;
                        cursor: pointer;
                        transition: all 0.15s;
                        white-space: nowrap;
                    }
                    .notif-action-btn:hover {
                        background: #f1f5f9;
                        border-color: #cbd5e1;
                    }
                    .notif-action-btn.mark-all {
                        color: #2563eb;
                        border-color: #bfdbfe;
                        background: #eff6ff;
                    }
                    .notif-action-btn.mark-all:hover {
                        background: #dbeafe;
                    }
                    .notif-action-btn:disabled {
                        opacity: 0.5;
                        cursor: default;
                    }

                    /* Push permission nudge strips */
                    .notif-push-prompt {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 9px 14px;
                        background: #fffbeb;
                        border-bottom: 1px solid #fef3c7;
                        font-size: 0.75rem;
                        color: #78350f;
                    }
                    .notif-push-prompt-btn {
                        margin-left: auto;
                        flex-shrink: 0;
                        font-size: 0.7rem;
                        font-weight: 700;
                        padding: 3px 10px;
                        border: none;
                        border-radius: 50rem;
                        background: #f59e0b;
                        color: #fff;
                        cursor: pointer;
                        transition: background 0.15s;
                    }
                    .notif-push-prompt-btn:hover { background: #d97706; }

                    .notif-push-denied {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 9px 14px;
                        background: #fef2f2;
                        border-bottom: 1px solid #fecaca;
                        font-size: 0.72rem;
                        color: #991b1b;
                    }

                    /* List */
                    .notif-list {
                        max-height: 380px;
                        overflow-y: auto;
                        overscroll-behavior: contain;
                    }
                    .notif-list::-webkit-scrollbar { width: 4px; }
                    .notif-list::-webkit-scrollbar-track { background: transparent; }
                    .notif-list::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }

                    /* Empty state */
                    .notif-empty {
                        padding: 40px 20px;
                        text-align: center;
                        color: #94a3b8;
                    }
                    .notif-empty-icon {
                        margin-bottom: 10px;
                        opacity: 0.4;
                    }
                    .notif-empty p {
                        font-size: 0.85rem;
                        margin: 0;
                    }

                    /* Item */
                    .notif-item {
                        display: flex;
                        align-items: flex-start;
                        gap: 12px;
                        padding: 12px 16px;
                        border-bottom: 1px solid #f8fafc;
                        position: relative;
                        transition: background 0.15s;
                        cursor: default;
                    }
                    .notif-item:last-child { border-bottom: none; }
                    .notif-item.unread {
                        background: #fafeff;
                    }
                    .notif-item.read {
                        opacity: 0.65;
                    }
                    .notif-item:hover {
                        background: #f8fafc;
                        opacity: 1;
                    }

                    .notif-item-icon {
                        flex-shrink: 0;
                        width: 32px;
                        height: 32px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin-top: 2px;
                    }

                    .notif-item-body {
                        flex: 1;
                        min-width: 0;
                    }
                    .notif-item-title {
                        font-size: 0.8rem;
                        font-weight: 700;
                        color: #1e293b;
                        margin-bottom: 2px;
                    }
                    .notif-item-msg {
                        font-size: 0.78rem;
                        color: #475569;
                        line-height: 1.4;
                        word-break: break-word;
                    }
                    .notif-item-time {
                        font-size: 0.68rem;
                        color: #94a3b8;
                        margin-top: 4px;
                    }

                    /* Unread dot */
                    .notif-unread-dot {
                        position: absolute;
                        top: 50%;
                        right: 36px;
                        transform: translateY(-50%);
                        width: 7px;
                        height: 7px;
                        background: #3b82f6;
                        border-radius: 50%;
                        flex-shrink: 0;
                    }

                    /* Per-item mark-read btn */
                    .notif-mark-btn {
                        flex-shrink: 0;
                        width: 22px;
                        height: 22px;
                        border: 1.5px solid #bfdbfe;
                        border-radius: 50%;
                        background: #eff6ff;
                        color: #2563eb;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        margin-top: 4px;
                        transition: background 0.15s, transform 0.15s;
                        opacity: 0;
                    }
                    .notif-item:hover .notif-mark-btn {
                        opacity: 1;
                    }
                    .notif-mark-btn:hover {
                        background: #dbeafe;
                        transform: scale(1.1);
                    }

                    /* Footer */
                    .notif-panel-footer {
                        padding: 8px 16px;
                        background: #fafbfc;
                        border-top: 1px solid #f1f5f9;
                        font-size: 0.68rem;
                        color: #94a3b8;
                        text-align: center;
                    }

                    /* Push permission banner (outside the panel, top of page) */
                    .push-banner {
                        position: fixed;
                        bottom: 24px;
                        left: 50%;
                        transform: translateX(-50%);
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        background: #1e293b;
                        color: #f8fafc;
                        border-radius: 1rem;
                        padding: 12px 16px;
                        box-shadow: 0 8px 32px rgba(0,0,0,0.28);
                        z-index: 9999;
                        max-width: calc(100vw - 32px);
                        width: 420px;
                        animation: banner-slide-up 0.35s cubic-bezier(0.34,1.56,0.64,1);
                    }
                    @keyframes banner-slide-up {
                        from { opacity: 0; transform: translateX(-50%) translateY(40px); }
                        to   { opacity: 1; transform: translateX(-50%) translateY(0); }
                    }
                    .push-banner-text {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        gap: 1px;
                    }
                    .push-banner-text strong {
                        font-size: 0.82rem;
                        font-weight: 700;
                    }
                    .push-banner-text span {
                        font-size: 0.72rem;
                        color: #94a3b8;
                    }
                    .push-banner-enable {
                        flex-shrink: 0;
                        padding: 6px 14px;
                        border: none;
                        border-radius: 50rem;
                        background: #3b82f6;
                        color: #fff;
                        font-size: 0.78rem;
                        font-weight: 700;
                        cursor: pointer;
                        transition: background 0.15s;
                    }
                    .push-banner-enable:hover { background: #2563eb; }
                    .push-banner-dismiss {
                        flex-shrink: 0;
                        width: 26px;
                        height: 26px;
                        border: none;
                        border-radius: 50%;
                        background: rgba(255,255,255,0.1);
                        color: #94a3b8;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        transition: background 0.15s;
                    }
                    .push-banner-dismiss:hover { background: rgba(255,255,255,0.2); }
                `}</style>
            </div>
        </>
    );
};

export default NotificationBell;
