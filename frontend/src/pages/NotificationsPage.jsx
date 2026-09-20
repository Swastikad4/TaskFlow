import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import GlassCard from '../components/common/GlassCard';
import { notificationService } from '../services/notificationService';
import { useSocket } from '../hooks/useSocket';
import { formatRelativeTime } from '../utils/formatters';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  MessageSquare,
  AlertCircle,
  Loader2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

const NotificationsPage = () => {
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNotifications = async () => {
    try {
      const res = await notificationService.getNotifications();
      if (res?.data?.notifications) {
        setNotifications(res.data.notifications);
      }
    } catch (err) {
      setError('Failed to fetch notifications from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    if (socket) {
      socket.on('notificationCreated', (newNotif) => {
        setNotifications((prev) => [newNotif, ...prev]);
      });
    }

    return () => {
      if (socket) {
        socket.off('notificationCreated');
      }
    };
  }, [socket]);

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      alert('Failed to mark all notifications as read.');
    }
  };

  const handleMarkOneRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(
        notifications.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.warn('Failed to mark notification as read.');
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div style={{ maxWidth: 840, margin: '0 auto' }}>
      {/* Header bar */}
      <div
        className="glass-card"
        style={{
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '18px 24px',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.4rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
            }}
          >
            Live Notifications Center
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {unreadCount > 0
              ? `${unreadCount} unread alert(s) requiring your attention`
              : 'All notifications are caught up'}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="btn-outline"
            style={{ padding: '8px 16px', fontSize: '0.825rem' }}
          >
            <CheckCheck size={16} />
            <span>Mark All Read</span>
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#FFFFFF' }}>
          <Loader2 size={36} className="spin-animation" style={{ margin: '0 auto 12px auto' }} />
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem' }}>
            Fetching notifications...
          </p>
        </div>
      ) : notifications.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {notifications.map((notif) => (
            <div
              key={notif._id}
              className="glass-card"
              style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                background: notif.isRead ? '#FFFFFF' : '#FFFBF9',
                borderLeft: notif.isRead
                  ? '1px solid #E5E7EB'
                  : '4px solid var(--coral-primary)',
                transition: 'transform 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: notif.isRead
                      ? '#F1F3F5'
                      : 'rgba(255, 91, 38, 0.12)',
                    color: notif.isRead ? '#6B7280' : 'var(--coral-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Bell size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: notif.isRead ? 500 : 700,
                      color: 'var(--text-primary)',
                      marginBottom: 2,
                    }}
                  >
                    {notif.message}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>{formatRelativeTime(notif.createdAt)}</span>
                    {notif.task && (
                      <>
                        <span>•</span>
                        <Link
                          to={`/tasks/${notif.task._id || notif.task}`}
                          style={{
                            color: 'var(--coral-primary)',
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          View Task Specifications ↗
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {!notif.isRead && (
                <button
                  onClick={() => handleMarkOneRead(notif._id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--coral-primary)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: '6px 10px',
                    borderRadius: 6,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <Sparkles size={40} color="var(--coral-primary)" style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 800 }}>
            No notifications
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
            You are completely up to date with workspace activity and assignments.
          </p>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
