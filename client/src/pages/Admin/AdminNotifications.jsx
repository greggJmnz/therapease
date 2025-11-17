import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import NotificationList from '../../components/NotificationList';
import NotificationModal from '../../components/NotificationModal';
import ConfirmationModal from '../../components/ConfirmationModal';

const AdminNotifications = () => {
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch notifications using admin API
  const {
    data: notificationsData,
    isLoading,
    error,
    refetch
  } = useQuery(
    'adminNotifications',
    adminAPI.getNotifications,
    {
      refetchOnWindowFocus: false,
      staleTime: 300000, // 5 minutes - match other queries
      cacheTime: 600000, // 10 minutes
      refetchInterval: false, // Disable automatic refetching
    }
  );

  // Format notifications for display
  const notifications = notificationsData?.data?.data?.notifications.map(notification => {
    const formatted = {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      priority: notification.priority || 'medium',
      isRead: notification.read === true || notification.isRead === 1 || notification.isRead === true,
      user: notification.user,
      relatedId: notification.relatedId || null, // Include relatedId for appointment approvals
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
      date: notification.date,
      time: notification.time,
      timeAgo: notification.timeAgo || 'Just now'
    };
    return formatted;
  }) || [];

  // Mark as read mutation
  const markAsReadMutation = useMutation(
    (notificationId) => adminAPI.markNotificationAsRead(notificationId),
    {
      onSuccess: (data, notificationId) => {
        // Update the notification state optimistically
        queryClient.setQueryData('adminNotifications', (oldData) => {
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
        // Don't invalidate queries to avoid refetching and losing optimistic updates
      },
      onError: (error) => {
        console.error('Error marking notification as read:', error);
        // Revert optimistic update on error
        queryClient.invalidateQueries('adminNotifications');
      }
    }
  );

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation(
    () => adminAPI.markAllNotificationsAsRead(),
    {
      onSuccess: (data) => {
        queryClient.setQueryData('adminNotifications', (oldData) => {
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
        // Don't invalidate queries here to avoid refetching and losing optimistic updates
      },
      onError: (error) => {
        console.error('Error marking all notifications as read:', error);
        // Revert optimistic update on error
        queryClient.invalidateQueries('adminNotifications');
      }
    }
  );

  // Delete notification mutation
  const deleteNotificationMutation = useMutation(
    (notificationId) => adminAPI.deleteNotification(notificationId),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('adminNotifications');
      },
      onError: (error) => {
        console.error('Error deleting notification:', error);
      }
    }
  );

  // Actions
  const markAsRead = (notificationId) => {
    // Call the server mutation
    markAsReadMutation.mutate(notificationId);
  };

  const markAllAsRead = () => {
    queryClient.setQueryData('adminNotifications', (oldData) => {
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

  const confirmDeleteAllNotifications = () => {
    notifications.forEach(notification => {
      deleteNotificationMutation.mutate(notification.id);
    });
    setShowDeleteAllModal(false);
  };

  const refreshNotifications = () => {
    refetch();
  };

  const handleViewDetails = (notification) => {
    setSelectedNotification(notification);
  };

  const handleViewAppointment = (notification) => {
    setSelectedNotification(null);
    navigate('/admin/appointments');
  };

  // Navigate to assign therapist modal in patient management
  const handleAssignTherapist = (notification) => {
    if (!notification.relatedId) {
      toast.error('Patient ID not found');
      return;
    }
    
    setSelectedNotification(null);
    // Navigate to patient management with assignPatientId param
    navigate(`/admin/patients?assignPatientId=${notification.relatedId}`);
  };

  // Approve appointment from notification
  const handleApproveAppointment = async (notification) => {
    if (!notification.relatedId) {
      toast.error('Appointment ID not found');
      return;
    }

    try {
      await adminAPI.approveAppointment(notification.relatedId);
      toast.success('Appointment approved successfully');
      setSelectedNotification(null);
      // Refetch notifications to update the list
      refetch();
      // Invalidate appointments cache so the appointments list updates
      queryClient.invalidateQueries('adminAppointments');
    } catch (error) {
      console.error('Error approving appointment:', error);
      toast.error(error.response?.data?.error || 'Failed to approve appointment');
    }
  };

  return (
    <div className="space-y-6">
      <NotificationList
        notifications={notifications}
        isLoading={isLoading}
        error={error}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onDelete={deleteNotification}
        onDeleteAll={deleteAllNotifications}
        onRefresh={refreshNotifications}
        onViewDetails={handleViewDetails}
        title="System Notifications"
        subtitle="Administrative alerts and system updates"
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
          onDelete={deleteNotification}
          onMarkAsRead={markAsRead}
          onViewAppointment={handleViewAppointment}
          onApproveAppointment={handleApproveAppointment}
          onAssignTherapist={handleAssignTherapist}
          isDeleting={deleteNotificationMutation.isLoading}
        />
      )}
      
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteAllModal}
        onClose={() => setShowDeleteAllModal(false)}
        onConfirm={confirmDeleteAllNotifications}
        title="Delete All Notifications"
        message="Are you sure you want to delete all notifications? This action cannot be undone."
        confirmText="Delete All"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default AdminNotifications;