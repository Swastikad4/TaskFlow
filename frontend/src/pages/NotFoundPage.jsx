import React from 'react';
import { Link } from 'react-router-dom';
import GlassCard from '../components/common/GlassCard';
import { Compass, ArrowLeft } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <GlassCard style={{ maxWidth: 440, textAlign: 'center', padding: 40 }}>
        <Compass size={48} color="var(--coral-primary)" style={{ margin: '0 auto 16px auto' }} />
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800 }}>404</h1>
        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
          The requested telemetry endpoint or page could not be located.
        </p>
        <Link to="/dashboard" className="btn-coral">
          <ArrowLeft size={16} />
          <span>Return to Dashboard</span>
        </Link>
      </GlassCard>
    </div>
  );
};

export default NotFoundPage;
