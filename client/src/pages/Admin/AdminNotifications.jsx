import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { 
  Bell,
  Eye,
  CheckCircle
} from 'lucide-react';
import { adminAPI } from '../../services/api';

const AdminNotifications = () => {
  // Fetch notifications data from API
  const { data: notificationsData, isLoading, error } = useQuery(
    'adminNotifications',
    adminAPI.getNotifications,
    {
      onError: (error) => {
        console.error('Error fetching notifications:', error);
      }
    }
  );

  // Extract notifications from API response or use default
  const [notifications, setNotifications] = useState(
    notificationsData?.data?.notifications || [
      {
        id: 1,
        type: 'system',
        title: 'System Status',
        message: 'All systems are running normally',
        time: 'Just now',
        priority: 'low',
        read: false
      }
    ]
  );

  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const getUnreadCount = () => {
    return notifications.filter(notification => !notification.read).length;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#10b981] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Failed to load notifications</div>
          <p className="text-gray-600">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-section">
      <div className="section-header">
        <h2>System Notifications</h2>
        <div className="header-actions">
          <span className="unread-count">
            {getUnreadCount()} unread
          </span>
          <button className="btn-secondary" onClick={markAllAsRead}>
            <CheckCircle size={16} />
            Mark All Read
          </button>
        </div>
      </div>

      <div className="notifications-list">
        {notifications.map(notification => (
          <div key={notification.id} className={`notification-card ${notification.priority} ${!notification.read ? 'unread' : ''}`}>
            <div className="notification-icon">
              <Bell size={20} />
            </div>
            <div className="notification-content">
              <h4>{notification.title}</h4>
              <p>{notification.message}</p>
              <div className="notification-meta">
                <span className="time">{notification.time}</span>
                <span className={`priority-badge ${notification.priority}`}>
                  {notification.priority}
                </span>
                <span className="type-badge">
                  {notification.type}
                </span>
              </div>
            </div>
            <div className="notification-actions">
              {!notification.read && (
                <button 
                  className="mark-read-btn" 
                  onClick={() => markAsRead(notification.id)}
                >
                  Mark Read
                </button>
              )}
              <button className="action-btn">
                <Eye size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {notifications.length === 0 && (
        <div className="empty-state">
          <Bell size={48} className="empty-icon" />
          <h3>No notifications</h3>
          <p>You're all caught up! No new notifications at the moment.</p>
        </div>
      )}
    </div>
  );
};

export default AdminNotifications;
