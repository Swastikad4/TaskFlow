import React from 'react';

const MetricBar = ({ label, value, unit = '%', color = 'fill-coral', percentage = 75, totalSegments = 24 }) => {
  const activeSegments = Math.round((percentage / 100) * totalSegments);

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          {value} {unit}
        </span>
      </div>

      <div className="led-bar">
        {Array.from({ length: totalSegments }).map((_, index) => {
          const isActive = index < activeSegments;
          return (
            <div
              key={index}
              className={`led-segment ${isActive ? color : ''}`}
            />
          );
        })}
      </div>
    </div>
  );
};

export default MetricBar;
