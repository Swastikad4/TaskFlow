import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../hooks/useSocket';
import { Bell, CheckCircle2, AlertCircle, X, ExternalLink } from 'lucide-react';

const ToastContainer = () => {
  const { toasts, removeToast } = useSocket();
  const navigate = useNavigate();

  if (!toasts || toasts.length === 0) return null;

  const handleToastClick = (toast) => {
    if (toast.taskId) {
      navigate(`/tasks/${toast.taskId}`);
      removeToast(toast.id);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 80,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        maxWidth: 380,
        width: '100%',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            pointerEvents: 'auto',
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.8)',
            borderLeft: '4px solid var(--coral-primary)',
            borderRadius: 'var(--card-radius-md)',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.12)',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            cursor: toast.taskId ? 'pointer' : 'default',
          }}
          onClick={() => handleToastClick(toast)}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(255, 91, 38, 0.12)',
              color: 'var(--coral-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Bell size={16} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: '0.825rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {toast.title || 'Live Alert'}
              </span>
              {toast.taskId && (
                <span style={{ fontSize: '0.7rem', color: 'var(--coral-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
                  View <ExternalLink size={10} />
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4 }}>
              {toast.message}
            </p>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              removeToast(toast.id);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 2,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
