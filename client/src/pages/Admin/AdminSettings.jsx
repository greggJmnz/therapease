import React, { useState, useEffect, useRef } from 'react';
import { Settings, User, Bell, Users, Clock, RefreshCw, Server, Lock, Mail, Globe, Eye, EyeOff, Smartphone, Monitor, ChevronDown, Shield, KeyRound } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { adminAPI, authAPI } from '../../services/api';
import { useSystemSettings } from '../../context/SystemSettingsContext';
import ProfileForm from '../../components/Profile/ProfileForm';
import toast from 'react-hot-toast';

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [showDropdown, setShowDropdown] = useState(false);
  const [navigationType, setNavigationType] = useState('top'); // 'top' or 'dropdown'
  const queryClient = useQueryClient();
  const { refreshSystemSettings, systemSettings: contextSettings, updateSystemSettings } = useSystemSettings();
  const dropdownRef = useRef(null);

  // Fetch settings data
  const { isLoading } = useQuery(
    'adminSettings',
    adminAPI.getSettings,
    {
      onError: (error) => {
        console.error('Error fetching settings:', error);
      }
    }
  );

  // Initialize state first (before useQuery hooks that reference them)
  const [systemSettings, setSystemSettings] = useState({
    systemName: 'TherapEase',
    maintenanceMode: false,
    maintenanceDuration: '2 hours',
    sessionTimeout: 30,
    allowRegistration: true,
    requireEmailVerification: true,
    passwordComplexity: 'medium',
    maxLoginAttempts: 5,
    notificationFrequency: 'immediate'
  });
  
  const [dataLoaded, setDataLoaded] = useState(false);

  const [notificationSettings, setNotificationSettings] = useState({
    systemAlerts: true,
    userActivity: true,
    securityEvents: true,
    maintenanceNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true
  });

  // Fetch system settings data
  const { isLoading: systemSettingsLoading } = useQuery(
    'systemSettings',
    adminAPI.getSystemSettings,
    {
      onSuccess: (response) => {
        if (response?.data?.data) {
          // Use functional setState to ensure we're working with the latest state
          setSystemSettings(prev => ({
            ...prev,
            ...response.data.data.general,
            ...response.data.data.registration,
            ...response.data.data.security
          }));
          
          setNotificationSettings(prev => ({
            ...prev,
            ...response.data.data.notifications
          }));
          
          setDataLoaded(true);
        }
      },
      onError: (error) => {
        console.error('Error fetching system settings:', error);
      }
    }
  );

  // Fetch 2FA status
  const { data: twoFactorStatus } = useQuery(
    'twoFactorStatus',
    authAPI.get2FAStatus,
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      retry: 1,
      retryDelay: 1000
    }
  );

  // Update 2FA state when data changes
  useEffect(() => {
    // Handle nested data structure: data.data.data.enabled
    const enabledValue = twoFactorStatus?.data?.data?.enabled ?? twoFactorStatus?.data?.enabled;
    if (enabledValue !== undefined) {
      const enabled = Boolean(enabledValue);
      setTwoFactorEnabled(enabled);
    }
  }, [twoFactorStatus]);


  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [show2FAVerify, setShow2FAVerify] = useState(false);
  const [show2FADisable, setShow2FADisable] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorPassword, setTwoFactorPassword] = useState('');

  // Navigation tabs data
  const navigationTabs = [
    { id: 'profile', name: 'Profile', icon: User, description: 'Personal information' },
    { id: 'system', name: 'System', icon: Settings, description: 'System configuration' },
    { id: 'notifications', name: 'Notifications', icon: Bell, description: 'Alert preferences' },
    { id: 'security', name: 'Security', icon: Lock, description: 'Security settings' }
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Sync local state with context state (only if data hasn't been loaded from API yet)
  useEffect(() => {
    // Only sync with context if API data hasn't loaded yet AND context has complete data
    if (!dataLoaded && contextSettings && contextSettings.systemName && 
        contextSettings.allowRegistration !== undefined && 
        contextSettings.requireEmailVerification !== undefined) {
      const newSettings = {
        ...systemSettings,
        systemName: contextSettings.systemName,
        sessionTimeout: contextSettings.sessionTimeout,
        maintenanceMode: contextSettings.maintenanceMode,
        maintenanceDuration: contextSettings.maintenanceDuration,
        allowRegistration: contextSettings.allowRegistration,
        requireEmailVerification: contextSettings.requireEmailVerification,
        passwordComplexity: contextSettings.passwordComplexity,
        maxLoginAttempts: contextSettings.maxLoginAttempts,
        notificationFrequency: contextSettings.notificationFrequency
      };
      setSystemSettings(newSettings);
    }
  }, [contextSettings, dataLoaded]);

  // Update settings mutation
  const updateSettingsMutation = useMutation(
    (settings) => adminAPI.updateSystemSettings(settings),
    {
      onSuccess: async (response) => {
        // Update the local systemSettings state with all settings from the API response
        if (response?.data?.data) {
          // Use functional setState to ensure we're working with the latest state
          setSystemSettings(prev => ({
            ...prev,
            ...response.data.data.general,
            ...response.data.data.registration,
            ...response.data.data.security
          }));
        }
        
        // Update the context with the new settings from the API response
        if (response?.data?.data?.general) {
          updateSystemSettings({
            systemName: response.data.data.general.systemName,
            sessionTimeout: response.data.data.general.sessionTimeout,
            maintenanceMode: response.data.data.general.maintenanceMode,
            maintenanceDuration: response.data.data.general.maintenanceDuration,
            allowRegistration: response.data.data.registration?.allowRegistration,
            requireEmailVerification: response.data.data.registration?.requireEmailVerification,
            passwordComplexity: response.data.data.security?.passwordComplexity,
            maxLoginAttempts: response.data.data.security?.maxLoginAttempts,
            notificationFrequency: response.data.data.security?.notificationFrequency
          });
        }
        
        // Update notification settings from the API response
        if (response?.data?.data?.notifications) {
          setNotificationSettings(prev => ({
            ...prev,
            ...response.data.data.notifications
          }));
        }
        
        // Small delay to ensure backend has processed the update
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Invalidate and refetch system settings to ensure all components get updated
        await queryClient.invalidateQueries('systemSettings');
        await queryClient.refetchQueries('systemSettings');
        // Also refresh the system settings context
        await refreshSystemSettings();
        
        // Broadcast maintenance mode changes to other tabs/windows
        if (response?.data?.data?.general?.maintenanceMode !== undefined) {
          localStorage.setItem('maintenanceMode', response.data.data.general.maintenanceMode.toString());
          // Trigger storage event for other tabs
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'maintenanceMode',
            newValue: response.data.data.general.maintenanceMode.toString(),
            oldValue: localStorage.getItem('maintenanceMode')
          }));
        }
        
        toast.success('System settings updated successfully');
      },
      onError: (error) => {
        toast.error('Failed to update system settings');
        console.error('Error updating system settings:', error);
      }
    }
  );

  // Update password mutation
  const updatePasswordMutation = useMutation(
    (passwordData) => adminAPI.changePassword(passwordData),
    {
      onSuccess: (response) => {
        // Check if the response indicates success
        if (response.data && response.data.success === false) {
          // Backend returned success: false, treat as error
          toast.error(response.data.error || 'Failed to update password');
          return;
        }
        
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        toast.success('Password updated successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update password');
        console.error('Error updating password:', error);
      }
    }
  );

  const handleSystemChange = (field, value) => {
    // Special validation for maintenance mode
    if (field === 'maintenanceMode' && value === true) {
      // Check if maintenance duration is set before enabling maintenance mode
      if (!systemSettings.maintenanceDuration || systemSettings.maintenanceDuration.trim() === '') {
        toast.error('Please set the expected maintenance duration before enabling maintenance mode');
        return; // Don't enable maintenance mode
      }
    }

    const newSettings = {
      ...systemSettings,
      [field]: value
    };
    
    setSystemSettings(newSettings);
    
    // Automatically save changes for toggles and immediate settings
    if (['allowRegistration', 'requireEmailVerification', 'maintenanceMode', 'passwordComplexity', 'maxLoginAttempts', 'notificationFrequency'].includes(field)) {
      const mutationData = {
        general: {
          systemName: newSettings.systemName,
          maintenanceMode: newSettings.maintenanceMode,
          maintenanceDuration: newSettings.maintenanceDuration,
          sessionTimeout: newSettings.sessionTimeout
        },
        registration: {
          allowRegistration: newSettings.allowRegistration,
          requireEmailVerification: newSettings.requireEmailVerification
        },
        security: {
          passwordComplexity: newSettings.passwordComplexity,
          maxLoginAttempts: newSettings.maxLoginAttempts,
          notificationFrequency: newSettings.notificationFrequency
        }
      };
      updateSettingsMutation.mutate(mutationData);
    }
  };

  const handleNotificationChange = (setting, value) => {
    const newNotificationSettings = {
      ...notificationSettings,
      [setting]: value
    };
    
    setNotificationSettings(newNotificationSettings);
    
    // Automatically save notification changes
    updateSettingsMutation.mutate({
      general: {
        systemName: systemSettings.systemName,
        maintenanceMode: systemSettings.maintenanceMode,
        maintenanceDuration: systemSettings.maintenanceDuration,
        sessionTimeout: systemSettings.sessionTimeout
      },
      registration: {
        allowRegistration: systemSettings.allowRegistration,
        requireEmailVerification: systemSettings.requireEmailVerification
      },
      security: {
        passwordComplexity: systemSettings.passwordComplexity,
        maxLoginAttempts: systemSettings.maxLoginAttempts,
        notificationFrequency: systemSettings.notificationFrequency
      },
      notifications: newNotificationSettings
    });
  };


  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 2FA handlers
  const handle2FAToggle = async () => {
    if (twoFactorEnabled) {
      setShow2FADisable(true);
    } else {
      setShow2FASetup(true);
    }
  };

  const handleEnable2FA = async () => {
    if (!twoFactorPassword) {
      toast.error('Please enter your password');
      return;
    }

    setTwoFactorLoading(true);
    try {
      await authAPI.enable2FA(twoFactorPassword);
      toast.success('2FA setup code sent to your email. Please check your inbox.');
      setTwoFactorPassword('');
      setShow2FASetup(false);
      setShow2FAVerify(true);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to enable 2FA');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleVerify2FASetup = async () => {
    if (!twoFactorCode || twoFactorCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setTwoFactorLoading(true);
    try {
      await authAPI.verify2FASetup(twoFactorCode);
      toast.success('Two-Factor Authentication enabled successfully!');
      
      // Update local state immediately
      setTwoFactorEnabled(true);
      setTwoFactorCode('');
      setShow2FAVerify(false);
      
      // Refetch the 2FA status to ensure consistency
      await queryClient.invalidateQueries('twoFactorStatus');
      await queryClient.refetchQueries('twoFactorStatus');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to verify 2FA setup');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!twoFactorPassword) {
      toast.error('Please enter your password');
      return;
    }

    setTwoFactorLoading(true);
    try {
      await authAPI.disable2FA(twoFactorPassword);
      toast.success('Two-Factor Authentication disabled successfully');
      
      // Update local state immediately
      setTwoFactorEnabled(false);
      setTwoFactorPassword('');
      setShow2FADisable(false);
      
      // Refetch the 2FA status to ensure consistency
      await queryClient.invalidateQueries('twoFactorStatus');
      await queryClient.refetchQueries('twoFactorStatus');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to disable 2FA');
    } finally {
      setTwoFactorLoading(false);
    }
  };


  const handlePasswordSubmit = () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }

    updatePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword
    });
  };

  if (isLoading || systemSettingsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Settings className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600 mt-1">Manage system settings and your account preferences</p>
            </div>
          </div>
        </div>

        {/* Navigation Toggle */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setNavigationType('top')}
                className={`px-3 py-1 text-sm rounded-lg transition-all duration-200 ${
                  navigationType === 'top' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Top Navigation
              </button>
              <button
                onClick={() => setNavigationType('dropdown')}
                className={`px-3 py-1 text-sm rounded-lg transition-all duration-200 ${
                  navigationType === 'dropdown' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Dropdown Menu
              </button>
            </div>
          </div>
        </div>

        {/* Top Navigation */}
        {navigationType === 'top' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Settings Categories</h3>
            </div>
            <nav className="flex flex-wrap gap-2 p-6">
              {navigationTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-3 px-6 py-4 rounded-xl transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-blue-50 border-2 border-blue-200 text-blue-700'
                        : 'hover:bg-gray-50 text-gray-700 hover:text-gray-900 border-2 border-transparent'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      activeTab === tab.id ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <Icon className={`h-5 w-5 ${
                        activeTab === tab.id ? 'text-blue-600' : 'text-gray-500'
                      }`} />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">{tab.name}</div>
                      <div className="text-sm text-gray-500 hidden sm:block">{tab.description}</div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        )}

        {/* Dropdown Navigation */}
        {navigationType === 'dropdown' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Settings Categories</h3>
            </div>
            <div className="p-6">
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl hover:bg-gray-100 transition-all duration-200"
                >
                  <div className="flex items-center space-x-3">
                    {(() => {
                      const activeTabData = navigationTabs.find(tab => tab.id === activeTab);
                      const Icon = activeTabData?.icon || User;
                      return (
                        <>
                          <div className="p-2 rounded-lg bg-blue-100">
                            <Icon className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="text-left">
                            <div className="font-medium text-gray-900">{activeTabData?.name || 'Select Category'}</div>
                            <div className="text-sm text-gray-500">{activeTabData?.description || 'Choose a settings category'}</div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                    showDropdown ? 'rotate-180' : ''
                  }`} />
                </button>
                
                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-10">
                    {navigationTabs.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setActiveTab(tab.id);
                            setShowDropdown(false);
                          }}
                          className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 transition-all duration-200 ${
                            activeTab === tab.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                          } ${tab.id === navigationTabs[0].id ? 'rounded-t-xl' : ''} ${
                            tab.id === navigationTabs[navigationTabs.length - 1].id ? 'rounded-b-xl' : ''
                          }`}
                        >
                          <div className={`p-2 rounded-lg ${
                            activeTab === tab.id ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            <Icon className={`h-5 w-5 ${
                              activeTab === tab.id ? 'text-blue-600' : 'text-gray-500'
                            }`} />
                          </div>
                          <div>
                            <div className="font-medium">{tab.name}</div>
                            <div className="text-sm text-gray-500">{tab.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="w-full">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="p-8">
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Information</h2>
                    <p className="text-gray-600">Update your personal information and account details</p>
                  </div>
                  <ProfileForm userRole="admin" apiService={adminAPI} />
                </div>
              )}

              {/* System Tab */}
              {activeTab === 'system' && (
                <div className="p-8">
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">System Configuration</h2>
                    <p className="text-gray-600">Manage system-wide settings and preferences</p>
                  </div>

                  <div className="space-y-8">
                    {/* General Settings */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Globe className="h-5 w-5 mr-2 text-blue-600" />
                        General Settings
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            System Name
                          </label>
                          <input
                            type="text"
                            value={systemSettings.systemName || ''}
                            onChange={(e) => handleSystemChange('systemName', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Session Timeout (minutes)
                          </label>
                          <input
                            type="number"
                            value={systemSettings.sessionTimeout || 30}
                            onChange={(e) => handleSystemChange('sessionTimeout', parseInt(e.target.value))}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Registration Settings */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Users className="h-5 w-5 mr-2 text-green-600" />
                        Registration Settings
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                          <div>
                            <h4 className="font-medium text-gray-900">Allow User Registration</h4>
                            <p className="text-sm text-gray-500">Enable new user registrations</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={systemSettings.allowRegistration || false}
                              onChange={(e) => handleSystemChange('allowRegistration', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                          <div>
                            <h4 className="font-medium text-gray-900">Require Email Verification</h4>
                            <p className="text-sm text-gray-500">Users must verify their email address</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={systemSettings.requireEmailVerification || false}
                              onChange={(e) => handleSystemChange('requireEmailVerification', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Maintenance Mode */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Server className="h-5 w-5 mr-2 text-orange-600" />
                        System Status
                      </h3>
                      <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                        <div>
                          <h4 className="font-medium text-gray-900">Maintenance Mode</h4>
                          <p className="text-sm text-gray-500">Temporarily disable system access</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={systemSettings.maintenanceMode || false}
                            onChange={(e) => handleSystemChange('maintenanceMode', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                        </label>
                      </div>
                      
                      {/* Maintenance Duration - Always visible and required */}
                      <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                        <div>
                          <label htmlFor="maintenanceDuration" className="block text-sm font-medium text-gray-700 mb-2">
                            Expected Duration <span className="text-red-500">*</span>
                          </label>
                          <p className="text-sm text-gray-500 mb-3">
                            {systemSettings.maintenanceMode 
                              ? 'How long will maintenance mode be active?' 
                              : 'Set the expected duration before enabling maintenance mode'
                            }
                          </p>
                          <input
                            type="text"
                            id="maintenanceDuration"
                            value={systemSettings.maintenanceDuration || ''}
                            onChange={(e) => handleSystemChange('maintenanceDuration', e.target.value)}
                            placeholder="e.g., 2 hours, 30 minutes, 1 day"
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
                              !systemSettings.maintenanceDuration || systemSettings.maintenanceDuration.trim() === '' 
                                ? 'border-red-300 bg-red-50' 
                                : 'border-gray-300'
                            }`}
                          />
                          <p className="text-xs text-gray-400 mt-1">
                            {systemSettings.maintenanceMode 
                              ? 'This will be displayed to users during maintenance'
                              : 'Required before enabling maintenance mode'
                            }
                          </p>
                          {(!systemSettings.maintenanceDuration || systemSettings.maintenanceDuration.trim() === '') && (
                            <p className="text-xs text-red-500 mt-1">
                              ⚠️ Duration is required to enable maintenance mode
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="p-8">
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Notification Settings</h2>
                    <p className="text-gray-600">Configure how you receive notifications and alerts</p>
                  </div>

                  <div className="space-y-6">
                    {/* System Notifications */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Bell className="h-5 w-5 mr-2 text-blue-600" />
                        System Notifications
                      </h3>
                      <div className="space-y-4">
                        {[
                          { key: 'systemAlerts', label: 'System Alerts', description: 'Critical system notifications' },
                          { key: 'userActivity', label: 'User Activity', description: 'New user registrations and activity' },
                          { key: 'securityEvents', label: 'Security Events', description: 'Login attempts and security alerts' },
                          { key: 'maintenanceNotifications', label: 'Maintenance Notifications', description: 'Scheduled maintenance updates' }
                        ].map((setting) => (
                          <div key={setting.key} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                            <div>
                              <h4 className="font-medium text-gray-900">{setting.label}</h4>
                              <p className="text-sm text-gray-500">{setting.description}</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={notificationSettings[setting.key] || false}
                                onChange={(e) => handleNotificationChange(setting.key, e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Delivery Methods */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Mail className="h-5 w-5 mr-2 text-green-600" />
                        Delivery Methods
                      </h3>
                      <div className="space-y-4">
                        {[
                          { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive notifications via email', icon: Mail },
                          { key: 'smsNotifications', label: 'SMS Notifications', description: 'Receive notifications via SMS', icon: Smartphone },
                          { key: 'pushNotifications', label: 'Push Notifications', description: 'Receive notifications in browser', icon: Monitor }
                        ].map((setting) => {
                          const Icon = setting.icon;
                          return (
                            <div key={setting.key} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                              <div className="flex items-center space-x-3">
                                <Icon className="h-5 w-5 text-gray-500" />
                                <div>
                                  <h4 className="font-medium text-gray-900">{setting.label}</h4>
                                  <p className="text-sm text-gray-500">{setting.description}</p>
                                </div>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={notificationSettings[setting.key] || false}
                                  onChange={(e) => handleNotificationChange(setting.key, e.target.checked)}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="p-8">
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Security Settings</h2>
                    <p className="text-gray-600">Manage security policies and authentication settings</p>
                  </div>

                  <div className="space-y-6">
                    {/* Password Change */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Lock className="h-5 w-5 mr-2 text-red-600" />
                        Change Password
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Current Password
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={passwordData.currentPassword || ''}
                              onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                              placeholder="Enter current password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                              {showPassword ? (
                                <EyeOff className="h-5 w-5 text-gray-400" />
                              ) : (
                                <Eye className="h-5 w-5 text-gray-400" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            New Password
                          </label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? 'text' : 'password'}
                              value={passwordData.newPassword || ''}
                              onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                              placeholder="Enter new password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                              {showNewPassword ? (
                                <EyeOff className="h-5 w-5 text-gray-400" />
                              ) : (
                                <Eye className="h-5 w-5 text-gray-400" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Confirm New Password
                          </label>
                          <input
                            type="password"
                            value={passwordData.confirmPassword || ''}
                            onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            placeholder="Confirm new password"
                          />
                        </div>
                        <div className="mt-6">
                          <button
                            onClick={handlePasswordSubmit}
                            disabled={updatePasswordMutation.isLoading}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {updatePasswordMutation.isLoading ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Updating...
                              </>
                            ) : (
                              <>
                                <KeyRound className="h-4 w-4 mr-2" />
                                Update Password
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Password Policy */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Shield className="h-5 w-5 mr-2 text-purple-600" />
                        Password Policy
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Password Complexity
                          </label>
                          <select
                            value={systemSettings.passwordComplexity || 'medium'}
                            onChange={(e) => handleSystemChange('passwordComplexity', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          >
                            <option value="low">Low (6+ characters)</option>
                            <option value="medium">Medium (8+ characters, mixed case)</option>
                            <option value="high">High (12+ characters, special chars)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Max Login Attempts
                          </label>
                          <input
                            type="number"
                            value={systemSettings.maxLoginAttempts || 5}
                            onChange={(e) => handleSystemChange('maxLoginAttempts', parseInt(e.target.value))}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Session Security */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Clock className="h-5 w-5 mr-2 text-orange-600" />
                        Session Security
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                          <div>
                            <h4 className="font-medium text-gray-900">Force Logout on Inactivity</h4>
                            <p className="text-sm text-gray-500">Automatically log out inactive users</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              value={systemSettings.sessionTimeout || 30}
                              onChange={(e) => handleSystemChange('sessionTimeout', parseInt(e.target.value))}
                              className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <span className="text-sm text-gray-500">minutes</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Two-Factor Authentication */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Shield className="h-5 w-5 mr-2 text-green-600" />
                        Two-Factor Authentication
                      </h3>
                      <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {twoFactorEnabled ? '2FA Enabled' : 'Enable 2FA'}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {twoFactorEnabled 
                              ? 'Two-Factor Authentication is active on your account' 
                              : 'Add an extra layer of security to your account'
                            }
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={twoFactorEnabled || false}
                            onChange={handle2FAToggle}
                            disabled={twoFactorLoading}
                            className="sr-only peer"
                          />
                          <div className={`w-11 h-6 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${twoFactorEnabled ? 'bg-blue-600' : 'bg-gray-200'} ${twoFactorLoading ? 'opacity-50' : ''}`}></div>
                        </label>
                      </div>
                    </div>

                    {/* 2FA Setup Modal */}
                    {show2FASetup && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Enable Two-Factor Authentication</h3>
                          <p className="text-sm text-gray-600 mb-4">
                            Enter your password to start the 2FA setup process. A verification code will be sent to your email.
                          </p>
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Current Password
                            </label>
                            <input
                              type="password"
                              value={twoFactorPassword || ''}
                              onChange={(e) => setTwoFactorPassword(e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Enter your password"
                            />
                          </div>
                          <div className="flex space-x-3">
                            <button
                              onClick={handleEnable2FA}
                              disabled={twoFactorLoading}
                              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-xl hover:bg-blue-700 disabled:opacity-50"
                            >
                              {twoFactorLoading ? 'Sending...' : 'Send Code'}
                            </button>
                            <button
                              onClick={() => {
                                setShow2FASetup(false);
                                setTwoFactorPassword('');
                              }}
                              className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2FA Verification Modal */}
                    {show2FAVerify && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Verify 2FA Setup</h3>
                          <p className="text-sm text-gray-600 mb-4">
                            Enter the 6-digit verification code sent to your email.
                          </p>
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Verification Code
                            </label>
                            <input
                              type="text"
                              value={twoFactorCode || ''}
                              onChange={(e) => setTwoFactorCode(e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg tracking-widest"
                              placeholder="000000"
                              maxLength="6"
                            />
                          </div>
                          <div className="flex space-x-3">
                            <button
                              onClick={handleVerify2FASetup}
                              disabled={twoFactorLoading}
                              className="flex-1 bg-green-600 text-white py-3 px-4 rounded-xl hover:bg-green-700 disabled:opacity-50"
                            >
                              {twoFactorLoading ? 'Verifying...' : 'Verify & Enable'}
                            </button>
                            <button
                              onClick={() => {
                                setTwoFactorCode('');
                                setShow2FAVerify(false);
                              }}
                              className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2FA Disable Modal */}
                    {show2FADisable && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Disable Two-Factor Authentication</h3>
                          <p className="text-sm text-gray-600 mb-4">
                            Enter your password to disable 2FA. This will make your account less secure.
                          </p>
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Current Password
                            </label>
                            <input
                              type="password"
                              value={twoFactorPassword || ''}
                              onChange={(e) => setTwoFactorPassword(e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Enter your password"
                            />
                          </div>
                          <div className="flex space-x-3">
                            <button
                              onClick={handleDisable2FA}
                              disabled={twoFactorLoading}
                              className="flex-1 bg-red-600 text-white py-3 px-4 rounded-xl hover:bg-red-700 disabled:opacity-50"
                            >
                              {twoFactorLoading ? 'Disabling...' : 'Disable 2FA'}
                            </button>
                            <button
                              onClick={() => {
                                setShow2FADisable(false);
                                setTwoFactorPassword('');
                              }}
                              className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;