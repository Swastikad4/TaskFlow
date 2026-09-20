import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const GlassCard = ({
  title,
  subtitle,
  children,
  linkTo,
  className = '',
  style = {},
}) => {
  return (
    <div className={`glass-card ${className}`} style={style}>
      {linkTo && (
        <Link to={linkTo} className="card-header-action" title="View details">
          <ArrowUpRight size={16} />
        </Link>
      )}
      {(title || subtitle) && (
        <div style={{ marginBottom: 16 }}>
          {title && (
            <h3
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.05rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}
            >
              {title}
            </h3>
          )}
          {subtitle && (
            <p
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                marginTop: 2,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

export default GlassCard;
