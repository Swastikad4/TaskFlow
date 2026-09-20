import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import ToastContainer from '../components/common/ToastContainer';
import {
  LayoutDashboard,
  CheckSquare,
  Kanban,
  Calendar,
  TrendingUp,
  Users,
  Archive,
  Shield,
} from 'lucide-react';

const DashboardLayout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/tasks', label: 'Tasks', icon: CheckSquare },
    { to: '/kanban', label: 'Kanban', icon: Kanban },
    { to: '/calendar', label: 'Calendar', icon: Calendar },
    { to: '/analytics', label: 'Analytics', icon: TrendingUp },
    { to: '/teams', label: 'Teams', icon: Users },
    { to: '/archived-tasks', label: 'Archive', icon: Archive },
    { to: '/sessions', label: 'Sessions', icon: Shield },
  ];

  return (
    <div className="app-container">
      {/* Clean Floating Glass Header */}
      <Navbar
        isMobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
      />

      {/* Global Real-Time Toast Alerts Container */}
      <ToastContainer />

      {/* Main Viewport Container */}
      <main className="main-viewport">
        {/* Mobile Navigation Drawer / Dropdown */}
        {mobileMenuOpen && (
          <div
            className="mobile-nav-backdrop"
            onClick={() => setMobileMenuOpen(false)}
          >
            <nav
              className="mobile-nav-menu"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mobile-nav-header">
                <span>Navigation</span>
                <button
                  className="mobile-nav-close"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  ✕
                </button>
              </div>
              <div className="mobile-nav-links">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `mobile-nav-item ${isActive ? 'active' : ''}`
                      }
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </nav>
          </div>
        )}

        {/* Primary Desktop Navigation Bar */}
        <nav className="subnav-pills desktop-only-nav" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `nav-pill-link ${isActive ? 'active' : ''}`
                }
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Dynamic Route Content */}
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
