import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationList from '../../components/NotificationList';
import NotificationModal from '../../components/NotificationModal';

const TherapistNotifications = () => {
  const [selectedNotification, setSelectedNotification] = useState(null);
  const navigate = useNavigate();

  const {
    notifications,
    isLoading,
    error,
    stats,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
    isMarkingAsRead,
    isDeleting
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
      // Delete all notifications one by one
      notifications.forEach(notification => {
        deleteNotification(notification.id);
      });
    }
  };

  const handleViewDetails = (notification) => {
    setSelectedNotification(notification);
  };

  const handleViewAppointment = (notification) => {
    setSelectedNotification(null);
    navigate('/therapist/schedule');
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
        isMarkingAsRead={isMarkingAsRead}
        isDeleting={isDeleting}
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
    </div>
  );
};

export default TherapistNotifications;