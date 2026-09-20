import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import GlassCard from '../components/common/GlassCard';
import TaskCard from '../components/tasks/TaskCard';
import { taskService } from '../services/taskService';
import { userService } from '../services/userService';
import { teamService } from '../services/teamService';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import {
  Kanban,
  Search,
  Star,
  Plus,
  RefreshCw,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  ListTodo,
  Flame,
  Users,
  Repeat,
} from 'lucide-react';

const COLUMNS = [
  { id: 'To Do', title: 'To Do', icon: ListTodo, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.08)' },
  { id: 'In Progress', title: 'In Progress', icon: Clock, color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.08)' },
  { id: 'Completed', title: 'Completed', icon: CheckCircle2, color: '#10B981', bg: 'rgba(16, 185, 129, 0.08)' },
];

const KanbanPage = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  const isManagerOrAdmin = user?.role === 'Admin' || user?.role === 'Manager';

  const fetchTasks = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search) params.search = search;
      if (priorityFilter) params.priority = priorityFilter;
      if (assigneeFilter) params.assignedTo = assigneeFilter;
      if (teamFilter) params.team = teamFilter;
      if (onlyFavorites) params.isFavorite = 'true';

      const [taskRes, userRes, teamRes] = await Promise.allSettled([
        taskService.getTasks(params),
        userService.getUsers(),
        teamService.getTeams(),
      ]);

      if (taskRes.status === 'fulfilled' && taskRes.value?.data?.tasks) {
        setTasks(taskRes.value.data.tasks);
      } else if (taskRes.status === 'rejected') {
        setError('Failed to load Kanban tasks.');
      }

      if (userRes.status === 'fulfilled' && userRes.value?.data?.users) {
        setUsers(userRes.value.data.users);
      }

      if (teamRes.status === 'fulfilled' && teamRes.value?.data?.teams) {
        setTeams(teamRes.value.data.teams);
      }
    } catch (err) {
      setError('An unexpected error occurred while loading the board.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [search, priorityFilter, assigneeFilter, teamFilter, onlyFavorites]);

  // Real-time socket sync
  useEffect(() => {
    if (socket) {
      const handleTaskSync = () => {
        fetchTasks();
      };

      socket.on('taskCreated', handleTaskSync);
      socket.on('taskUpdated', handleTaskSync);
      socket.on('taskStatusChanged', handleTaskSync);
      socket.on('taskMoved', handleTaskSync);
      socket.on('taskDeleted', handleTaskSync);
      socket.on('recurringTaskGenerated', handleTaskSync);
      socket.on('teamUpdated', handleTaskSync);

      return () => {
        socket.off('taskCreated', handleTaskSync);
        socket.off('taskUpdated', handleTaskSync);
        socket.off('taskStatusChanged', handleTaskSync);
        socket.off('taskMoved', handleTaskSync);
        socket.off('taskDeleted', handleTaskSync);
        socket.off('recurringTaskGenerated', handleTaskSync);
        socket.off('teamUpdated', handleTaskSync);
      };
    }
  }, [socket]);

  // Drag and Drop Handlers
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDragLeave = (e, columnId) => {
    if (dragOverColumn === columnId) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setDraggedTaskId(null);

    if (!taskId) return;

    const taskToMove = tasks.find((t) => t._id === taskId);
    if (!taskToMove || taskToMove.status === targetStatus) return;

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, status: targetStatus } : t))
    );

    try {
      await taskService.updateTask(taskId, { status: targetStatus });
    } catch (err) {
      // Revert if failed
      fetchTasks();
      alert(err.response?.data?.message || 'Failed to move task');
    }
  };

  return (
    <div>
      {/* Header & Title */}
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
            <Kanban size={22} />
          </div>
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.6rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
              }}
            >
              Interactive Kanban Board
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Real-time drag-and-drop workflow lane management
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={fetchTasks}
            className="glass-icon-btn"
            title="Refresh Board"
            style={{ width: 38, height: 38 }}
          >
            <RefreshCw size={16} />
          </button>

          {isManagerOrAdmin && (
            <Link to="/tasks/create" className="btn-coral">
              <Plus size={16} />
              <span>New Task</span>
            </Link>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div
        className="glass-card"
        style={{
          marginBottom: 24,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        {/* Search */}
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
            placeholder="Search Kanban tasks..."
            style={{ paddingLeft: 40, marginBottom: 0 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Priority Filter */}
        <div style={{ flex: 1, minWidth: 120 }}>
          <select
            className="form-select"
            style={{ marginBottom: 0, padding: '10px 14px' }}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        {/* Squad Filter */}
        {teams.length > 0 && (
          <div style={{ flex: 1, minWidth: 130 }}>
            <select
              className="form-select"
              style={{ marginBottom: 0, padding: '10px 14px' }}
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
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

        {/* Assignee Filter */}
        {isManagerOrAdmin && users.length > 0 && (
          <div style={{ flex: 1, minWidth: 130 }}>
            <select
              className="form-select"
              style={{ marginBottom: 0, padding: '10px 14px' }}
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
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

        {/* Starred filter button */}
        <button
          type="button"
          onClick={() => setOnlyFavorites(!onlyFavorites)}
          className={onlyFavorites ? 'btn-coral' : 'btn-outline'}
          style={{
            padding: '8px 14px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Star size={15} fill={onlyFavorites ? '#FFF' : 'none'} />
          <span>Starred</span>
        </button>
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

      {/* Kanban Board Columns */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-white)' }}>
          <Loader2 size={36} className="spin-animation" color="var(--coral-primary)" style={{ margin: '0 auto 12px auto' }} />
          <div>Synchronizing Kanban board...</div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 20,
            alignItems: 'flex-start',
          }}
        >
          {COLUMNS.map((column) => {
            const columnTasks = tasks.filter((t) => t.status === column.id);
            const Icon = column.icon;
            const isTargeted = dragOverColumn === column.id;

            return (
              <div
                key={column.id}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={(e) => handleDragLeave(e, column.id)}
                onDrop={(e) => handleDrop(e, column.id)}
                style={{
                  background: 'var(--card-bg)',
                  borderRadius: 'var(--card-radius-lg)',
                  border: isTargeted
                    ? '2px dashed var(--coral-primary)'
                    : '1px solid var(--card-border-subtle)',
                  boxShadow: 'var(--shadow-md)',
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  minHeight: 500,
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Column Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: 12,
                    borderBottom: '1px solid var(--card-border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: column.bg,
                        color: column.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={16} />
                    </div>
                    <span
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontWeight: 700,
                        fontSize: '1rem',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {column.title}
                    </span>
                  </div>

                  <span
                    style={{
                      background: 'var(--card-bg-subtle)',
                      border: '1px solid var(--card-border-subtle)',
                      color: 'var(--text-secondary)',
                      borderRadius: 'var(--card-radius-pill)',
                      padding: '2px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {columnTasks.length}
                  </span>
                </div>

                {/* Column Cards List */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    flex: 1,
                  }}
                >
                  {columnTasks.length === 0 ? (
                    <div
                      style={{
                        border: '1px dashed var(--card-border-subtle)',
                        borderRadius: 'var(--card-radius-md)',
                        padding: '30px 16px',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        fontSize: '0.85rem',
                        background: 'var(--card-bg-subtle)',
                      }}
                    >
                      No tasks in {column.title}
                    </div>
                  ) : (
                    columnTasks.map((task) => (
                      <div
                        key={task._id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task._id)}
                      >
                        <TaskCard task={task} isDraggable={true} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default KanbanPage;
