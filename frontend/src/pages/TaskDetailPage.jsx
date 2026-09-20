import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import GlassCard from '../components/common/GlassCard';
import StatusPill from '../components/common/StatusPill';
import TagBadge from '../components/common/TagBadge';
import EditTaskModal from '../components/tasks/EditTaskModal';
import ActivityTimeline from '../components/tasks/ActivityTimeline';
import TaskChecklist from '../components/tasks/TaskChecklist';
import TaskAttachments from '../components/tasks/TaskAttachments';
import MentionInput, { renderCommentWithMentions } from '../components/tasks/MentionInput';
import { taskService } from '../services/taskService';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { formatDate, formatRelativeTime, getInitials } from '../utils/formatters';
import {
  ArrowLeft,
  Calendar,
  User,
  MessageSquare,
  Send,
  Trash2,
  Edit3,
  AlertCircle,
  Loader2,
  Clock,
  Shield,
  Star,
  Tag,
  Archive,
  RotateCcw,
  Activity as ActivityIcon,
  CheckSquare,
  Paperclip,
  Repeat,
  Users,
} from 'lucide-react';

const TaskDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [task, setTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [error, setError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('comments'); // 'comments' | 'activity'
  const [actionLoading, setActionLoading] = useState(false);

  const isManagerOrAdmin = user?.role === 'Admin' || user?.role === 'Manager';
  const isAdmin = user?.role === 'Admin';
  const isAssignedMember =
    task?.assignedTo?._id === user?._id || task?.assignedTo === user?._id;
  const isCreator =
    task?.createdBy?._id === user?._id || task?.createdBy === user?._id;
  const canUpdateStatus = isManagerOrAdmin || isAssignedMember;
  const canArchive = isManagerOrAdmin || isCreator;

  const fetchTaskAndComments = async () => {
    setError('');
    try {
      const [taskRes, commentRes] = await Promise.all([
        taskService.getTaskById(id),
        taskService.getComments(id),
      ]);

      if (taskRes?.data?.task) {
        setTask(taskRes.data.task);
      }
      if (commentRes?.data?.comments) {
        setComments(commentRes.data.comments);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Failed to load task specifications. You may not have permission to view this task.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskAndComments();

    if (socket) {
      socket.emit('join_task_room', id);

      socket.on('commentAdded', (comment) => {
        setComments((prev) => {
          if (prev.some((c) => c._id === comment._id)) return prev;
          return [...prev, comment];
        });
      });

      socket.on('taskUpdated', (updatedTask) => {
        if (updatedTask._id === id) {
          setTask((prev) => ({ ...prev, ...updatedTask }));
        }
      });

      socket.on('taskStatusChanged', (updatedTask) => {
        if (updatedTask._id === id) {
          setTask((prev) => ({ ...prev, ...updatedTask }));
        }
      });

      socket.on('taskArchived', (archivedTask) => {
        if (archivedTask._id === id) {
          setTask((prev) => ({ ...prev, isArchived: true }));
        }
      });

      socket.on('taskRestored', (restoredTask) => {
        if (restoredTask._id === id) {
          setTask((prev) => ({ ...prev, isArchived: false }));
        }
      });

      socket.on('taskDeleted', ({ taskId }) => {
        if (taskId === id) {
          alert('This task was deleted by an administrator.');
          navigate('/tasks');
        }
      });
    }

    return () => {
      if (socket) {
        socket.emit('leave_task_room', id);
        socket.off('commentAdded');
        socket.off('taskUpdated');
        socket.off('taskStatusChanged');
        socket.off('taskArchived');
        socket.off('taskRestored');
        socket.off('taskDeleted');
      }
    };
  }, [id, socket]);

  const handleStatusChange = async (newStatus) => {
    try {
      const res = await taskService.updateTask(id, { status: newStatus });
      if (res?.data?.task) {
        setTask(res.data.task);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update task status.');
    }
  };

  const handleToggleFavorite = async () => {
    try {
      // Optimistic update
      setTask((prev) => ({ ...prev, isFavorite: !prev.isFavorite }));
      const res = await taskService.toggleFavorite(id);
      if (res?.data?.task) {
        setTask(res.data.task);
      }
    } catch (err) {
      // Revert if error
      setTask((prev) => ({ ...prev, isFavorite: !prev.isFavorite }));
      alert(err.response?.data?.message || 'Failed to update favorite status.');
    }
  };

  const handleArchiveToggle = async () => {
    setActionLoading(true);
    try {
      if (task.isArchived) {
        await taskService.restoreTask(id);
        setTask((prev) => ({ ...prev, isArchived: false }));
      } else {
        if (window.confirm('Archive this task? It will be moved to the Archived Tasks Vault.')) {
          await taskService.archiveTask(id);
          setTask((prev) => ({ ...prev, isArchived: true }));
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to change archive status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveTaskEdits = async (updatedData) => {
    const res = await taskService.updateTask(id, updatedData);
    if (res?.data?.task) {
      setTask(res.data.task);
    }
  };

  const handleAddComment = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newComment.trim() || submittingComment) return;

    setSubmittingComment(true);
    try {
      const res = await taskService.addComment(id, { text: newComment.trim() });
      if (res?.data?.comment) {
        setComments((prev) => {
          if (prev.some((c) => c._id === res.data.comment._id)) return prev;
          return [...prev, res.data.comment];
        });
      }
      setNewComment('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to post comment.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!isAdmin) {
      alert('Only administrators are authorized to delete tasks.');
      return;
    }

    if (window.confirm('Are you sure you want to permanently delete this task?')) {
      try {
        await taskService.deleteTask(id);
        navigate('/tasks');
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete task.');
      }
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: '#FFFFFF' }}>
        <Loader2 size={36} className="spin-animation" style={{ margin: '0 auto 12px auto' }} />
        <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem' }}>
          Loading task specifications...
        </p>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div style={{ maxWidth: 600, margin: '60px auto' }}>
        <GlassCard style={{ textAlign: 'center', padding: 40 }}>
          <AlertCircle size={48} color="#EF4444" style={{ margin: '0 auto 16px auto' }} />
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800 }}>
            Unable to Load Task
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: 6, marginBottom: 24 }}>
            {error || 'Task not found or access denied.'}
          </p>
          <Link to="/tasks" className="btn-coral">
            Return to Tasks Matrix
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div>
      {/* Back button & Action Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <Link
          to={task.isArchived ? '/archived-tasks' : '/tasks'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--text-white)',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 600,
            background: 'rgba(255, 255, 255, 0.2)',
            padding: '6px 14px',
            borderRadius: 'var(--card-radius-pill)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <ArrowLeft size={16} />
          <span>{task.isArchived ? 'Back to Archived Vault' : 'Back to Tasks Matrix'}</span>
        </Link>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Favorite Star Button */}
          <button
            onClick={handleToggleFavorite}
            className="btn-outline"
            style={{
              padding: '6px 14px',
              fontSize: '0.85rem',
              color: task.isFavorite ? '#F59E0B' : '#FFFFFF',
              borderColor: task.isFavorite ? '#F59E0B' : 'rgba(255,255,255,0.4)',
              background: task.isFavorite ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(8px)',
            }}
            title={task.isFavorite ? 'Starred task' : 'Star as favorite'}
          >
            <Star size={15} fill={task.isFavorite ? '#F59E0B' : 'none'} />
            <span>{task.isFavorite ? 'Starred' : 'Star'}</span>
          </button>

          {/* Archive / Restore Button */}
          {canArchive && (
            <button
              onClick={handleArchiveToggle}
              disabled={actionLoading}
              className="btn-outline"
              style={{
                padding: '6px 14px',
                fontSize: '0.85rem',
                color: task.isArchived ? '#10B981' : '#FFFFFF',
                borderColor: 'rgba(255,255,255,0.4)',
                background: task.isArchived ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(8px)',
              }}
            >
              {task.isArchived ? <RotateCcw size={15} /> : <Archive size={15} />}
              <span>{task.isArchived ? 'Restore' : 'Archive'}</span>
            </button>
          )}

          {isManagerOrAdmin && (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="btn-outline"
              style={{
                padding: '6px 16px',
                fontSize: '0.85rem',
                color: '#FFFFFF',
                borderColor: 'rgba(255,255,255,0.4)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <Edit3 size={15} />
              <span>Edit Task</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={handleDeleteTask}
              className="btn-outline"
              style={{
                padding: '6px 16px',
                fontSize: '0.85rem',
                color: '#EF4444',
                borderColor: 'rgba(239, 68, 68, 0.4)',
                background: 'rgba(239, 68, 68, 0.1)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <Trash2 size={15} />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Left Side: Task Content, Checklist, Attachments, and Discussion/Audit */}
        <div className="col-span-8">
          {/* Main Task Description Card */}
          <GlassCard style={{ marginBottom: 20 }}>
            {task.isArchived && (
              <div
                style={{
                  background: 'rgba(100, 116, 139, 0.15)',
                  border: '1px solid #64748B',
                  color: '#475569',
                  borderRadius: 'var(--card-radius-sm)',
                  padding: '8px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  marginBottom: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Archive size={16} />
                <span>This task is currently archived. It is preserved in the Archived Vault.</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <StatusPill status={task.status} />
                <StatusPill priority={task.priority} />
                {task.tags && task.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginLeft: 6 }}>
                    {task.tags.map((tag, idx) => (
                      <TagBadge key={idx} tag={tag} size="sm" />
                    ))}
                  </div>
                )}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                ID: {task._id.slice(-6)}
              </span>
            </div>

            <h1
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.6rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                marginBottom: 14,
                lineHeight: 1.3,
              }}
            >
              {task.title}
            </h1>

            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.65, whiteSpace: 'pre-line' }}>
              {task.description || 'No detailed description provided for this work item.'}
            </p>
          </GlassCard>

          {/* Subtasks Checklist Section */}
          <TaskChecklist taskId={task._id} initialChecklist={task.checklist} />

          {/* File Attachments Section */}
          <TaskAttachments taskId={task._id} />

          {/* Tab Navigation: Discussion (with @mentions) vs Audit Timeline */}
          <div
            className="glass-card"
            style={{
              padding: '20px 24px',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: 8,
                borderBottom: '1px solid #E2E8F0',
                paddingBottom: 14,
                marginBottom: 20,
              }}
            >
              <button
                onClick={() => setActiveTab('comments')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  border: 'none',
                  background: activeTab === 'comments' ? 'var(--coral-primary)' : 'transparent',
                  color: activeTab === 'comments' ? '#FFFFFF' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  padding: '8px 18px',
                  borderRadius: 'var(--card-radius-pill)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <MessageSquare size={16} />
                <span>Discussion ({comments.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('activity')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  border: 'none',
                  background: activeTab === 'activity' ? 'var(--coral-primary)' : 'transparent',
                  color: activeTab === 'activity' ? '#FFFFFF' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  padding: '8px 18px',
                  borderRadius: 'var(--card-radius-pill)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <ActivityIcon size={16} />
                <span>Audit Timeline</span>
              </button>
            </div>

            {/* Comments Tab View */}
            {activeTab === 'comments' ? (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                  {comments.map((comment) => (
                    <div
                      key={comment._id}
                      style={{
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: 'var(--card-radius-md)',
                        padding: '14px 18px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                              color: '#FFF',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {getInitials(comment.user?.name || 'User')}
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {comment.user?.name || 'Team Member'}
                          </span>
                          {comment.user?.role && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                color: 'var(--text-muted)',
                                background: '#E5E7EB',
                                padding: '1px 6px',
                                borderRadius: 4,
                              }}
                            >
                              {comment.user.role}
                            </span>
                          )}
                        </div>

                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {formatRelativeTime(comment.createdAt)}
                        </span>
                      </div>

                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginLeft: 34, lineHeight: 1.5 }}>
                        {renderCommentWithMentions(comment.text)}
                      </p>
                    </div>
                  ))}

                  {comments.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                      <MessageSquare size={32} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                      <p style={{ fontSize: '0.85rem' }}>No comments yet. Type `@` to mention team members!</p>
                    </div>
                  )}
                </div>

                {/* Comment Form with @Mention Autocomplete */}
                <form onSubmit={handleAddComment} style={{ display: 'flex', gap: 10 }}>
                  <MentionInput
                    value={newComment}
                    onChange={setNewComment}
                    onSubmit={handleAddComment}
                    disabled={submittingComment}
                    placeholder="Write a message... Type @ to mention a team member"
                  />
                  <button
                    type="submit"
                    disabled={submittingComment || !newComment.trim()}
                    className="btn-coral"
                    style={{ padding: '0 22px', flexShrink: 0 }}
                  >
                    {submittingComment ? (
                      <Loader2 size={16} className="spin-animation" />
                    ) : (
                      <Send size={16} />
                    )}
                  </button>
                </form>
              </div>
            ) : (
              /* Activity Timeline Tab View */
              <ActivityTimeline taskId={id} />
            )}
          </div>
        </div>

        {/* Right Side: Metadata & Status Controls */}
        <div className="col-span-4">
          <GlassCard title="Task Specifications">
            {/* Workflow status selector */}
            <div className="form-group">
              <label className="form-label">Workflow Status</label>
              {canUpdateStatus ? (
                <select
                  className="form-select"
                  value={task.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                >
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              ) : (
                <div style={{ padding: '8px 0' }}>
                  <StatusPill status={task.status} />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 20 }}>
              {/* Assigned Team Member */}
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Assigned Team Member
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      background: 'var(--coral-gradient)',
                      color: '#FFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                    }}
                  >
                    {getInitials(task.assignedTo?.name || 'Unassigned')}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                      {task.assignedTo?.name || 'Unassigned'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {task.assignedTo?.email || 'No email associated'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Due Date */}
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Target Due Date
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: '0.9rem', fontWeight: 600 }}>
                  <Calendar size={16} color="var(--coral-primary)" />
                  <span>{formatDate(task.dueDate)}</span>
                </div>
              </div>

              {/* Squad Team Scope */}
              {task.team && (
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Team Squad Scope
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: '0.9rem', fontWeight: 700, color: '#00B4D8' }}>
                    <Users size={16} />
                    <span>{task.team.name || 'Assigned Squad'}</span>
                  </div>
                </div>
              )}

              {/* Recurring Task Schedule */}
              {task.isRecurring && (
                <div style={{ background: 'rgba(157, 78, 221, 0.12)', border: '1px solid rgba(157, 78, 221, 0.3)', borderRadius: 'var(--card-radius-sm)', padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#C77DFF', fontSize: '0.8rem', fontWeight: 700 }}>
                    <Repeat size={14} />
                    <span>Recurring Schedule: {task.recurrence?.frequency || 'Active'}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                    Interval: Every {task.recurrence?.interval || 1} {task.recurrence?.frequency === 'Daily' ? 'day(s)' : task.recurrence?.frequency === 'Weekly' ? 'week(s)' : 'month(s)'}
                  </div>
                  {task.recurrence?.nextRun && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      Next Execution: {new Date(task.recurrence.nextRun).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )}

              {/* Tags */}
              {task.tags && task.tags.length > 0 && (
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Tags & Labels
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {task.tags.map((t, i) => (
                      <TagBadge key={i} tag={t} size="sm" />
                    ))}
                  </div>
                </div>
              )}

              {/* Created By & Date */}
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Created By
                </span>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                  {task.createdBy?.name || 'Admin'} ({task.createdBy?.role || 'Admin'})
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Created on {formatDate(task.createdAt)}
                </div>
              </div>

              {/* Archive Information (if archived) */}
              {task.isArchived && (
                <div style={{ borderTop: '1px solid #F1F3F5', paddingTop: 14 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#EF4444', textTransform: 'uppercase' }}>
                    Archive Details
                  </span>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Archived on {formatDate(task.archivedAt || task.updatedAt)}
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Edit Task Modal */}
      {isEditModalOpen && (
        <EditTaskModal
          task={task}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveTaskEdits}
        />
      )}
    </div>
  );
};

export default TaskDetailPage;
