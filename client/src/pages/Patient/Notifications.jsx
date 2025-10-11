import React, { useState } from 'react';
import { Bell, Calendar, User, FileText, Target, AlertCircle, CheckCircle, Info, Clock, X, Loader2, MessageSquare } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';

const Notifications = () => {
  const [selectedNotification, setSelectedNotification] = useState(null);
  
  const {
    notifications,
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
    isMarkingAsRead,
    isDeleting,
    isDeletingAll
  } = useNotifications();

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

  const getActionButton = (notification) => {
    // Generate action button based on notification type
    switch (notification.type) {
      case 'appointment':
        return (
          <button
            onClick={() => {
              // Navigate to appointments page
              window.location.href = '/patient/appointments';
            }}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Calendar className="h-3 w-3 mr-1" />
            View Appointment
          </button>
        );
      case 'assessment':
        return (
          <button
            onClick={() => {
              // Navigate to progress page instead
              window.location.href = '/patient/progress';
            }}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <FileText className="h-3 w-3 mr-1" />
            View Assessment
          </button>
        );
      case 'progress':
        return (
          <button
            onClick={() => {
              // Navigate to progress page
              window.location.href = '/patient/progress';
            }}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-orange-700 bg-orange-100 hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            <Target className="h-3 w-3 mr-1" />
            View Progress
          </button>
        );
      case 'note':
        return (
          <button
            onClick={() => {
              // Navigate to daily notes page
              window.location.href = '/patient/daily-notes';
            }}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-purple-700 bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            <FileText className="h-3 w-3 mr-1" />
            View Notes
          </button>
        );
      case 'exercise':
        return (
          <button
            onClick={() => {
              // Navigate to exercises page
              window.location.href = '/patient/exercises';
            }}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Target className="h-3 w-3 mr-1" />
            View Exercises
          </button>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const getNotificationPriority = (type) => {
    switch (type) {
      case 'appointment':
        return 'high';
      case 'assessment':
        return 'high';
      case 'progress':
        return 'medium';
      case 'note':
        return 'medium';
      case 'exercise':
        return 'low';
      case 'system':
        return 'low';
      default:
        return 'low';
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

  const filteredNotifications = notifications
    .map(notification => ({
      ...notification,
      priority: getNotificationPriority(notification.type)
    }))
    .filter(notification => {
      if (filter === 'unread') return !notification.isRead;
      if (filter === 'read') return notification.isRead;
      return true;
    });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-gray-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Notifications</h3>
          <p className="text-gray-600 mb-4">{error.message || 'Failed to load notifications'}</p>
          <button
            onClick={refreshNotifications}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Try Again
          </button>
        </div>
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
          {stats.unreadCount > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              {stats.unreadCount} unread
            </span>
          )}
          <button
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAsRead}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isMarkingAsRead ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Marking...
              </>
            ) : (
              'Mark all as read'
            )}
          </button>
          {notifications.length > 0 && (
            <button
              onClick={handleDeleteAll}
              disabled={isDeletingAll}
              className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {isDeletingAll ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Delete All
                </>
              )}
            </button>
          )}
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
            All ({stats.total})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              filter === 'unread'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Unread ({stats.unreadCount})
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              filter === 'read'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Read ({stats.total - stats.unreadCount})
          </button>
        </nav>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length > 0 ? (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => {
                setSelectedNotification(notification);
                // Mark as read when clicked
                if (!notification.isRead) {
                  handleMarkAsRead(notification.id);
                }
              }}
              className={`border-l-4 ${getPriorityColor(notification.priority)} shadow rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                !notification.isRead ? 'ring-2 ring-green-100 bg-green-50' : 'bg-white'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="flex-shrink-0">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      notification.isRead ? 'bg-gray-100' : 'bg-green-100'
                    }`}>
                      {getTypeIcon(notification.type)}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2 mb-1">
                      <h3 className={`text-sm font-medium ${
                        notification.isRead ? 'text-gray-900' : 'text-green-900'
                      }`}>
                        {notification.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(notification.type)}`}>
                          {notification.type}
                        </span>
                        {getPriorityIcon(notification.priority)}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      {notification.message}
                    </p>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-gray-500">
                      <span>{notification.date} at {notification.time}</span>
                      {!notification.isRead && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          New
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2 sm:ml-4">
                  {/* Generate action button based on notification type */}
                  {getActionButton(notification)}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering the card click
                      if (window.confirm('Are you sure you want to delete this notification?')) {
                        handleDelete(notification.id);
                      }
                    }}
                    disabled={isDeleting}
                    className="inline-flex items-center justify-center px-3 py-2 border border-red-200 text-xs font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed touch-target"
                    title="Delete notification"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <X className="h-4 w-4 mr-2" />
                    )}
                    Delete
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

      {/* Notification Details Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
              {/* Modern Gradient Header */}
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Bell className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">{selectedNotification.title}</h3>
                      <p className="text-white/90 mt-1">Notification Details</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedNotification(null)}
                    className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all duration-200"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              <div className="p-8">
            
                {/* Message Section */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <MessageSquare className="h-5 w-5 text-indigo-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">Message</h4>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{selectedNotification.message}</p>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900">Type</h4>
                    </div>
                    <p className="text-gray-700 capitalize font-medium">{selectedNotification.type}</p>
                  </div>
                  
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900">Priority</h4>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      selectedNotification.priority === 'high' ? 'bg-red-100 text-red-800' :
                      selectedNotification.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {selectedNotification.priority}
                    </span>
                  </div>
                  
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Clock className="h-5 w-5 text-purple-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900">Date & Time</h4>
                    </div>
                    <p className="text-gray-700 font-medium">{selectedNotification.date} at {selectedNotification.time}</p>
                  </div>
                  
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900">Status</h4>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      selectedNotification.isRead 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {selectedNotification.isRead ? 'Read' : 'Unread'}
                    </span>
                  </div>
                </div>
            
                {/* Modern Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this notification?')) {
                        handleDelete(selectedNotification.id);
                        setSelectedNotification(null);
                      }
                    }}
                    className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
                  >
                    <X className="h-5 w-5 mr-2" />
                    Delete
                  </button>
                  <button
                    onClick={() => setSelectedNotification(null)}
                    className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
