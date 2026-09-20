import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Repeat, Users, Loader2 } from 'lucide-react';
import { userService } from '../../services/userService';
import { teamService } from '../../services/teamService';

const EditTaskModal = ({ task, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    team: '',
    status: 'To Do',
    priority: 'Medium',
    dueDate: '',
    tags: '',
    isRecurring: false,
    frequency: 'Daily',
    interval: 1,
    startDate: '',
    endDate: '',
  });
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (task) {
      const rec = task.recurrence || {};
      setFormData({
        title: task.title || '',
        description: task.description || '',
        assignedTo: task.assignedTo?._id || task.assignedTo || '',
        team: task.team?._id || task.team || '',
        status: task.status || 'To Do',
        priority: task.priority || 'Medium',
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
        tags: Array.isArray(task.tags) ? task.tags.join(', ') : '',
        isRecurring: Boolean(task.isRecurring),
        frequency: rec.frequency && rec.frequency !== 'None' ? rec.frequency : 'Daily',
        interval: rec.interval || 1,
        startDate: rec.startDate ? new Date(rec.startDate).toISOString().split('T')[0] : '',
        endDate: rec.endDate ? new Date(rec.endDate).toISOString().split('T')[0] : '',
      });
    }

    const fetchOptions = async () => {
      try {
        const [usersRes, teamsRes] = await Promise.all([
          userService.getUsers(),
          teamService.getTeams(),
        ]);
        if (usersRes?.data?.users) setUsers(usersRes.data.users);
        if (teamsRes?.data?.teams) setTeams(teamsRes.data.teams);
      } catch (err) {
        console.warn('Failed to load options for edit modal');
      }
    };

    if (isOpen) {
      fetchOptions();
    }
  }, [task, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const parsedTags = formData.tags
        ? formData.tags.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean)
        : [];

      await onSave({
        title: formData.title,
        description: formData.description,
        assignedTo: formData.assignedTo || null,
        team: formData.team || null,
        status: formData.status,
        priority: formData.priority,
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
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update task.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: 660 }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.35rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
              }}
            >
              Edit Task Specifications
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Update work details, squad assignment, and recurring rules
            </p>
          </div>

          <button
            onClick={onClose}
            className="glass-icon-btn"
            style={{ width: 32, height: 32 }}
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div
            style={{
              background: '#FEF2F2',
              border: '1px solid #F87171',
              color: '#991B1B',
              borderRadius: 'var(--card-radius-sm)',
              padding: '10px 14px',
              fontSize: '0.85rem',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertCircle size={16} />
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
              value={formData.title}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              name="description"
              rows={3}
              className="form-textarea"
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 16,
            }}
          >
            <div className="form-group">
              <label className="form-label">Assigned Team Member</label>
              <select
                name="assignedTo"
                className="form-select"
                value={formData.assignedTo}
                onChange={handleChange}
              >
                <option value="">-- Unassigned --</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.role})
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
              <label className="form-label">Priority</label>
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
              <label className="form-label">Status</label>
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
              <label className="form-label">Due Date</label>
              <input
                type="date"
                name="dueDate"
                className="form-input"
                value={formData.dueDate}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tags (comma-separated)</label>
              <input
                type="text"
                name="tags"
                className="form-input"
                placeholder="e.g. frontend, backend, bug, critical"
                value={formData.tags}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Recurring Task Settings */}
          <div
            style={{
              marginTop: 14,
              padding: 16,
              borderRadius: 'var(--card-radius-md)',
              background: 'var(--card-bg-subtle)',
              border: '1px solid var(--card-border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Repeat size={16} color="var(--accent-purple)" />
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.9rem' }}>
                  Recurrence Schedule
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
                <span>Active</span>
              </label>
            </div>

            {formData.isRecurring && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--card-border-subtle)' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Frequency</label>
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
                  <label className="form-label">Interval</label>
                  <input
                    type="number"
                    name="interval"
                    min={1}
                    className="form-input"
                    value={formData.interval}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    className="form-input"
                    value={formData.startDate}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">End Date</label>
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
            <button
              type="button"
              onClick={onClose}
              className="btn-outline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-coral"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="spin-animation" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTaskModal;
