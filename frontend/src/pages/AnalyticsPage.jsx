import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { analyticsService } from '../services/analyticsService';
import { teamService } from '../services/teamService';
import GlassCard from '../components/common/GlassCard';
import StatDial from '../components/common/StatDial';
import {
  TrendingUp,
  BarChart2,
  PieChart,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Repeat,
  RefreshCw,
  Loader2,
  ArrowUpRight,
  Shield,
} from 'lucide-react';

const AnalyticsPage = () => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [dateRange, setDateRange] = useState('30d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [teams, setTeams] = useState([]);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAdminOrManager = user?.role === 'Admin' || user?.role === 'Manager';

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = { dateRange };
      if (dateRange === 'custom' && startDate) {
        params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }
      if (selectedTeamId) {
        params.teamId = selectedTeamId;
      }

      const res = await analyticsService.getAnalytics(params);
      if (res?.data) {
        setData(res.data);
      }
    } catch (err) {
      setError('Failed to compute productivity analytics');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    if (!isAdminOrManager) return;
    try {
      const res = await teamService.getTeams();
      if (res?.data?.teams) {
        setTeams(res.data.teams);
      }
    } catch (err) {
      console.warn('Could not load teams list');
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [isAdminOrManager]);

  useEffect(() => {
    fetchAnalytics();

    if (socket) {
      const handleAnalyticsUpdated = () => {
        fetchAnalytics();
      };

      socket.on('analyticsUpdated', handleAnalyticsUpdated);

      return () => {
        socket.off('analyticsUpdated', handleAnalyticsUpdated);
      };
    }
  }, [socket, dateRange, startDate, endDate, selectedTeamId]);

  const metrics = data?.metrics || {
    totalTasks: 0,
    completed: 0,
    inProgress: 0,
    todo: 0,
    overdue: 0,
    recurring: 0,
    completionRate: 0,
  };

  const statusDistribution = data?.statusDistribution || [];
  const priorityDistribution = data?.priorityDistribution || [];
  const timeline = data?.timeline || [];
  const memberWorkload = data?.memberWorkload || [];

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.8rem',
              fontWeight: 800,
              color: 'var(--text-white)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <TrendingUp size={28} color="var(--coral-primary)" />
            <span>Productivity & Velocity Analytics</span>
          </h1>
          <p style={{ color: 'var(--text-white-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Real-time pipeline metrics, team capacity breakdown, and execution performance
          </p>
        </div>

        {/* Date Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {isAdminOrManager && teams.length > 0 && (
            <select
              className="form-select"
              style={{ width: 'auto', padding: '8px 14px', fontSize: '0.85rem' }}
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
            >
              <option value="">All Squads & Teams</option>
              {teams.map((t) => (
                <option key={t._id} value={t._id}>
                  Squad: {t.name}
                </option>
              ))}
            </select>
          )}

          <div
            style={{
              display: 'flex',
              background: 'rgba(255, 255, 255, 0.15)',
              padding: 3,
              borderRadius: 'var(--card-radius-pill)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
            }}
          >
            {['7d', '30d', '90d', 'all', 'custom'].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--card-radius-pill)',
                  border: 'none',
                  background: dateRange === range ? 'var(--card-bg)' : 'transparent',
                  color: dateRange === range ? 'var(--text-primary)' : 'var(--text-white)',
                  fontFamily: 'var(--font-heading)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: dateRange === range ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                }}
              >
                {range === '7d' && '7 Days'}
                {range === '30d' && '30 Days'}
                {range === '90d' && '90 Days'}
                {range === 'all' && 'All Time'}
                {range === 'custom' && 'Custom'}
              </button>
            ))}
          </div>

          <button
            onClick={fetchAnalytics}
            className="glass-icon-btn"
            title="Refresh Analytics"
            style={{ width: 36, height: 36 }}
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Custom Date Range Picker */}
      {dateRange === 'custom' && (
        <GlassCard style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>From:</span>
            <input
              type="date"
              className="form-input"
              style={{ width: 'auto', padding: '6px 12px' }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>To:</span>
            <input
              type="date"
              className="form-input"
              style={{ width: 'auto', padding: '6px 12px' }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </GlassCard>
      )}

      {loading && !data ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-white)' }}>
          <Loader2 size={36} className="spin-animation" color="var(--coral-primary)" style={{ margin: '0 auto 12px auto' }} />
          <div>Aggregating Pipeline Telemetry...</div>
        </div>
      ) : (
        <>
          {/* Top Key Metrics Banner */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 16,
            }}
          >
            <GlassCard style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Total Tasks Scope
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <span className="stat-large-val">{metrics.totalTasks}</span>
                <span className="stat-unit">tasks</span>
              </div>
            </GlassCard>

            <GlassCard style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#10B981' }}>
                Completed Deliverables
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <span className="stat-large-val" style={{ color: '#10B981' }}>
                  {metrics.completed}
                </span>
                <span className="stat-unit">({metrics.completionRate}%)</span>
              </div>
            </GlassCard>

            <GlassCard style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#3A86FF' }}>
                In Progress Pipeline
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <span className="stat-large-val" style={{ color: '#3A86FF' }}>
                  {metrics.inProgress}
                </span>
                <span className="stat-unit">active</span>
              </div>
            </GlassCard>

            <GlassCard style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#F59E0B' }}>
                To Do Backlog
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <span className="stat-large-val" style={{ color: '#F59E0B' }}>
                  {metrics.todo}
                </span>
                <span className="stat-unit">queued</span>
              </div>
            </GlassCard>

            <GlassCard style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#EF4444' }}>
                Overdue Bottlenecks
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <span className="stat-large-val" style={{ color: '#EF4444' }}>
                  {metrics.overdue}
                </span>
                <span className="stat-unit">delayed</span>
              </div>
            </GlassCard>

            <GlassCard style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#9D4EDD' }}>
                Recurring Engines
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <span className="stat-large-val" style={{ color: '#9D4EDD' }}>
                  {metrics.recurring}
                </span>
                <span className="stat-unit">schedules</span>
              </div>
            </GlassCard>
          </div>

          {/* Charts Row: Status Donut & Priority Meter */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 20 }}>
            {/* Status Breakdown Card */}
            <div style={{ gridColumn: 'span 6' }}>
              <GlassCard title="Workflow Status Distribution" subtitle="Pipeline saturation by stage">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
                  {statusDistribution.map((s) => (
                    <div key={s.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.label}</span>
                        <span style={{ fontWeight: 700, color: s.color }}>
                          {s.count} ({s.percentage}%)
                        </span>
                      </div>
                      <div
                        style={{
                          height: 10,
                          borderRadius: 'var(--card-radius-pill)',
                          background: 'var(--card-bg-subtle)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${s.percentage}%`,
                            background: s.color,
                            borderRadius: 'var(--card-radius-pill)',
                            transition: 'width 0.5s ease',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>

            {/* Priority Distribution Card */}
            <div style={{ gridColumn: 'span 6' }}>
              <GlassCard title="Priority Matrix Breakdown" subtitle="Urgency distribution across scope">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
                  {priorityDistribution.map((p) => {
                    const pct = metrics.totalTasks > 0 ? Math.round((p.count / metrics.totalTasks) * 100) : 0;
                    return (
                      <div key={p.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.label} Priority</span>
                          <span style={{ fontWeight: 700, color: p.color }}>
                            {p.count} tasks ({pct}%)
                          </span>
                        </div>
                        <div
                          style={{
                            height: 10,
                            borderRadius: 'var(--card-radius-pill)',
                            background: 'var(--card-bg-subtle)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${pct}%`,
                              background: p.color,
                              borderRadius: 'var(--card-radius-pill)',
                              transition: 'width 0.5s ease',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            </div>
          </div>

          {/* Velocity Timeline Card */}
          <GlassCard title="Completion Velocity Timeline" subtitle="Created vs Completed tasks trend">
            {timeline.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                No task activity logged within this timeframe.
              </div>
            ) : (
              <div style={{ overflowX: 'auto', padding: '10px 0' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 12,
                    height: 160,
                    paddingBottom: 24,
                    borderBottom: '1px solid var(--card-border-subtle)',
                  }}
                >
                  {timeline.map((item) => {
                    const maxVal = Math.max(...timeline.map((t) => Math.max(t.created, t.completed, 1)));
                    const createdHeight = Math.max(8, Math.round((item.created / maxVal) * 120));
                    const completedHeight = Math.max(8, Math.round((item.completed / maxVal) * 120));

                    return (
                      <div
                        key={item.date}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 6,
                          flex: 1,
                          minWidth: 40,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }}>
                          {/* Created bar */}
                          <div
                            title={`Created: ${item.created}`}
                            style={{
                              width: 12,
                              height: createdHeight,
                              background: '#3A86FF',
                              borderRadius: '4px 4px 0 0',
                            }}
                          />
                          {/* Completed bar */}
                          <div
                            title={`Completed: ${item.completed}`}
                            style={{
                              width: 12,
                              height: completedHeight,
                              background: '#10B981',
                              borderRadius: '4px 4px 0 0',
                            }}
                          />
                        </div>

                        <span
                          style={{
                            fontSize: '0.65rem',
                            color: 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.date.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: 20, marginTop: 12, justifyContent: 'flex-end' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem' }}>
                    <div style={{ width: 10, height: 10, background: '#3A86FF', borderRadius: 2 }} />
                    <span style={{ color: 'var(--text-secondary)' }}>Created</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem' }}>
                    <div style={{ width: 10, height: 10, background: '#10B981', borderRadius: 2 }} />
                    <span style={{ color: 'var(--text-secondary)' }}>Completed</span>
                  </div>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Member Workload Table */}
          {memberWorkload.length > 0 && (
            <GlassCard title="Team Capacity & Member Workload" subtitle="Active assignments and execution performance">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--card-border-subtle)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '12px 14px' }}>Team Member</th>
                      <th style={{ padding: '12px 14px' }}>Role</th>
                      <th style={{ padding: '12px 14px' }}>Assigned</th>
                      <th style={{ padding: '12px 14px' }}>Completed</th>
                      <th style={{ padding: '12px 14px' }}>In Progress</th>
                      <th style={{ padding: '12px 14px' }}>To Do</th>
                      <th style={{ padding: '12px 14px' }}>Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberWorkload.map((m) => (
                      <tr
                        key={m.userId}
                        style={{
                          borderBottom: '1px solid var(--card-border-subtle)',
                        }}
                      >
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {m.name}
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                          {m.role}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 700 }}>
                          {m.totalAssigned}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#10B981', fontWeight: 600 }}>
                          {m.completedCount}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#3A86FF' }}>
                          {m.inProgressCount}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#F59E0B' }}>
                          {m.todoCount}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              background: m.completionRate >= 70 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              color: m.completionRate >= 70 ? '#10B981' : '#F59E0B',
                              padding: '2px 8px',
                              borderRadius: 'var(--card-radius-pill)',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                            }}
                          >
                            {m.completionRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}
        </>
      )}
    </div>
  );
};

export default AnalyticsPage;
