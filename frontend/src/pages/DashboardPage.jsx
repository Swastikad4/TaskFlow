import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import GlassCard from '../components/common/GlassCard';
import StatusPill from '../components/common/StatusPill';
import { taskService } from '../services/taskService';
import { notificationService } from '../services/notificationService';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { formatDate, formatRelativeTime, getInitials } from '../utils/formatters';
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ArrowRight,
  Plus,
  Star,
  Bell,
  Layers,
  Loader2,
  TrendingUp,
} from 'lucide-react';

const DashboardPage = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [tasks, setTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingFavId, setTogglingFavId] = useState(null);

  const fetchDashboardData = async () => {
    try {
      const [taskRes, notifRes] = await Promise.allSettled([
        taskService.getTasks(),
        notificationService.getNotifications(),
      ]);

      if (taskRes.status === 'fulfilled' && taskRes.value?.data?.tasks) {
        setTasks(taskRes.value.data.tasks);
      }
      if (notifRes.status === 'fulfilled' && notifRes.value?.data?.notifications) {
        setNotifications(notifRes.value.data.notifications);
      }
    } catch (err) {
      console.warn('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    if (socket) {
      socket.on('taskCreated', fetchDashboardData);
      socket.on('taskUpdated', fetchDashboardData);
      socket.on('taskStatusChanged', fetchDashboardData);
      socket.on('taskMoved', fetchDashboardData);
      socket.on('taskDeleted', fetchDashboardData);
      socket.on('recurringTaskGenerated', fetchDashboardData);
      socket.on('notificationCreated', fetchDashboardData);
    }

    return () => {
      if (socket) {
        socket.off('taskCreated', fetchDashboardData);
        socket.off('taskUpdated', fetchDashboardData);
        socket.off('taskStatusChanged', fetchDashboardData);
        socket.off('taskMoved', fetchDashboardData);
        socket.off('taskDeleted', fetchDashboardData);
        socket.off('recurringTaskGenerated', fetchDashboardData);
        socket.off('notificationCreated', fetchDashboardData);
      }
    };
  }, [socket]);

  // Handle favorite toggle from dashboard
  const handleToggleFavorite = async (taskId, currentFav, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (togglingFavId) return;

    setTogglingFavId(taskId);
    // Optimistically update local state
    setTasks((prev) =>
      prev.map((t) =>
        (t._id === taskId || t.id === taskId)
          ? { ...t, isFavorite: !currentFav }
          : t
      )
    );

    try {
      await taskService.toggleFavorite(taskId);
    } catch (err) {
      // Revert on failure
      setTasks((prev) =>
        prev.map((t) =>
          (t._id === taskId || t.id === taskId)
            ? { ...t, isFavorite: currentFav }
            : t
        )
      );
    } finally {
      setTogglingFavId(null);
    }
  };

  // Greeting determination based on hour
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Real-time metric computations
  const totalTasks = tasks.length;
  const inProgressCount = tasks.filter((t) => t.status === 'In Progress').length;
  const completedCount = tasks.filter((t) => t.status === 'Completed').length;
  const todoCount = tasks.filter((t) => t.status === 'To Do').length;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const overdueCount = tasks.filter((t) => {
    if (!t.dueDate || t.status === 'Completed') return false;
    return new Date(t.dueDate) < startOfToday;
  }).length;

  const completionPercentage =
    totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  // Priority counts
  const urgentCount = tasks.filter((t) => t.priority === 'Urgent').length;
  const highCount = tasks.filter((t) => t.priority === 'High').length;
  const medCount = tasks.filter((t) => t.priority === 'Medium').length;
  const lowCount = tasks.filter((t) => t.priority === 'Low').length;

  // Active tasks (In Progress first, then To Do, sorted by priority/updated)
  const activeTasks = tasks
    .filter((t) => t.status !== 'Completed')
    .sort((a, b) => {
      // In Progress first
      if (a.status === 'In Progress' && b.status !== 'In Progress') return -1;
      if (b.status === 'In Progress' && a.status !== 'In Progress') return 1;
      // Priority weighting
      const pWeights = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
      const weightA = pWeights[a.priority] || 0;
      const weightB = pWeights[b.priority] || 0;
      if (weightA !== weightB) return weightB - weightA;
      return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
    })
    .slice(0, 5);

  // Upcoming deadlines (overdue first, then today, then chronological)
  const upcomingDeadlines = tasks
    .filter((t) => t.dueDate && t.status !== 'Completed')
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5);

  // Helper for deadline urgency badges
  const getDeadlineInfo = (dueDateString) => {
    const due = new Date(dueDateString);
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    const diffTime = dueDay - startOfToday;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: 'Overdue', className: 'deadline-overdue', isUrgent: true };
    }
    if (diffDays === 0) {
      return { label: 'Today', className: 'deadline-today', isUrgent: true };
    }
    if (diffDays === 1) {
      return { label: 'Tomorrow', className: 'deadline-soon', isUrgent: false };
    }
    if (diffDays <= 7) {
      return {
        label: `In ${diffDays} days`,
        className: 'deadline-upcoming',
        isUrgent: false,
      };
    }
    return {
      label: formatDate(dueDateString),
      className: 'deadline-normal',
      isUrgent: false,
    };
  };

  const isManagerOrAdmin = user?.role === 'Admin' || user?.role === 'Manager';
  const userName = user?.name ? user.name.split(' ')[0] : 'there';

  return (
    <div className="dashboard-wrapper">
      {/* 1. Welcome Section */}
      <section className="welcome-banner">
        <div className="welcome-text-container">
          <h1 className="welcome-title">
            {getGreeting()}, {userName} <span className="wave-emoji">👋</span>
          </h1>
          <p className="welcome-subtitle">
            Here's what's happening with your tasks today.
          </p>
        </div>

        <div className="welcome-actions">
          {isManagerOrAdmin && (
            <Link to="/tasks/create" className="btn-coral welcome-create-btn">
              <Plus size={16} />
              <span>Create Task</span>
            </Link>
          )}
        </div>
      </section>

      {loading ? (
        <div className="dashboard-loading-state">
          <Loader2 size={36} className="spin-animation" color="var(--coral-primary)" />
          <p>Loading your dashboard...</p>
        </div>
      ) : (
        <>
          {/* 2. Task Summary Section (4 Primary Cards) */}
          <section className="summary-cards-grid" aria-label="Task Summary Metrics">
            {/* Total Tasks */}
            <Link to="/tasks" className="summary-card total-card">
              <div className="summary-card-header">
                <span className="summary-card-label">Total Tasks</span>
                <div className="summary-card-icon total-icon">
                  <CheckSquare size={18} />
                </div>
              </div>
              <div className="summary-card-body">
                <span className="summary-card-number">{totalTasks}</span>
                <span className="summary-card-hint">
                  {todoCount} to do • {inProgressCount} active
                </span>
              </div>
            </Link>

            {/* In Progress */}
            <Link to="/tasks?status=In%20Progress" className="summary-card in-progress-card">
              <div className="summary-card-header">
                <span className="summary-card-label">In Progress</span>
                <div className="summary-card-icon in-progress-icon">
                  <Clock size={18} />
                </div>
              </div>
              <div className="summary-card-body">
                <span className="summary-card-number">{inProgressCount}</span>
                <span className="summary-card-hint">Currently in workflow</span>
              </div>
            </Link>

            {/* Completed */}
            <Link to="/tasks?status=Completed" className="summary-card completed-card">
              <div className="summary-card-header">
                <span className="summary-card-label">Completed</span>
                <div className="summary-card-icon completed-icon">
                  <CheckCircle2 size={18} />
                </div>
              </div>
              <div className="summary-card-body">
                <span className="summary-card-number">{completedCount}</span>
                <span className="summary-card-hint">
                  {completionPercentage}% completed
                </span>
              </div>
            </Link>

            {/* Overdue */}
            <Link to="/tasks?datePreset=overdue" className="summary-card overdue-card">
              <div className="summary-card-header">
                <span className="summary-card-label">Overdue</span>
                <div className="summary-card-icon overdue-icon">
                  <AlertTriangle size={18} />
                </div>
              </div>
              <div className="summary-card-body">
                <span className="summary-card-number">{overdueCount}</span>
                <span className="summary-card-hint">
                  {overdueCount > 0 ? 'Requires attention' : 'All on schedule'}
                </span>
              </div>
            </Link>
          </section>

          {/* 3. Main Dashboard Content Grid */}
          <div className="dashboard-main-grid">
            {/* Left Column: Active Tasks (Span 7/12) */}
            <div className="active-tasks-column">
              <GlassCard
                title="Active Tasks"
                subtitle="High-priority tasks currently in your queue"
              >
                {activeTasks.length > 0 ? (
                  <div className="active-tasks-list">
                    {activeTasks.map((task) => {
                      const isFav = Boolean(task.isFavorite);
                      const isTaskOverdue =
                        task.dueDate &&
                        new Date(task.dueDate) < startOfToday &&
                        task.status !== 'Completed';

                      return (
                        <div key={task._id} className="active-task-row">
                          {/* Star Action */}
                          <button
                            onClick={(e) => handleToggleFavorite(task._id, isFav, e)}
                            className="task-fav-btn"
                            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                            aria-label="Toggle favorite"
                          >
                            <Star
                              size={16}
                              fill={isFav ? '#F59E0B' : 'transparent'}
                              color={isFav ? '#F59E0B' : 'var(--text-muted)'}
                            />
                          </button>

                          {/* Task Info */}
                          <div className="active-task-info">
                            <Link to={`/tasks/${task._id}`} className="active-task-title">
                              {task.title}
                            </Link>
                            <div className="active-task-meta">
                              <StatusPill status={task.status} size="small" />
                              <StatusPill priority={task.priority} size="small" />
                              {task.dueDate && (
                                <span
                                  className={`active-task-date ${
                                    isTaskOverdue ? 'date-overdue' : ''
                                  }`}
                                >
                                  <Calendar size={12} />
                                  <span>Due {formatDate(task.dueDate)}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Assignee Avatar */}
                          <div className="active-task-assignee">
                            {task.assignedTo ? (
                              <div
                                className="assignee-avatar-chip"
                                title={`Assigned to: ${task.assignedTo.name || 'Team Member'}`}
                              >
                                <div className="assignee-mini-avatar">
                                  {getInitials(task.assignedTo.name || 'TM')}
                                </div>
                                <span className="assignee-name">
                                  {task.assignedTo.name
                                    ? task.assignedTo.name.split(' ')[0]
                                    : 'Assigned'}
                                </span>
                              </div>
                            ) : (
                              <span className="unassigned-chip">Unassigned</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-dashboard-block">
                    <Layers size={36} className="empty-icon" />
                    <p className="empty-heading">No active tasks</p>
                    <p className="empty-subtext">You're all caught up for today!</p>
                  </div>
                )}

                <div className="section-footer-link">
                  <Link to="/tasks" className="text-link">
                    <span>View all tasks</span>
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </GlassCard>
            </div>

            {/* Right Column: Upcoming Deadlines (Span 5/12) */}
            <div className="deadlines-column">
              <GlassCard
                title="Upcoming Deadlines"
                subtitle="Tasks scheduled for near-term delivery"
              >
                {upcomingDeadlines.length > 0 ? (
                  <div className="deadlines-list">
                    {upcomingDeadlines.map((task) => {
                      const deadline = getDeadlineInfo(task.dueDate);
                      return (
                        <Link
                          key={task._id}
                          to={`/tasks/${task._id}`}
                          className="deadline-item-row"
                        >
                          <div className="deadline-item-details">
                            <span className="deadline-task-title">{task.title}</span>
                            <div className="deadline-submeta">
                              <StatusPill status={task.status} size="small" />
                              <span className="deadline-formatted-date">
                                {formatDate(task.dueDate)}
                              </span>
                            </div>
                          </div>
                          <div className={`deadline-badge ${deadline.className}`}>
                            {deadline.label}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-dashboard-block">
                    <Calendar size={36} className="empty-icon" />
                    <p className="empty-heading">No upcoming deadlines</p>
                    <p className="empty-subtext">No tasks with due dates in queue.</p>
                  </div>
                )}

                <div className="section-footer-link">
                  <Link to="/calendar" className="text-link">
                    <span>View calendar</span>
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </GlassCard>
            </div>

            {/* Bottom Left: Task Completion Summary (Span 6/12) */}
            <div className="productivity-column">
              <GlassCard
                title="Task Completion"
                subtitle="Overall project progress"
              >
                <div className="completion-card-content">
                  <div className="completion-stats-row">
                    <div>
                      <span className="completion-fraction">
                        {completedCount} of {totalTasks}
                      </span>
                      <span className="completion-label"> tasks completed</span>
                    </div>
                    <span className="completion-percentage-val">
                      {completionPercentage}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="completion-progress-track">
                    <div
                      className="completion-progress-fill"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>

                  <div className="completion-details-sub">
                    <span>
                      {totalTasks - completedCount} tasks remaining to reach 100%
                    </span>
                    <Link to="/analytics" className="mini-analytics-link">
                      <TrendingUp size={13} />
                      <span>Full Analytics</span>
                    </Link>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Bottom Right: Priority Breakdown (Span 6/12) */}
            <div className="priority-column">
              <GlassCard
                title="Priority Breakdown"
                subtitle="Distribution of current workload"
              >
                <div className="priority-bars-container">
                  {/* Urgent */}
                  <div className="priority-row">
                    <div className="priority-row-header">
                      <span className="priority-name urgent">Urgent</span>
                      <span className="priority-count">{urgentCount}</span>
                    </div>
                    <div className="priority-track">
                      <div
                        className="priority-fill fill-urgent"
                        style={{
                          width: `${totalTasks > 0 ? (urgentCount / totalTasks) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* High */}
                  <div className="priority-row">
                    <div className="priority-row-header">
                      <span className="priority-name high">High</span>
                      <span className="priority-count">{highCount}</span>
                    </div>
                    <div className="priority-track">
                      <div
                        className="priority-fill fill-high"
                        style={{
                          width: `${totalTasks > 0 ? (highCount / totalTasks) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Medium */}
                  <div className="priority-row">
                    <div className="priority-row-header">
                      <span className="priority-name medium">Medium</span>
                      <span className="priority-count">{medCount}</span>
                    </div>
                    <div className="priority-track">
                      <div
                        className="priority-fill fill-medium"
                        style={{
                          width: `${totalTasks > 0 ? (medCount / totalTasks) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Low */}
                  <div className="priority-row">
                    <div className="priority-row-header">
                      <span className="priority-name low">Low</span>
                      <span className="priority-count">{lowCount}</span>
                    </div>
                    <div className="priority-track">
                      <div
                        className="priority-fill fill-low"
                        style={{
                          width: `${totalTasks > 0 ? (lowCount / totalTasks) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Section: Recent Alerts (Span 12/12) */}
            {notifications.length > 0 && (
              <div className="alerts-full-column">
                <GlassCard
                  title="Recent Team Activity"
                  subtitle="Latest updates and collaboration alerts"
                >
                  <div className="dashboard-alerts-list">
                    {notifications.slice(0, 3).map((n) => (
                      <div key={n._id} className="dashboard-alert-item">
                        <div className="dashboard-alert-icon">
                          <Bell size={14} />
                        </div>
                        <span className="dashboard-alert-message">{n.message}</span>
                        <span className="dashboard-alert-time">
                          {formatRelativeTime(n.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="section-footer-link">
                    <Link to="/notifications" className="text-link">
                      <span>View all alerts</span>
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                </GlassCard>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
