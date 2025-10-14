import React, { useState } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationList from '../../components/NotificationList';
import NotificationModal from '../../components/NotificationModal';

const Notifications = () => {
  const [selectedNotification, setSelectedNotification] = useState(null);
  
  const {
    notifications,
    isLoading,
    error,
    stats,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    refreshNotifications,
    isMarkingAsRead,
    isDeleting,
    isDeletingAll
  } = useNotifications();

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
    if (window.confirm('Are you sure you want to delete all notifications? This action cannot be undone.')) {
      deleteAllNotifications();
    }
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
        isMarkingAsRead={isMarkingAsRead}
        isDeleting={isDeleting}
        isDeletingAll={isDeletingAll}
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
    </div>
  );
};

export default Notifications;
