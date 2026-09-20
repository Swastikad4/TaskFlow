import React from 'react';
import { X } from 'lucide-react';

const TagBadge = ({
  tag,
  color = '#FF5B26',
  onRemove,
  onClick,
  selected = false,
  size = 'md',
}) => {
  const isSmall = size === 'sm';

  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: selected ? color : `${color}18`,
        color: selected ? '#FFFFFF' : color,
        border: `1px solid ${selected ? color : `${color}40`}`,
        borderRadius: 'var(--card-radius-pill)',
        padding: isSmall ? '2px 8px' : '4px 10px',
        fontSize: isSmall ? '0.7rem' : '0.78rem',
        fontWeight: 700,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
        userSelect: 'none',
        boxShadow: selected ? `0 2px 8px ${color}50` : 'none',
      }}
    >
      <span>#{tag}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(tag);
          }}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: selected ? '#FFFFFF' : color,
            display: 'flex',
            alignItems: 'center',
            opacity: 0.75,
            transition: 'opacity 0.15s ease',
          }}
          title={`Remove tag #${tag}`}
        >
          <X size={isSmall ? 10 : 12} />
        </button>
      )}
    </span>
  );
};

export default TagBadge;
