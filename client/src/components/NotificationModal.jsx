import React, { useState } from 'react';
import { 
  X, 
  Bell, 
  Calendar, 
  User,
  FileText, 
  Target, 
  AlertCircle, 
  CheckCircle, 
  Info, 
  Clock,
  MessageSquare,
  ExternalLink,
  Trash2,
  Check,
  UserCheck
} from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

const NotificationModal = ({ 
  notification, 
  onClose, 
  onDelete, 
  onMarkAsRead, 
  onViewAppointment,
  onScheduleAssessment,
  onApproveAppointment,
  onAssignTherapist,
  isDeleting = false
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  if (!notification) return null;

  const getTypeIcon = (type) => {
    switch (type) {
      case 'appointment':
        return <Calendar className="h-6 w-6" />;
      case 'assessment':
        return <FileText className="h-6 w-6" />;
      case 'note':
        return <FileText className="h-6 w-6" />;
      case 'progress':
        return <Target className="h-6 w-6" />;
      case 'exercise':
        return <Target className="h-6 w-6" />;
      case 'system':
        return <Info className="h-6 w-6" />;
      case 'patient':
        return <User className="h-6 w-6" />;
      default:
        return <Bell className="h-6 w-6" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'appointment':
        return 'text-blue-600 bg-blue-100';
      case 'assessment':
        return 'text-green-600 bg-green-100';
      case 'note':
        return 'text-purple-600 bg-purple-100';
      case 'progress':
        return 'text-orange-600 bg-orange-100';
      case 'exercise':
        return 'text-indigo-600 bg-indigo-100';
      case 'system':
        return 'text-gray-600 bg-gray-100';
      case 'patient':
        return 'text-pink-600 bg-pink-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  const handleMarkAsRead = () => {
    if (!notification.isRead && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    onDelete(notification.id);
    onClose();
    setShowDeleteModal(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full flex items-start justify-center z-50 p-4">
      <div className="relative w-full max-w-2xl mx-auto my-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${getTypeColor(notification.type)}`}>
                  {getTypeIcon(notification.type)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{notification.title}</h2>
                  <p className="text-white/90 text-sm capitalize">{notification.type} notification</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all duration-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6">
            {/* Message */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Message</h3>
              </div>
              <p className="text-gray-700 leading-relaxed">{notification.message}</p>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded ${getTypeColor(notification.type)}`}>
                    {getTypeIcon(notification.type)}
                  </div>
                  <h4 className="font-semibold text-gray-900">Type</h4>
                </div>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-white text-gray-800 capitalize border border-gray-200">
                  {notification.type}
                </span>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-gray-600" />
                  <h4 className="font-semibold text-gray-900">Priority</h4>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${getPriorityColor(notification.priority)}`}>
                  {notification.priority}
                </span>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-gray-600" />
                  <h4 className="font-semibold text-gray-900">Date & Time</h4>
                </div>
                <p className="text-gray-700 font-medium">{formatTime(notification.date, notification.time, notification.createdAt)}</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-gray-600" />
                  <h4 className="font-semibold text-gray-900">Status</h4>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${
                  notification.isRead 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {notification.isRead ? 'Read' : 'Unread'}
                </span>
              </div>
            </div>

            {/* Patient Info (if available) */}
            {notification.patient && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-gray-600" />
                  <h4 className="font-semibold text-gray-900">Patient</h4>
                </div>
                <p className="text-gray-700 font-medium">{notification.patient}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t border-gray-200">
              {/* Assign Therapist button for onboarding complete notifications */}
              {notification.type === 'admin_notification' && 
               notification.title === 'New User Onboarding Complete' && 
               notification.relatedId && 
               onAssignTherapist && (
                <button
                  onClick={() => {
                    if (onAssignTherapist) {
                      onAssignTherapist(notification);
                    }
                  }}
                  className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Assign Therapist
                </button>
              )}
              {/* Approve Appointment button for admin notifications */}
              {notification.type === 'admin_notification' && 
               notification.title === 'New Appointment Request - Approval Required' && 
               notification.relatedId && 
               onApproveAppointment && (
                <button
                  onClick={() => {
                    if (onApproveAppointment) {
                      onApproveAppointment(notification);
                    }
                  }}
                  className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve Appointment
                </button>
              )}
              {(notification.type === 'patient_assignment' || notification.type === 'assessment_priority') && onScheduleAssessment && (
                <button
                  onClick={() => {
                    if (onScheduleAssessment) {
                      onScheduleAssessment(notification);
                    }
                  }}
                  className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Assessment
                </button>
              )}
              {notification.type === 'appointment' && (
                <button
                  onClick={() => {
                    if (onViewAppointment) {
                      onViewAppointment(notification);
                    } else {
                      // Default fallback
                      window.location.href = '/appointments';
                    }
                  }}
                  className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Appointment
                </button>
              )}
              
              {onDelete && (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </>
                  )}
                </button>
              )}
              
              <button
                onClick={onClose}
                className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Notification"
        message="Are you sure you want to delete this notification?"
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default NotificationModal;
