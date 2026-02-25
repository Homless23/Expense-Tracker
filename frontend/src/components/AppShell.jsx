import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FiBarChart2, FiBell, FiCreditCard, FiDollarSign, FiFileText, FiGrid, FiLayers, FiMenu, FiMoreVertical, FiX } from 'react-icons/fi';
import { useGlobalContext } from '../context/globalContext';
import AddTransactionModal from './AddTransactionModal';
import { getInitials } from '../utils/avatar';

const AppShell = ({ title, subtitle, children, rightPanel = null }) => {
  const navigate = useNavigate();
  const { user, expenses, notifications, markNotificationsRead, logoutUser } = useGlobalContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const menuRef = useRef(null);
  const notifRef = useRef(null);
  const navItems = useMemo(() => {
    const base = [
      { to: '/dashboard', label: 'Dashboard', icon: <FiGrid /> },
      { to: '/transactions', label: 'Transactions', icon: <FiCreditCard /> },
      { action: 'open-add', label: 'Add Expense', icon: <FiDollarSign /> },
      { to: '/budget', label: 'Budget', icon: <FiBarChart2 /> },
      { to: '/categories', label: 'Categories', icon: <FiLayers /> },
      { to: '/reports', label: 'Reports', icon: <FiFileText /> }
    ];
    if (user?.role === 'admin') {
      base.push({ to: '/admin', label: 'Admin', icon: <FiLayers /> });
    }
    return base;
  }, [user?.role]);

  const initials = useMemo(() => getInitials(user?.name || 'User'), [user?.name]);

  const todayAlerts = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    return expenses.filter((item) => {
      if ((item.type || 'expense') !== 'expense') return false;
      const date = new Date(item.date);
      if (Number.isNaN(date.getTime())) return false;
      return date.toISOString().slice(0, 10) === todayKey;
    }).length;
  }, [expenses]);
  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );
  const latestNotifications = useMemo(() => notifications.slice(0, 8), [notifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setIsMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target)) setIsNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  return (
    <div className={`dashboard-ui-shell ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className={`dashboard-sidebar ${isMobileSidebarOpen ? 'open' : ''}`}>
        <div className="dashboard-brand-row">
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            aria-label="Toggle sidebar"
          >
            <FiMenu />
          </button>
          <div className="dashboard-brand">EXPENSE TRACKER</div>
        </div>
        <button
          type="button"
          className="sidebar-close-mobile"
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-label="Close menu"
        >
          <FiX />
        </button>
        <nav className="dashboard-nav">
          {navItems.map((item) => (
            item.to ? (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `dashboard-nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setIsMobileSidebarOpen(false)}
              >
                <span>{item.icon}</span>
                {!isSidebarCollapsed ? item.label : null}
              </NavLink>
            ) : (
              <button
                key={item.action}
                type="button"
                className="dashboard-nav-link dashboard-nav-btn"
                onClick={() => {
                  setIsAddModalOpen(true);
                  setIsMobileSidebarOpen(false);
                }}
              >
                <span>{item.icon}</span>
                {!isSidebarCollapsed ? item.label : null}
              </button>
            )
          ))}
        </nav>
      </aside>
      {isMobileSidebarOpen ? <button className="sidebar-backdrop" onClick={() => setIsMobileSidebarOpen(false)} /> : null}

      <section className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <div className="topbar-actions">
              <button
                type="button"
                className="sidebar-toggle mobile"
                onClick={() => setIsMobileSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <FiMenu />
              </button>
            </div>
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <div className="dashboard-topbar-right">
            <div className="notif-chip" title="Today alerts">
              <span className="notif-dot" />
              {todayAlerts}
            </div>
            <div className="profile-menu-wrap" ref={notifRef}>
              <button
                type="button"
                className="profile-menu-trigger bell-trigger"
                onClick={() => {
                  setIsNotifOpen((prev) => {
                    const next = !prev;
                    if (next) markNotificationsRead();
                    return next;
                  });
                }}
                aria-haspopup="menu"
                aria-expanded={isNotifOpen}
                title="Notifications"
              >
                <FiBell />
                {unreadCount > 0 ? <span className="bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span> : null}
              </button>
              {isNotifOpen ? (
                <div className="profile-dropdown notif-dropdown" role="menu">
                  <div className="notif-dropdown-head">Notifications</div>
                  {latestNotifications.length ? latestNotifications.map((item) => (
                    <div key={item.id} className="notif-item">
                      <p>{item.message}</p>
                      <small>{new Date(item.createdAt).toLocaleString()}</small>
                    </div>
                  )) : <div className="notif-item empty">No notifications yet</div>}
                </div>
              ) : null}
            </div>
            <div className="profile-menu-wrap" ref={menuRef}>
              <button
                type="button"
                className="profile-menu-trigger"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
              >
                <div className="user-chip">
                  <strong className="user-chip-avatar">
                    <span>{initials}</span>
                  </strong>
                  <div>
                    <span>{user?.name || 'User'}</span>
                    <small>{user?.role || 'user'}</small>
                  </div>
                </div>
              </button>

              {isMenuOpen ? (
                <div className="profile-dropdown" role="menu">
                  <button
                    type="button"
                    className="profile-dropdown-item"
                    onClick={() => {
                      navigate('/profile');
                      setIsMenuOpen(false);
                    }}
                  >
                    Profile
                  </button>
                  <button
                    type="button"
                    className="profile-dropdown-item danger"
                    onClick={() => {
                      setIsMenuOpen(false);
                      logoutUser();
                    }}
                  >
                    Log Out
                  </button>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="profile-menu-trigger topbar-more-btn"
              aria-label="More options"
              title="More options"
            >
              <FiMoreVertical />
            </button>
          </div>
        </header>

        <div className={`dashboard-content-grid ${rightPanel ? 'with-right-panel' : ''}`}>
          <main>{children}</main>
          {rightPanel ? <aside>{rightPanel}</aside> : null}
        </div>
      </section>
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
};

export default AppShell;
