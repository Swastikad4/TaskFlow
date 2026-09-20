import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ArrowRight, Star, CheckSquare, Repeat, Users } from 'lucide-react';
import StatusPill from '../common/StatusPill';
import TagBadge from '../common/TagBadge';
import { formatDate, getInitials } from '../../utils/formatters';
import { taskService } from '../../services/taskService';

const TaskCard = ({ task, isDraggable = false, onDragStart, onFavoriteToggle }) => {
  const [isFavorite, setIsFavorite] = useState(task?.isFavorite || false);
  const [togglingFav, setTogglingFav] = useState(false);

  useEffect(() => {
    if (task) {
      setIsFavorite(Boolean(task.isFavorite));
    }
  }, [task?.isFavorite]);

  if (!task) return null;

  const handleToggleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (togglingFav) return;

    setTogglingFav(true);
    const newFav = !isFavorite;
    setIsFavorite(newFav);

    try {
      await taskService.toggleFavorite(task._id || task.id);
      if (onFavoriteToggle) {
        onFavoriteToggle(task._id || task.id, newFav);
      }
    } catch (err) {
      setIsFavorite(!newFav);
    } finally {
      setTogglingFav(false);
    }
  };

  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== 'Completed';

  const checklistCount = task.checklist?.length || 0;
  const completedChecklistCount = task.checklist?.filter((i) => i.completed)?.length || 0;
  const isRecurring = Boolean(task.isRecurring);
  const recurrenceFreq = task.recurrence?.frequency;

  return (
    <div
      draggable={isDraggable}
      onDragStart={(e) => {
        if (onDragStart) onDragStart(e, task);
      }}
      style={{
        background: 'var(--card-bg)',
        borderRadius: 'var(--card-radius-md)',
        border: isOverdue
          ? '1px solid #EF4444'
          : '1px solid var(--card-border-subtle)',
        padding: '16px 18px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        cursor: isDraggable ? 'grab' : 'default',
        position: 'relative',
        color: 'var(--text-primary)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
      }}
    >
      {/* Top badges & Favorite star */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <StatusPill status={task.status} />
          <StatusPill priority={task.priority} size="small" />

          {isRecurring && (
            <span className="recurring-badge" title={`Recurring Task: ${recurrenceFreq || 'Active'}`}>
              <Repeat size={10} />
              <span>{recurrenceFreq || 'Recurring'}</span>
            </span>
          )}

          {task.team && (
            <span className="team-badge" title={`Squad: ${task.team.name || 'Team'}`}>
              <Users size={10} />
              <span>{task.team.name || 'Team'}</span>
            </span>
          )}

          {checklistCount > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                fontSize: '0.68rem',
                fontWeight: 700,
                background: completedChecklistCount === checklistCount ? 'rgba(16, 185, 129, 0.15)' : 'var(--card-bg-subtle)',
                color: completedChecklistCount === checklistCount ? '#10B981' : 'var(--text-secondary)',
                padding: '2px 6px',
                borderRadius: 4,
              }}
            >
              <CheckSquare size={11} />
              <span>
                {completedChecklistCount}/{checklistCount}
              </span>
            </span>
          )}
        </div>

        <button
          onClick={handleToggleFavorite}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            color: isFavorite ? '#F59E0B' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.2s ease',
          }}
        >
          <Star size={16} fill={isFavorite ? '#F59E0B' : 'none'} />
        </button>
      </div>

      {/* Title & Description */}
      <div>
        <Link
          to={`/tasks/${task._id || task.id}`}
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            textDecoration: 'none',
            display: 'block',
            marginBottom: 4,
          }}
        >
          {task.title}
        </Link>
        {task.description && (
          <p
            style={{
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {task.description}
          </p>
        )}
      </div>

      {/* Tags Chips */}
      {task.tags && task.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
          {task.tags.map((tag, idx) => (
            <TagBadge key={idx} tag={tag} size="sm" />
          ))}
        </div>
      )}

      {/* Footer Info */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 8,
          borderTop: '1px solid var(--card-border-subtle)',
          marginTop: 2,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: '0.75rem',
            color: isOverdue ? '#EF4444' : 'var(--text-muted)',
            fontWeight: isOverdue ? 700 : 500,
          }}
        >
          <Calendar size={12} />
          <span>{formatDate(task.dueDate)}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {task.assignedTo ? (
            <div
              title={`Assigned to: ${task.assignedTo.name || task.assignedTo}`}
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FF6F3D 0%, #FF4D15 100%)',
                color: '#FFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.65rem',
                fontWeight: 700,
              }}
            >
              {getInitials(task.assignedTo.name || 'User')}
            </div>
          ) : (
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Unassigned</span>
          )}

          <Link
            to={`/tasks/${task._id || task.id}`}
            style={{
              color: 'var(--coral-primary)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
