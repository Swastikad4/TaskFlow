import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { teamService } from '../services/teamService';
import { userService } from '../services/userService';
import GlassCard from '../components/common/GlassCard';
import {
  Users,
  Plus,
  Shield,
  UserPlus,
  UserMinus,
  Trash2,
  Edit2,
  Check,
  X,
  Loader2,
  AlertCircle,
  Briefcase,
  Layers,
  Crown,
} from 'lucide-react';
import { getInitials } from '../utils/formatters';

const TeamsPage = () => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [teams, setTeams] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    manager: '',
    members: [],
  });

  const [manageForm, setManageForm] = useState({
    name: '',
    description: '',
    manager: '',
  });

  const [selectedUserToAdd, setSelectedUserToAdd] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const isAdmin = user?.role === 'Admin';
  const isManager = user?.role === 'Manager';
  const canCreateTeam = isAdmin || isManager;

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const res = await teamService.getTeams();
      if (res?.data?.teams) {
        setTeams(res.data.teams);
      }
    } catch (err) {
      setError('Failed to load teams. Please check network connection.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await userService.getUsers();
      if (res?.data?.users) {
        setAllUsers(res.data.users);
      }
    } catch (err) {
      console.warn('Could not fetch all users');
    }
  };

  useEffect(() => {
    fetchTeams();
    fetchUsers();

    if (socket) {
      const handleTeamCreated = () => fetchTeams();
      const handleTeamUpdated = () => fetchTeams();
      const handleTeamDeleted = () => fetchTeams();

      socket.on('teamCreated', handleTeamCreated);
      socket.on('teamUpdated', handleTeamUpdated);
      socket.on('teamDeleted', handleTeamDeleted);

      return () => {
        socket.off('teamCreated', handleTeamCreated);
        socket.off('teamUpdated', handleTeamUpdated);
        socket.off('teamDeleted', handleTeamDeleted);
      };
    }
  }, [socket]);

  const showNotification = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const handleOpenCreateModal = () => {
    setCreateForm({
      name: '',
      description: '',
      manager: user?._id || '',
      members: [],
    });
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim()) return;

    setActionLoading(true);
    setError('');

    try {
      await teamService.createTeam({
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        manager: isAdmin && createForm.manager ? createForm.manager : user._id,
        members: createForm.members,
      });

      setShowCreateModal(false);
      showNotification(`Team "${createForm.name}" created successfully!`);
      fetchTeams();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create team');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenManageModal = async (team) => {
    try {
      const res = await teamService.getTeamById(team._id);
      const teamDetails = res?.data?.team || team;
      setSelectedTeam(teamDetails);
      setManageForm({
        name: teamDetails.name,
        description: teamDetails.description || '',
        manager: teamDetails.manager?._id || teamDetails.manager || '',
      });
      setSelectedUserToAdd('');
      setShowManageModal(true);
    } catch (err) {
      setError('Failed to fetch team details');
    }
  };

  const handleUpdateTeamDetails = async (e) => {
    e.preventDefault();
    if (!selectedTeam) return;

    setActionLoading(true);
    try {
      const payload = {
        name: manageForm.name.trim(),
        description: manageForm.description.trim(),
      };
      if (isAdmin && manageForm.manager) {
        payload.manager = manageForm.manager;
      }

      await teamService.updateTeam(selectedTeam._id, payload);
      showNotification('Team details updated successfully');
      fetchTeams();
      // Refresh modal data
      const updated = await teamService.getTeamById(selectedTeam._id);
      setSelectedTeam(updated?.data?.team);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update team');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedTeam || !selectedUserToAdd) return;
    setActionLoading(true);
    setError('');
    try {
      await teamService.addMember(selectedTeam._id, selectedUserToAdd);
      showNotification('Team member added successfully');
      setSelectedUserToAdd('');
      const updated = await teamService.getTeamById(selectedTeam._id);
      setSelectedTeam(updated?.data?.team);
      fetchTeams();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!selectedTeam || !userId) return;
    if (!window.confirm('Are you sure you want to remove this member from the team?')) return;

    setActionLoading(true);
    setError('');
    try {
      await teamService.removeMember(selectedTeam._id, userId);
      showNotification('Member removed from team');
      const updated = await teamService.getTeamById(selectedTeam._id);
      setSelectedTeam(updated?.data?.team);
      fetchTeams();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove member');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTeam = async (teamId, teamName) => {
    if (!window.confirm(`Are you sure you want to permanently delete team "${teamName}"?`)) return;

    try {
      await teamService.deleteTeam(teamId);
      showNotification(`Team "${teamName}" deleted.`);
      fetchTeams();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete team');
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header Banner */}
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
            <Users size={28} color="var(--coral-primary)" />
            <span>Team Workspace Hub</span>
          </h1>
          <p style={{ color: 'var(--text-white-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Organize departments, assign squad managers, and coordinate cross-functional task matrices
          </p>
        </div>

        {canCreateTeam && (
          <button
            onClick={handleOpenCreateModal}
            className="btn-coral"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <Plus size={18} />
            <span>Create New Team</span>
          </button>
        )}
      </div>

      {/* Alerts */}
      {successMessage && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.2)',
            border: '1px solid #10B981',
            color: '#10B981',
            borderRadius: 'var(--card-radius-sm)',
            padding: '12px 18px',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Check size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid #EF4444',
            color: '#EF4444',
            borderRadius: 'var(--card-radius-sm)',
            padding: '12px 18px',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
          <button
            onClick={() => setError('')}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-white)' }}>
          <Loader2 size={36} className="spin-animation" color="var(--coral-primary)" style={{ margin: '0 auto 12px auto' }} />
          <div>Synchronizing Team Rosters...</div>
        </div>
      ) : teams.length === 0 ? (
        <GlassCard style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Users size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px auto', opacity: 0.6 }} />
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700 }}>
            No Teams Created Yet
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 460, margin: '8px auto 20px auto' }}>
            Teams allow managers to coordinate task assignments and track workload distribution across squads.
          </p>
          {canCreateTeam && (
            <button onClick={handleOpenCreateModal} className="btn-coral">
              <Plus size={16} />
              <span>Create First Team</span>
            </button>
          )}
        </GlassCard>
      ) : (
        /* Team Cards Grid */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: 20,
          }}
        >
          {teams.map((team) => {
            const isManagerOfTeam = team.manager?._id?.toString() === user?._id?.toString();
            const canManage = isAdmin || isManagerOfTeam;

            return (
              <GlassCard key={team._id} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Header with actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: '1.2rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {team.name}
                    </h3>
                    <p
                      style={{
                        color: 'var(--text-secondary)',
                        fontSize: '0.85rem',
                        marginTop: 4,
                        minHeight: 36,
                      }}
                    >
                      {team.description || 'No description provided.'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    {canManage && (
                      <button
                        onClick={() => handleOpenManageModal(team)}
                        className="glass-icon-btn"
                        title="Manage Squad Members"
                        style={{ width: 32, height: 32 }}
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteTeam(team._id, team.name)}
                        className="glass-icon-btn"
                        title="Delete Team"
                        style={{ width: 32, height: 32, color: '#EF4444' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Team Manager Banner */}
                <div
                  style={{
                    background: 'var(--card-bg-subtle)',
                    border: '1px solid var(--card-border-subtle)',
                    borderRadius: 'var(--card-radius-sm)',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'var(--coral-gradient)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFF',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      {getInitials(team.manager?.name || 'M')}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {team.manager?.name || 'Unassigned'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {team.manager?.email || 'No email'}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: 'var(--coral-primary)',
                      background: 'var(--coral-glow)',
                      padding: '2px 8px',
                      borderRadius: 'var(--card-radius-pill)',
                    }}
                  >
                    <Crown size={12} />
                    Manager
                  </span>
                </div>

                {/* Team Stats & Members Avatars */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: 8,
                    borderTop: '1px solid var(--card-border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                      }}
                    >
                      Members ({team.members?.length || 0}):
                    </span>
                    <div style={{ display: 'flex', marginLeft: 4 }}>
                      {(team.members || []).slice(0, 4).map((m, idx) => (
                        <div
                          key={m._id || idx}
                          title={`${m.name} (${m.role})`}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #3A86FF 0%, #00B4D8 100%)',
                            color: '#FFF',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginLeft: idx === 0 ? 0 : -8,
                            border: '2px solid var(--card-bg)',
                          }}
                        >
                          {getInitials(m.name || 'U')}
                        </div>
                      ))}
                      {(team.members?.length || 0) > 4 && (
                        <div
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            background: 'var(--card-bg-subtle)',
                            color: 'var(--text-muted)',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginLeft: -8,
                            border: '2px solid var(--card-bg)',
                          }}
                        >
                          +{(team.members.length - 4)}
                        </div>
                      )}
                    </div>
                  </div>

                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#00B4D8',
                      background: 'rgba(0, 180, 216, 0.15)',
                      padding: '3px 10px',
                      borderRadius: 'var(--card-radius-pill)',
                    }}
                  >
                    <Briefcase size={12} />
                    {team.taskCount || 0} Tasks
                  </span>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Modal: Create Team */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800 }}>
                Create New Team Squad
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="glass-icon-btn"
                style={{ width: 32, height: 32 }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label className="form-label">Team Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Core Engineering, Product Design, Marketing Ops"
                  className="form-input"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Team Description</label>
                <textarea
                  rows={3}
                  placeholder="Briefly describe what this squad is responsible for..."
                  className="form-textarea"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                />
              </div>

              {isAdmin && (
                <div className="form-group">
                  <label className="form-label">Assign Squad Manager</label>
                  <select
                    className="form-select"
                    value={createForm.manager}
                    onChange={(e) => setCreateForm({ ...createForm, manager: e.target.value })}
                  >
                    {allUsers.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.role} — {u.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Initial Team Members</label>
                <select
                  multiple
                  className="form-select"
                  style={{ height: 110 }}
                  value={createForm.members}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                    setCreateForm({ ...createForm, members: selected });
                  }}
                >
                  {allUsers.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Hold Ctrl (Windows) or Cmd (Mac) to select multiple members
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-coral"
                >
                  {actionLoading ? <Loader2 size={16} className="spin-animation" /> : <Check size={16} />}
                  <span>Create Team</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Manage Team */}
      {showManageModal && selectedTeam && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 680 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800 }}>
                  Manage: {selectedTeam.name}
                </h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Roster management & team profile configuration
                </span>
              </div>
              <button
                onClick={() => setShowManageModal(false)}
                className="glass-icon-btn"
                style={{ width: 32, height: 32 }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Edit details form */}
            <form onSubmit={handleUpdateTeamDetails} style={{ marginBottom: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Team Name</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={manageForm.name}
                    onChange={(e) => setManageForm({ ...manageForm, name: e.target.value })}
                  />
                </div>

                {isAdmin && (
                  <div className="form-group">
                    <label className="form-label">Squad Manager</label>
                    <select
                      className="form-select"
                      value={manageForm.manager}
                      onChange={(e) => setManageForm({ ...manageForm, manager: e.target.value })}
                    >
                      {allUsers.map((u) => (
                        <option key={u._id} value={u._id}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  type="text"
                  className="form-input"
                  value={manageForm.description}
                  onChange={(e) => setManageForm({ ...manageForm, description: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="btn-outline"
                style={{ padding: '6px 16px', fontSize: '0.85rem' }}
              >
                Save Details
              </button>
            </form>

            <div style={{ borderTop: '1px solid var(--card-border-subtle)', paddingTop: 18 }}>
              <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>
                Team Members ({selectedTeam.members?.length || 0})
              </h4>

              {/* Add member row */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <select
                  className="form-select"
                  value={selectedUserToAdd}
                  onChange={(e) => setSelectedUserToAdd(e.target.value)}
                >
                  <option value="">-- Select user to add to squad --</option>
                  {allUsers
                    .filter((u) => !selectedTeam.members.some((m) => (m._id || m) === u._id))
                    .map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.role} — {u.email})
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddMember}
                  disabled={!selectedUserToAdd || actionLoading}
                  className="btn-coral"
                  style={{ padding: '8px 16px', whiteSpace: 'nowrap' }}
                >
                  <UserPlus size={16} />
                  <span>Add</span>
                </button>
              </div>

              {/* Members List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                {(selectedTeam.members || []).map((member) => (
                  <div
                    key={member._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--card-bg-subtle)',
                      padding: '8px 14px',
                      borderRadius: 'var(--card-radius-sm)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #3A86FF 0%, #00B4D8 100%)',
                          color: '#FFF',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {getInitials(member.name)}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{member.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {member.role} • {member.email}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member._id)}
                      className="glass-icon-btn"
                      title="Remove Member"
                      style={{ width: 28, height: 28, color: '#EF4444' }}
                    >
                      <UserMinus size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamsPage;
