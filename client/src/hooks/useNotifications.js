import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import notificationService from '../services/notificationService';
import { patientAPI, therapistAPI, adminAPI } from '../services/api';
import { useWebSocketEvent } from './useWebSocket';

// Get the appropriate API instance based on user role
const getNotificationsAPI = () => {
  const role = localStorage.getItem('userRole') || '';
  if (role === 'admin') {
    return adminAPI.getNotifications;
  } else if (role === 'therapist') {
    return therapistAPI.getNotifications;
  } else if (role === 'patient') {
    return patientAPI.getNotifications;
  }
  // Fallback to notificationService for unknown roles
  return () => notificationService.getNotifications({});
};

export const useNotifications = (options = {}) => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState(options.filter || 'all');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch notifications using role-specific API
  const {
    data: notificationsData,
    isLoading,
    error,
    refetch
  } = useQuery(
    ['notifications', filter, searchTerm, options.page, options.limit],
    () => {
      const apiMethod = getNotificationsAPI();
      // For role-specific APIs, they don't accept query params directly
      // So we need to use notificationService for filtered queries
      if (filter !== 'all' || options.page || options.limit) {
        return notificationService.getNotifications({
          ...options,
          isRead: filter === 'unread' ? false : filter === 'read' ? true : undefined
        });
      }
      // Use role-specific API for simple queries
      return apiMethod();
    },
    {
      refetchOnWindowFocus: false,
      staleTime: 30000, // 30 seconds
      cacheTime: 300000, // 5 minutes
    }
  );

  // Mark as read mutation
  const markAsReadMutation = useMutation(
    (notificationId) => notificationService.markAsRead(notificationId),
    {
      onSuccess: (data, notificationId) => {
        // Update the notification state optimistically
        queryClient.setQueryData(['notifications', filter, searchTerm, options.page, options.limit], (oldData) => {
          if (!oldData?.data?.notifications) return oldData;
          
          const updatedNotifications = oldData.data.notifications.map(notification => {
            if (notification.id === notificationId) {
              return { ...notification, isRead: true };
            }
            return notification;
          });
          
          return {
            ...oldData,
            data: {
              ...oldData.data,
              notifications: updatedNotifications
            }
          };
        });
        // Don't invalidate queries to avoid refetching and losing optimistic updates
      },
      onError: (error) => {
        console.error('Error marking notification as read:', error);
        // Revert optimistic update on error
        queryClient.invalidateQueries('notifications');
      }
    }
  );

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation(
    () => notificationService.markAllAsRead(),
    {
      onSuccess: (data) => {
        // Update all notifications to read state optimistically
        queryClient.setQueryData(['notifications', filter, searchTerm, options.page, options.limit], (oldData) => {
          if (!oldData?.data?.notifications) return oldData;
          
          const updatedNotifications = oldData.data.notifications.map(notification => ({
            ...notification,
            isRead: true
          }));
          
          return {
            ...oldData,
            data: {
              ...oldData.data,
              notifications: updatedNotifications
            }
          };
        });
        // Don't invalidate queries to avoid refetching and losing optimistic updates
      },
      onError: (error) => {
        console.error('Error marking all notifications as read:', error);
        // Revert optimistic update on error
        queryClient.invalidateQueries('notifications');
      }
    }
  );

  // Delete notification mutation
  const deleteNotificationMutation = useMutation(
    (notificationId) => notificationService.deleteNotification(notificationId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('notifications');
      }
    }
  );

  // Delete all notifications mutation
  const deleteAllNotificationsMutation = useMutation(
    () => notificationService.deleteAllNotifications(),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('notifications');
      }
    }
  );

  // Listen for real-time notifications
  useWebSocketEvent('notification', (data) => {
    // Invalidate and refetch notifications when new one arrives
    queryClient.invalidateQueries('notifications');
  });

  // Format notifications for display
  const notifications = notificationsData?.data?.notifications?.map(notification => 
    notificationService.formatNotification(notification)
  ) || [];

  // Filter notifications by search term
  const filteredNotifications = notifications.filter(notification => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      notification.title.toLowerCase().includes(searchLower) ||
      notification.message.toLowerCase().includes(searchLower) ||
      notification.type.toLowerCase().includes(searchLower)
    );
  });

  // Get statistics
  const stats = {
    total: notificationsData?.data?.total || 0,
    unreadCount: notificationsData?.data?.unreadCount || 0,
    page: notificationsData?.data?.page || 1,
    totalPages: notificationsData?.data?.totalPages || 1
  };

  // Actions
  const markAsRead = useCallback((notificationId) => {
    markAsReadMutation.mutate(notificationId);
  }, [markAsReadMutation]);

  const markAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);

  const deleteNotification = useCallback((notificationId) => {
    deleteNotificationMutation.mutate(notificationId);
  }, [deleteNotificationMutation]);

  const deleteAllNotifications = useCallback(() => {
    deleteAllNotificationsMutation.mutate();
  }, [deleteAllNotificationsMutation]);

  const refreshNotifications = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    notifications: filteredNotifications,
    isLoading,
    error,
    stats,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    refreshNotifications,
    isMarkingAsRead: markAsReadMutation.isLoading,
    isMarkingAllAsRead: markAllAsReadMutation.isLoading,
    isDeleting: deleteNotificationMutation.isLoading,
    isDeletingAll: deleteAllNotificationsMutation.isLoading
  };
};

export const useNotificationStats = () => {
  const getStatsAPI = () => {
    const role = localStorage.getItem('userRole') || '';
    // For stats, we can use notificationService as it handles role-specific endpoints correctly
    return () => notificationService.getNotificationStats();
  };

  const {
    data: statsData,
    isLoading,
    error
  } = useQuery(
    'notificationStats',
    getStatsAPI(),
    {
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1 minute
    }
  );

  // Map the response data to ensure unreadCount is available
  const stats = statsData?.data || {};
  const mappedStats = {
    ...stats,
    unreadCount: stats.unreadCount || stats.unread || 0
  };

  return {
    stats: mappedStats,
    isLoading,
    error
  };
};

export default useNotifications;
