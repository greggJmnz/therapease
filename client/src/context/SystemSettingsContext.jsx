import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { adminAPI } from '../services/api';
import { useAuth } from './AuthContext';

export const SystemSettingsContext = createContext();

export const useSystemSettings = () => {
  const context = useContext(SystemSettingsContext);
  if (!context) {
    throw new Error('useSystemSettings must be used within a SystemSettingsProvider');
  }
  return context;
};

export const SystemSettingsProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [systemSettings, setSystemSettings] = useState({
    systemName: 'TherapEase',
    sessionTimeout: 30,
    maintenanceMode: false,
    maintenanceDuration: '2 hours'
  });

  // Only fetch system settings for admin users
  const shouldFetchSettings = user?.role === 'admin';
  
  // Check if token is available before making requests (must be boolean)
  const hasToken = Boolean(typeof window !== 'undefined' && localStorage.getItem('token'));

  // Fetch system settings (only for admin users)
  const { data: settingsData, isLoading, error, refetch } = useQuery(
    'systemSettings',
    adminAPI.getSystemSettings,
    {
      enabled: shouldFetchSettings && hasToken, // Only fetch if user is admin AND token exists (both must be boolean)
      onSuccess: (data) => {
        if (data?.data?.general) {
          const newSettings = {
            systemName: data.data.general.systemName || 'TherapEase',
            sessionTimeout: data.data.general.sessionTimeout || 30,
            maintenanceMode: data.data.general.maintenanceMode || false,
            maintenanceDuration: data.data.general.maintenanceDuration || '2 hours'
          };
          setSystemSettings(prev => ({
            ...prev,
            ...newSettings
          }));
        }
      },
      onError: (error) => {
        // Handle 403 Forbidden errors gracefully for non-admin users
        if (error?.response?.status === 403) {
          console.log('System settings not accessible for this user role - using defaults');
          // Keep default values for non-admin users
        } else {
          console.error('Error fetching system settings:', error);
        }
      },
      staleTime: 30 * 1000, // 30 seconds - reasonable cache time for system settings
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: true, // Refetch when window gains focus
      retry: false, // Don't retry on error to avoid repeated 403 errors
      retryOnMount: false // Don't retry when component mounts
    }
  );


  // Function to refresh system settings
  const refreshSystemSettings = async () => {
    await queryClient.invalidateQueries('systemSettings');
    await refetch();
  };

  // Function to directly update system settings (for immediate updates)
  const updateSystemSettings = (newSettings) => {
    setSystemSettings(prev => ({
      ...prev,
      ...newSettings
    }));
  };

  const value = {
    systemSettings,
    isLoading,
    error,
    systemName: systemSettings.systemName,
    sessionTimeout: systemSettings.sessionTimeout,
    maintenanceMode: systemSettings.maintenanceMode,
    refreshSystemSettings,
    updateSystemSettings
  };

  return (
    <SystemSettingsContext.Provider value={value}>
      {children}
    </SystemSettingsContext.Provider>
  );
};
