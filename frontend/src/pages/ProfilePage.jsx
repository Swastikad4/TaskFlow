import React, { useState, useEffect } from 'react';
import GlassCard from '../components/common/GlassCard';
import { useAuth } from '../hooks/useAuth';
import { taskService } from '../services/taskService';
import { getInitials, formatDate } from '../utils/formatters';
import {
  Shield,
  User,
  Mail,
  Calendar,
  CheckCircle,
  Clock,
  Briefcase,
  Award,
  Loader2,
} from 'lucide-react';

const ProfilePage = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const res = await taskService.getTasks();
        if (res?.data?.tasks) {
          setTasks(res.data.tasks);
        }
      } catch (err) {
        console.warn('Failed to load user task stats');
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, []);

  const role = user?.role || 'Team Member';

  // Calculate real task metrics for current user
  const assignedTasks = tasks.filter(
    (t) => t.assignedTo?._id === user?._id || t.assignedTo === user?._id || t.assignedTo?.name === user?.name
  );
  const totalAssigned = assignedTasks.length;
  const completedTasks = assignedTasks.filter((t) => t.status === 'Completed').length;
  const inProgressTasks = assignedTasks.filter((t) => t.status === 'In Progress').length;
  const completionRate =
    totalAssigned > 0 ? Math.round((completedTasks / totalAssigned) * 100) : 0;

  return (
    <div style={{ maxWidth: 950, margin: '0 auto' }}>
      <div className="dashboard-grid">
        {/* User Card */}
        <div className="col-span-4">
          <GlassCard style={{ textAlign: 'center', padding: '36px 20px' }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'var(--coral-gradient)',
                color: '#FFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.75rem',
                fontWeight: 800,
                margin: '0 auto 18px auto',
                boxShadow: '0 8px 24px var(--coral-glow)',
              }}
            >
              {getInitials(user?.name || 'User')}
            </div>

            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.4rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
              }}
            >
              {user?.name || 'User Name'}
            </h2>
            <p
              style={{
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                marginTop: 2,
                marginBottom: 16,
              }}
            >
              {user?.email || 'user@taskflow.dev'}
            </p>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 16px',
                borderRadius: 9999,
                fontSize: '0.75rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                background: '#E8F0FE',
                color: '#1A73E8',
                border: '1px solid #D2E3FC',
              }}
            >
              <Shield size={14} />
              <span>{role}</span>
            </span>

            <div
              style={{
                marginTop: 24,
                paddingTop: 18,
                borderTop: '1px solid #F1F3F5',
                textAlign: 'left',
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={14} />
                <span>Joined {formatDate(user?.createdAt || new Date().toISOString())}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Briefcase size={14} />
                <span>Node Cluster: Production-01</span>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* User Real Task Metrics & Security Matrix */}
        <div className="col-span-8">
          {/* Real Task Performance */}
          <GlassCard
            title="Individual Task Metrics"
            subtitle="Personal execution and throughput"
            style={{ marginBottom: 20 }}
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Loader2 size={24} className="spin-animation" style={{ margin: '0 auto' }} />
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 16,
                  textAlign: 'center',
                }}
              >
                <div style={{ background: '#F8FAFC', padding: '16px 12px', borderRadius: 'var(--card-radius-sm)', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {totalAssigned}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Assigned Tasks
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', padding: '16px 12px', borderRadius: 'var(--card-radius-sm)', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10B981' }}>
                    {completedTasks}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Resolved Tasks
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', padding: '16px 12px', borderRadius: 'var(--card-radius-sm)', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--coral-primary)' }}>
                    {completionRate}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Completion Rate
                  </div>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Role Authorization Claims */}
          <GlassCard
            title="Security & RBAC Authorization Matrix"
            subtitle="Capabilities granted to your account"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  background: '#F8FAFC',
                  borderRadius: 'var(--card-radius-sm)',
                  border: '1px solid #E2E8F0',
                }}
              >
                <CheckCircle size={18} color="#10B981" />
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>
                    Real-Time Collaboration & Sockets
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Live discussion comments, instantaneous broadcast alerts, and activity push.
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  background: '#F8FAFC',
                  borderRadius: 'var(--card-radius-sm)',
                  border: '1px solid #E2E8F0',
                }}
              >
                <CheckCircle size={18} color="#10B981" />
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>
                    Role Authority: {role}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {role === 'Admin' && 'Full unrestricted access: Create, assign, edit, and delete any task across the workspace.'}
                    {role === 'Manager' && 'Management access: Create and assign tasks, edit specifications, and track team velocity.'}
                    {role === 'Team Member' && 'Execution access: View assigned tasks, update workflow status, and participate in comment threads.'}
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
