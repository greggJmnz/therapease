// Notification Service for TherapEase
// Handles real notification data fetching and management
// Uses axios instance from api.js for consistency with adminAPI, patientAPI, and therapistAPI

import { api } from './api';

class NotificationService {
  // Fetch notifications for current user
  async getNotifications(options = {}) {
    try {
      const { page = 1, limit = 20, type, isRead } = options;
      const params = {
        page: page.toString(),
        limit: limit.toString(),
        _t: Date.now(),
        ...(type && { type }),
        ...(isRead !== undefined && { isRead: isRead.toString() })
      };

      const response = await api.get('/notifications', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Check if response is HTML (404 page) instead of JSON
      if (error.response && error.response.data) {
        const dataStr = typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data);
        if (dataStr.trim().startsWith('<!DOCTYPE') || dataStr.trim().startsWith('<html')) {
          console.error('❌ Server returned HTML instead of JSON for notifications');
          throw new Error(`API endpoint not found. Check VITE_API_URL configuration. URL: ${error.config?.url || '/notifications'}`);
        }
      }
      throw error;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      const response = await api.patch(`/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  async markAllAsRead() {
    try {
      const response = await api.patch('/notifications/read-all');
      return response.data;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Delete notification
  async deleteNotification(notificationId) {
    try {
      const response = await api.delete(`/notifications/${notificationId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Delete all notifications
  async deleteAllNotifications() {
    try {
      const response = await api.delete('/notifications/delete-all');
      return response.data;
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      throw error;
    }
  }

  // Get notification statistics
  async getNotificationStats() {
    try {
      console.log('📊 Fetching notification stats...');
      const response = await api.get('/notifications/stats', { params: { _t: Date.now() } });
      return response.data;
    } catch (error) {
      console.error('Error fetching notification stats:', error);
      // Check if response is HTML (404 page) instead of JSON
      if (error.response && error.response.data) {
        const dataStr = typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data);
        if (dataStr.trim().startsWith('<!DOCTYPE') || dataStr.trim().startsWith('<html')) {
          console.error('❌ Server returned HTML instead of JSON for notification stats');
          throw new Error(`API endpoint not found. Check VITE_API_URL configuration. URL: ${error.config?.url || '/notifications/stats'}`);
        }
      }
      throw error;
    }
  }

  // Subscribe to push notifications
  async subscribeToPush(subscription, userAgent) {
    try {
      const response = await api.post('/notifications/subscribe', {
        subscription,
        userAgent,
        endpoint: subscription.endpoint
      });
      return response.data;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      throw error;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribeFromPush() {
    try {
      const response = await api.post('/notifications/unsubscribe');
      return response.data;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      throw error;
    }
  }

  // Send test notification
  async sendTestNotification() {
    try {
      const response = await api.post('/notifications/test');
      return response.data;
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  }

  // Format notification data for display
  formatNotification(notification) {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      date: notification.date,
      time: notification.time,
      timeAgo: notification.timeAgo,
      priority: notification.priority || this.getPriorityFromType(notification.type),
      icon: this.getIconFromType(notification.type),
      action: this.getActionFromType(notification.type),
      actionUrl: this.getActionUrlFromType(notification.type)
    };
  }

  // Get priority based on notification type
  getPriorityFromType(type) {
    const priorityMap = {
      'appointment': 'high',
      'assessment': 'high',
      'emergency': 'high',
      'progress_report': 'high',
      'patient': 'medium',
      'progress': 'medium',
      'note': 'medium',
      'message': 'medium',
      'system': 'low',
      'reminder': 'low'
    };
    return priorityMap[type] || 'medium';
  }

  // Get icon based on notification type
  getIconFromType(type) {
    const iconMap = {
      'appointment': 'Calendar',
      'assessment': 'FileText',
      'progress_report': 'FileText',
      'patient': 'User',
      'progress': 'Target',
      'note': 'MessageSquare',
      'message': 'MessageSquare',
      'system': 'Info',
      'reminder': 'Clock',
      'emergency': 'AlertCircle'
    };
    return iconMap[type] || 'Bell';
  }

  // Get action based on notification type
  getActionFromType(type) {
    const actionMap = {
      'appointment': 'View Appointment',
      'assessment': 'View Assessment',
      'progress_report': 'View Progress Report',
      'patient': 'View Patient',
      'progress': 'View Progress',
      'note': 'View Note',
      'message': 'Read Message',
      'system': 'Learn More',
      'reminder': 'View Details',
      'emergency': 'Take Action'
    };
    return actionMap[type] || 'View Details';
  }

  // Get action URL based on notification type
  getActionUrlFromType(type) {
    const urlMap = {
      'appointment': '/appointments',
      'assessment': '/assessments',
      'progress_report': '/progress',
      'patient': '/patients',
      'progress': '/progress',
      'note': '/daily-notes',
      'message': '/messages',
      'system': '/help',
      'reminder': '/notifications',
      'emergency': '/emergency'
    };
    return urlMap[type] || '/notifications';
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;
