import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import GlassCard from '../components/common/GlassCard';
import StatusPill from '../components/common/StatusPill';
import { taskService } from '../services/taskService';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { formatDate } from '../utils/formatters';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Layers,
  CalendarDays,
  ListFilter,
} from 'lucide-react';

const CalendarPage = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'list'
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isManagerOrAdmin = user?.role === 'Admin' || user?.role === 'Manager';

  const fetchTasks = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await taskService.getTasks();
      if (res?.data?.tasks) {
        setTasks(res.data.tasks);
      }
    } catch (err) {
      setError('Failed to fetch calendar tasks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Real-time socket sync
  useEffect(() => {
    if (socket) {
      const handleSync = () => fetchTasks();
      socket.on('taskCreated', handleSync);
      socket.on('taskUpdated', handleSync);
      socket.on('taskStatusChanged', handleSync);
      socket.on('taskDeleted', handleSync);
      return () => {
        socket.off('taskCreated', handleSync);
        socket.off('taskUpdated', handleSync);
        socket.off('taskStatusChanged', handleSync);
        socket.off('taskDeleted', handleSync);
      };
    }
  }, [socket]);

  // Navigation handlers
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() - 7);
    } else {
      next.setDate(next.getDate() - 1);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setDate(next.getDate() + 1);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Month grid computation
  const monthData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const cells = [];

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthTotalDays - i;
      const dateObj = new Date(year, month - 1, d);
      cells.push({
        date: dateObj,
        dayNumber: d,
        isCurrentMonth: false,
        dateKey: dateObj.toISOString().split('T')[0],
      });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      cells.push({
        date: dateObj,
        dayNumber: d,
        isCurrentMonth: true,
        dateKey: dateObj.toISOString().split('T')[0],
      });
    }

    // Next month filler days (fill up to 35 or 42 grid slots)
    const remainingSlots = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remainingSlots; d++) {
      const dateObj = new Date(year, month + 1, d);
      cells.push({
        date: dateObj,
        dayNumber: d,
        isCurrentMonth: false,
        dateKey: dateObj.toISOString().split('T')[0],
      });
    }

    return cells;
  }, [currentDate]);

  // Tasks mapped by date string (YYYY-MM-DD)
  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach((task) => {
      if (task.dueDate) {
        const key = new Date(task.dueDate).toISOString().split('T')[0];
        if (!map[key]) map[key] = [];
        map[key].push(task);
      }
    });
    return map;
  }, [tasks]);

  // Helper for task chip styling
  const getTaskChipStyle = (task) => {
    const today = new Date().toISOString().split('T')[0];
    const taskDue = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : null;

    if (task.status === 'Completed') {
      return {
        background: 'rgba(16, 185, 129, 0.15)',
        color: '#065F46',
        border: '1px solid rgba(16, 185, 129, 0.3)',
      };
    }
    if (taskDue && taskDue < today) {
      return {
        background: 'rgba(239, 68, 68, 0.15)',
        color: '#991B1B',
        border: '1px solid rgba(239, 68, 68, 0.3)',
      };
    }
    if (taskDue === today) {
      return {
        background: 'rgba(255, 91, 38, 0.15)',
        color: '#C2410C',
        border: '1px solid rgba(255, 91, 38, 0.4)',
      };
    }
    return {
      background: 'rgba(59, 130, 246, 0.12)',
      color: '#1E40AF',
      border: '1px solid rgba(59, 130, 246, 0.3)',
    };
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div>
      {/* Header & Controls */}
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
              background: 'var(--coral-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFF',
              boxShadow: '0 4px 12px rgba(255, 91, 38, 0.3)',
            }}
          >
            <CalendarIcon size={22} />
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
              Timeline & Calendar Matrix
            </h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Visualize deliverable deadlines, milestones, and overdue work
            </p>
          </div>
        </div>

        {/* View mode switcher & Date selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              background: '#F1F5F9',
              borderRadius: 'var(--card-radius-pill)',
              padding: 3,
            }}
          >
            <button
              onClick={() => setViewMode('month')}
              style={{
                border: 'none',
                background: viewMode === 'month' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'month' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.8rem',
                padding: '6px 14px',
                borderRadius: 'var(--card-radius-pill)',
                cursor: 'pointer',
                boxShadow: viewMode === 'month' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              style={{
                border: 'none',
                background: viewMode === 'week' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'week' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.8rem',
                padding: '6px 14px',
                borderRadius: 'var(--card-radius-pill)',
                cursor: 'pointer',
                boxShadow: viewMode === 'week' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                border: 'none',
                background: viewMode === 'list' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'list' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.8rem',
                padding: '6px 14px',
                borderRadius: 'var(--card-radius-pill)',
                cursor: 'pointer',
                boxShadow: viewMode === 'list' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              Schedule
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={handlePrev}
              className="btn-outline"
              style={{ padding: '6px 10px' }}
              title="Previous"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleToday}
              className="btn-outline"
              style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700 }}
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="btn-outline"
              style={{ padding: '6px 10px' }}
              title="Next"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {isManagerOrAdmin && (
            <Link to="/tasks/create" className="btn-coral" style={{ padding: '6px 16px' }}>
              <Plus size={16} />
              <span>Create Task</span>
            </Link>
          )}
        </div>
      </div>

      {/* Date Header Indicator */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          padding: '0 4px',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.25rem',
            fontWeight: 800,
            color: '#FFFFFF',
            textShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}
        >
          {currentDate.toLocaleString('default', { month: 'long' })} {currentDate.getFullYear()}
        </h2>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: '#FFF' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} />
            <span>Overdue</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: '#FFF' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF5B26' }} />
            <span>Due Today</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: '#FFF' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3B82F6' }} />
            <span>Upcoming</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: '#FFF' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} />
            <span>Completed</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#FFFFFF' }}>
          <Loader2 size={36} className="spin-animation" style={{ margin: '0 auto 12px auto' }} />
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem' }}>
            Rendering task calendar...
          </p>
        </div>
      ) : viewMode === 'month' ? (
        /* Month View Grid */
        <div
          className="glass-card"
          style={{
            padding: 16,
            background: 'var(--card-bg)',
          }}
        >
          {/* Days of week header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              textAlign: 'center',
              fontWeight: 800,
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              paddingBottom: 12,
              borderBottom: '1px solid var(--card-border-subtle)',
            }}
          >
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Calendar Day Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 8,
              marginTop: 10,
            }}
          >
            {monthData.map((cell, idx) => {
              const cellTasks = tasksByDate[cell.dateKey] || [];
              const isToday = cell.dateKey === todayStr;

              return (
                <div
                  key={idx}
                  style={{
                    minHeight: 110,
                    background: isToday
                      ? 'rgba(255, 91, 38, 0.08)'
                      : cell.isCurrentMonth
                      ? 'var(--card-bg)'
                      : 'var(--card-bg-subtle)',
                    border: isToday
                      ? '2px solid var(--coral-primary)'
                      : '1px solid var(--card-border-subtle)',
                    borderRadius: 'var(--card-radius-md)',
                    padding: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    opacity: cell.isCurrentMonth ? 1 : 0.45,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Day Number */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontWeight: isToday ? 800 : 700,
                        fontSize: '0.8rem',
                        color: isToday ? 'var(--coral-primary)' : 'var(--text-primary)',
                      }}
                    >
                      {cell.dayNumber}
                    </span>
                    {cellTasks.length > 0 && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          background: '#F1F5F9',
                          color: 'var(--text-secondary)',
                          padding: '1px 5px',
                          borderRadius: 8,
                        }}
                      >
                        {cellTasks.length}
                      </span>
                    )}
                  </div>

                  {/* Task Chips */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', maxHeight: 85 }}>
                    {cellTasks.slice(0, 3).map((t) => {
                      const chipStyle = getTaskChipStyle(t);
                      return (
                        <div
                          key={t._id}
                          onClick={() => navigate(`/tasks/${t._id}`)}
                          title={`${t.title} (${t.status})`}
                          style={{
                            ...chipStyle,
                            padding: '3px 6px',
                            borderRadius: 6,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              backgroundColor:
                                t.priority === 'Urgent'
                                  ? '#EF4444'
                                  : t.priority === 'High'
                                  ? '#FF5B26'
                                  : '#3B82F6',
                              flexShrink: 0,
                            }}
                          />
                          <span>{t.title}</span>
                        </div>
                      );
                    })}
                    {cellTasks.length > 3 && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        +{cellTasks.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : viewMode === 'week' ? (
        /* Week View Grid */
        <div
          className="glass-card"
          style={{
            padding: 20,
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 12,
            }}
          >
            {Array.from({ length: 7 }).map((_, i) => {
              const d = new Date(currentDate);
              const day = d.getDay();
              const diff = d.getDate() - day + i;
              const weekDay = new Date(d.setDate(diff));
              const dateKey = weekDay.toISOString().split('T')[0];
              const isToday = dateKey === todayStr;
              const dayTasks = tasksByDate[dateKey] || [];

              return (
                <div
                  key={i}
                  style={{
                    minHeight: 350,
                    background: isToday ? 'rgba(255, 91, 38, 0.05)' : '#FFFFFF',
                    border: isToday ? '2px solid var(--coral-primary)' : '1px solid #E2E8F0',
                    borderRadius: 'var(--card-radius-md)',
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ textAlign: 'center', paddingBottom: 8, borderBottom: '1px solid #F1F5F9' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      {weekDay.toLocaleDateString('default', { weekday: 'short' })}
                    </div>
                    <div
                      style={{
                        fontSize: '1.1rem',
                        fontWeight: 800,
                        color: isToday ? 'var(--coral-primary)' : 'var(--text-primary)',
                      }}
                    >
                      {weekDay.getDate()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflowY: 'auto' }}>
                    {dayTasks.map((t) => {
                      const chipStyle = getTaskChipStyle(t);
                      return (
                        <div
                          key={t._id}
                          onClick={() => navigate(`/tasks/${t._id}`)}
                          style={{
                            ...chipStyle,
                            padding: '6px 8px',
                            borderRadius: 8,
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.3 }}>
                            {t.title}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                            <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>{t.priority}</span>
                            <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>{t.status}</span>
                          </div>
                        </div>
                      );
                    })}
                    {dayTasks.length === 0 && (
                      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 20 }}>
                        No deliverables
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Agenda / List View */
        <GlassCard title="Chronological Deliverable Agenda">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tasks
              .filter((t) => t.dueDate)
              .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
              .map((t) => {
                const isOverdue =
                  new Date(t.dueDate).toISOString().split('T')[0] < todayStr &&
                  t.status !== 'Completed';

                return (
                  <div
                    key={t._id}
                    onClick={() => navigate(`/tasks/${t._id}`)}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: 'var(--card-radius-md)',
                      padding: '14px 18px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      borderLeft: isOverdue
                        ? '4px solid #EF4444'
                        : t.status === 'Completed'
                        ? '4px solid #10B981'
                        : '4px solid var(--coral-primary)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div
                        style={{
                          textAlign: 'center',
                          minWidth: 70,
                          padding: '6px 10px',
                          background: '#F8FAFC',
                          borderRadius: 8,
                        }}
                      >
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                          {new Date(t.dueDate).toLocaleDateString('default', { month: 'short' })}
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {new Date(t.dueDate).getDate()}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {t.title}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          Assigned: {t.assignedTo?.name || 'Unassigned'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <StatusPill status={t.status} />
                      <StatusPill priority={t.priority} />
                    </div>
                  </div>
                );
              })}

            {tasks.filter((t) => t.dueDate).length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                No tasks have scheduled due dates.
              </div>
            )}
          </div>
        </GlassCard>
      )}
    </div>
  );
};

export default CalendarPage;
