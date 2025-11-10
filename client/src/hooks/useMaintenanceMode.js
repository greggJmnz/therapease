import { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { adminAPI } from '../services/api';

export const useMaintenanceMode = () => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');

  // Query to get maintenance status (public endpoint)
  const { isLoading, error } = useQuery(
    'maintenanceStatus',
    adminAPI.getMaintenanceStatus,
    {
      refetchInterval: 30000, // Refetch every 30 seconds during maintenance
      refetchOnWindowFocus: true, // Refetch on window focus to catch maintenance changes
      staleTime: 10000, // Consider data fresh for 10 seconds
      cacheTime: 60000, // Keep in cache for 1 minute
      retry: 1, // Retry once if it fails
      retryDelay: 1000, // Wait 1 second before retry
      refetchOnMount: true, // Always check on mount
      onSuccess: (data) => {
        if (data?.data?.maintenanceMode) {
          setIsMaintenanceMode(true);
          setMaintenanceMessage(data.data.message || 'System is currently under maintenance. Please try again later.');
        } else {
          setIsMaintenanceMode(false);
          setMaintenanceMessage('');
        }
      },
      onError: (error) => {
        // If we get a 503 error, it might be maintenance mode
        if (error?.response?.status === 503 && error?.response?.data?.maintenanceMode) {
          setIsMaintenanceMode(true);
          setMaintenanceMessage(error.response.data.message || 'System is currently under maintenance. Please try again later.');
        } else {
          // If it's not a 503 maintenance error, assume no maintenance
          setIsMaintenanceMode(false);
          setMaintenanceMessage('');
        }
      }
    }
  );

  // Check for maintenance mode in API responses and listen for maintenance events
  useEffect(() => {
    // Listen for maintenance mode events from axios interceptor
    const handleMaintenanceEvent = (event) => {
      if (event.detail?.maintenanceMode) {
        setIsMaintenanceMode(true);
        setMaintenanceMessage(event.detail.message || 'System is currently under maintenance. Please try again later.');
      }
    };

    // Listen for maintenance:enabled events
    window.addEventListener('maintenance:enabled', handleMaintenanceEvent);

    // Also check for 503 errors in fetch responses (for non-axios requests)
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (response.status === 503) {
          try {
            const data = await response.json();
            if (data.maintenanceMode) {
              setIsMaintenanceMode(true);
              setMaintenanceMessage(data.message || 'System is currently under maintenance. Please try again later.');
            }
          } catch (e) {
            // If response is not JSON, ignore
          }
        }
        return response;
      } catch (error) {
        // Handle fetch errors
        if (error?.response?.status === 503 && error?.response?.data?.maintenanceMode) {
          setIsMaintenanceMode(true);
          setMaintenanceMessage(error.response.data.message || 'System is currently under maintenance. Please try again later.');
        }
        throw error;
      }
    };

    return () => {
      window.removeEventListener('maintenance:enabled', handleMaintenanceEvent);
      window.fetch = originalFetch;
    };
  }, []);

  return {
    isMaintenanceMode,
    maintenanceMessage,
    isLoading,
    error
  };
};
