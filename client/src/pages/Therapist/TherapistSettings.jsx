import React, { useState } from 'react';
import { User, Bell, Shield, Settings as SettingsIcon, Clock, MapPin, Globe, Lock, Calendar, Smartphone, Monitor, Save, RefreshCw, Target, Users, Activity } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { therapistAPI } from '../../services/api';
import ProfileForm from '../../components/Profile/ProfileForm';
import toast from 'react-hot-toast';

const TherapistSettings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const queryClient = useQueryClient();

  // Fetch settings data
  const { data: settingsData, isLoading } = useQuery(
    'therapistSettings',
    therapistAPI.getSettings,
    {
      onError: (error) => {
        console.error('Error fetching settings:', error);
      }
    }
  );

  const [notificationSettings, setNotificationSettings] = useState({
    appointmentReminders: true,
    patientUpdates: true,
    systemNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true
  });

  const [workingHours, setWorkingHours] = useState({
    monday: { start: '09:00', end: '17:00', enabled: true },
    tuesday: { start: '09:00', end: '17:00', enabled: true },
    wednesday: { start: '09:00', end: '17:00', enabled: true },
    thursday: { start: '09:00', end: '17:00', enabled: true },
    friday: { start: '09:00', end: '17:00', enabled: true },
    saturday: { start: '10:00', end: '14:00', enabled: false },
    sunday: { start: '10:00', end: '14:00', enabled: false }
  });

  const [sessionPreferences, setSessionPreferences] = useState({
    defaultDuration: 45,
    bufferTime: 15,
    maxSessionsPerDay: 8,
    allowWeekendSessions: false,
    allowEveningSessions: true
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation(
    (settings) => therapistAPI.updateSettings(settings),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('therapistSettings');
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

  const handleWorkingHoursChange = (day, field, value) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const handleSessionPreferenceChange = (field, value) => {
    setSessionPreferences(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      notifications: notificationSettings,
      workingHours: workingHours,
      sessionPreferences: sessionPreferences
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

  const days = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ];

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
              <p className="text-gray-600 mt-1">Manage your account and practice preferences</p>
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
                  { id: 'schedule', name: 'Schedule', icon: Calendar, description: 'Working hours & availability' },
                  { id: 'sessions', name: 'Sessions', icon: Activity, description: 'Session preferences' },
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
                    <p className="text-gray-600">Update your personal information and professional details</p>
                  </div>
                  <ProfileForm userRole="therapist" apiService={therapistAPI} />
                </div>
              )}

              {/* Schedule Tab */}
              {activeTab === 'schedule' && (
                <div className="p-8">
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Working Hours</h2>
                    <p className="text-gray-600">Set your availability for patient appointments</p>
                  </div>

                  <div className="space-y-6">
                    {days.map((day) => (
                      <div key={day.key} className="bg-gray-50 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">{day.label}</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                              checked={workingHours[day.key].enabled}
                              onChange={(e) => handleWorkingHoursChange(day.key, 'enabled', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                        {workingHours[day.key].enabled && (
                          <div className="grid grid-cols-2 gap-4">
                    <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Start Time
                        </label>
                          <input
                            type="time"
                                value={workingHours[day.key].start}
                                onChange={(e) => handleWorkingHoursChange(day.key, 'start', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                End Time
                              </label>
                          <input
                            type="time"
                                value={workingHours[day.key].end}
                                onChange={(e) => handleWorkingHoursChange(day.key, 'end', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                              />
                            </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

              {/* Sessions Tab */}
          {activeTab === 'sessions' && (
                <div className="p-8">
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Preferences</h2>
                    <p className="text-gray-600">Configure your session settings and preferences</p>
                  </div>

            <div className="space-y-6">
                    {/* Session Duration */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Clock className="h-5 w-5 mr-2 text-blue-600" />
                        Session Duration
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Default Duration (minutes)
                          </label>
                    <input
                      type="number"
                      value={sessionPreferences.defaultDuration}
                      onChange={(e) => handleSessionPreferenceChange('defaultDuration', parseInt(e.target.value))}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                  <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Buffer Time (minutes)
                          </label>
                    <input
                      type="number"
                      value={sessionPreferences.bufferTime}
                      onChange={(e) => handleSessionPreferenceChange('bufferTime', parseInt(e.target.value))}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                        </div>
                      </div>
                  </div>

                    {/* Session Limits */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Users className="h-5 w-5 mr-2 text-green-600" />
                        Session Limits
                      </h3>
                      <div className="space-y-4">
                  <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Maximum Sessions Per Day
                          </label>
                    <input
                      type="number"
                      value={sessionPreferences.maxSessionsPerDay}
                      onChange={(e) => handleSessionPreferenceChange('maxSessionsPerDay', parseInt(e.target.value))}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                  <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                      <div>
                              <h4 className="font-medium text-gray-900">Allow Weekend Sessions</h4>
                              <p className="text-sm text-gray-500">Enable appointments on weekends</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sessionPreferences.allowWeekendSessions}
                          onChange={(e) => handleSessionPreferenceChange('allowWeekendSessions', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                      <div>
                              <h4 className="font-medium text-gray-900">Allow Evening Sessions</h4>
                              <p className="text-sm text-gray-500">Enable appointments after 6 PM</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sessionPreferences.allowEveningSessions}
                          onChange={(e) => handleSessionPreferenceChange('allowEveningSessions', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
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
                    {/* Practice Notifications */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Bell className="h-5 w-5 mr-2 text-blue-600" />
                        Practice Notifications
                      </h3>
                      <div className="space-y-4">
                        {[
                          { key: 'appointmentReminders', label: 'Appointment Reminders', description: 'Reminders for upcoming sessions' },
                          { key: 'patientUpdates', label: 'Patient Updates', description: 'Updates about patient progress and activities' },
                          { key: 'systemNotifications', label: 'System Notifications', description: 'System updates and maintenance alerts' }
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
                        <Globe className="h-5 w-5 mr-2 text-green-600" />
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

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="p-8">
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Security Settings</h2>
                    <p className="text-gray-600">Manage your account security and privacy settings</p>
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
                          <input
                            type="password"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            placeholder="Enter current password"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            New Password
                          </label>
                          <input
                            type="password"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            placeholder="Enter new password"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Confirm New Password
                          </label>
                          <input
                            type="password"
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

export default TherapistSettings;