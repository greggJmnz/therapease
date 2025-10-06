import React, { useState, useEffect } from 'react';
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
  Loader2,
  Search,
  Clock,
  ExternalLink
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../services/api';

const AdminNotifications = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format Philippine time
  const formatPhilippineTime = (date) => {
    return date.toLocaleString('en-US', {
      timeZone: 'Asia/Manila',
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

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
      staleTime: 30000, // 30 seconds
      cacheTime: 300000, // 5 minutes
    }
  );

  // Format notifications for display
  const notifications = notificationsData?.data?.data?.notifications.map(notification => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    priority: notification.priority || 'medium', // Use actual priority from backend
    isRead: notification.read === 1 || notification.isRead === true,
    user: notification.user,
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
    date: notification.date,
    time: notification.time,
    timeAgo: notification.timeAgo || 'Just now'
  })) || [];


  // Get statistics
  const stats = {
    total: notificationsData?.data?.total || notifications.length,
    unreadCount: notifications.filter(n => !n.isRead).length,
    page: 1,
    totalPages: 1
  };

  // Mark as read mutation
  const markAsReadMutation = useMutation(
    (notificationId) => adminAPI.markNotificationAsRead(notificationId),
    {
      onSuccess: (data) => {
        console.log('Successfully marked notification as read:', data);
        queryClient.invalidateQueries('adminNotifications');
      },
      onError: (error) => {
        console.error('Error marking notification as read:', error);
      }
    }
  );

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation(
    () => adminAPI.markAllNotificationsAsRead(),
    {
      onSuccess: (data) => {
        console.log('Successfully marked all notifications as read:', data);
        queryClient.invalidateQueries('adminNotifications');
      },
      onError: (error) => {
        console.error('Error marking all notifications as read:', error);
      }
    }
  );

  // Delete notification mutation
  const deleteNotificationMutation = useMutation(
    (notificationId) => adminAPI.deleteNotification(notificationId),
    {
      onSuccess: (data) => {
        console.log('Successfully deleted notification:', data);
        queryClient.invalidateQueries('adminNotifications');
      },
      onError: (error) => {
        console.error('Error deleting notification:', error);
      }
    }
  );

  // Actions
  const markAsRead = (notificationId) => {
    console.log('Marking notification as read:', notificationId);
    markAsReadMutation.mutate(notificationId);
  };

  const markAllAsRead = () => {
    console.log('Marking all notifications as read');
    markAllAsReadMutation.mutate();
  };

  const deleteNotification = (notificationId) => {
    if (window.confirm('Are you sure you want to delete this notification?')) {
      deleteNotificationMutation.mutate(notificationId);
    }
  };

  const refreshNotifications = () => {
    refetch();
  };

  const isMarkingAsRead = markAsReadMutation.isLoading;
  const isDeleting = deleteNotificationMutation.isLoading;

  // Filter notifications by search term and filters
  const filteredNotifications = notifications.filter(notification => {
    // Search filter
    if (searchTerm) {
    const searchLower = searchTerm.toLowerCase();
      if (!notification.title.toLowerCase().includes(searchLower) &&
          !notification.message.toLowerCase().includes(searchLower) &&
          !notification.type.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    // Priority filter - use actual priority from backend
    if (filterPriority !== 'all') {
      if (notification.priority !== filterPriority) {
        return false;
      }
    }

    // Type filter
    if (filterType !== 'all' && notification.type !== filterType) {
      return false;
    }

    // Status filter
    if (filterStatus !== 'all') {
      if (filterStatus === 'unread' && notification.isRead) return false;
      if (filterStatus === 'read' && !notification.isRead) return false;
    }

    return true;
  });


  const getTypeIcon = (type) => {
    switch (type) {
      case 'appointment': return Calendar;
      case 'assessment': return FileText;
      case 'progress': return Target;
      case 'system': return Info;
      case 'patient': return User;
      default: return Bell;
    }
  };

  const getPriorityColor = (priority) => {
    const priorityColors = {
      'high': 'border-red-500',
      'medium': 'border-yellow-500',
      'low': 'border-green-500'
    };
    return priorityColors[priority] || 'border-gray-500';
  };

  const handleClearAllNotifications = () => {
    console.log('Clear all notifications clicked');
    setShowClearConfirm(true);
  };

  const confirmClearAll = async () => {
    console.log('Confirming clear all notifications');
    try {
      for (const notification of notifications) {
        console.log('Deleting notification:', notification.id);
        await deleteNotification(notification.id);
      }
      setShowClearConfirm(false);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const handleViewAppointment = (notification) => {
    // Close the notification modal
    setSelectedNotification(null);
    
    // Navigate to appointments page
    navigate('/admin/appointments');
    
    // Note: In a real implementation, you might want to pass the appointment ID
    // and have the appointments page automatically open that specific appointment
    // For now, we'll just navigate to the appointments page
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Total Notifications</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.total || notifications.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Bell className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Unread</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats?.unreadCount || notifications.filter(n => !n.isRead).length}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">High Priority</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{notifications.filter(n => n.priority === 'high').length}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Today</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{notifications.filter(n => {
                const today = new Date().toDateString();
                const notificationDate = new Date(n.createdAt).toDateString();
                return today === notificationDate;
              }).length}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Notifications */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Recent Notifications</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                console.log('Overview Mark All Read button clicked');
                markAllAsRead();
              }}
              disabled={markAllAsReadMutation.isLoading}
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {markAllAsReadMutation.isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Marking All...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Mark All as Read
                </>
              )}
            </button>
            <button
              onClick={() => {
                console.log('Overview Clear All button clicked');
                handleClearAllNotifications();
              }}
              className="text-red-600 hover:text-red-700 font-medium flex items-center gap-1 text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {notifications.slice(0, 3).map(notification => {
            const TypeIcon = getTypeIcon(notification.type);
            return (
              <div key={notification.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                  notification.priority === 'high' ? 'bg-red-100' :
                  notification.priority === 'medium' ? 'bg-yellow-100' : 'bg-green-100'
                }`}>
                  <TypeIcon className={`w-4 h-4 ${
                    notification.priority === 'high' ? 'text-red-600' :
                    notification.priority === 'medium' ? 'text-yellow-600' : 'text-green-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm truncate">{notification.title}</h4>
                      {!notification.isRead && (
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-700 text-xs mb-1 line-clamp-1">{notification.message}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {notification.date && notification.time ? `${notification.date} at ${notification.time}` : (notification.timeAgo || 'Just now')}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 capitalize">
                      {notification.type}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNotification(notification)}
                  className="text-blue-600 hover:text-blue-700 font-medium text-xs"
                >
                  View
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderNotificationList = () => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            
            {/* Filter Dropdowns */}
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[140px] text-sm"
              >
                <option value="all">All Priorities</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
              
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[140px] text-sm"
              >
                <option value="all">All Types</option>
                <option value="appointment">Appointment</option>
                <option value="assessment">Assessment</option>
                <option value="system">System</option>
                <option value="progress">Progress</option>
                <option value="patient">Patient</option>
                <option value="exercise">Exercise</option>
                <option value="note">Note</option>
              </select>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[140px] text-sm"
              >
                <option value="all">All Status</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                console.log('Mark All Read button clicked');
                markAllAsRead();
              }}
              disabled={markAllAsReadMutation.isLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium text-sm shadow-sm hover:shadow-md whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {markAllAsReadMutation.isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Marking All...
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  Mark All Read
                </>
              )}
            </button>
            <button
              onClick={() => {
                console.log('Clear All button clicked');
                handleClearAllNotifications();
              }}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center gap-2 font-medium text-sm shadow-sm hover:shadow-md whitespace-nowrap"
            >
              <Trash2 size={16} />
              Clear All
            </button>
            <button
              onClick={() => {
                console.log('Test API button clicked');
                adminAPI.getNotifications().then(response => {
                  console.log('API test response:', response);
                }).catch(error => {
                  console.error('API test error:', error);
                });
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center gap-2 font-medium text-sm shadow-sm hover:shadow-md whitespace-nowrap"
            >
              Test API
            </button>
          </div>
        </div>
        
        {/* Results Count */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-600">
            Showing <span className="font-medium text-gray-900">{filteredNotifications.length}</span> of{' '}
            <span className="font-medium text-gray-900">{notifications.length}</span> notifications
          </p>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map(notification => {
            const TypeIcon = getTypeIcon(notification.type);
            return (
              <div
                key={notification.id}
                className={`bg-white rounded-md border border-gray-200 overflow-hidden hover:shadow-sm transition-all duration-200 ${
                  !notification.isRead ? 'ring-1 ring-blue-500 ring-opacity-20' : ''
                }`}
              >
                <div className={`p-3 border-l-3 ${getPriorityColor(notification.priority)}`}>
                  <div className="flex items-center gap-3">
                    {/* Icon Section */}
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                      notification.priority === 'high' ? 'bg-red-100' :
                      notification.priority === 'medium' ? 'bg-yellow-100' : 'bg-green-100'
                    }`}>
                      <TypeIcon className={`w-4 h-4 ${
                        notification.priority === 'high' ? 'text-red-600' :
                        notification.priority === 'medium' ? 'text-yellow-600' : 'text-green-600'
                      }`} />
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 min-w-0">
                      {/* Header with title and badges */}
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 text-sm truncate">{notification.title}</h3>
                          {!notification.isRead && (
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            notification.priority === 'high' ? 'bg-red-100 text-red-700' :
                            notification.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {notification.priority}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 capitalize">
                            {notification.type}
                          </span>
                        </div>
                      </div>

                      {/* Message */}
                      <p className="text-gray-700 text-xs mb-1 line-clamp-1">{notification.message}</p>

                      {/* Metadata and Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {notification.date && notification.time ? `${notification.date} at ${notification.time}` : (notification.timeAgo || 'Just now')}
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedNotification(notification)}
                            className="bg-blue-600 text-white py-0.5 px-2 rounded text-xs font-medium flex items-center gap-1 hover:bg-blue-700 transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            View
                          </button>
                          
                          {!notification.isRead && !markAsReadMutation.isLoading && (
                            <button
                              onClick={() => {
                                console.log('Individual Read button clicked for notification:', notification.id);
                                markAsRead(notification.id);
                              }}
                              className="bg-green-600 text-white py-0.5 px-2 rounded text-xs font-medium flex items-center gap-1 hover:bg-green-700 transition-colors"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Read
                            </button>
                          )}
                          {markAsReadMutation.isLoading && (
                            <button
                              disabled
                              className="bg-gray-400 text-white py-0.5 px-2 rounded text-xs font-medium flex items-center gap-1 cursor-not-allowed"
                            >
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Marking...
                            </button>
                          )}
                          
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            disabled={deleteNotificationMutation.isLoading}
                            className="bg-red-50 text-red-700 py-0.5 px-2 rounded text-xs font-medium flex items-center gap-1 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deleteNotificationMutation.isLoading ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bell className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No notifications</h3>
            <p className="text-gray-600">
              {searchTerm 
                ? `No notifications found matching "${searchTerm}"`
                : "You're all caught up! No new notifications at the moment."
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'notifications':
        return renderNotificationList();
      default:
        return renderOverview();
    }
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
    <div className="admin-notifications p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">System Notifications</h1>
            <p className="text-base text-gray-600">
              Stay updated with important system alerts, appointments, and administrative updates
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 mb-1">Current Time (Philippines)</div>
            <div className="text-lg font-mono font-semibold text-gray-900">
              {formatPhilippineTime(currentTime)}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6 shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-6 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-semibold text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Bell className="w-4 h-4 inline mr-2" />
              Overview
            </button>
          <button 
              onClick={() => setActiveTab('notifications')}
              className={`py-4 px-1 border-b-2 font-semibold text-sm transition-colors ${
                activeTab === 'notifications'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <AlertCircle className="w-4 h-4 inline mr-2" />
              All Notifications
          </button>
          </nav>
        </div>

        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>

      {/* Notification Detail Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  {(() => {
                    const TypeIcon = getTypeIcon(selectedNotification.type);
                    return (
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        selectedNotification.priority === 'high' ? 'bg-red-100' :
                        selectedNotification.priority === 'medium' ? 'bg-yellow-100' : 'bg-green-100'
                      }`}>
                        <TypeIcon className={`w-6 h-6 ${
                          selectedNotification.priority === 'high' ? 'text-red-600' :
                          selectedNotification.priority === 'medium' ? 'text-yellow-600' : 'text-green-600'
                        }`} />
            </div>
                    );
                  })()}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedNotification.title}</h2>
                    <p className="text-gray-600 capitalize">{selectedNotification.type} notification</p>
          </div>
        </div>
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
        </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Message</h3>
                  <p className="text-gray-700 leading-relaxed">{selectedNotification.message}</p>
      </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Type</h4>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 capitalize">
                      {selectedNotification.type}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Status</h4>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      selectedNotification.isRead 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {selectedNotification.isRead ? 'Read' : 'Unread'}
                    </span>
          </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Created</h4>
                    <p className="text-gray-600">{selectedNotification.date && selectedNotification.time ? `${selectedNotification.date} at ${selectedNotification.time}` : (selectedNotification.timeAgo || 'Just now')}</p>
            </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Priority</h4>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      selectedNotification.priority === 'high' ? 'bg-red-100 text-red-800' :
                      selectedNotification.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {selectedNotification.priority?.charAt(0).toUpperCase() + selectedNotification.priority?.slice(1)}
                </span>
              </div>
            </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
                {selectedNotification.type === 'appointment' && (
                  <button
                    onClick={() => handleViewAppointment(selectedNotification)}
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 font-semibold"
                  >
                    <ExternalLink className="w-5 h-5" />
                    View Appointment
                  </button>
                )}
                {!selectedNotification.isRead && !markAsReadMutation.isLoading && (
                  <button
                    onClick={() => {
                      markAsRead(selectedNotification.id);
                      setSelectedNotification(null);
                    }}
                    className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-colors flex items-center gap-2 font-semibold"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Mark as Read
                  </button>
                )}
                {markAsReadMutation.isLoading && (
                  <button
                    disabled
                    className="bg-gray-400 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-semibold cursor-not-allowed"
                  >
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Marking as Read...
                  </button>
                )}
                <button 
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this notification?')) {
                      deleteNotification(selectedNotification.id);
                      setSelectedNotification(null);
                    }
                  }}
                  disabled={deleteNotificationMutation.isLoading}
                  className="bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition-colors flex items-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteNotificationMutation.isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Trash2 className="w-5 h-5" />
                  )}
                  Delete
                </button>
              <button 
                  onClick={() => setSelectedNotification(null)}
                  className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-200 transition-colors font-semibold"
                >
                  Close
              </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Clear All Notifications</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to clear all notifications? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmClearAll}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold"
                >
                  Clear All
          </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNotifications;
