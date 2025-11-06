import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSystemSettings } from '../context/SystemSettingsContext';
import InitialsAvatar from '../components/InitialsAvatar';
import { useQuery } from 'react-query';
import { adminAPI } from '../services/api';
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
  HelpCircle,
  ChevronDown,
  User,
  Globe,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import './Layouts.css';

// Helper function to get the public website URL
const getPublicWebsiteUrl = () => {
  // Check for environment variable first
  const publicWebsiteUrl = import.meta.env.VITE_PUBLIC_WEBSITE_URL;
  if (publicWebsiteUrl) {
    return publicWebsiteUrl;
  }
  
  // In development, use localhost
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isDevelopment) {
    return 'http://localhost:8000';
  }
  
  // In production, use www.therapease.site/public-website
  const isProduction = window.location.protocol === 'https:';
  if (isProduction) {
    return 'https://www.therapease.site/public-website';
  }
  
  // Fallback: infer from current location
  const hostname = window.location.hostname;
  if (hostname.includes('therapease.site')) {
    return `https://www.therapease.site/public-website`;
  }
  
  // Default fallback
  return `${window.location.origin}/public-website`;
};

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [userManagementDropdownOpen, setUserManagementDropdownOpen] = useState(false);
  const { user, logout } = useAuth();
  const { systemName } = useSystemSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const profileDropdownRef = useRef(null);
  // OPTIMIZED: Defer notifications fetch to prevent blocking login
  const [shouldFetchNotifications, setShouldFetchNotifications] = React.useState(false);
  
  React.useEffect(() => {
    // Defer notifications fetch by 2 seconds after mount to prevent blocking login
    const timer = setTimeout(() => {
      setShouldFetchNotifications(true);
    }, 2000); // Wait 2 seconds after layout loads
    return () => clearTimeout(timer);
  }, []);
  
  // Fetch notifications for unread count - deferred to prevent blocking login
  const { data: notificationsData, isLoading, error } = useQuery(
    'adminNotificationsHeader',
    adminAPI.getNotifications,
    {
      enabled: shouldFetchNotifications, // Only fetch after delay
      refetchOnWindowFocus: false,
      staleTime: 300000, // 5 minutes - much longer to prevent continuous fetching
      cacheTime: 600000, // 10 minutes
      refetchInterval: false, // Disable automatic refetching
      retry: false, // OPTIMIZED: Don't retry - if it fails, show 0 unread (don't block UI)
    }
  );

  // Calculate unread count from notifications data
  // Note: axios response has data.data structure, so we need notificationsData.data.data.unreadCount
  const unreadCount = notificationsData?.data?.data?.unreadCount || 0;


  // Check screen size on mount and resize with improved mobile detection
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // More comprehensive mobile detection
      const isMobile = width <= 1024 || (width <= 768 && height <= 1024);
      setIsMobile(isMobile);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    window.addEventListener('orientationchange', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
      window.removeEventListener('orientationchange', checkScreenSize);
    };
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
    { name: 'Dashboard', href: '/admin/dashboard', icon: BarChart3 },
    { 
      name: 'User Management', 
      icon: Users, 
      isDropdown: true,
      dropdownItems: [
        { name: 'All Users', href: '/admin/users', icon: Users },
        { name: 'Patients', href: '/admin/patients', icon: UserCheck },
        { name: 'Therapists', href: '/admin/therapists', icon: UserPlus },
      ]
    },
    { name: 'Appointments', href: '/admin/appointments', icon: Calendar },
    { name: 'Notifications', href: '/admin/notifications', icon: Bell },
    { name: 'Reports', href: '/admin/reports', icon: FileText },
  ];

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  const toggleProfileDropdown = () => {
    setProfileDropdownOpen(!profileDropdownOpen);
  };

  const toggleUserManagementDropdown = () => {
    setUserManagementDropdownOpen(!userManagementDropdownOpen);
  };

  // Get current section name for breadcrumb
  const getCurrentSectionName = () => {
    // Check regular navigation items first
    const currentRoute = navigation.find(item => item.href === location.pathname);
    if (currentRoute) {
      return currentRoute.name;
    }
    
    // Check dropdown items
    for (const navItem of navigation) {
      if (navItem.isDropdown && navItem.dropdownItems) {
        const dropdownItem = navItem.dropdownItems.find(item => item.href === location.pathname);
        if (dropdownItem) {
          return dropdownItem.name;
        }
      }
    }
    
    return 'Dashboard';
  };

  return (
    <div className="admin-layout">
      {/* Mobile sidebar - only render on mobile */}
      {isMobile && (
        <div className={`mobile-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="mobile-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        <div className="mobile-sidebar-content">
          <div className="mobile-sidebar-header">
            <div className="logo-icon">
              <i className="fas fa-heart-pulse"></i>
            </div>
            <h1>{systemName}</h1>
            <p className="subtitle">Admin Portal</p>
            <button
              onClick={() => setSidebarOpen(false)}
              className="close-btn"
            >
              <X size={20} />
            </button>
          </div>
          <nav className="mobile-sidebar-nav">
            {navigation.map((item) => {
              if (item.isDropdown) {
                const isDropdownActive = item.dropdownItems?.some(dropdownItem => 
                  location.pathname === dropdownItem.href
                );
                return (
                  <div key={item.name} className="nav-dropdown-container">
                    <button
                      className={`nav-link dropdown-toggle ${isDropdownActive ? 'active' : ''}`}
                      onClick={toggleUserManagementDropdown}
                    >
                      <item.icon size={20} />
                      {item.name}
                      <ChevronDown 
                        size={16} 
                        className={`dropdown-arrow ${userManagementDropdownOpen ? 'open' : ''}`} 
                      />
                    </button>
                    {userManagementDropdownOpen && (
                      <div className="nav-dropdown">
                        {item.dropdownItems?.map((dropdownItem) => {
                          const isActive = location.pathname === dropdownItem.href;
                          return (
                            <Link
                              key={dropdownItem.name}
                              to={dropdownItem.href}
                              className={`nav-link dropdown-item ${isActive ? 'active' : ''}`}
                              onClick={() => setSidebarOpen(false)}
                            >
                              <dropdownItem.icon size={20} />
                              {dropdownItem.name}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              } else {
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
              }
            })}
            <div className="tools-section">
              <h4>Tools</h4>
              <Link to="/admin/settings" className="nav-link" onClick={() => setSidebarOpen(false)}>
                <Settings size={20} />
                Settings
              </Link>
              <Link to="/admin/help" className="nav-link" onClick={() => setSidebarOpen(false)}>
                <HelpCircle size={20} />
                Help Center
              </Link>
            </div>
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
                  <Link to="/admin/profile" className="dropdown-item" onClick={() => setSidebarOpen(false)}>
                    <User size={16} />
                    <span>Your Profile</span>
                  </Link>
                  <Link to="/admin/settings" className="dropdown-item" onClick={() => setSidebarOpen(false)}>
                    <Settings size={16} />
                    <span>Settings</span>
                  </Link>
                  <Link to="/admin/help" className="dropdown-item" onClick={() => setSidebarOpen(false)}>
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
            <h1>{systemName}</h1>
            <p className="subtitle">Admin Portal</p>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          {navigation.map((item) => {
            if (item.isDropdown) {
              const isDropdownActive = item.dropdownItems?.some(dropdownItem => 
                location.pathname === dropdownItem.href
              );
              return (
                <div key={item.name} className="nav-dropdown-container">
                  <button
                    className={`nav-link dropdown-toggle ${isDropdownActive ? 'active' : ''}`}
                    onClick={toggleUserManagementDropdown}
                  >
                    <item.icon size={20} />
                    {item.name}
                    <ChevronDown 
                      size={16} 
                      className={`dropdown-arrow ${userManagementDropdownOpen ? 'open' : ''}`} 
                    />
                  </button>
                  {userManagementDropdownOpen && (
                    <div className="nav-dropdown">
                      {item.dropdownItems?.map((dropdownItem) => {
                        const isActive = location.pathname === dropdownItem.href;
                        return (
                          <Link
                            key={dropdownItem.name}
                            to={dropdownItem.href}
                            className={`nav-link dropdown-item ${isActive ? 'active' : ''}`}
                          >
                            <dropdownItem.icon size={20} />
                            {dropdownItem.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            } else {
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
            }
          })}
          
          <div className="tools-section">
            <h4>Tools</h4>
            <Link to="/admin/settings" className="nav-link">
              <Settings size={20} />
              Settings
            </Link>
            <Link to="/admin/help" className="nav-link">
              <HelpCircle size={20} />
              Help Center
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
              <Link to="/admin/profile" className="dropdown-item">
                <User size={16} />
                <span>Your Profile</span>
              </Link>
              <Link to="/admin/settings" className="dropdown-item">
                <Settings size={16} />
                <span>Settings</span>
              </Link>
              <Link to="/admin/help" className="dropdown-item">
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
                className="mobile-menu-btn touch-target"
                onClick={() => setSidebarOpen(true)}
                title="Open Menu"
                aria-label="Open navigation menu"
              >
                <Menu size={20} />
              </button>
            )}
            
            <div className="header-logo-section">
              <div className="system-logo">
                <div className="logo-icon">
                  <i className="fas fa-heart-pulse"></i>
                </div>
              </div>
              <div className="system-name">
                <span className="system-title">{systemName || 'TherapEase'}</span>
                <span className="portal-type">Admin Portal</span>
              </div>
            </div>
            
            <div className="breadcrumb">
              <span className="breadcrumb-main">Admin</span>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-current">{getCurrentSectionName()}</span>
            </div>
          </div>
          
          <div className="header-actions">
            <a 
              href={getPublicWebsiteUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              title="Visit Public Website"
            >
              <Globe size={16} />
              <span className="hidden sm:inline">Public Website</span>
            </a>
            <button 
              onClick={() => navigate('/admin/notifications')}
              className="btn-secondary relative touch-target"
              title="Notifications"
            >
              <Bell size={16} />
              {!isLoading && unreadCount > 0 && (
                <span className="notification-count">{unreadCount}</span>
              )}
            </button>
            <button 
              onClick={() => navigate('/admin/settings')}
              className="btn-secondary touch-target"
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

export default AdminLayout;
