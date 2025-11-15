import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { therapistAPI } from '../../services/api';
import NotificationList from '../../components/NotificationList';
import NotificationModal from '../../components/NotificationModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import notificationService from '../../services/notificationService';

const TherapistNotifications = () => {
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch notifications using therapist API (matching admin pattern)
  const {
    data: notificationsData,
    isLoading,
    error,
    refetch
  } = useQuery(
    'therapistNotifications',
    therapistAPI.getNotifications,
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
      return notificationService.markAsRead(notificationId);
    },
    {
      onSuccess: (data, notificationId) => {
        queryClient.setQueryData('therapistNotifications', (oldData) => {
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
        queryClient.invalidateQueries('therapistNotifications');
      }
    }
  );

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation(
    () => {
      return notificationService.markAllAsRead();
    },
    {
      onSuccess: (data) => {
        queryClient.setQueryData('therapistNotifications', (oldData) => {
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
        queryClient.invalidateQueries('therapistNotifications');
      }
    }
  );

  // Delete notification mutation
  const deleteNotificationMutation = useMutation(
    (notificationId) => {
      return notificationService.deleteNotification(notificationId);
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('therapistNotifications');
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
    queryClient.setQueryData('therapistNotifications', (oldData) => {
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
    navigate('/therapist/schedule');
  };

  const handleScheduleAssessment = async (notification) => {
    setSelectedNotification(null);
    
    // Try to extract patient name from notification message
    // Message format: "You have been assigned a new patient: [Patient Name]"
    // or "Please schedule an initial assessment for your new patient: [Patient Name]"
    let patientName = null;
    const message = notification.message || '';
    const match = message.match(/patient:\s*([^\.]+)/i) || message.match(/patient\s+([^:\.]+)/i);
    if (match && match[1]) {
      patientName = match[1].trim();
    }
    
    // Navigate to schedule page with patient name in state
    // The schedule page will handle opening the create appointment modal
    navigate('/therapist/schedule', {
      state: {
        mode: 'schedule',
        patientName: patientName,
        appointmentType: 'assessment'
      }
    });
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
        subtitle="Stay updated with important alerts, reminders, and patient updates"
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
          onScheduleAssessment={handleScheduleAssessment}
          isDeleting={deleteNotificationMutation.isLoading}
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

export default TherapistNotifications;