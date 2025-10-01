import React, { useState, useEffect, useRef } from 'react';
import './Layouts.css';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import InitialsAvatar from '../components/InitialsAvatar';
import { useNotificationStats } from '../hooks/useNotifications';
import {
  Calendar,
  FileText,
  Bell,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Target,
  Download,
  MessageSquare,
  HelpCircle,
  ChevronDown,
  User,
  Globe,
} from 'lucide-react';

const PatientLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const profileDropdownRef = useRef(null);
  const { stats: notificationStats } = useNotificationStats();

  // Check screen size on mount and resize
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 1024);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navigation = [
    { 
      name: 'Dashboard', 
      href: '/patient/dashboard', 
      icon: BarChart3,
      description: 'Overview and progress'
    },
    { 
      name: 'Schedule', 
      href: '/patient/appointments', 
      icon: Calendar,
      description: 'View appointments'
    },
    { 
      name: 'Daily Notes', 
      href: '/patient/daily-notes', 
      icon: FileText,
      description: 'Session documentation'
    },
    { 
      name: 'Progress Tracking', 
      href: '/patient/progress', 
      icon: Target,
      description: 'Track your therapy progress'
    },
    { 
      name: 'Home Exercises', 
      href: '/patient/exercises', 
      icon: Target,
      description: 'Exercise routines'
    },
    { 
      name: 'Assessments', 
      href: '/patient/assessments', 
      icon: Target,
      description: 'Complete assessments'
    },
    { 
      name: 'Notifications', 
      href: '/patient/notifications', 
      icon: Bell,
      description: 'Alerts and messages'
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  const toggleProfileDropdown = () => {
    setProfileDropdownOpen(!profileDropdownOpen);
  };

  return (
    <div className="patient-layout">
      {/* Mobile sidebar - only render on mobile */}
      {isMobile && (
        <div className={`mobile-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="mobile-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        <div className="mobile-sidebar-content">
          <div className="mobile-sidebar-header">
            <div className="logo-icon">
              <i className="fas fa-heart-pulse"></i>
            </div>
            <h1>TherapEase</h1>
            <p className="subtitle">Patient Portal</p>
            <button
              onClick={() => setSidebarOpen(false)}
              className="close-btn"
            >
              <X size={20} />
            </button>
          </div>
          <nav className="mobile-sidebar-nav">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                  title={item.description}
                >
                  <div className="nav-link-content">
                    <item.icon size={20} />
                    <div className="nav-link-text">
                      <span className="nav-link-name">{item.name}</span>
                      <span className="nav-link-description">{item.description}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
            <div className="tools-section">
              <h4>Tools</h4>
              <Link to="/patient/settings" className="nav-link" title="Account and system settings">
                <div className="nav-link-content">
                  <Settings size={20} />
                  <div className="nav-link-text">
                    <span className="nav-link-name">Settings</span>
                    <span className="nav-link-description">Account settings</span>
                  </div>
                </div>
              </Link>
              <Link to="/patient/help" className="nav-link" title="Help and support resources">
                <div className="nav-link-content">
                  <HelpCircle size={20} />
                  <div className="nav-link-text">
                    <span className="nav-link-name">Help Center</span>
                    <span className="nav-link-description">Support resources</span>
                  </div>
                </div>
              </Link>
            </div>
            <div className="user-profile">
              <InitialsAvatar 
                name={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User'} 
                size="md" 
                className="profile-picture" 
              />
              <div className="profile-info">
                <strong>{user?.firstName} {user?.lastName}</strong>
                <span>{user?.email}</span>
              </div>
            </div>
          </nav>
        </div>
        </div>
      )}

      {/* Desktop sidebar - only render on desktop */}
      {!isMobile && (
        <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-container">
            <div className="logo-icon">
              <i className="fas fa-heart-pulse"></i>
            </div>
            <h1>TherapEase</h1>
            <p className="subtitle">Patient Portal</p>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`nav-link ${isActive ? 'active' : ''}`}
                title={item.description}
              >
                <div className="nav-link-content">
                  <item.icon size={20} />
                  <div className="nav-link-text">
                    <span className="nav-link-name">{item.name}</span>
                    <span className="nav-link-description">{item.description}</span>
                  </div>
                </div>
              </Link>
            );
          })}
          
          <div className="tools-section">
            <h4>Tools</h4>
            <Link to="/patient/settings" className="nav-link" title="Account and system settings">
              <div className="nav-link-content">
                <Settings size={20} />
                <div className="nav-link-text">
                  <span className="nav-link-name">Settings</span>
                  <span className="nav-link-description">Account settings</span>
                </div>
              </div>
            </Link>
            <Link to="/patient/help" className="nav-link" title="Help and support resources">
              <div className="nav-link-content">
                <HelpCircle size={20} />
                <div className="nav-link-text">
                  <span className="nav-link-name">Help Center</span>
                  <span className="nav-link-description">Support resources</span>
                </div>
              </div>
            </Link>
          </div>
        </nav>
        
        <div className="user-profile" ref={profileDropdownRef}>
          <div className="profile-main" onClick={toggleProfileDropdown}>
            <InitialsAvatar 
              name={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User'} 
              size="md" 
              className="profile-picture" 
            />
            <div className="profile-info">
              <strong>{user?.firstName} {user?.lastName}</strong>
              <span>{user?.email}</span>
            </div>
            <ChevronDown 
              size={16} 
              className={`profile-dropdown-arrow ${profileDropdownOpen ? 'open' : ''}`} 
            />
          </div>
          
          {profileDropdownOpen && (
            <div className="profile-dropdown">
              <div className="dropdown-header">
                <span>Signed in as</span>
                <strong>{user?.email}</strong>
              </div>
              <Link to="/patient/profile" className="dropdown-item">
                <User size={16} />
                <span>Your Profile</span>
              </Link>
              <Link to="/patient/settings" className="dropdown-item">
                <Settings size={16} />
                <span>Settings</span>
              </Link>
              <Link to="/patient/help" className="dropdown-item">
                <HelpCircle size={16} />
                <span>Help Center</span>
              </Link>
              <button onClick={handleLogout} className="dropdown-item logout-item">
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
        </aside>
      )}

      {/* Main content */}
      <main className="main-content">
        <div className="content-header">
          <div className="header-left">
            {isMobile && (
              <button
                type="button"
                className="mobile-menu-btn"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu size={20} />
              </button>
            )}

            <div className="breadcrumb">
              <span className="breadcrumb-main">Patient Portal</span>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-current">{navigation.find(item => item.href === location.pathname)?.name || 'Dashboard'}</span>
            </div>
          </div>
          
          <div className="header-actions">
            <a 
              href="http://localhost:8000/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              title="Visit Public Website"
            >
              <Globe size={16} />
              <span className="hidden sm:inline">Public Website</span>
            </a>
            <button 
              onClick={() => navigate('/patient/notifications')}
              className="btn-secondary relative"
              title="View Notifications"
            >
              <Bell size={16} />
              {notificationStats?.unreadCount > 0 && (
                <span className="notification-count">{notificationStats.unreadCount}</span>
              )}
            </button>
            <button 
              onClick={() => navigate('/patient/settings')}
              className="btn-secondary"
              title="Settings"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
        
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default PatientLayout;
