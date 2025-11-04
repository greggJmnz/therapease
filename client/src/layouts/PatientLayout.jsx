import React, { useState, useEffect, useRef } from 'react';
import './Layouts.css';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import InitialsAvatar from '../components/InitialsAvatar';
import { useNotificationStats } from '../hooks/useNotifications';
import OnboardingStatus from '../components/OnboardingStatus';
import { useQuery, useQueryClient } from 'react-query';
import { patientAPI } from '../services/api';
import { useNavigationState } from '../hooks/useNavigationState';
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
  Dumbbell,
} from 'lucide-react';

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
  
  // In production, use www.therapease.site
  const isProduction = window.location.protocol === 'https:';
  if (isProduction) {
    return 'https://www.therapease.site';
  }
  
  // Fallback: infer from current location
  const hostname = window.location.hostname;
  if (hostname.includes('therapease.site')) {
    return `https://www.therapease.site`;
  }
  
  // Default fallback
  return window.location.origin;
};

const PatientLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { user, logout } = useAuth();
  const systemName = 'TherapEase'; // Use default system name for patients
  const navigate = useNavigate();
  const location = useLocation();
  const profileDropdownRef = useRef(null);
  const { stats: notificationStats } = useNotificationStats();
  const { startNavigation, completeNavigation, canNavigate } = useNavigationState();
  const queryClient = useQueryClient();

  // Check onboarding status
  const { data: onboardingStatus, isLoading: onboardingLoading, refetch: refetchOnboardingStatus } = useQuery(
    'patientOnboardingStatus',
    async () => {
      const response = await patientAPI.getOnboardingStatus();
      return response.data; // Extract just the data part
    },
    {
      enabled: user?.role === 'patient',
      refetchOnWindowFocus: true,
      staleTime: 1 * 60 * 1000, // 1 minute - reduced for better responsiveness
      cacheTime: 5 * 60 * 1000, // 5 minutes - reduced cache time
    }
  );

  // Invalidate onboarding status when user changes
  useEffect(() => {
    if (user?.id) {
      queryClient.invalidateQueries('patientOnboardingStatus');
      // Also manually refetch to ensure fresh data
      refetchOnboardingStatus();
    }
  }, [user?.id, queryClient, refetchOnboardingStatus]);

  // Listen for maintenance mode changes and refresh onboarding status
  useEffect(() => {
    const handleMaintenanceModeChange = () => {
      // When maintenance mode is disabled, refresh onboarding status
      queryClient.invalidateQueries('patientOnboardingStatus');
      refetchOnboardingStatus();
    };

    // Listen for storage events (when maintenance mode changes in another tab)
    window.addEventListener('storage', (e) => {
      if (e.key === 'maintenanceMode' && e.newValue === 'false') {
        handleMaintenanceModeChange();
      }
    });

    // Also listen for focus events to refresh when user returns to tab
    const handleFocus = () => {
      refetchOnboardingStatus();
    };
    
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('storage', handleMaintenanceModeChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [queryClient, refetchOnboardingStatus]);


  // Handle navigation based on onboarding status
  useEffect(() => {
    if (onboardingLoading || isRedirecting || !onboardingStatus?.data) return;

    const isComplete = onboardingStatus.data.isComplete === true || onboardingStatus.data.isComplete === 1;
    const currentPath = location.pathname;

    // If onboarding is complete and user is on onboarding page, redirect to dashboard
    if (isComplete && currentPath === '/patient/onboarding') {
      setIsRedirecting(true);
      navigate('/patient/dashboard');
      // Reset redirecting state after a short delay
      setTimeout(() => setIsRedirecting(false), 1000);
    }
    // If onboarding is not complete and user is on dashboard, redirect to onboarding
    else if (!isComplete && currentPath === '/patient/dashboard') {
      setIsRedirecting(true);
      navigate('/patient/onboarding');
      // Reset redirecting state after a short delay
      setTimeout(() => setIsRedirecting(false), 1000);
    }
  }, [onboardingStatus, location.pathname, navigate, isRedirecting, onboardingLoading]);

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
      icon: Dumbbell,
      description: 'Exercise routines'
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
            <h1>{systemName}</h1>
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
              <Link to="/patient/settings" className="nav-link" title="Account and system settings" onClick={() => setSidebarOpen(false)}>
                <div className="nav-link-content">
                  <Settings size={20} />
                  <div className="nav-link-text">
                    <span className="nav-link-name">Settings</span>
                    <span className="nav-link-description">Account settings</span>
                  </div>
                </div>
              </Link>
              <Link to="/patient/help" className="nav-link" title="Help and support resources" onClick={() => setSidebarOpen(false)}>
                <div className="nav-link-content">
                  <HelpCircle size={20} />
                  <div className="nav-link-text">
                    <span className="nav-link-name">Help Center</span>
                    <span className="nav-link-description">Support resources</span>
                  </div>
                </div>
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
                  <Link to="/patient/profile" className="dropdown-item" onClick={() => setSidebarOpen(false)}>
                    <User size={16} />
                    <span>Your Profile</span>
                  </Link>
                  <Link to="/patient/settings" className="dropdown-item" onClick={() => setSidebarOpen(false)}>
                    <Settings size={16} />
                    <span>Settings</span>
                  </Link>
                  <Link to="/patient/help" className="dropdown-item" onClick={() => setSidebarOpen(false)}>
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

            <div className="header-logo-section">
              <div className="system-logo">
                <div className="logo-icon">
                  <i className="fas fa-heart-pulse"></i>
                </div>
              </div>
              <div className="system-name">
                <span className="system-title">{systemName || 'TherapEase'}</span>
                <span className="portal-type">Patient Portal</span>
              </div>
            </div>

            <div className="breadcrumb">
              <span className="breadcrumb-main">Patient Portal</span>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-current">{navigation.find(item => item.href === location.pathname)?.name || 'Dashboard'}</span>
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
          {/* Show onboarding status if not complete and not on onboarding page */}
          {onboardingStatus?.data && !onboardingStatus.data.isComplete && location.pathname !== '/patient/onboarding' && (
            <div className="px-6 pt-4">
              <OnboardingStatus onboardingStatus={onboardingStatus.data} isCompact={true} />
            </div>
          )}
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default PatientLayout;
