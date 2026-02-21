import React, { useState, useEffect, useRef, useCallback } from 'react';
import { notificationAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { registerPushSubscription } from '../context/AuthContext';
import {
    FaBell, FaCheckDouble, FaCheck, FaCalendarCheck,
    FaStar, FaTools, FaEye, FaEyeSlash, FaTimes,
    FaBellSlash, FaExclamationTriangle, FaWifi, FaMobileAlt,
    FaCheckCircle, FaTimesCircle, FaSpinner, FaPaperPlane
} from 'react-icons/fa';
import moment from 'moment';

const POLL_INTERVAL = 10000;

const TYPE_CONFIG = {
    new_booking: { icon: <FaCalendarCheck size={14} />, color: '#3b82f6', bg: '#eff6ff' },
    new_review: { icon: <FaStar size={14} />, color: '#f59e0b', bg: '#fffbeb' },
    job_done: { icon: <FaTools size={14} />, color: '#10b981', bg: '#ecfdf5' }
};

// ─── Push Setup Panel ─────────────────────────────────────────────────────────

const StatusRow = ({ ok, label, detail }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
        {ok === null
            ? <FaSpinner size={13} style={{ color: '#94a3b8', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
            : ok
                ? <FaCheckCircle size={13} style={{ color: '#10b981', flexShrink: 0 }} />
                : <FaTimesCircle size={13} style={{ color: '#ef4444', flexShrink: 0 }} />
        }
        <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e293b' }}>{label}</div>
            {detail && <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{detail}</div>}
        </div>
    </div>
);

const PushSetupPanel = ({ onClose }) => {
    const [checks, setChecks] = useState({
        sw: { ok: null, detail: 'Checking...' },
        permission: { ok: null, detail: 'Checking...' },
        vapid: { ok: null, detail: 'Checking...' },
        subscription: { ok: null, detail: 'Checking...' }
    });
    const [testSent, setTestSent] = useState(null); // null | 'sending' | 'ok' | 'error'
    const [testMsg, setTestMsg] = useState('');
    const [registering, setRegistering] = useState(false);

    const runChecks = useCallback(async () => {
        // 1. Service worker
        const swOk = 'serviceWorker' in navigator && 'PushManager' in window;
        setChecks(c => ({ ...c, sw: { ok: swOk, detail: swOk ? 'Service Worker + PushManager available' : 'Not supported in this browser' } }));
        if (!swOk) return;

        // 2. Notification permission
        const perm = 'Notification' in window ? Notification.permission : 'unsupported';
        const permOk = perm === 'granted';
        setChecks(c => ({ ...c, permission: { ok: permOk, detail: `Status: ${perm}${permOk ? '' : ' — click "Enable Push" below'}` } }));

        // 3. VAPID key on server
        try {
            const { data } = await notificationAPI.getVapidPublicKey();
            const vapidOk = !!data?.publicKey;
            setChecks(c => ({ ...c, vapid: { ok: vapidOk, detail: vapidOk ? 'VAPID key configured on server ✓' : 'VAPID_PUBLIC_KEY not set on Render — see setup guide' } }));
        } catch {
            setChecks(c => ({ ...c, vapid: { ok: false, detail: 'Could not reach server' } }));
        }

        // 4. Push subscription in DB
        try {
            const { data } = await notificationAPI.getPushStatus();
            const subOk = data.subscriptionCount > 0;
            setChecks(c => ({
                ...c,
                subscription: {
                    ok: subOk,
                    detail: subOk
                        ? `${data.subscriptionCount} device(s) registered for push`
                        : 'No push subscription saved — click "Enable Push" below'
                }
            }));
        } catch {
            setChecks(c => ({ ...c, subscription: { ok: false, detail: 'Could not check subscription status' } }));
        }
    }, []);

    useEffect(() => { runChecks(); }, [runChecks]);

    const handleEnable = async () => {
        setRegistering(true);
        const result = await registerPushSubscription();
        setRegistering(false);
        if (result.ok) {
            runChecks();
        } else if (result.reason === 'denied' || result.reason === 'permission_denied') {
            setChecks(c => ({ ...c, permission: { ok: false, detail: 'Permission blocked. Open browser Settings → Site Settings → Notifications → Allow' } }));
        }
    };

    const handleTestPush = async () => {
        setTestSent('sending');
        setTestMsg('');
        try {
            const { data } = await notificationAPI.testPush();
            setTestSent('ok');
            setTestMsg(data.message || 'Test push sent! Check your notification tray.');
        } catch (err) {
            setTestSent('error');
            setTestMsg(err?.response?.data?.message || 'Failed to send test push.');
        }
    };

    const allOk = Object.values(checks).every(v => v.ok === true);

    return (
        <div className="push-setup-overlay" onClick={onClose}>
            <div className="push-setup-card" onClick={e => e.stopPropagation()}>
                <div className="push-setup-header">
                    <FaMobileAlt size={16} style={{ color: '#3b82f6' }} />
                    <span>Native Push Setup</span>
                    <button className="push-setup-close" onClick={onClose}><FaTimes size={12} /></button>
                </div>

                <div style={{ padding: '14px 16px 8px' }}>
                    <StatusRow ok={checks.sw.ok} label="Browser Support" detail={checks.sw.detail} />
                    <StatusRow ok={checks.permission.ok} label="Notification Permission" detail={checks.permission.detail} />
                    <StatusRow ok={checks.vapid.ok} label="Server VAPID Keys" detail={checks.vapid.detail} />
                    <StatusRow ok={checks.subscription.ok} label="Device Registered" detail={checks.subscription.detail} />
                </div>

                {!allOk && (
                    <div style={{ padding: '0 16px 12px' }}>
                        <button
                            className="push-setup-btn primary"
                            onClick={handleEnable}
                            disabled={registering}
                        >
                            {registering
                                ? <><FaSpinner size={12} style={{ animation: 'spin 1s linear infinite' }} /> Enabling…</>
                                : <><FaBell size={12} /> Enable Push Notifications</>
                            }
                        </button>
                    </div>
                )}

                {allOk && (
                    <div style={{ padding: '0 16px 12px' }}>
                        <button
                            className="push-setup-btn test"
                            onClick={handleTestPush}
                            disabled={testSent === 'sending'}
                        >
                            {testSent === 'sending'
                                ? <><FaSpinner size={12} style={{ animation: 'spin 1s linear infinite' }} /> Sending…</>
                                : <><FaPaperPlane size={12} /> Send Test Notification</>
                            }
                        </button>
                        {testMsg && (
                            <div style={{
                                marginTop: 8, fontSize: '0.72rem', fontWeight: 600,
                                color: testSent === 'ok' ? '#059669' : '#dc2626'
                            }}>
                                {testSent === 'ok' ? '✅ ' : '❌ '}{testMsg}
                            </div>
                        )}
                    </div>
                )}

                {!checks.vapid.ok && checks.vapid.ok !== null && (
                    <div className="push-setup-hint">
                        <strong>To enable:</strong> Go to <em>Render → Environment</em> and add:
                        <br /><code>VAPID_PUBLIC_KEY</code>, <code>VAPID_PRIVATE_KEY</code>, <code>VAPID_EMAIL</code>
                        <br />Then redeploy the backend.
                    </div>
                )}

                <div style={{ padding: '8px 16px', borderTop: '1px solid #f1f5f9', fontSize: '0.67rem', color: '#94a3b8', textAlign: 'center' }}>
                    iOS requires Safari + "Add to Home Screen" · Android requires Chrome
                </div>
            </div>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const NotificationBell = () => {
    const { isAuthenticated } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);
    const [showRead, setShowRead] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showPushSetup, setShowPushSetup] = useState(false);

    // Push permission state (for bell icon / nudge strip)
    const [pushPermission, setPushPermission] = useState(
        () => 'Notification' in window ? Notification.permission : 'unsupported'
    );
    const [hasSubscription, setHasSubscription] = useState(false);

    const panelRef = useRef(null);
    const pollRef = useRef(null);

    // ─── Fetch notifications ───────────────────────────────────────────────────
    const fetchNotifications = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const { data } = await notificationAPI.getAll();
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
        } catch (_) { }
    }, [isAuthenticated]);

    useEffect(() => {
        fetchNotifications();
        pollRef.current = setInterval(fetchNotifications, POLL_INTERVAL);
        return () => clearInterval(pollRef.current);
    }, [fetchNotifications]);

    // ─── Check push subscription state ────────────────────────────────────────
    useEffect(() => {
        if (!isAuthenticated) return;
        // Quick local check first
        const perm = 'Notification' in window ? Notification.permission : 'unsupported';
        setPushPermission(perm);

        if (perm === 'granted' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(reg =>
                reg.pushManager.getSubscription().then(sub => setHasSubscription(!!sub))
            ).catch(() => { });
        }
    }, [isAuthenticated]);

    // ─── Close on outside click ────────────────────────────────────────────────
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

    // ─── Actions ──────────────────────────────────────────────────────────────
    const handleMarkOne = async (id, e) => {
        if (e) e.stopPropagation();
        try {
            await notificationAPI.markRead(id);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (_) { }
    };

    // ─── URL Trigger (Handle Push Click) ───────────────────────────────────────
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('openNotifs') === 'true') {
            setOpen(true);
            const notifId = params.get('notifId');
            if (notifId) {
                // Mark as read after a small delay
                setTimeout(() => handleMarkOne(notifId), 1000);
            }
        }
    }, []); // Only run once on mount or when location changes manually if needed

    // ─── Actions Cont. ─────────────────────────────────────────────────────────

    const handleMarkAll = async () => {
        setLoading(true);
        try {
            await notificationAPI.markAllRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (_) { }
        setLoading(false);
    };

    const handleEnablePush = async () => {
        const result = await registerPushSubscription();
        if (result.ok) {
            setPushPermission('granted');
            setHasSubscription(true);
        } else {
            const perm = 'Notification' in window ? Notification.permission : 'unsupported';
            setPushPermission(perm);
        }
    };

    // ─── Derived ──────────────────────────────────────────────────────────────
    const displayed = showRead ? notifications : notifications.filter(n => !n.isRead);
    const pushNeedsSetup = isAuthenticated && (pushPermission !== 'granted' || !hasSubscription);
    const pushBlocked = pushPermission === 'denied';

    if (!isAuthenticated) return null;

    return (
        <>
            {showPushSetup && <PushSetupPanel onClose={() => setShowPushSetup(false)} />}

            <div ref={panelRef} style={{ position: 'relative' }}>
                {/* Bell button */}
                <button
                    className="notif-bell-btn"
                    onClick={() => setOpen(o => !o)}
                    title="Notifications"
                >
                    {pushBlocked
                        ? <FaBellSlash size={18} style={{ color: '#94a3b8' }} />
                        : <FaBell size={18} className={unreadCount > 0 ? 'notif-bell-ring' : ''} />
                    }
                    {unreadCount > 0 && (
                        <span className="notif-count-badge">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                    {/* Exclamation dot if push isn't set up */}
                    {pushNeedsSetup && !pushBlocked && unreadCount === 0 && (
                        <span className="notif-push-dot" title="Push not configured" />
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
                                <button
                                    className="notif-action-btn"
                                    onClick={() => setShowRead(s => !s)}
                                    title={showRead ? 'Hide read' : 'Show all'}
                                >
                                    {showRead ? <FaEyeSlash size={13} /> : <FaEye size={13} />}
                                    <span>{showRead ? 'Hide read' : 'Show all'}</span>
                                </button>
                                {unreadCount > 0 && (
                                    <button
                                        className="notif-action-btn mark-all"
                                        onClick={handleMarkAll}
                                        disabled={loading}
                                    >
                                        <FaCheckDouble size={13} />
                                        <span>All read</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Push status strips */}
                        {pushBlocked ? (
                            <div className="notif-status-strip blocked">
                                <FaBellSlash size={12} />
                                <span>Push blocked in browser settings. Unblock to receive native alerts.</span>
                            </div>
                        ) : pushNeedsSetup ? (
                            <div className="notif-status-strip warn">
                                <FaExclamationTriangle size={12} />
                                <span>Native push not set up — you won't get alerts when app is closed.</span>
                                <button className="notif-status-strip-btn" onClick={handleEnablePush}>
                                    Enable
                                </button>
                                <button
                                    className="notif-status-strip-icon-btn"
                                    onClick={() => { setOpen(false); setShowPushSetup(true); }}
                                    title="Push setup & diagnostics"
                                >
                                    <FaWifi size={11} />
                                </button>
                            </div>
                        ) : (
                            <div className="notif-status-strip ok">
                                <FaCheckCircle size={12} />
                                <span>Native push active — you'll get alerts even when app is closed.</span>
                                <button
                                    className="notif-status-strip-icon-btn"
                                    onClick={() => { setOpen(false); setShowPushSetup(true); }}
                                    title="Push diagnostics & test"
                                    style={{ marginLeft: 'auto' }}
                                >
                                    <FaWifi size={11} />
                                </button>
                            </div>
                        )}

                        {/* Notification list */}
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
                                        <div key={n._id} className={`notif-item ${n.isRead ? 'read' : 'unread'}`}>
                                            <div className="notif-item-icon" style={{ color: cfg.color, background: cfg.bg }}>
                                                {cfg.icon}
                                            </div>
                                            <div className="notif-item-body">
                                                <div className="notif-item-title">{n.title}</div>
                                                <div className="notif-item-msg">{n.message}</div>
                                                <div className="notif-item-time">{moment(n.createdAt).fromNow()}</div>
                                            </div>
                                            {!n.isRead && (
                                                <button
                                                    className="notif-mark-btn"
                                                    onClick={(e) => handleMarkOne(n._id, e)}
                                                    title="Mark as read"
                                                >
                                                    <FaCheck size={10} />
                                                </button>
                                            )}
                                            {!n.isRead && <span className="notif-unread-dot" />}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {notifications.length > 0 && (
                            <div className="notif-panel-footer">
                                Showing {displayed.length} of {notifications.length} notifications
                            </div>
                        )}
                    </div>
                )}

                <style>{`
                    .notif-bell-btn {
                        position: relative;
                        display: flex; align-items: center; justify-content: center;
                        width: 38px; height: 38px;
                        background: #f1f5f9; border: none; border-radius: 50%;
                        cursor: pointer; color: #475569;
                        transition: background 0.2s, color 0.2s;
                        box-shadow: 0 1px 4px rgba(0,0,0,0.07);
                        flex-shrink: 0;
                    }
                    .notif-bell-btn:hover { background: #e2e8f0; color: #1e293b; }

                    @keyframes bell-ring {
                        0%, 100% { transform: rotate(0deg); }
                        10%, 30%, 50% { transform: rotate(-15deg); }
                        20%, 40% { transform: rotate(15deg); }
                    }
                    .notif-bell-ring { animation: bell-ring 2.5s ease infinite; color: #3b82f6; }

                    .notif-count-badge {
                        position: absolute; top: -2px; right: -2px;
                        min-width: 18px; height: 18px;
                        background: #ef4444; border: 2px solid #fff;
                        border-radius: 50rem; color: #fff;
                        font-size: 0.6rem; font-weight: 700;
                        display: flex; align-items: center; justify-content: center;
                        padding: 0 3px; animation: badge-pop 0.3s ease;
                    }
                    @keyframes badge-pop { from { transform: scale(0.5); } to { transform: scale(1); } }

                    .notif-push-dot {
                        position: absolute; top: 0; right: 0;
                        width: 9px; height: 9px;
                        background: #f59e0b; border: 2px solid #fff;
                        border-radius: 50%;
                        animation: badge-pop 0.3s ease;
                    }

                    .notif-panel {
                        position: absolute; top: calc(100% + 10px); right: 0;
                        width: 370px; max-width: calc(100vw - 24px);
                        background: #fff; border-radius: 1rem;
                        box-shadow: 0 12px 48px rgba(0,0,0,0.18);
                        border: 1px solid rgba(0,0,0,0.06);
                        z-index: 2100; overflow: hidden;
                        animation: panel-in 0.2s ease;
                        transform-origin: top right;
                    }
                    @keyframes panel-in {
                        from { opacity: 0; transform: translateY(-10px) scale(0.97); }
                        to   { opacity: 1; transform: translateY(0) scale(1); }
                    }

                    @media (max-width: 640px) {
                        .notif-panel {
                            position: fixed;
                            top: 70px;
                            left: 12px;
                            right: 12px;
                            width: auto;
                            max-width: none;
                            transform-origin: top center;
                        }
                    }

                    .notif-panel-header {
                        display: flex; align-items: center; justify-content: space-between;
                        padding: 14px 16px 12px;
                        border-bottom: 1px solid #f1f5f9; background: #fafbfc;
                    }
                    .notif-panel-title { font-weight: 700; font-size: 0.9rem; color: #1e293b; margin-right: 8px; }
                    .notif-unread-chip {
                        font-size: 0.65rem; font-weight: 700;
                        background: #dbeafe; color: #2563eb;
                        border-radius: 50rem; padding: 2px 7px; vertical-align: middle;
                    }
                    .notif-header-actions { display: flex; gap: 6px; }
                    .notif-action-btn {
                        display: flex; align-items: center; gap: 4px;
                        font-size: 0.72rem; font-weight: 600;
                        padding: 4px 9px; border: 1px solid #e2e8f0;
                        border-radius: 50rem; background: #fff; color: #475569;
                        cursor: pointer; transition: all 0.15s; white-space: nowrap;
                    }
                    .notif-action-btn:hover { background: #f1f5f9; border-color: #cbd5e1; }
                    .notif-action-btn.mark-all { color: #2563eb; border-color: #bfdbfe; background: #eff6ff; }
                    .notif-action-btn.mark-all:hover { background: #dbeafe; }
                    .notif-action-btn:disabled { opacity: 0.5; cursor: default; }

                    /* Status strips */
                    .notif-status-strip {
                        display: flex; align-items: center; gap: 8px;
                        padding: 8px 12px;
                        font-size: 0.72rem; font-weight: 500;
                        border-bottom: 1px solid transparent;
                    }
                    .notif-status-strip.ok    { background: #f0fdf4; color: #166534; border-color: #bbf7d0; }
                    .notif-status-strip.warn  { background: #fffbeb; color: #78350f; border-color: #fde68a; }
                    .notif-status-strip.blocked { background: #fef2f2; color: #991b1b; border-color: #fecaca; }
                    .notif-status-strip-btn {
                        margin-left: auto; flex-shrink: 0;
                        font-size: 0.68rem; font-weight: 700;
                        padding: 3px 10px; border: none; border-radius: 50rem;
                        background: #f59e0b; color: #fff; cursor: pointer;
                        transition: background 0.15s;
                    }
                    .notif-status-strip-btn:hover { background: #d97706; }
                    .notif-status-strip-icon-btn {
                        flex-shrink: 0; width: 24px; height: 24px;
                        border: none; border-radius: 50%;
                        background: rgba(0,0,0,0.06); color: inherit;
                        display: flex; align-items: center; justify-content: center;
                        cursor: pointer; transition: background 0.15s;
                    }
                    .notif-status-strip-icon-btn:hover { background: rgba(0,0,0,0.12); }

                    /* List */
                    .notif-list { max-height: 340px; overflow-y: auto; overscroll-behavior: contain; }
                    .notif-list::-webkit-scrollbar { width: 4px; }
                    .notif-list::-webkit-scrollbar-track { background: transparent; }
                    .notif-list::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }

                    .notif-empty { padding: 36px 20px; text-align: center; color: #94a3b8; }
                    .notif-empty-icon { margin-bottom: 10px; opacity: 0.4; }
                    .notif-empty p { font-size: 0.85rem; margin: 0; }

                    .notif-item {
                        display: flex; align-items: flex-start; gap: 12px;
                        padding: 12px 16px; border-bottom: 1px solid #f8fafc;
                        position: relative; transition: background 0.15s; cursor: default;
                    }
                    .notif-item:last-child { border-bottom: none; }
                    .notif-item.unread { background: #fafeff; }
                    .notif-item.read { opacity: 0.65; }
                    .notif-item:hover { background: #f8fafc; opacity: 1; }

                    .notif-item-icon {
                        flex-shrink: 0; width: 32px; height: 32px;
                        border-radius: 50%; display: flex; align-items: center; justify-content: center;
                        margin-top: 2px;
                    }
                    .notif-item-body { flex: 1; min-width: 0; }
                    .notif-item-title { font-size: 0.8rem; font-weight: 700; color: #1e293b; margin-bottom: 2px; }
                    .notif-item-msg { font-size: 0.78rem; color: #475569; line-height: 1.4; word-break: break-word; }
                    .notif-item-time { font-size: 0.68rem; color: #94a3b8; margin-top: 4px; }

                    .notif-unread-dot {
                        position: absolute; top: 50%; right: 36px;
                        transform: translateY(-50%); width: 7px; height: 7px;
                        background: #3b82f6; border-radius: 50%; flex-shrink: 0;
                    }
                    .notif-mark-btn {
                        flex-shrink: 0; width: 22px; height: 22px;
                        border: 1.5px solid #bfdbfe; border-radius: 50%;
                        background: #eff6ff; color: #2563eb;
                        display: flex; align-items: center; justify-content: center;
                        cursor: pointer; margin-top: 4px;
                        transition: background 0.15s, transform 0.15s;
                        opacity: 1; /* Always visible for unread items */
                    }
                    .notif-item.read .notif-mark-btn { display: none; }
                    .notif-mark-btn:hover { background: #dbeafe; transform: scale(1.1); }

                    .notif-panel-footer {
                        padding: 8px 16px; background: #fafbfc;
                        border-top: 1px solid #f1f5f9;
                        font-size: 0.68rem; color: #94a3b8; text-align: center;
                    }

                    /* Push Setup Overlay */
                    .push-setup-overlay {
                        position: fixed; inset: 0;
                        background: rgba(0,0,0,0.45);
                        z-index: 9998; display: flex;
                        align-items: center; justify-content: center;
                        padding: 16px;
                        animation: fade-in 0.15s ease;
                    }
                    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }

                    .push-setup-card {
                        background: #fff; border-radius: 1.2rem;
                        width: 100%; max-width: 380px;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.25);
                        overflow: hidden;
                        animation: slide-up 0.22s cubic-bezier(0.34,1.56,0.64,1);
                    }
                    @keyframes slide-up {
                        from { opacity: 0; transform: translateY(30px) scale(0.95); }
                        to   { opacity: 1; transform: translateY(0) scale(1); }
                    }
                    .push-setup-header {
                        display: flex; align-items: center; gap: 10px;
                        padding: 14px 16px; background: #f8fafc;
                        border-bottom: 1px solid #f1f5f9;
                        font-size: 0.88rem; font-weight: 700; color: #1e293b;
                    }
                    .push-setup-close {
                        margin-left: auto; width: 26px; height: 26px;
                        border: none; border-radius: 50%;
                        background: #e2e8f0; color: #475569;
                        display: flex; align-items: center; justify-content: center;
                        cursor: pointer; transition: background 0.15s;
                    }
                    .push-setup-close:hover { background: #cbd5e1; }

                    .push-setup-btn {
                        display: flex; align-items: center; justify-content: center; gap: 7px;
                        width: 100%; padding: 10px 16px;
                        border: none; border-radius: 50rem;
                        font-size: 0.82rem; font-weight: 700;
                        cursor: pointer; transition: background 0.15s, opacity 0.15s;
                    }
                    .push-setup-btn:disabled { opacity: 0.6; cursor: default; }
                    .push-setup-btn.primary { background: #3b82f6; color: #fff; }
                    .push-setup-btn.primary:hover:not(:disabled) { background: #2563eb; }
                    .push-setup-btn.test { background: #ecfdf5; color: #065f46; border: 1.5px solid #a7f3d0; }
                    .push-setup-btn.test:hover:not(:disabled) { background: #d1fae5; }

                    .push-setup-hint {
                        margin: 0 16px 14px; padding: 10px 12px;
                        background: #fffbeb; border: 1px solid #fde68a;
                        border-radius: 0.6rem; font-size: 0.71rem; color: #78350f; line-height: 1.6;
                    }
                    .push-setup-hint code {
                        background: #fef3c7; padding: 0 4px;
                        border-radius: 3px; font-size: 0.68rem;
                    }

                    @keyframes spin { to { transform: rotate(360deg); } }
                `}</style>
            </div>
        </>
    );
};

export default NotificationBell;
