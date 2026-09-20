import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import GlassCard from '../components/common/GlassCard';
import StatusPill from '../components/common/StatusPill';
import TagBadge from '../components/common/TagBadge';
import { taskService } from '../services/taskService';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { formatDate } from '../utils/formatters';
import {
  Archive,
  RotateCcw,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  Clock,
  User,
  ArrowLeft,
} from 'lucide-react';

const ArchivedTasksPage = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [restoringId, setRestoringId] = useState(null);

  const fetchArchivedTasks = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        isArchived: true,
      };
      if (search) params.search = search;

      const res = await taskService.getTasks(params);
      if (res?.data?.tasks) {
        setTasks(res.data.tasks);
      }
    } catch (err) {
      setError('Failed to fetch archived tasks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedTasks();
  }, [search]);

  // Real-time socket sync
  useEffect(() => {
    if (socket) {
      const handleSync = () => fetchArchivedTasks();
      socket.on('taskArchived', handleSync);
      socket.on('taskRestored', handleSync);
      return () => {
        socket.off('taskArchived', handleSync);
        socket.off('taskRestored', handleSync);
      };
    }
  }, [socket]);

  const handleRestoreTask = async (taskId) => {
    if (window.confirm('Restore this task to the active workflow?')) {
      setRestoringId(taskId);
      try {
        await taskService.restoreTask(taskId);
        setTasks((prev) => prev.filter((t) => t._id !== taskId));
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to restore task.');
      } finally {
        setRestoringId(null);
      }
    }
  };

  return (
    <div>
      {/* Header & Controls Bar */}
      <div
        className="glass-card"
        style={{
          marginBottom: 20,
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #64748B 0%, #475569 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFF',
              boxShadow: '0 4px 12px rgba(100, 116, 139, 0.3)',
            }}
          >
            <Archive size={22} />
          </div>
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.4rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
              }}
            >
              Archived Tasks Vault
            </h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Completed or decommissioned work items preserved for historical records
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={fetchArchivedTasks}
            className="btn-outline"
            style={{ padding: '8px 14px' }}
            title="Refresh Archive"
          >
            <RefreshCw size={15} />
          </button>

          <Link to="/tasks" className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={16} />
            <span>Active Tasks</span>
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div
        className="glass-card"
        style={{
          marginBottom: 24,
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div style={{ flex: 1, position: 'relative' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: 14,
              top: 13,
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            className="form-input"
            placeholder="Search archived tasks by title, description or tags..."
            style={{ paddingLeft: 40, marginBottom: 0 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #F87171',
            color: '#991B1B',
            borderRadius: 'var(--card-radius-sm)',
            padding: '12px 16px',
            fontSize: '0.85rem',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Tasks List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#FFFFFF' }}>
          <Loader2 size={36} className="spin-animation" style={{ margin: '0 auto 12px auto' }} />
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem' }}>
            Loading archived vault...
          </p>
        </div>
      ) : tasks.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {tasks.map((task) => (
            <div
              key={task._id}
              className="glass-card"
              style={{
                padding: '18px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 16,
                borderLeft: '4px solid #64748B',
              }}
            >
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      background: '#F1F5F9',
                      color: '#475569',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 6,
                      textTransform: 'uppercase',
                    }}
                  >
                    Archived
                  </span>
                  <StatusPill status={task.status} />
                  <StatusPill priority={task.priority} />

                  {task.tags && task.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      {task.tags.map((t, idx) => (
                        <TagBadge key={idx} tag={t} size="sm" />
                      ))}
                    </div>
                  )}
                </div>

                <Link
                  to={`/tasks/${task._id}`}
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    color: 'var(--text-primary)',
                    textDecoration: 'none',
                    display: 'block',
                    marginBottom: 4,
                  }}
                >
                  {task.title}
                </Link>

                <p
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.4,
                    marginBottom: 8,
                  }}
                >
                  {task.description
                    ? task.description.length > 140
                      ? task.description.substring(0, 140) + '...'
                      : task.description
                    : 'No description provided.'}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>Archived on {formatDate(task.archivedAt || task.updatedAt)}</span>
                  <span>•</span>
                  <span>Assignee: {task.assignedTo?.name || 'Unassigned'}</span>
                </div>
              </div>

              {/* Restore Action */}
              <button
                type="button"
                onClick={() => handleRestoreTask(task._id)}
                disabled={restoringId === task._id}
                className="btn-coral"
                style={{ padding: '8px 18px', fontSize: '0.85rem' }}
              >
                {restoringId === task._id ? (
                  <>
                    <Loader2 size={16} className="spin-animation" />
                    <span>Restoring...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw size={16} />
                    <span>Restore Task</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card" style={{ maxWidth: 500, margin: '40px auto', padding: 40, textAlign: 'center' }}>
          <Archive size={40} color="#94A3B8" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800 }}>
            No archived tasks
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4, marginBottom: 20 }}>
            No tasks have been archived yet. Tasks archived from the details page will appear here.
          </p>
          <Link to="/tasks" className="btn-coral">
            Return to Active Tasks
          </Link>
        </div>
      )}
    </div>
  );
};

export default ArchivedTasksPage;
