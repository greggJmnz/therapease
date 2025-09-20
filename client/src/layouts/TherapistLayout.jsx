import React, { useState, useEffect, useRef } from 'react';
import './Layouts.css';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Calendar,
  FileText,
  Bell,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Brain,
  Target,
  HelpCircle,
  ChevronDown,
  User,
  Shield,
  Globe,
} from 'lucide-react';

const TherapistLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const profileDropdownRef = useRef(null);

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
    { name: 'Dashboard', href: '/therapist/dashboard', icon: BarChart3 },
    { name: 'Patients', href: '/therapist/patients', icon: Users },
    { name: 'Daily Notes', href: '/therapist/daily-notes', icon: FileText },
    { name: 'AI Insights', href: '/therapist/ai-insights', icon: Brain },
    { name: 'Progress Tracking', href: '/therapist/progress-tracking', icon: Target },
    { name: 'Schedule', href: '/therapist/schedule', icon: Calendar },
    { name: 'Notifications', href: '/therapist/notifications', icon: Bell },
  ];

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  const toggleProfileDropdown = () => {
    setProfileDropdownOpen(!profileDropdownOpen);
  };

  return (
    <div className="therapist-layout">
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
              <p className="subtitle">Therapist Portal</p>
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
                  >
                    <item.icon size={20} />
                    {item.name}
                  </Link>
                );
              })}
            <div className="tools-section">
              <h4>Tools</h4>
              <Link to="/therapist/settings" className="nav-link">
                  <Settings size={20} />
                  Settings
                </Link>
                <Link to="/therapist/help" className="nav-link">
                  <HelpCircle size={20} />
                  Help Center
                </Link>
              </div>
              <div className="user-profile">
                <img 
                  src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face" 
                  alt="User Profile" 
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
            <p className="subtitle">Therapist Portal</p>
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
              >
                <item.icon size={20} />
                {item.name}
              </Link>
            );
          })}
          
          <div className="tools-section">
            <h4>Tools</h4>
            <Link to="/therapist/settings" className="nav-link">
              <Settings size={20} />
              Settings
            </Link>
            <Link to="/therapist/help" className="nav-link">
              <HelpCircle size={20} />
              Help Center
            </Link>
          </div>
        </nav>
        
        <div className="user-profile" ref={profileDropdownRef}>
          <div className="profile-main" onClick={toggleProfileDropdown}>
            <img 
              src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face" 
              alt="User Profile" 
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
              <Link to="/therapist/profile" className="dropdown-item">
                <User size={16} />
                <span>Your Profile</span>
              </Link>
              <Link to="/therapist/settings" className="dropdown-item">
                <Settings size={16} />
                <span>Settings</span>
              </Link>
              <Link to="/therapist/help" className="dropdown-item">
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
            <span>Therapist</span>
            <span>/</span>
            <span>{navigation.find(item => item.href === location.pathname)?.name || 'Dashboard'}</span>
          </div>
          
          <div className="header-actions">
            <a 
              href="http://localhost:5000/public-website/index.html"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              title="Visit Public Website"
            >
              <Globe size={16} />
              <span className="hidden sm:inline">Public Website</span>
            </a>
            <button 
              onClick={() => navigate('/therapist/notifications')}
              className="btn-secondary"
            >
              <Bell size={16} />
              <span className="notification-count">2</span>
            </button>
            <button 
              onClick={() => navigate('/therapist/settings')}
              className="btn-secondary"
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

export default TherapistLayout;
