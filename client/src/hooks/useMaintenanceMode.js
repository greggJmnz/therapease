import { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { adminAPI } from '../services/api';

export const useMaintenanceMode = () => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');

  // OPTIMIZED: Query to get maintenance status (public endpoint)
  // Don't block login - assume no maintenance if query fails
  const { isLoading, error } = useQuery(
    'maintenanceStatus',
    adminAPI.getMaintenanceStatus,
    {
      refetchInterval: 300000, // Refetch every 5 minutes (reduced frequency to reduce server load)
      refetchOnWindowFocus: false, // Don't refetch on window focus to reduce requests
      staleTime: 300000, // Consider data fresh for 5 minutes
      cacheTime: 600000, // Keep in cache for 10 minutes
      retry: false, // OPTIMIZED: Don't retry - if it fails, assume no maintenance (don't block login)
      retryDelay: 0, // Don't wait for retry
      refetchOnMount: false, // Don't refetch on mount - use cached data
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
        // OPTIMIZED: If we can't fetch maintenance status, assume maintenance mode is off
        // This prevents blocking login if the API is slow or unavailable
        setIsMaintenanceMode(false);
        setMaintenanceMessage('');
      }
    }
  );

  // Check for maintenance mode in API responses
  useEffect(() => {
    const handleApiError = (error) => {
      if (error?.response?.status === 503 && error?.response?.data?.maintenanceMode) {
        setIsMaintenanceMode(true);
        setMaintenanceMessage(error.response.data.message || 'System is currently under maintenance. Please try again later.');
      }
    };

    // Add global error handler for maintenance mode
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (response.status === 503) {
          const data = await response.json();
          if (data.maintenanceMode) {
            setIsMaintenanceMode(true);
            setMaintenanceMessage(data.message || 'System is currently under maintenance. Please try again later.');
          }
        }
        return response;
      } catch (error) {
        handleApiError(error);
        throw error;
      }
    };

    return () => {
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
