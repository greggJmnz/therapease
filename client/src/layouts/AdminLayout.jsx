import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSystemSettings } from '../context/SystemSettingsContext';
import InitialsAvatar from '../components/InitialsAvatar';
import { useQuery } from 'react-query';
import { adminAPI } from '../services/api';
import { getPublicWebsiteUrl } from '../utils/publicWebsiteUrl';
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
  // Admin portal should only be accessible on desktop/iPad (not mobile phones)
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Mobile phone detection: width <= 768px (exclude tablets/iPads which are typically 768px+)
      // iPad/Tablet: typically 768px - 1024px
      // Desktop: > 1024px
      // Block mobile phones (width <= 768px and height/width ratio suggests phone)
      const isMobilePhone = width <= 768 && (width < height || height < 1024);
      setIsMobile(isMobilePhone);
      
      // If on mobile phone, show message and prevent access
      if (isMobilePhone) {
        // Redirect to login or show message
        const shouldBlock = true;
        if (shouldBlock) {
          // You can redirect or show a message
          // For now, we'll just set the mobile state
        }
      }
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
    { name: 'Analytics', href: '/admin/reports', icon: FileText },
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

  // Show mobile restriction message if on mobile phone
  if (isMobile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <X className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Portal Not Available</h1>
            <p className="text-gray-600">
              The admin portal is only accessible on desktop computers and tablets (iPad).
              Please access this portal from a desktop or tablet device.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      {/* Desktop sidebar - only render on desktop/tablet */}
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
              <Link to="/admin/settings" className="nav-link">
                <Settings size={20} />
                Settings
              </Link>
              <Link to="/admin/help" className="nav-link">
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
          </nav>
        </aside>
      )}

      {/* Main content */}
      <main className="main-content">
        <div className="content-header">
          <div className="header-left">
            
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
