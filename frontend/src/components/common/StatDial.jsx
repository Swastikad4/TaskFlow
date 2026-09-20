import React from 'react';

const StatDial = ({ value = 72, max = 100, label = 'Completed Tasks', unit = '%' }) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = 68;
  const strokeWidth = 10;
  // Semicircle arc (180 deg to 360 deg)
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Needle angle from -90deg to +90deg
  const needleAngle = -90 + (percentage / 100) * 180;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: 170, height: 100, display: 'flex', justifyContent: 'center' }}>
        <svg width="170" height="95" viewBox="0 0 170 95" style={{ overflow: 'visible' }}>
          {/* Background Track Arc */}
          <path
            d="M 15 85 A 70 70 0 0 1 155 85"
            fill="none"
            stroke="#F1F3F6"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Colored Progress Arc */}
          <path
            d="M 15 85 A 70 70 0 0 1 155 85"
            fill="none"
            stroke="url(#coralDialGradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />

          {/* Gradients */}
          <defs>
            <linearGradient id="coralDialGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFA043" />
              <stop offset="100%" stopColor="#FF5B26" />
            </linearGradient>
          </defs>

          {/* Needle Pin and Line */}
          <g transform={`translate(85, 85) rotate(${needleAngle})`}>
            <line x1="0" y1="0" x2="0" y2="-56" stroke="#FF5B26" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="0" cy="0" r="5" fill="#FF5B26" />
            <circle cx="0" cy="0" r="2.5" fill="#FFFFFF" />
          </g>
        </svg>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 170, fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
        <span>0</span>
        <button
          style={{
            background: 'none',
            border: 'none',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Live Sync ⟳
        </button>
        <span>{max}</span>
      </div>

      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginRight: 6 }}>Velocity</span>
          <span className="stat-large-val">{value}</span>
          <span className="stat-unit">{unit}</span>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{label}</p>
      </div>
    </div>
  );
};

export default StatDial;
