import React, { useState, useEffect } from 'react';
import { taskService } from '../../services/taskService';
import { useSocket } from '../../hooks/useSocket';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  ListTodo,
} from 'lucide-react';

const TaskChecklist = ({ taskId, initialChecklist = [] }) => {
  const { socket } = useSocket();
  const [checklist, setChecklist] = useState(initialChecklist || []);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingItemId, setLoadingItemId] = useState(null);

  useEffect(() => {
    if (initialChecklist) {
      setChecklist(initialChecklist);
    }
  }, [initialChecklist]);

  // Real-time socket updates
  useEffect(() => {
    if (socket && taskId) {
      const handleChecklistUpdated = ({ taskId: updatedTaskId, checklist: updatedList }) => {
        if (updatedTaskId === taskId && Array.isArray(updatedList)) {
          setChecklist(updatedList);
        }
      };

      socket.on('checklistUpdated', handleChecklistUpdated);

      return () => {
        socket.off('checklistUpdated', handleChecklistUpdated);
      };
    }
  }, [socket, taskId]);

  const totalItems = checklist.length;
  const completedItems = checklist.filter((i) => i.completed).length;
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const handleToggleItem = async (item) => {
    const nextCompleted = !item.completed;
    // Optimistic UI update
    setChecklist((prev) =>
      prev.map((i) => (i._id === item._id ? { ...i, completed: nextCompleted } : i))
    );
    setLoadingItemId(item._id);

    try {
      const res = await taskService.updateChecklistItem(taskId, item._id, {
        completed: nextCompleted,
      });
      if (res?.data?.checklist) {
        setChecklist(res.data.checklist);
      }
    } catch (err) {
      // Revert if error
      setChecklist((prev) =>
        prev.map((i) => (i._id === item._id ? { ...i, completed: !nextCompleted } : i))
      );
      alert(err.response?.data?.message || 'Failed to update checklist item');
    } finally {
      setLoadingItemId(null);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemTitle.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await taskService.addChecklistItem(taskId, {
        title: newItemTitle.trim(),
      });
      if (res?.data?.checklist) {
        setChecklist(res.data.checklist);
      }
      setNewItemTitle('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add checklist item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      setChecklist((prev) => prev.filter((i) => i._id !== itemId));
      const res = await taskService.deleteChecklistItem(taskId, itemId);
      if (res?.data?.checklist) {
        setChecklist(res.data.checklist);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete checklist item');
    }
  };

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 'var(--card-radius-md)',
        padding: '20px 24px',
        marginBottom: 20,
      }}
    >
      {/* Header & Progress Bar */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ListTodo size={18} color="var(--coral-primary)" />
            <h3
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
              }}
            >
              Task Checklist & Subtasks
            </h3>
          </div>

          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 800,
              color: progressPercent === 100 ? '#10B981' : 'var(--coral-primary)',
            }}
          >
            {completedItems} / {totalItems} completed ({progressPercent}%)
          </span>
        </div>

        {/* Progress bar container */}
        <div
          style={{
            width: '100%',
            height: 6,
            background: '#F1F5F9',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progressPercent}%`,
              height: '100%',
              background:
                progressPercent === 100
                  ? '#10B981'
                  : 'var(--coral-gradient)',
              borderRadius: 3,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Checklist Items List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {checklist.map((item) => (
          <div
            key={item._id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: 'var(--card-radius-sm)',
              background: item.completed ? '#F8FAFC' : '#FFFFFF',
              border: item.completed ? '1px solid #E2E8F0' : '1px solid #E2E8F0',
              transition: 'all 0.15s ease',
            }}
          >
            <div
              onClick={() => handleToggleItem(item)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                flex: 1,
              }}
            >
              {loadingItemId === item._id ? (
                <Loader2 size={16} className="spin-animation" color="var(--coral-primary)" />
              ) : item.completed ? (
                <CheckCircle2 size={18} color="#10B981" />
              ) : (
                <Square size={18} color="#94A3B8" />
              )}
              <span
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: item.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                  textDecoration: item.completed ? 'line-through' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {item.title}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleDeleteItem(item._id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                borderRadius: 4,
                transition: 'color 0.15s ease',
              }}
              title="Delete item"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        {checklist.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '16px 0',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
            }}
          >
            No subtasks yet. Break this task down into actionable checklist items!
          </div>
        )}
      </div>

      {/* Add New Item Form */}
      <form onSubmit={handleAddItem} style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          className="form-input"
          placeholder="Add a new checklist item / subtask..."
          value={newItemTitle}
          onChange={(e) => setNewItemTitle(e.target.value)}
          style={{ marginBottom: 0, padding: '8px 14px', fontSize: '0.85rem' }}
          disabled={submitting}
        />
        <button
          type="submit"
          disabled={submitting || !newItemTitle.trim()}
          className="btn-coral"
          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
        >
          {submitting ? (
            <Loader2 size={15} className="spin-animation" />
          ) : (
            <>
              <Plus size={15} />
              <span>Add</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default TaskChecklist;
