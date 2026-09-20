import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { sessionService } from '../services/sessionService';
import GlassCard from '../components/common/GlassCard';
import {
  Shield,
  Smartphone,
  Laptop,
  Monitor,
  Globe,
  Clock,
  LogOut,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { formatTimeAgo } from '../utils/formatters';

const SessionsPage = () => {
  const { user, logout } = useAuth();
  const { socket } = useSocket();

  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await sessionService.getSessions();
      if (res?.data?.sessions) {
        setSessions(res.data.sessions);
        setCurrentSessionId(res.data.currentSessionId);
      }
    } catch (err) {
      setError('Failed to fetch active device sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();

    if (socket) {
      const handleSessionRevoked = (data) => {
        if (data?.revokedOthers && data.exceptSessionId !== currentSessionId) {
          logout();
        } else if (data?.sessionId === currentSessionId) {
          logout();
        } else {
          fetchSessions();
        }
      };

      socket.on('sessionRevoked', handleSessionRevoked);

      return () => {
        socket.off('sessionRevoked', handleSessionRevoked);
      };
    }
  }, [socket, currentSessionId]);

  const showMsg = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 4000);
  };

  const handleRevokeSession = async (sessionId) => {
    if (!window.confirm('Revoke authorization for this session?')) return;

    setActionLoading(true);
    try {
      await sessionService.revokeSession(sessionId);
      showMsg('Session successfully revoked');
      fetchSessions();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to revoke session');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeAllOthers = async () => {
    if (!window.confirm('Are you sure you want to sign out all other devices and active sessions?')) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await sessionService.revokeAllOtherSessions();
      showMsg(`Revoked ${res?.data?.revokedCount || 0} other active sessions.`);
      fetchSessions();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to revoke other sessions');
    } finally {
      setActionLoading(false);
    }
  };

  const getDeviceIcon = (deviceStr = '') => {
    const d = deviceStr.toLowerCase();
    if (d.includes('ios') || d.includes('android') || d.includes('phone')) {
      return <Smartphone size={22} color="var(--accent-cyan)" />;
    }
    if (d.includes('mac') || d.includes('laptop')) {
      return <Laptop size={22} color="var(--accent-purple)" />;
    }
    return <Monitor size={22} color="var(--coral-primary)" />;
  };

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.8rem',
              fontWeight: 800,
              color: 'var(--text-white)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Shield size={28} color="var(--coral-primary)" />
            <span>Active Device & Session Security</span>
          </h1>
          <p style={{ color: 'var(--text-white-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Manage devices currently signed into your TaskFlow account with instant token revocation
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={fetchSessions}
            className="glass-icon-btn"
            title="Refresh Sessions"
            style={{ width: 40, height: 40 }}
          >
            <RefreshCw size={16} />
          </button>

          {otherSessionsCount > 0 && (
            <button
              onClick={handleRevokeAllOthers}
              disabled={actionLoading}
              className="btn-coral"
              style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}
            >
              <Trash2 size={16} />
              <span>Revoke All Other Sessions ({otherSessionsCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {message && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.2)',
            border: '1px solid #10B981',
            color: '#10B981',
            borderRadius: 'var(--card-radius-sm)',
            padding: '12px 18px',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <CheckCircle size={18} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid #EF4444',
            color: '#EF4444',
            borderRadius: 'var(--card-radius-sm)',
            padding: '12px 18px',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Sessions List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-white)' }}>
          <Loader2 size={36} className="spin-animation" color="var(--coral-primary)" style={{ margin: '0 auto 12px auto' }} />
          <div>Scanning active security sessions...</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sessions.map((session) => (
            <GlassCard
              key={session.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: session.isCurrent
                  ? '2px solid var(--accent-emerald)'
                  : '1px solid var(--card-border-subtle)',
                background: session.isCurrent ? 'var(--card-bg)' : 'var(--card-bg)',
                flexWrap: 'wrap',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 'var(--card-radius-md)',
                    background: 'var(--card-bg-subtle)',
                    border: '1px solid var(--card-border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {getDeviceIcon(session.device)}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: '1.05rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {session.device}
                    </span>

                    {session.isCurrent ? (
                      <span
                        style={{
                          background: 'rgba(16, 185, 129, 0.18)',
                          color: '#10B981',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 'var(--card-radius-pill)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
                        Current Device
                      </span>
                    ) : (
                      <span
                        style={{
                          background: 'rgba(148, 163, 184, 0.15)',
                          color: 'var(--text-muted)',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 'var(--card-radius-pill)',
                        }}
                      >
                        Remote Session
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                      marginTop: 4,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Globe size={13} />
                      IP: {session.ipAddress}
                    </span>

                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={13} />
                      Last Active: {formatTimeAgo(session.lastActive)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                {session.isCurrent ? (
                  <button
                    onClick={logout}
                    className="btn-outline"
                    style={{ padding: '8px 18px', fontSize: '0.85rem' }}
                  >
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleRevokeSession(session.id)}
                    disabled={actionLoading}
                    className="btn-outline"
                    style={{
                      padding: '8px 18px',
                      fontSize: '0.85rem',
                      borderColor: 'rgba(239, 68, 68, 0.4)',
                      color: '#EF4444',
                    }}
                  >
                    <Trash2 size={15} />
                    <span>Revoke Access</span>
                  </button>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default SessionsPage;
