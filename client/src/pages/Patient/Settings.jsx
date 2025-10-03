import React, { useState, useEffect, useRef } from 'react';
import { User, Bell, Shield, Settings as SettingsIcon, Eye, EyeOff, Smartphone, Monitor, Globe, Heart, Lock, Save, RefreshCw, Target, Activity, Calendar, Download, Trash2, ChevronDown } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { patientAPI } from '../../services/api';
import ProfileForm from '../../components/Profile/ProfileForm';
import toast from 'react-hot-toast';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [showDropdown, setShowDropdown] = useState(false);
  const [navigationType, setNavigationType] = useState('top'); // 'top' or 'dropdown'
  const queryClient = useQueryClient();

  // Fetch settings data
  const { data: settingsData, isLoading } = useQuery(
    'patientSettings',
    patientAPI.getSettings,
    {
      onError: (error) => {
        console.error('Error fetching settings:', error);
      }
    }
  );

  const [notificationSettings, setNotificationSettings] = useState({
    appointmentReminders: true,
    progressUpdates: true,
    assessmentResults: true,
    homeExerciseReminders: true,
    systemUpdates: false,
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true
  });

  const [privacySettings, setPrivacySettings] = useState({
    shareProgressWithFamily: true,
    allowResearchParticipation: false,
    dataAnalytics: true,
    thirdPartySharing: false
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const dropdownRef = useRef(null);

  // Navigation tabs data
  const navigationTabs = [
    { id: 'profile', name: 'Profile', icon: User, description: 'Personal information' },
    { id: 'notifications', name: 'Notifications', icon: Bell, description: 'Alert preferences' },
    { id: 'privacy', name: 'Privacy', icon: Shield, description: 'Privacy & data settings' },
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

  // Update settings mutation
  const updateSettingsMutation = useMutation(
    (settings) => patientAPI.updateSettings(settings),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('patientSettings');
        toast.success('Settings updated successfully');
      },
      onError: (error) => {
        toast.error('Failed to update settings');
        console.error('Error updating settings:', error);
      }
    }
  );

  const handleNotificationChange = (setting, value) => {
    setNotificationSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handlePrivacyChange = (setting, value) => {
    setPrivacySettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      notifications: notificationSettings,
      privacy: privacySettings,
      password: passwordData
    });
  };

  if (isLoading) {
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
              <SettingsIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600 mt-1">Manage your account and therapy preferences</p>
            </div>
          </div>
        </div>

        {/* Navigation Toggle */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Layout:</span>
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
                  <p className="text-gray-600">Update your personal information and contact details</p>
                </div>
                <ProfileForm userRole="patient" apiService={patientAPI} />
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="p-8">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Notification Settings</h2>
                  <p className="text-gray-600">Configure how you receive notifications about your therapy</p>
                </div>

                <div className="space-y-6">
                  {/* Therapy Notifications */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Heart className="h-5 w-5 mr-2 text-blue-600" />
                      Therapy Notifications
                    </h3>
                    <div className="space-y-4">
                      {[
                        { key: 'appointmentReminders', label: 'Appointment Reminders', description: 'Reminders for upcoming therapy sessions' },
                        { key: 'progressUpdates', label: 'Progress Updates', description: 'Updates about your therapy progress' },
                        { key: 'assessmentResults', label: 'Assessment Results', description: 'Notifications when assessment results are available' },
                        { key: 'homeExerciseReminders', label: 'Exercise Reminders', description: 'Reminders for home exercises and activities' }
                      ].map((setting) => (
                        <div key={setting.key} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                          <div>
                            <h4 className="font-medium text-gray-900">{setting.label}</h4>
                            <p className="text-sm text-gray-500">{setting.description}</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={notificationSettings[setting.key]}
                              onChange={(e) => handleNotificationChange(setting.key, e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* System Notifications */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Activity className="h-5 w-5 mr-2 text-green-600" />
                      System Notifications
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                        <div>
                          <h4 className="font-medium text-gray-900">System Updates</h4>
                          <p className="text-sm text-gray-500">Notifications about app updates and maintenance</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificationSettings.systemUpdates}
                            onChange={(e) => handleNotificationChange('systemUpdates', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Methods */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Globe className="h-5 w-5 mr-2 text-purple-600" />
                      Delivery Methods
                    </h3>
                    <div className="space-y-4">
                      {[
                        { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive notifications via email', icon: Globe },
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
                                checked={notificationSettings[setting.key]}
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

            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <div className="p-8">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Privacy Settings</h2>
                  <p className="text-gray-600">Control how your data is used and shared</p>
                </div>

                <div className="space-y-6">
                  {/* Data Sharing */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Target className="h-5 w-5 mr-2 text-blue-600" />
                      Data Sharing
                    </h3>
                    <div className="space-y-4">
                      {[
                        { key: 'shareProgressWithFamily', label: 'Share Progress with Family', description: 'Allow family members to view your therapy progress' },
                        { key: 'allowResearchParticipation', label: 'Research Participation', description: 'Allow your anonymized data to be used for research' },
                        { key: 'dataAnalytics', label: 'Data Analytics', description: 'Help improve the app by sharing usage analytics' },
                        { key: 'thirdPartySharing', label: 'Third-Party Sharing', description: 'Share data with trusted third-party services' }
                      ].map((setting) => (
                        <div key={setting.key} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                          <div>
                            <h4 className="font-medium text-gray-900">{setting.label}</h4>
                            <p className="text-sm text-gray-500">{setting.description}</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={privacySettings[setting.key]}
                              onChange={(e) => handlePrivacyChange(setting.key, e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Data Export */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Calendar className="h-5 w-5 mr-2 text-green-600" />
                      Data Management
                    </h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-white rounded-lg border border-gray-200">
                        <h4 className="font-medium text-gray-900 mb-2">Export Your Data</h4>
                        <p className="text-sm text-gray-500 mb-4">Download a copy of all your therapy data</p>
                        <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200">
                          <Download className="h-4 w-4 mr-2" />
                          Export Data
                        </button>
                      </div>
                      <div className="p-4 bg-white rounded-lg border border-gray-200">
                        <h4 className="font-medium text-gray-900 mb-2">Delete Account</h4>
                        <p className="text-sm text-gray-500 mb-4">Permanently delete your account and all associated data</p>
                        <button className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Account
                        </button>
                      </div>
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
                  <p className="text-gray-600">Manage your account security and password</p>
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
                            value={passwordData.currentPassword}
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
                            value={passwordData.newPassword}
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
                          value={passwordData.confirmPassword}
                          onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          placeholder="Confirm new password"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Two-Factor Authentication */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Shield className="h-5 w-5 mr-2 text-purple-600" />
                      Two-Factor Authentication
                    </h3>
                    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                      <div>
                        <h4 className="font-medium text-gray-900">Enable 2FA</h4>
                        <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button - Only show for non-profile tabs */}
            {activeTab !== 'profile' && (
              <div className="px-8 py-6 bg-gray-50 border-t border-gray-200">
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveSettings}
                    disabled={updateSettingsMutation.isLoading}
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updateSettingsMutation.isLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;