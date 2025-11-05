import React from 'react';
import { 
  Bell, 
  Calendar, 
  User, 
  FileText, 
  Target, 
  AlertCircle, 
  CheckCircle, 
  Info, 
  Clock,
  X,
  ExternalLink
} from 'lucide-react';

const NotificationCard = ({ 
  notification, 
  onMarkAsRead, 
  onDelete, 
  onViewDetails,
  isCompact = false 
}) => {
  const getTypeIcon = (type) => {
    switch (type) {
      case 'appointment':
        return <Calendar className="h-4 w-4" />;
      case 'assessment':
        return <FileText className="h-4 w-4" />;
      case 'note':
        return <FileText className="h-4 w-4" />;
      case 'progress':
        return <Target className="h-4 w-4" />;
      case 'exercise':
        return <Target className="h-4 w-4" />;
      case 'system':
        return <Info className="h-4 w-4" />;
      case 'patient':
        return <User className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'appointment':
        return 'text-blue-600 bg-blue-50';
      case 'assessment':
        return 'text-green-600 bg-green-50';
      case 'note':
        return 'text-purple-600 bg-purple-50';
      case 'progress':
        return 'text-orange-600 bg-orange-50';
      case 'exercise':
        return 'text-indigo-600 bg-indigo-50';
      case 'system':
        return 'text-gray-600 bg-gray-50';
      case 'patient':
        return 'text-pink-600 bg-pink-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500';
      case 'medium':
        return 'border-l-yellow-500';
      case 'low':
        return 'border-l-green-500';
      default:
        return 'border-l-gray-500';
    }
  };

  const formatTime = (dateString, timeString, createdAt) => {
    // If createdAt ISO string is available, use it to format in user's local timezone
    if (createdAt) {
      try {
        const date = new Date(createdAt);
        const formattedDate = date.toLocaleDateString('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
        const formattedTime = date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        return `${formattedDate} at ${formattedTime}`;
      } catch (error) {
        // Fallback to backend formatted strings if createdAt is invalid
      }
    }
    
    // Fallback to backend formatted strings
    if (dateString && timeString) {
      return `${dateString} at ${timeString}`;
    }
    return 'Just now';
  };

  if (isCompact) {
    return (
      <div
        onClick={() => {
          if (!notification.isRead && onMarkAsRead) {
            onMarkAsRead(notification.id);
          }
          if (onViewDetails) {
            onViewDetails(notification);
          }
        }}
        className={`border-l-4 ${getPriorityColor(notification.priority)} rounded-lg p-3 cursor-pointer transition-all duration-200 hover:shadow-md ${
          !notification.isRead 
            ? 'bg-blue-50 ring-2 ring-blue-100 border-blue-200' 
            : 'bg-white'
        }`}
      >
        <div className="flex items-start space-x-3">
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getTypeColor(notification.type)}`}>
            {getTypeIcon(notification.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className={`text-sm font-medium truncate ${
                !notification.isRead ? 'text-blue-900 font-semibold' : 'text-gray-700'
              }`}>
                {notification.title}
              </h4>
              {!notification.isRead && (
                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
              )}
            </div>
            
            <p className={`text-xs line-clamp-2 mb-2 ${
              !notification.isRead ? 'text-blue-800' : 'text-gray-600'
            }`}>
              {notification.message}
            </p>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {formatTime(notification.date, notification.time, notification.createdAt)}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeColor(notification.type)}`}>
                {notification.type}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => {
        if (!notification.isRead && onMarkAsRead) {
          onMarkAsRead(notification.id);
        }
        if (onViewDetails) {
          onViewDetails(notification);
        }
      }}
      className={`border-l-4 ${getPriorityColor(notification.priority)} rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-lg ${
        !notification.isRead 
          ? 'bg-blue-50 ring-2 ring-blue-100 border-blue-200' 
          : 'bg-white hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start space-x-4">
        <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${getTypeColor(notification.type)}`}>
          {getTypeIcon(notification.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-base font-semibold ${
              !notification.isRead ? 'text-blue-900' : 'text-gray-700'
            }`}>
              {notification.title}
            </h3>
            <div className="flex items-center space-x-2">
              {!notification.isRead && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  New
                </span>
              )}
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${getTypeColor(notification.type)}`}>
                {notification.type}
              </span>
            </div>
          </div>
          
          <p className={`text-sm mb-3 line-clamp-2 ${
            !notification.isRead ? 'text-blue-800' : 'text-gray-600'
          }`}>
            {notification.message}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{formatTime(notification.date, notification.time, notification.createdAt)}</span>
              </span>
              {notification.patient && (
                <span className="flex items-center space-x-1">
                  <User className="h-3 w-3" />
                  <span>{notification.patient}</span>
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {notification.type === 'appointment' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle appointment view
                  }}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View
                </button>
              )}
              
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(notification.id);
                  }}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
                >
                  <X className="h-3 w-3 mr-1" />
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationCard;
