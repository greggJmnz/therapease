// Notification Service for TherapEase
// Handles real notification data fetching and management

class NotificationService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || '/api';
  }

  // Get auth token from localStorage
  getAuthToken() {
    return localStorage.getItem('token');
  }

  // Get headers with auth token
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getAuthToken()}`
    };
  }

  // Fetch notifications for current user
  async getNotifications(options = {}) {
    try {
      const { page = 1, limit = 20, type, isRead } = options;
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(type && { type }),
        ...(isRead !== undefined && { isRead: isRead.toString() })
      });

      const response = await fetch(`${this.baseURL}/notifications?${params}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      const response = await fetch(`${this.baseURL}/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  async markAllAsRead() {
    try {
      const response = await fetch(`${this.baseURL}/notifications/read-all`, {
        method: 'PATCH',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Delete notification
  async deleteNotification(notificationId) {
    try {
      const response = await fetch(`${this.baseURL}/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Get notification statistics
  async getNotificationStats() {
    try {
      const response = await fetch(`${this.baseURL}/notifications/stats`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching notification stats:', error);
      throw error;
    }
  }

  // Subscribe to push notifications
  async subscribeToPush(subscription, userAgent) {
    try {
      const response = await fetch(`${this.baseURL}/notifications/subscribe`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          subscription,
          userAgent,
          endpoint: subscription.endpoint
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      throw error;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribeFromPush() {
    try {
      const response = await fetch(`${this.baseURL}/notifications/unsubscribe`, {
        method: 'POST',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      throw error;
    }
  }

  // Send test notification
  async sendTestNotification() {
    try {
      const response = await fetch(`${this.baseURL}/notifications/test`, {
        method: 'POST',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
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
      priority: this.getPriorityFromType(notification.type),
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
