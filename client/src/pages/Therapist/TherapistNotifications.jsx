import React, { useState } from 'react';
import { 
  Bell, 
  Eye, 
  CheckCircle, 
  X, 
  Search, 
  Filter,
  AlertCircle,
  Info,
  Clock,
  User,
  Calendar,
  MessageSquare,
  FileText,
  Target,
  Star,
  Trash2,
  Archive,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';

const TherapistNotifications = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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
  } = useNotifications({
    filter: filterStatus === 'all' ? 'all' : filterStatus === 'unread' ? 'unread' : 'read'
  });

  // Clear all notifications function
  const handleClearAllNotifications = () => {
    setShowClearConfirm(true);
  };

  // Handle viewing appointment from notification
  const handleViewAppointment = (notification) => {
    // Close the notification modal
    setSelectedNotification(null);
    
    // Navigate to therapist schedule page
    navigate('/therapist/schedule');
    
    // Note: In a real implementation, you might want to pass the appointment ID
    // and have the schedule page automatically open that specific appointment
    // For now, we'll just navigate to the schedule page
  };

  const confirmClearAll = async () => {
    try {
      // Delete all notifications one by one
      for (const notification of notifications) {
        await deleteNotification(notification.id);
      }
      setShowClearConfirm(false);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  // Filter notifications based on search and filters
  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = filterPriority === 'all' || notification.priority === filterPriority;
    const matchesType = filterType === 'all' || notification.type === filterType;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'read' && notification.isRead) ||
                         (filterStatus === 'unread' && !notification.isRead);
    return matchesSearch && matchesPriority && matchesType && matchesStatus;
  });

  const handleMarkAsRead = (id) => {
    markAsRead(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const handleDelete = (id) => {
    deleteNotification(id);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-l-green-500 bg-green-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getPriorityTextColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'text-red-700';
      case 'medium':
        return 'text-yellow-700';
      case 'low':
        return 'text-green-700';
      default:
        return 'text-gray-700';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'appointment':
        return Calendar;
      case 'patient':
        return User;
      case 'system':
        return Info;
      case 'message':
        return MessageSquare;
      case 'assessment':
        return FileText;
      case 'reminder':
        return Clock;
      case 'achievement':
        return Star;
      case 'schedule':
        return Calendar;
      default:
        return Bell;
    }
  };

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

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Total Notifications</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total || 0}</p>
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
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.unreadCount || 0}</p>
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
              <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.highPriority || 0}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Today</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{stats.today || 0}</p>
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
              onClick={markAllAsRead}
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 text-sm"
            >
              <CheckCircle className="w-4 h-4" />
              Mark All as Read
            </button>
            <button
              onClick={handleClearAllNotifications}
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
                    <h4 className="font-medium text-gray-900 text-sm truncate">{notification.title}</h4>
                    {!notification.isRead && (
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                    )}
                  </div>
                  <p className="text-gray-700 text-xs mb-1 line-clamp-1">{notification.message}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {notification.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {notification.time}
                    </span>
                    {notification.patient && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {notification.patient}
                      </span>
                    )}
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
                <option value="patient">Patient</option>
                <option value="system">System</option>
                <option value="message">Message</option>
                <option value="assessment">Assessment</option>
                <option value="reminder">Reminder</option>
                <option value="achievement">Achievement</option>
                <option value="schedule">Schedule</option>
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
              onClick={markAllAsRead}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium text-sm shadow-sm hover:shadow-md whitespace-nowrap"
            >
              <CheckCircle size={16} />
              Mark All Read
            </button>
            <button
              onClick={handleClearAllNotifications}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center gap-2 font-medium text-sm shadow-sm hover:shadow-md whitespace-nowrap"
            >
              <Trash2 size={16} />
              Clear All
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
                            <Calendar className="w-3 h-3" />
                            {notification.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {notification.time}
                          </span>
                          {notification.patient && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {notification.patient}
                            </span>
                          )}
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
                          
                          {!notification.isRead && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="bg-green-600 text-white py-0.5 px-2 rounded text-xs font-medium flex items-center gap-1 hover:bg-green-700 transition-colors"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Read
                            </button>
                          )}
                          
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="bg-red-50 text-red-700 py-0.5 px-2 rounded text-xs font-medium flex items-center gap-1 border border-red-200 hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
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
            <h3 className="text-xl font-semibold text-gray-900 mb-3">No notifications found</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {searchTerm || filterPriority !== 'all' || filterType !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your search terms or filters to find notifications.'
                : 'You\'re all caught up! New notifications will appear here when they arrive.'
              }
            </p>
            {(searchTerm || filterPriority !== 'all' || filterType !== 'all' || filterStatus !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterPriority('all');
                  setFilterType('all');
                  setFilterStatus('all');
                }}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors font-semibold"
              >
                Clear Filters
              </button>
            )}
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

  return (
    <div className="therapist-notifications p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
        <p className="text-base text-gray-600">
          Stay updated with important alerts, reminders, and patient updates
        </p>
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
                <h3 className="text-2xl font-bold text-gray-900">Notification Details</h3>
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                    selectedNotification.priority === 'high' ? 'bg-red-100' :
                    selectedNotification.priority === 'medium' ? 'bg-yellow-100' : 'bg-green-100'
                  }`}>
                    {(() => {
                      const Icon = getTypeIcon(selectedNotification.type);
                      return <Icon className={`w-8 h-8 ${
                        selectedNotification.priority === 'high' ? 'text-red-600' :
                        selectedNotification.priority === 'medium' ? 'text-yellow-600' : 'text-green-600'
                      }`} />;
                    })()}
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-gray-900">{selectedNotification.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityTextColor(selectedNotification.priority)} bg-opacity-20`}>
                        {selectedNotification.priority} priority
                      </span>
                      {!selectedNotification.read && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          Unread
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="font-semibold text-gray-900 mb-2">Message</h5>
                  <p className="text-gray-700">{selectedNotification.message}</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Date</p>
                        <p className="font-medium text-gray-900">{selectedNotification.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Time</p>
                        <p className="font-medium text-gray-900">{selectedNotification.time}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {selectedNotification.patient && (
                      <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Patient</p>
                          <p className="font-medium text-gray-900">{selectedNotification.patient}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Type</p>
                        <p className="font-medium text-gray-900 capitalize">{selectedNotification.type}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <div className="flex gap-3">
                    {selectedNotification.type === 'appointment' ? (
                      <button 
                        onClick={() => handleViewAppointment(selectedNotification)}
                        className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Appointment
                      </button>
                    ) : (
                      <button className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-xl hover:bg-blue-700 transition-colors font-medium">
                        {selectedNotification.action}
                      </button>
                    )}
                    {!selectedNotification.read && (
                      <button 
                        onClick={() => {
                          markAsRead(selectedNotification.id);
                          setSelectedNotification(null);
                        }}
                        className="flex-1 bg-green-600 text-white py-3 px-6 rounded-xl hover:bg-green-700 transition-colors font-medium"
                      >
                        <CheckCircle className="w-4 h-4 inline mr-2" />
                        Mark as Read
                      </button>
                    )}
                  </div>
                </div>
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

export default TherapistNotifications;
