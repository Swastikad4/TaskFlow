import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import GlassCard from '../components/common/GlassCard';
import TaskCard from '../components/tasks/TaskCard';
import { taskService } from '../services/taskService';
import { userService } from '../services/userService';
import { teamService } from '../services/teamService';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  AlertCircle,
  Loader2,
  RefreshCw,
  Star,
  Tag,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Layers,
  Repeat,
  Users,
} from 'lucide-react';

const TasksPage = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [searchParams] = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Advanced Filters State (initialized from URL search parameters if provided)
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get('priority') || '');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(searchParams.get('isFavorite') === 'true');
  const [onlyRecurring, setOnlyRecurring] = useState(false);
  const [datePreset, setDatePreset] = useState(searchParams.get('datePreset') || 'all'); // 'all' | 'today' | 'week' | 'overdue'
  const [sortBy, setSortBy] = useState('newest');

  // Sync state if searchParams change in URL
  useEffect(() => {
    const urlStatus = searchParams.get('status');
    const urlDatePreset = searchParams.get('datePreset');
    const urlPriority = searchParams.get('priority');
    if (urlStatus !== null) setStatusFilter(urlStatus);
    if (urlDatePreset !== null) setDatePreset(urlDatePreset);
    if (urlPriority !== null) setPriorityFilter(urlPriority);
  }, [searchParams]);

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 9;

  const isManagerOrAdmin = user?.role === 'Admin' || user?.role === 'Manager';

  const fetchTasksAndUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        limit,
      };

      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (assigneeFilter) params.assignedTo = assigneeFilter;
      if (teamFilter) params.team = teamFilter;
      if (tagFilter) params.tags = tagFilter;
      if (onlyFavorites) params.isFavorite = 'true';
      if (onlyRecurring) params.isRecurring = 'true';

      // Handle date presets
      const now = new Date();
      if (datePreset === 'today') {
        params.dateRange = 'today';
      } else if (datePreset === 'week') {
        params.dateRange = 'this_week';
      } else if (datePreset === 'overdue') {
        params.dateRange = 'overdue';
      }

      const [taskRes, userRes, teamRes] = await Promise.allSettled([
        taskService.getTasks(params),
        userService.getUsers(),
        teamService.getTeams(),
      ]);

      if (taskRes.status === 'fulfilled' && taskRes.value?.data?.tasks) {
        setTasks(taskRes.value.data.tasks);
        setTotalPages(taskRes.value.data.totalPages || 1);
        setTotalCount(taskRes.value.data.totalCount || taskRes.value.data.tasks.length);
      } else if (taskRes.status === 'rejected') {
        setError('Failed to fetch tasks from backend server.');
      }

      if (userRes.status === 'fulfilled' && userRes.value?.data?.users) {
        setUsers(userRes.value.data.users);
      }

      if (teamRes.status === 'fulfilled' && teamRes.value?.data?.teams) {
        setTeams(teamRes.value.data.teams);
      }
    } catch (err) {
      setError('An unexpected error occurred while loading tasks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasksAndUsers();
  }, [
    search,
    statusFilter,
    priorityFilter,
    assigneeFilter,
    teamFilter,
    tagFilter,
    onlyFavorites,
    onlyRecurring,
    datePreset,
    page,
    sortBy,
  ]);

  // Real-time socket sync
  useEffect(() => {
    if (socket) {
      socket.on('taskCreated', fetchTasksAndUsers);
      socket.on('taskUpdated', fetchTasksAndUsers);
      socket.on('taskStatusChanged', fetchTasksAndUsers);
      socket.on('taskMoved', fetchTasksAndUsers);
      socket.on('taskDeleted', fetchTasksAndUsers);
      socket.on('recurringTaskGenerated', fetchTasksAndUsers);
      socket.on('teamUpdated', fetchTasksAndUsers);
    }

    return () => {
      if (socket) {
        socket.off('taskCreated');
        socket.off('taskUpdated');
        socket.off('taskStatusChanged');
        socket.off('taskMoved');
        socket.off('taskDeleted');
        socket.off('recurringTaskGenerated');
        socket.off('teamUpdated');
      }
    };
  }, [socket]);

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setAssigneeFilter('');
    setTeamFilter('');
    setTagFilter('');
    setOnlyFavorites(false);
    setOnlyRecurring(false);
    setDatePreset('all');
    setPage(1);
  };

  return (
    <div>
      {/* Header Controls Bar */}
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
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.6rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Layers size={24} color="var(--coral-primary)" />
            <span>Task Matrix Directory</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 2 }}>
            Central task directory with multi-tag filtering, squad scope, recurring rules, and status tracking
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={fetchTasksAndUsers}
            className="glass-icon-btn"
            title="Refresh Tasks"
            style={{ width: 38, height: 38 }}
          >
            <RefreshCw size={16} />
          </button>

          {isManagerOrAdmin && (
            <Link to="/tasks/create" className="btn-coral">
              <Plus size={16} />
              <span>Create Task</span>
            </Link>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="glass-card"
        style={{
          marginBottom: 24,
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {/* Row 1: Search, Status, Priority, Assignee, Squad */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          {/* Universal Search Input */}
          <div style={{ flex: 2, minWidth: 200, position: 'relative' }}>
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
              placeholder="Search by title, description, tags, comments..."
              style={{ paddingLeft: 40, marginBottom: 0 }}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Status Filter */}
          <div style={{ flex: 1, minWidth: 120 }}>
            <select
              className="form-select"
              style={{ marginBottom: 0, padding: '10px 14px' }}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div style={{ flex: 1, minWidth: 120 }}>
            <select
              className="form-select"
              style={{ marginBottom: 0, padding: '10px 14px' }}
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Squad / Team Filter */}
          {teams.length > 0 && (
            <div style={{ flex: 1, minWidth: 130 }}>
              <select
                className="form-select"
                style={{ marginBottom: 0, padding: '10px 14px' }}
                value={teamFilter}
                onChange={(e) => {
                  setTeamFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Squads</option>
                {teams.map((t) => (
                  <option key={t._id} value={t._id}>
                    Squad: {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tag Filter */}
          <div style={{ flex: 1, minWidth: 110 }}>
            <input
              type="text"
              className="form-input"
              placeholder="Tag label..."
              style={{ marginBottom: 0, padding: '10px 14px' }}
              value={tagFilter}
              onChange={(e) => {
                setTagFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Assignee Filter */}
          {isManagerOrAdmin && users.length > 0 && (
            <div style={{ flex: 1, minWidth: 130 }}>
              <select
                className="form-select"
                style={{ marginBottom: 0, padding: '10px 14px' }}
                value={assigneeFilter}
                onChange={(e) => {
                  setAssigneeFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Assignees</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sort selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 130 }}>
            <ArrowUpDown size={14} color="var(--text-muted)" />
            <select
              className="form-select"
              style={{ marginBottom: 0, padding: '10px 14px' }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="dueDate">Sort: Due Date</option>
              <option value="priority">Sort: Priority</option>
            </select>
          </div>
        </div>

        {/* Row 2: Date Presets & Favorites & Recurring Toggle */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
            paddingTop: 8,
            borderTop: '1px solid var(--card-border-subtle)',
          }}
        >
          {/* Date Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              Timeline:
            </span>
            {[
              { id: 'all', label: 'All Dates' },
              { id: 'today', label: 'Due Today' },
              { id: 'week', label: 'Due This Week' },
              { id: 'overdue', label: 'Overdue' },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
                  setDatePreset(preset.id);
                  setPage(1);
                }}
                style={{
                  border: 'none',
                  background: datePreset === preset.id ? 'var(--coral-primary)' : 'var(--card-bg-subtle)',
                  color: datePreset === preset.id ? '#FFFFFF' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  padding: '5px 12px',
                  borderRadius: 'var(--card-radius-pill)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Favorites & Recurring & Reset */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                setOnlyRecurring(!onlyRecurring);
                setPage(1);
              }}
              className={onlyRecurring ? 'btn-coral' : 'btn-outline'}
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Repeat size={14} />
              <span>Recurring</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setOnlyFavorites(!onlyFavorites);
                setPage(1);
              }}
              className={onlyFavorites ? 'btn-coral' : 'btn-outline'}
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Star size={14} fill={onlyFavorites ? '#FFF' : 'none'} />
              <span>Starred</span>
            </button>

            <button
              type="button"
              onClick={handleResetFilters}
              className="btn-outline"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              Reset Filters
            </button>
          </div>
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

      {/* Main Grid View */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-white)' }}>
          <Loader2 size={36} className="spin-animation" color="var(--coral-primary)" style={{ margin: '0 auto 12px auto' }} />
          <div>Synchronizing Task Matrix...</div>
        </div>
      ) : tasks.length === 0 ? (
        <GlassCard style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Layers size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px auto', opacity: 0.6 }} />
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700 }}>
            No Matching Tasks Found
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 460, margin: '8px auto 20px auto' }}>
            We couldn't find any tasks matching your active search terms or filters. Try adjusting your query parameters.
          </p>
          <button onClick={handleResetFilters} className="btn-outline">
            Clear Filters
          </button>
        </GlassCard>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 18,
              marginBottom: 24,
            }}
          >
            {tasks.map((task) => (
              <TaskCard key={task._id || task.id} task={task} />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 12,
                marginTop: 12,
              }}
            >
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="glass-icon-btn"
                style={{ width: 36, height: 36, opacity: page <= 1 ? 0.4 : 1 }}
              >
                <ChevronLeft size={18} />
              </button>

              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-white)' }}>
                Page {page} of {totalPages}
              </span>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="glass-icon-btn"
                style={{ width: 36, height: 36, opacity: page >= totalPages ? 0.4 : 1 }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TasksPage;
