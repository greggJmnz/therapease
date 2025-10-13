import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { adminAPI } from '../services/api';

const SystemSettingsContext = createContext();

export const useSystemSettings = () => {
  const context = useContext(SystemSettingsContext);
  if (!context) {
    throw new Error('useSystemSettings must be used within a SystemSettingsProvider');
  }
  return context;
};

export const SystemSettingsProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const [systemSettings, setSystemSettings] = useState({
    systemName: 'TherapEase',
    sessionTimeout: 30,
    maintenanceMode: false
  });

  // Fetch system settings
  const { data: settingsData, isLoading, error, refetch } = useQuery(
    'systemSettings',
    adminAPI.getSystemSettings,
    {
      onSuccess: (data) => {
        if (data?.data?.general) {
          const newSettings = {
            systemName: data.data.general.systemName || 'TherapEase',
            sessionTimeout: data.data.general.sessionTimeout || 30,
            maintenanceMode: data.data.general.maintenanceMode || false
          };
          setSystemSettings(prev => ({
            ...prev,
            ...newSettings
          }));
        }
      },
      onError: (error) => {
        console.error('Error fetching system settings:', error);
        // Keep default values on error
      },
      staleTime: 30 * 1000, // 30 seconds - reasonable cache time for system settings
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: true, // Refetch when window gains focus
      retry: 1
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
