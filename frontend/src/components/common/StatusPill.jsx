import React from 'react';

const StatusPill = ({ status = 'To Do', priority = null, size = 'normal' }) => {
  const getStatusClass = () => {
    switch (status) {
      case 'Completed':
        return 'completed';
      case 'In Progress':
        return 'in-progress';
      case 'To Do':
      default:
        return 'todo';
    }
  };

  const getPriorityColor = () => {
    switch (priority) {
      case 'Urgent':
        return { bg: '#FCE8E6', color: '#C5221F', border: '#FAD2CF' };
      case 'High':
        return { bg: '#FEF7E0', color: '#B06000', border: '#FEEFC3' };
      case 'Medium':
        return { bg: '#E8F0FE', color: '#1A73E8', border: '#D2E3FC' };
      case 'Low':
      default:
        return { bg: '#F1F3F4', color: '#5F6368', border: '#E8EAED' };
    }
  };

  if (priority) {
    const style = getPriorityColor();
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: size === 'small' ? '2px 8px' : '3px 10px',
          borderRadius: 9999,
          fontSize: size === 'small' ? '0.7rem' : '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          backgroundColor: style.bg,
          color: style.color,
          border: `1px solid ${style.border}`,
        }}
      >
        <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: style.color }} />
        {priority}
      </span>
    );
  }

  return (
    <span className={`status-pill ${getStatusClass()}`}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: 'currentColor',
        }}
      />
      {status}
    </span>
  );
};

export default StatusPill;
