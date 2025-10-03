import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import notificationService from '../services/notificationService';
import { useWebSocketEvent } from './useWebSocket';

export const useNotifications = (options = {}) => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState(options.filter || 'all');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch notifications
  const {
    data: notificationsData,
    isLoading,
    error,
    refetch
  } = useQuery(
    ['notifications', filter, searchTerm, options.page, options.limit],
    () => notificationService.getNotifications({
      ...options,
      isRead: filter === 'unread' ? false : filter === 'read' ? true : undefined
    }),
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
      onSuccess: () => {
        queryClient.invalidateQueries('notifications');
      }
    }
  );

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation(
    () => notificationService.markAllAsRead(),
    {
      onSuccess: () => {
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
  const {
    data: statsData,
    isLoading,
    error
  } = useQuery(
    'notificationStats',
    () => notificationService.getNotificationStats(),
    {
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1 minute
    }
  );

  return {
    stats: statsData?.data || {},
    isLoading,
    error
  };
};

export default useNotifications;
