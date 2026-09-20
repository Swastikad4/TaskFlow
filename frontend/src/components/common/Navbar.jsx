import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { useTheme } from '../../hooks/useTheme';
import { notificationService } from '../../services/notificationService';
import {
  Layers,
  Bell,
  LogOut,
  PlusCircle,
  Sun,
  Moon,
  Menu,
  X,
} from 'lucide-react';
import { getInitials } from '../../utils/formatters';

const Navbar = ({ isMobileMenuOpen, onToggleMobileMenu }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { socket, connectionStatus } = useSocket();
  const { isDark, toggleTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const isManagerOrAdmin = user?.role === 'Admin' || user?.role === 'Manager';

  const fetchUnreadCount = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationService.getNotifications();
      if (res?.data?.unreadCount !== undefined) {
        setUnreadCount(res.data.unreadCount);
      }
    } catch (err) {
      // Graceful fallback
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    if (socket) {
      const handleNotifCreated = () => {
        setUnreadCount((prev) => prev + 1);
      };

      socket.on('notificationCreated', handleNotifCreated);

      return () => {
        socket.off('notificationCreated', handleNotifCreated);
      };
    }
  }, [socket, isAuthenticated]);

  // Re-check count when navigating away from notifications page
  useEffect(() => {
    if (location.pathname === '/notifications') {
      fetchUnreadCount();
    }
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getStatusText = () => {
    if (connectionStatus === 'connected') return 'Real-time synced';
    if (connectionStatus === 'reconnecting') return 'Reconnecting...';
    return 'Offline';
  };

  const getStatusColor = () => {
    if (connectionStatus === 'connected') return '#10B981';
    if (connectionStatus === 'reconnecting') return '#F59E0B';
    return '#EF4444';
  };

  return (
    <header className="glass-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Mobile Hamburger Toggle */}
        {isAuthenticated && (
          <button
            className="mobile-nav-toggle"
            onClick={onToggleMobileMenu}
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}

        {/* Brand Logo */}
        <Link to={isAuthenticated ? '/dashboard' : '/login'} className="brand-logo">
          <div className="brand-logo-icon">
            <Layers size={18} />
          </div>
          <span>TaskFlow</span>
        </Link>
      </div>

      {/* Subtle Real-time Connection Indicator */}
      {isAuthenticated && (
        <div className="header-sync-indicator" title={`System Status: ${getStatusText()}`}>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: getStatusColor(),
              boxShadow: `0 0 6px ${getStatusColor()}`,
              display: 'inline-block',
            }}
          />
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-white-muted)' }}>
            {getStatusText()}
          </span>
        </div>
      )}

      {/* Right Controls: Theme, Create Task, Notifications, Profile, Logout */}
      <div className="header-actions">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="glass-icon-btn"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun size={17} color="#F59E0B" /> : <Moon size={17} color="#3A86FF" />}
        </button>

        {isAuthenticated ? (
          <>
            {/* Create Task Action */}
            {isManagerOrAdmin && (
              <Link
                to="/tasks/create"
                className="header-create-btn"
                title="Create New Task"
              >
                <PlusCircle size={16} />
                <span className="create-btn-text">Create Task</span>
              </Link>
            )}

            {/* Notifications Bell */}
            <Link
              to="/notifications"
              className={`glass-icon-btn ${location.pathname === '/notifications' ? 'active' : ''}`}
              title="Notifications"
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span className="notification-badge">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {/* User Profile Chip */}
            <Link to="/profile" className="user-profile-chip" title="View Profile">
              <div className="user-avatar">
                {getInitials(user?.name || 'User')}
              </div>
              <span className="user-profile-name">{user?.name || 'User'}</span>
            </Link>

            {/* Log Out Button */}
            <button
              onClick={handleLogout}
              className="glass-icon-btn logout-btn"
              title="Log Out"
            >
              <LogOut size={16} />
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <Link
              to="/login"
              className="btn-outline"
              style={{
                padding: '6px 18px',
                color: '#FFF',
                borderColor: 'rgba(255,255,255,0.4)',
              }}
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="btn-coral"
              style={{ padding: '6px 18px' }}
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
