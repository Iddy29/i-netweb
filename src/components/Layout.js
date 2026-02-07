import { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationsAPI } from '../services/api';
import {
  HiHome, HiShoppingCart, HiChatAlt2, HiMenu, HiX,
  HiBell, HiUser, HiLogout, HiClock, HiCog,
  HiGlobeAlt, HiChevronDown, HiStatusOnline, HiFilm,
} from 'react-icons/hi';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const fetchUnread = useCallback(async () => {
    try {
      const { data } = await notificationsAPI.getUnreadCount();
      if (data.success) setUnreadCount(data.data.count);
    } catch {}
  }, []);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/home', icon: <HiHome size={20} />, label: 'Home' },
    { to: '/channels', icon: <HiStatusOnline size={20} />, label: 'Live TV' },
    { to: '/orders', icon: <HiShoppingCart size={20} />, label: 'My Orders' },
    { to: '/transactions', icon: <HiClock size={20} />, label: 'Transactions' },
    { to: '/chat', icon: <HiChatAlt2 size={20} />, label: 'Support' },
    { to: '/adult-videos', icon: <HiFilm size={20} />, label: '18+ Videos' },
  ];

  return (
    <div className="app-layout">
      {/* Mobile Header */}
      <header className="mobile-header">
        <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>
          <HiMenu size={24} />
        </button>
        <div className="header-brand">
          <HiGlobeAlt size={22} />
          <span>i-net</span>
        </div>
        <div className="header-actions">
          <button className="header-icon-btn" onClick={() => navigate('/notifications')}>
            <HiBell size={20} />
            {unreadCount > 0 && <span className="badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
        </div>
      </header>

      {/* Sidebar overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <HiGlobeAlt size={28} />
            <span>i-net</span>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
            <HiX size={20} />
          </button>
        </div>

        {/* User section */}
        <div className="sidebar-user" onClick={() => { navigate('/profile'); setSidebarOpen(false); }}>
          <div className="sidebar-avatar">
            {user?.profilePicture ? (
              <img src={user.profilePicture} alt="" />
            ) : (
              <HiUser size={22} />
            )}
          </div>
          <div className="sidebar-user-info">
            <strong>{user?.fullName || 'User'}</strong>
            <span>{user?.email || ''}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
          <NavLink
            to="/notifications"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <div className="nav-icon-wrap">
              <HiBell size={20} />
              {unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}
            </div>
            <span>Notifications</span>
          </NavLink>
          <NavLink
            to="/profile"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <HiCog size={20} />
            <span>Profile Settings</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item logout-btn" onClick={handleLogout}>
            <HiLogout size={20} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Desktop top bar */}
        <div className="topbar">
          <div className="topbar-left">
            <h2 className="topbar-greeting">
              {getGreeting()}, <span>{user?.fullName?.split(' ')[0] || 'User'}</span>
            </h2>
          </div>
          <div className="topbar-right">
            <button className="topbar-icon-btn" onClick={() => navigate('/notifications')}>
              <HiBell size={20} />
              {unreadCount > 0 && <span className="badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
            <div className="topbar-user" onClick={() => setShowUserMenu(!showUserMenu)}>
              <div className="topbar-avatar">
                {user?.profilePicture ? (
                  <img src={user.profilePicture} alt="" />
                ) : (
                  <HiUser size={18} />
                )}
              </div>
              <span>{user?.fullName?.split(' ')[0] || 'User'}</span>
              <HiChevronDown size={16} />
              {showUserMenu && (
                <div className="user-dropdown" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => { navigate('/profile'); setShowUserMenu(false); }}>
                    <HiUser size={16} /> Profile
                  </button>
                  <button onClick={() => { navigate('/notifications'); setShowUserMenu(false); }}>
                    <HiBell size={16} /> Notifications
                    {unreadCount > 0 && <span className="dropdown-badge">{unreadCount}</span>}
                  </button>
                  <hr />
                  <button className="logout-item" onClick={handleLogout}>
                    <HiLogout size={16} /> Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="page-content">
          <Outlet context={{ unreadCount, refreshUnread: fetchUnread }} />
        </div>
      </main>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
