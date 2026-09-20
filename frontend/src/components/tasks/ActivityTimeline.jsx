import React, { useState, useEffect } from 'react';
import { taskService } from '../../services/taskService';
import { useSocket } from '../../hooks/useSocket';
import { formatRelativeTime, getInitials } from '../../utils/formatters';
import {
  Activity as ActivityIcon,
  PlusCircle,
  RefreshCw,
  UserCheck,
  Flag,
  Calendar,
  MessageSquare,
  Edit3,
  Loader2,
  Clock,
} from 'lucide-react';

const ActivityTimeline = ({ taskId }) => {
  const { socket } = useSocket();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    try {
      const res = await taskService.getActivities(taskId);
      if (res?.data?.activities) {
        setActivities(res.data.activities);
      }
    } catch (err) {
      console.warn('Failed to load task activities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();

    if (socket) {
      socket.on('activityCreated', (newActivity) => {
        if (newActivity.task === taskId || newActivity.task?._id === taskId) {
          setActivities((prev) => [newActivity, ...prev]);
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('activityCreated');
      }
    };
  }, [taskId, socket]);

  const getActionIcon = (action) => {
    switch (action) {
      case 'TASK_CREATED':
        return <PlusCircle size={15} color="#10B981" />;
      case 'STATUS_CHANGED':
        return <RefreshCw size={15} color="#3B82F6" />;
      case 'ASSIGNED':
      case 'REASSIGNED':
        return <UserCheck size={15} color="#FF5B26" />;
      case 'PRIORITY_CHANGED':
        return <Flag size={15} color="#F59E0B" />;
      case 'DUE_DATE_CHANGED':
        return <Calendar size={15} color="#8B5CF6" />;
      case 'COMMENT_ADDED':
        return <MessageSquare size={15} color="#06B6D4" />;
      default:
        return <Edit3 size={15} color="#6B7280" />;
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '30px 0' }}>
        <Loader2 size={24} className="spin-animation" style={{ margin: '0 auto 8px auto' }} />
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading activity audit logs...</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
        <ActivityIcon size={32} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
        <p style={{ fontSize: '0.85rem' }}>No activity logged yet for this task.</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', paddingLeft: 20 }}>
      {/* Vertical Timeline Line */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          bottom: 10,
          left: 6,
          width: 2,
          background: '#E5E7EB',
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {activities.map((act) => (
          <div
            key={act._id}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            {/* Action Dot */}
            <div
              style={{
                position: 'absolute',
                left: -20,
                top: 2,
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: '#FFFFFF',
                border: '2px solid var(--coral-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            />

            <div
              style={{
                flex: 1,
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 'var(--card-radius-sm)',
                padding: '12px 14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {getActionIcon(act.action)}
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {act.user?.name || 'User'}
                  </span>
                  {act.user?.role && (
                    <span
                      style={{
                        fontSize: '0.68rem',
                        color: 'var(--text-muted)',
                        background: '#E5E7EB',
                        padding: '1px 5px',
                        borderRadius: 3,
                      }}
                    >
                      {act.user.role}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                  <Clock size={11} />
                  <span>{formatRelativeTime(act.createdAt)}</span>
                </div>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: 22 }}>
                {act.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityTimeline;
