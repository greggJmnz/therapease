// Notification Service for TherapEase
// Handles real notification data fetching and management
// Uses axios instance from api.js for consistency with adminAPI, patientAPI, and therapistAPI
// Note: For simple queries, prefer using role-specific APIs (patientAPI, therapistAPI, adminAPI) directly

import { api } from './api';

class NotificationService {
  // Get user role from localStorage
  getUserRole() {
    const role = localStorage.getItem('userRole') || '';
    return role;
  }

  // Get the correct notifications endpoint based on user role
  getNotificationsEndpoint() {
    const role = this.getUserRole();
    let endpoint;
    
    if (role === 'admin') {
      endpoint = '/admin/notifications';
    } else if (role === 'patient') {
      endpoint = '/patient/notifications';
    } else if (role === 'therapist') {
      endpoint = '/therapist/notifications';
    } else {
      // Fallback to general endpoint if role is unknown
      console.warn(`⚠️ Unknown role "${role}", using general /notifications endpoint`);
      endpoint = '/notifications';
    }
    
    console.log(`🔍 getNotificationsEndpoint(): role="${role}" → endpoint="${endpoint}"`);
    return endpoint;
  }

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

      const endpoint = this.getNotificationsEndpoint();
      const role = this.getUserRole();
      
      // Debug: Check API base URL
      const baseURL = api.defaults.baseURL || 'NOT SET';
      console.log(`📬 Fetching notifications:`, {
        endpoint: endpoint,
        role: role,
        baseURL: baseURL,
        fullURL: `${baseURL}${endpoint}`,
        params: params
      });
      
      const response = await api.get(endpoint, { params });
      console.log(`✅ Notifications fetched successfully from: ${endpoint}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: typeof error.response.data === 'string' 
            ? error.response.data.substring(0, 200) 
            : error.response.data
        } : 'No response',
        config: error.config ? {
          url: error.config.url,
          baseURL: error.config.baseURL,
          method: error.config.method
        } : 'No config'
      });
      
      // Check if response is HTML (404 page) instead of JSON
      if (error.response && error.response.data) {
        const dataStr = typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data);
        if (dataStr.trim().startsWith('<!DOCTYPE') || dataStr.trim().startsWith('<html')) {
          const attemptedURL = error.config?.url || endpoint || '/notifications';
          const fullURL = error.config?.baseURL ? `${error.config.baseURL}${attemptedURL}` : attemptedURL;
          console.error('❌ Server returned HTML instead of JSON for notifications');
          console.error(`   Attempted URL: ${fullURL}`);
          console.error(`   User role: ${this.getUserRole()}`);
          console.error(`   Expected endpoint based on role: ${this.getNotificationsEndpoint()}`);
          throw new Error(`API endpoint not found (404). Tried: ${fullURL}. Check VITE_API_URL and role-specific endpoint configuration.`);
        }
      }
      throw error;
    }
  }

  // Get the correct base endpoint for notification actions based on user role
  getNotificationsBaseEndpoint() {
    const role = this.getUserRole();
    if (role === 'admin') {
      return '/admin/notifications';
    } else if (role === 'patient') {
      return '/patient/notifications';
    } else if (role === 'therapist') {
      return '/therapist/notifications';
    }
    // Fallback to general endpoint if role is unknown
    return '/notifications';
  }

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      const baseEndpoint = this.getNotificationsBaseEndpoint();
      // For admin, use PATCH; for others, use PUT (as per backend routes)
      const method = this.getUserRole() === 'admin' ? 'patch' : 'put';
      const response = await api[method](`${baseEndpoint}/${notificationId}/read`);
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  async markAllAsRead() {
    try {
      const baseEndpoint = this.getNotificationsBaseEndpoint();
      // For admin, use PATCH; for others, use PUT (as per backend routes)
      const method = this.getUserRole() === 'admin' ? 'patch' : 'put';
      const response = await api[method](`${baseEndpoint}/read-all`);
      return response.data;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Delete notification
  async deleteNotification(notificationId) {
    try {
      const baseEndpoint = this.getNotificationsBaseEndpoint();
      const response = await api.delete(`${baseEndpoint}/${notificationId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Delete all notifications
  async deleteAllNotifications() {
    try {
      const baseEndpoint = this.getNotificationsBaseEndpoint();
      // Use delete-all endpoint if available, otherwise fallback
      const endpoint = `${baseEndpoint}/delete-all`;
      const response = await api.delete(endpoint);
      return response.data;
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      throw error;
    }
  }

  // Get the correct notification stats endpoint based on user role
  getNotificationStatsEndpoint() {
    const role = this.getUserRole();
    if (role === 'admin') {
      return '/admin/notifications/stats';
    } else if (role === 'patient') {
      return '/patient/notifications/stats';
    } else if (role === 'therapist') {
      return '/therapist/notifications/stats';
    }
    // Fallback to general endpoint if role is unknown
    return '/notifications/stats';
  }

  // Get notification statistics
  async getNotificationStats() {
    try {
      const endpoint = this.getNotificationStatsEndpoint();
      console.log(`📊 Fetching notification stats from: ${endpoint} (role: ${this.getUserRole()})`);
      const response = await api.get(endpoint, { params: { _t: Date.now() } });
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
