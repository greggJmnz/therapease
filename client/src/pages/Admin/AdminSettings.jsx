import React, { useState } from 'react';
import { Settings, User, Shield, Bell, Save, Users, Clock, AlertTriangle, CheckCircle, RefreshCw, Server, Database, Lock, Mail, Globe, Key, Eye, EyeOff, Smartphone, Monitor, Wifi, HardDrive } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { adminAPI } from '../../services/api';
import ProfileForm from '../../components/Profile/ProfileForm';
import toast from 'react-hot-toast';

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const queryClient = useQueryClient();

  // Fetch settings data
  const { data: settingsData, isLoading } = useQuery(
    'adminSettings',
    adminAPI.getSettings,
    {
      onError: (error) => {
        console.error('Error fetching settings:', error);
      }
    }
  );

  const [systemSettings, setSystemSettings] = useState({
    systemName: 'TherapEase',
    maintenanceMode: false,
    sessionTimeout: 30,
    allowRegistration: true,
    requireEmailVerification: true,
    passwordComplexity: 'medium',
    maxLoginAttempts: 5,
    emailNotifications: true,
    notificationFrequency: 'immediate'
  });

  const [notificationSettings, setNotificationSettings] = useState({
    systemAlerts: true,
    userActivity: true,
    securityEvents: true,
    maintenanceNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation(
    (settings) => adminAPI.updateSettings(settings),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminSettings');
        toast.success('Settings updated successfully');
      },
      onError: (error) => {
        toast.error('Failed to update settings');
        console.error('Error updating settings:', error);
      }
    }
  );

  const handleSystemChange = (field, value) => {
    setSystemSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNotificationChange = (setting, value) => {
    setNotificationSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      system: systemSettings,
      notifications: notificationSettings
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
              <Settings className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600 mt-1">Manage system settings and your account preferences</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Settings</h3>
              <nav className="space-y-2">
                {[
                  { id: 'profile', name: 'Profile', icon: User, description: 'Personal information' },
                  { id: 'system', name: 'System', icon: Settings, description: 'System configuration' },
                  { id: 'notifications', name: 'Notifications', icon: Bell, description: 'Alert preferences' },
                  { id: 'security', name: 'Security', icon: Shield, description: 'Security settings' }
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-blue-50 border-2 border-blue-200 text-blue-700'
                          : 'hover:bg-gray-50 text-gray-700 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
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
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
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
                            value={systemSettings.systemName}
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
                            value={systemSettings.sessionTimeout}
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
                              checked={systemSettings.allowRegistration}
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
                              checked={systemSettings.requireEmailVerification}
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
                            checked={systemSettings.maintenanceMode}
                            onChange={(e) => handleSystemChange('maintenanceMode', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                        </label>
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

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="p-8">
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Security Settings</h2>
                    <p className="text-gray-600">Manage security policies and authentication settings</p>
                  </div>

                  <div className="space-y-6">
                    {/* Password Policy */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Lock className="h-5 w-5 mr-2 text-red-600" />
                        Password Policy
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Password Complexity
                          </label>
                          <select
                            value={systemSettings.passwordComplexity}
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
                            value={systemSettings.maxLoginAttempts}
                            onChange={(e) => handleSystemChange('maxLoginAttempts', parseInt(e.target.value))}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Session Security */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Clock className="h-5 w-5 mr-2 text-purple-600" />
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
                              value={systemSettings.sessionTimeout}
                              onChange={(e) => handleSystemChange('sessionTimeout', parseInt(e.target.value))}
                              className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <span className="text-sm text-gray-500">minutes</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;