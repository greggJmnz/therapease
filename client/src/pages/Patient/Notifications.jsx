import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { patientAPI } from '../../services/api';
import NotificationList from '../../components/NotificationList';
import NotificationModal from '../../components/NotificationModal';
import ConfirmationModal from '../../components/ConfirmationModal';

const Notifications = () => {
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch notifications using patient API (matching admin pattern)
  const {
    data: notificationsData,
    isLoading,
    error,
    refetch
  } = useQuery(
    'patientNotifications',
    patientAPI.getNotifications,
    {
      refetchOnWindowFocus: false,
      staleTime: 300000, // 5 minutes - match admin
      cacheTime: 600000, // 10 minutes
      refetchInterval: false, // Disable automatic refetching
    }
  );

  // Format notifications for display (matching admin pattern)
  const notifications = notificationsData?.data?.data?.notifications?.map(notification => {
    const formatted = {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      priority: notification.priority || 'medium',
      isRead: notification.read === true || notification.isRead === 1 || notification.isRead === true,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
      date: notification.date,
      time: notification.time,
      timeAgo: notification.timeAgo || 'Just now'
    };
    return formatted;
  }) || [];

  // Calculate stats from notifications data
  const stats = {
    total: notificationsData?.data?.data?.total || notifications.length || 0,
    unreadCount: notificationsData?.data?.data?.unreadCount || notifications.filter(n => !n.isRead).length || 0,
    page: notificationsData?.data?.data?.page || 1,
    totalPages: notificationsData?.data?.data?.totalPages || 1
  };

  // Mark as read mutation (matching admin pattern)
  const markAsReadMutation = useMutation(
    (notificationId) => {
      // Use patient-specific endpoint - we'll need to add markAsRead to patientAPI
      // For now, use notificationService which has the role-based logic
      const notificationService = require('../../services/notificationService').default;
      return notificationService.markAsRead(notificationId);
    },
    {
      onSuccess: (data, notificationId) => {
        // Update the notification state optimistically
        queryClient.setQueryData('patientNotifications', (oldData) => {
          if (!oldData?.data?.data?.notifications) return oldData;
          
          const updatedNotifications = oldData.data.data.notifications.map(notification => {
            if (notification.id === notificationId) {
              return { ...notification, read: true, isRead: 1 };
            }
            return notification;
          });
          
          return {
            ...oldData,
            data: {
              ...oldData.data,
              data: {
                ...oldData.data.data,
                notifications: updatedNotifications
              }
            }
          };
        });
      },
      onError: (error) => {
        console.error('Error marking notification as read:', error);
        queryClient.invalidateQueries('patientNotifications');
      }
    }
  );

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation(
    () => {
      const notificationService = require('../../services/notificationService').default;
      return notificationService.markAllAsRead();
    },
    {
      onSuccess: (data) => {
        queryClient.setQueryData('patientNotifications', (oldData) => {
          if (!oldData?.data?.data?.notifications) return oldData;
          
          const updatedNotifications = oldData.data.data.notifications.map(notification => ({
            ...notification,
            read: true,
            isRead: 1
          }));
          
          return {
            ...oldData,
            data: {
              ...oldData.data,
              data: {
                ...oldData.data.data,
                notifications: updatedNotifications
              }
            }
          };
        });
      },
      onError: (error) => {
        console.error('Error marking all notifications as read:', error);
        queryClient.invalidateQueries('patientNotifications');
      }
    }
  );

  // Delete notification mutation
  const deleteNotificationMutation = useMutation(
    (notificationId) => {
      const notificationService = require('../../services/notificationService').default;
      return notificationService.deleteNotification(notificationId);
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('patientNotifications');
      },
      onError: (error) => {
        console.error('Error deleting notification:', error);
      }
    }
  );

  // Actions (matching admin pattern)
  const markAsRead = (notificationId) => {
    markAsReadMutation.mutate(notificationId);
  };

  const markAllAsRead = () => {
    queryClient.setQueryData('patientNotifications', (oldData) => {
      if (!oldData?.data?.data?.notifications) {
        return oldData;
      }
      
      const updatedNotifications = oldData.data.data.notifications.map(notification => ({
        ...notification,
        read: true,
        isRead: 1
      }));
      
      return {
        ...oldData,
        data: {
          ...oldData.data,
          data: {
            ...oldData.data.data,
            notifications: updatedNotifications
          }
        }
      };
    });
    
    markAllAsReadMutation.mutate();
  };

  const deleteNotification = (notificationId) => {
    deleteNotificationMutation.mutate(notificationId);
  };

  const deleteAllNotifications = () => {
    setShowDeleteAllModal(true);
  };

  const confirmDeleteAll = () => {
    notifications.forEach(notification => {
      deleteNotificationMutation.mutate(notification.id);
    });
    setShowDeleteAllModal(false);
  };

  const refreshNotifications = () => {
    refetch();
  };

  const handleMarkAsRead = (notificationId) => {
    markAsRead(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const handleDelete = (notificationId) => {
    deleteNotification(notificationId);
  };

  const handleDeleteAll = () => {
    deleteAllNotifications();
  };

  const handleViewDetails = (notification) => {
    setSelectedNotification(notification);
  };

  const handleViewAppointment = (notification) => {
    setSelectedNotification(null);
    window.location.href = '/patient/appointments';
  };

  return (
    <div className="space-y-6">
      <NotificationList
        notifications={notifications}
        isLoading={isLoading}
        error={error}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
        onDelete={handleDelete}
        onDeleteAll={handleDeleteAll}
        onRefresh={refreshNotifications}
        onViewDetails={handleViewDetails}
        title="Notifications"
        subtitle="Stay updated with your therapy progress and important updates"
        showFilters={true}
        showBulkActions={true}
        isMarkingAsRead={markAsReadMutation.isLoading}
        isDeleting={deleteNotificationMutation.isLoading}
        isDeletingAll={false}
      />

      {/* Notification Details Modal */}
      {selectedNotification && (
        <NotificationModal
          notification={selectedNotification}
          onClose={() => setSelectedNotification(null)}
          onDelete={handleDelete}
          onMarkAsRead={handleMarkAsRead}
          onViewAppointment={handleViewAppointment}
          isDeleting={isDeleting}
        />
      )}
      
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteAllModal}
        onClose={() => setShowDeleteAllModal(false)}
        onConfirm={confirmDeleteAll}
        title="Delete All Notifications"
        message="Are you sure you want to delete all notifications? This action cannot be undone."
        confirmText="Delete All"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default Notifications;
