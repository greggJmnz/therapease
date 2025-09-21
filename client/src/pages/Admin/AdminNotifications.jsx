import React, { useState } from 'react';
import { 
  Bell,
  Eye,
  CheckCircle,
  X,
  Trash2,
  AlertCircle,
  Info,
  Calendar,
  FileText,
  Target,
  User,
  Loader2
} from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';

const AdminNotifications = () => {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

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
  } = useNotifications({ filter });

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
            {stats?.unreadCount || 0} unread
          </span>
          <button 
            className="btn-secondary" 
            onClick={markAllAsRead}
            disabled={isMarkingAsRead}
          >
            {isMarkingAsRead ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle size={16} />}
            Mark All Read
          </button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <Bell className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Notifications</option>
            <option value="unread">Unread Only</option>
            <option value="read">Read Only</option>
          </select>
        </div>
      </div>

      <div className="notifications-list">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2">Loading notifications...</span>
          </div>
        ) : filteredNotifications.map(notification => (
          <div key={notification.id} className={`notification-card ${notification.priority || 'medium'} ${!notification.isRead ? 'unread' : ''}`}>
            <div className="notification-icon">
              {notification.type === 'appointment' && <Calendar size={20} />}
              {notification.type === 'assessment' && <FileText size={20} />}
              {notification.type === 'progress' && <Target size={20} />}
              {notification.type === 'system' && <Info size={20} />}
              {!['appointment', 'assessment', 'progress', 'system'].includes(notification.type) && <Bell size={20} />}
            </div>
            <div className="notification-content">
              <h4>{notification.title}</h4>
              <p>{notification.message}</p>
              <div className="notification-meta">
                <span className="time">{notification.timeAgo}</span>
                <span className={`priority-badge ${notification.priority || 'medium'}`}>
                  {notification.priority || 'medium'}
                </span>
                <span className="type-badge">
                  {notification.type}
                </span>
              </div>
            </div>
            <div className="notification-actions">
              {!notification.isRead && (
                <button 
                  className="mark-read-btn" 
                  onClick={() => markAsRead(notification.id)}
                  disabled={isMarkingAsRead}
                >
                  {isMarkingAsRead ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle size={16} />}
                  Mark Read
                </button>
              )}
              <button 
                className="action-btn delete-btn" 
                onClick={() => deleteNotification(notification.id)}
                disabled={isDeleting}
                title="Delete notification"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 size={16} />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {!isLoading && filteredNotifications.length === 0 && (
        <div className="empty-state">
          <Bell size={48} className="empty-icon" />
          <h3>No notifications</h3>
          <p>
            {searchTerm 
              ? `No notifications found matching "${searchTerm}"`
              : "You're all caught up! No new notifications at the moment."
            }
          </p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <AlertCircle size={48} className="error-icon" />
          <h3>Error loading notifications</h3>
          <p>Please try refreshing the page.</p>
          <button onClick={refreshNotifications} className="btn-primary">
            Refresh
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminNotifications;
