import React, { useState, useEffect } from 'react';
import { Bell, Calendar, User, FileText, Target, AlertCircle, CheckCircle, Info, Clock, X } from 'lucide-react';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read

  useEffect(() => {
    // Fetch notifications data
    const fetchNotifications = async () => {
      try {
        // This will be implemented with actual API calls
        // For now, using mock data
        setNotifications([
          {
            id: 1,
            type: 'appointment',
            title: 'Appointment Reminder',
            message: 'Your therapy session is scheduled for tomorrow at 9:00 AM with Dr. Sarah Wilson.',
            date: '2024-01-19T10:00:00Z',
            isRead: false,
            priority: 'high',
            action: 'View Appointment',
            actionUrl: '/appointments'
          },
          {
            id: 2,
            type: 'assessment',
            title: 'New Assessment Available',
            message: 'A new progress assessment has been scheduled for next week. Please review your goals.',
            date: '2024-01-18T14:30:00Z',
            isRead: false,
            priority: 'medium',
            action: 'View Assessment',
            actionUrl: '/assessments'
          },
          {
            id: 3,
            type: 'note',
            title: 'New Therapy Note',
            message: 'Dr. Sarah Wilson has added a new note from your recent session. Review the progress and recommendations.',
            date: '2024-01-17T16:45:00Z',
            isRead: true,
            priority: 'medium',
            action: 'View Note',
            actionUrl: '/daily-notes'
          },
          {
            id: 4,
            type: 'progress',
            title: 'Progress Update',
            message: 'Great news! You\'ve achieved 3 new milestones this month. Check your progress dashboard.',
            date: '2024-01-16T09:15:00Z',
            isRead: true,
            priority: 'low',
            action: 'View Progress',
            actionUrl: '/progress'
          },
          {
            id: 5,
            type: 'exercise',
            title: 'Home Exercise Reminder',
            message: 'Don\'t forget to complete your daily home exercises. Consistency is key to progress!',
            date: '2024-01-15T08:00:00Z',
            isRead: true,
            priority: 'medium',
            action: 'View Exercises',
            actionUrl: '/exercises'
          },
          {
            id: 6,
            type: 'system',
            title: 'System Maintenance',
            message: 'TherapEase will be undergoing scheduled maintenance tonight from 2:00 AM to 4:00 AM EST.',
            date: '2024-01-14T12:00:00Z',
            isRead: true,
            priority: 'low',
            action: null,
            actionUrl: null
          }
        ]);

        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const getTypeIcon = (type) => {
    switch (type) {
      case 'appointment':
        return <Calendar className="h-5 w-5 text-blue-600" />;
      case 'assessment':
        return <FileText className="h-5 w-5 text-green-600" />;
      case 'note':
        return <FileText className="h-5 w-5 text-purple-600" />;
      case 'progress':
        return <Target className="h-5 w-5 text-orange-600" />;
      case 'exercise':
        return <Target className="h-5 w-5 text-indigo-600" />;
      case 'system':
        return <Info className="h-5 w-5 text-gray-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'appointment':
        return 'bg-blue-100 text-blue-800';
      case 'assessment':
        return 'bg-green-100 text-green-800';
      case 'note':
        return 'bg-purple-100 text-purple-800';
      case 'progress':
        return 'bg-orange-100 text-orange-800';
      case 'exercise':
        return 'bg-indigo-100 text-indigo-800';
      case 'system':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500';
      case 'medium':
        return 'border-l-yellow-500';
      case 'low':
        return 'border-l-blue-500';
      default:
        return 'border-l-gray-500';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays === 0) return 'Today';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  };

  const markAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, isRead: true }
          : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, isRead: true }))
    );
  };

  const deleteNotification = (notificationId) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.isRead;
    if (filter === 'read') return notification.isRead;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="mt-2 text-sm text-gray-700">
            Stay updated with your therapy progress and important updates
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {unreadCount > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              {unreadCount} unread
            </span>
          )}
          <button
            onClick={markAllAsRead}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Mark all as read
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setFilter('all')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              filter === 'all'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              filter === 'unread'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              filter === 'read'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Read ({notifications.filter(n => n.isRead).length})
          </button>
        </nav>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length > 0 ? (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white border-l-4 ${getPriorityColor(notification.priority)} shadow rounded-lg p-4 ${
                !notification.isRead ? 'ring-2 ring-blue-100' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="flex-shrink-0">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      notification.isRead ? 'bg-gray-100' : 'bg-blue-100'
                    }`}>
                      {getTypeIcon(notification.type)}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className={`text-sm font-medium ${
                        notification.isRead ? 'text-gray-900' : 'text-blue-900'
                      }`}>
                        {notification.title}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(notification.type)}`}>
                        {notification.type}
                      </span>
                      {getPriorityIcon(notification.priority)}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>{formatDate(notification.date)}</span>
                      {!notification.isRead && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          New
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  {notification.action && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {notification.action}
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Bell className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {filter === 'all' ? 'No notifications' : `No ${filter} notifications`}
          </h3>
          <p className="text-sm text-gray-500">
            {filter === 'all' 
              ? 'You\'re all caught up! Check back later for updates.'
              : filter === 'unread'
              ? 'You have no unread notifications.'
              : 'You have no read notifications.'
            }
          </p>
        </div>
      )}

      {/* Notification Settings Info */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <div className="flex items-center">
              <Calendar className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Appointments</h4>
                <p className="text-xs text-gray-500">Reminders and schedule updates</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <div className="flex items-center">
              <FileText className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Progress Updates</h4>
                <p className="text-xs text-gray-500">Assessment results and milestones</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <div className="flex items-center">
              <Target className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Home Exercises</h4>
                <p className="text-xs text-gray-500">Daily reminders and updates</p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 text-center">
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            Manage notification preferences →
          </button>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
