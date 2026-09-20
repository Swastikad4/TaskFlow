import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import GlassCard from '../components/common/GlassCard';
import { taskService } from '../services/taskService';
import { userService } from '../services/userService';
import { teamService } from '../services/teamService';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, PlusCircle, AlertCircle, Loader2, ShieldAlert, Repeat, Users } from 'lucide-react';

const CreateTaskPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    team: '',
    priority: 'Medium',
    status: 'To Do',
    dueDate: '',
    tags: '',
    isRecurring: false,
    frequency: 'Daily',
    interval: 1,
    startDate: '',
    endDate: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isManagerOrAdmin = user?.role === 'Admin' || user?.role === 'Manager';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, teamsRes] = await Promise.all([
          userService.getUsers(),
          teamService.getTeams(),
        ]);
        if (usersRes?.data?.users) setUsers(usersRes.data.users);
        if (teamsRes?.data?.teams) setTeams(teamsRes.data.teams);
      } catch (err) {
        console.warn('Unable to load options');
      }
    };

    if (isManagerOrAdmin) {
      fetchData();
    }
  }, [isManagerOrAdmin]);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Task title is required');
      return;
    }

    setSubmitting(true);

    try {
      const parsedTags = formData.tags
        ? formData.tags.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean)
        : [];

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        status: formData.status,
        assignedTo: formData.assignedTo || null,
        team: formData.team || null,
        dueDate: formData.dueDate || null,
        tags: parsedTags,
        isRecurring: formData.isRecurring,
        recurrence: formData.isRecurring
          ? {
              frequency: formData.frequency,
              interval: Math.max(1, parseInt(formData.interval, 10) || 1),
              startDate: formData.startDate || null,
              endDate: formData.endDate || null,
            }
          : {
              frequency: 'None',
            },
      };

      const res = await taskService.createTask(payload);
      const newTaskId = res?.data?.task?._id;
      navigate(newTaskId ? `/tasks/${newTaskId}` : '/tasks');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Failed to create task. Verify your permissions and form inputs.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Permission Guard
  if (!isManagerOrAdmin) {
    return (
      <div style={{ maxWidth: 600, margin: '60px auto' }}>
        <GlassCard style={{ textAlign: 'center', padding: 40 }}>
          <ShieldAlert size={48} color="#EF4444" style={{ margin: '0 auto 16px auto' }} />
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800 }}>
            Access Restricted
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: 6, marginBottom: 24 }}>
            Only team members with <strong>Admin</strong> or <strong>Manager</strong> roles are authorized to create new tasks.
          </p>
          <Link to="/tasks" className="btn-coral">
            Return to Task Matrix
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 840, margin: '0 auto' }}>
      {/* Back button */}
      <div style={{ marginBottom: 20 }}>
        <Link
          to="/tasks"
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
          <span>Back to Tasks Matrix</span>
        </Link>
      </div>

      <GlassCard title="Create New Task" subtitle="Define work objectives, priority level, team squad, and recurrence rules">
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

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Task Title *</label>
            <input
              type="text"
              name="title"
              required
              className="form-input"
              placeholder="e.g. Implement Real-Time Telemetry Pipeline"
              value={formData.title}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description & Acceptance Criteria</label>
            <textarea
              name="description"
              rows={4}
              className="form-textarea"
              placeholder="Outline what needs to be delivered, edge cases to handle, or reference docs..."
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18 }}>
            <div className="form-group">
              <label className="form-label">Assign Team Member</label>
              <select
                name="assignedTo"
                className="form-select"
                value={formData.assignedTo}
                onChange={handleChange}
              >
                <option value="">-- Unassigned --</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.role} — {u.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Team Squad Scope</label>
              <select
                name="team"
                className="form-select"
                value={formData.team}
                onChange={handleChange}
              >
                <option value="">-- No Team (General) --</option>
                {teams.map((t) => (
                  <option key={t._id} value={t._id}>
                    Squad: {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Priority Level</label>
              <select
                name="priority"
                className="form-select"
                value={formData.priority}
                onChange={handleChange}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Workflow Status</label>
              <select
                name="status"
                className="form-select"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Target Due Date</label>
              <input
                type="date"
                name="dueDate"
                className="form-input"
                value={formData.dueDate}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tags / Labels (comma-separated)</label>
              <input
                type="text"
                name="tags"
                className="form-input"
                placeholder="e.g. frontend, ui, release-v1, bug"
                value={formData.tags}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Recurring Task Configuration Box */}
          <div
            style={{
              marginTop: 18,
              padding: 18,
              borderRadius: 'var(--card-radius-md)',
              background: 'var(--card-bg-subtle)',
              border: '1px solid var(--card-border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Repeat size={18} color="var(--accent-purple)" />
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.95rem' }}>
                  Recurring Task Automation
                </span>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  name="isRecurring"
                  checked={formData.isRecurring}
                  onChange={handleChange}
                  style={{ width: 16, height: 16, accentColor: 'var(--coral-primary)' }}
                />
                <span>Enable Recurrence</span>
              </label>
            </div>

            {formData.isRecurring && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--card-border-subtle)' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Recurrence Frequency</label>
                  <select
                    name="frequency"
                    className="form-select"
                    value={formData.frequency}
                    onChange={handleChange}
                  >
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Interval (Step)</label>
                  <input
                    type="number"
                    name="interval"
                    min={1}
                    className="form-input"
                    value={formData.interval}
                    onChange={handleChange}
                    placeholder="Every X days/weeks/months"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Recurrence Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    className="form-input"
                    value={formData.startDate}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Recurrence End Date (Optional)</label>
                  <input
                    type="date"
                    name="endDate"
                    className="form-input"
                    value={formData.endDate}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
              marginTop: 24,
              paddingTop: 18,
              borderTop: '1px solid var(--card-border-subtle)',
            }}
          >
            <Link to="/tasks" className="btn-outline">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="btn-coral"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="spin-animation" />
                  <span>Publishing Task...</span>
                </>
              ) : (
                <>
                  <PlusCircle size={16} />
                  <span>Publish Task</span>
                </>
              )}
            </button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
};

export default CreateTaskPage;
