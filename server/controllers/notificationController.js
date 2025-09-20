const { runQuery, getRow, getAll } = require('../config/database');
const smsService = require('../services/smsService');
const webpush = require('web-push');
const websocketService = require('../services/websocketService');

// Configure web-push only if VAPID keys are available
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@therapease.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  console.log('✅ VAPID keys configured for push notifications');
} else {
  console.log('⚠️ VAPID keys not configured - push notifications disabled');
}

// Get notifications for a user
const getNotifications = async (req, res) => {
  try {
    // Get user ID from request (in real app, get from auth token)
    const userId = req.user.userId;
    const { page = 1, limit = 20, type, isRead } = req.query;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereConditions = ['n.userId = ?'];
    let params = [userId];

    if (type) {
      whereConditions.push('n.type = ?');
      params.push(type);
    }

    if (isRead !== undefined) {
      whereConditions.push('n.isRead = ?');
      params.push(isRead === 'true' ? 1 : 0);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Get total count
    const countSql = `
      SELECT COUNT(*) as total
      FROM notifications n
      ${whereClause}
    `;
    
    const [countResult] = await getAll(countSql, params);
    const total = countResult.total;

    // Get notifications
    const sql = `
      SELECT 
        n.id,
        n.userId,
        n.title,
        n.message,
        n.type,
        n.isRead,
        n.createdAt
      FROM notifications n
      ${whereClause}
      ORDER BY n.createdAt DESC
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...params, parseInt(limit), offset];
    const notifications = await getAll(sql, queryParams);

    // Get unread count
    const unreadSql = `
      SELECT COUNT(*) as unread
      FROM notifications n
      WHERE n.userId = ? AND n.isRead = 0
    `;

    const [unreadResult] = await getAll(unreadSql, [userId]);
    const unreadCount = unreadResult.unread;

    res.json({
      success: true,
      data: {
        notifications,
        total,
        unreadCount,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if notification exists and belongs to user
    const existingNotification = await getRow(`
      SELECT * FROM notifications 
      WHERE id = ? AND userId = ?
    `, [parseInt(id), 2]); // Hardcoded user ID

    if (!existingNotification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found or not authorized'
      });
    }

    // Mark as read
    await runQuery('UPDATE notifications SET isRead = 1 WHERE id = ?', [parseInt(id)]);

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: { ...existingNotification, isRead: 1 }
    });

  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark notification as read' });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    // Get user ID from request (in real app, get from auth token)
    const userId = req.user.userId;

    // Mark all as read
    const result = await runQuery('UPDATE notifications SET isRead = 1 WHERE userId = ?', [userId]);

    res.json({
      success: true,
      message: 'All notifications marked as read',
      data: { updatedCount: result.affectedRows }
    });

  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark all notifications as read' });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if notification exists and belongs to user
    const existingNotification = await getRow(`
      SELECT * FROM notifications 
      WHERE id = ? AND userId = ?
    `, [parseInt(id), 2]); // Hardcoded user ID

    if (!existingNotification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found or not authorized'
      });
    }

    // Delete notification
    await runQuery('DELETE FROM notifications WHERE id = ?', [parseInt(id)]);

    res.json({
      success: true,
      message: 'Notification deleted successfully',
      data: existingNotification
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete notification' });
  }
};

// Create notification (for system use)
const createNotification = async (userId, title, message, type = 'system', options = {}) => {
  try {
    const insertSql = `
      INSERT INTO notifications (userId, title, message, type, relatedId)
      VALUES (?, ?, ?, ?, ?)
    `;

    const result = await runQuery(insertSql, [userId, title, message, type, options.relatedId || null]);
    const notificationId = result.insertId;

    // Send SMS if requested and user has phone number
    if (options.sendSMS && options.phoneNumber) {
      try {
        const smsResult = await smsService.sendSMS(options.phoneNumber, message);
        console.log('SMS sent:', smsResult);
        
        // Update notification with SMS status
        if (smsResult.success) {
          await runQuery(
            'UPDATE notifications SET smsMessageId = ?, smsStatus = ? WHERE id = ?',
            [smsResult.messageId, 'sent', notificationId]
          );
        } else {
          await runQuery(
            'UPDATE notifications SET smsStatus = ? WHERE id = ?',
            ['failed', notificationId]
          );
        }
      } catch (smsError) {
        console.error('SMS send error:', smsError);
        await runQuery(
          'UPDATE notifications SET smsStatus = ? WHERE id = ?',
          ['error', notificationId]
        );
      }
    }

    return notificationId;

  } catch (error) {
    console.error('Create notification error:', error);
    return null;
  }
};

// Create appointment reminder notification
const createAppointmentReminder = async (appointmentId, sendSMS = false) => {
  try {
    // Get appointment details with user phone number
    const appointmentSql = `
      SELECT 
        a.appointmentDate,
        a.startTime,
        a.type,
        CONCAT(u.firstName, ' ', u.lastName) as patientName,
        a.therapistId,
        u.phone as therapistPhone,
        CONCAT(u.firstName, ' ', u.lastName) as therapistName
      FROM appointments a
      JOIN patients p ON a.patientId = p.id
      JOIN users u ON p.userId = u.id
      JOIN users t ON a.therapistId = t.id
      WHERE a.id = ?
    `;

    const appointment = await getRow(appointmentSql, [appointmentId]);
    if (!appointment) return null;

    const title = 'Appointment Reminder';
    const message = `Reminder: You have a ${appointment.type} appointment with ${appointment.patientName} on ${appointment.appointmentDate} at ${appointment.startTime}`;
    const type = 'appointment';

    // Create notification with SMS if requested
    const options = {
      relatedId: appointmentId,
      sendSMS: sendSMS,
      phoneNumber: appointment.therapistPhone
    };

    return await createNotification(appointment.therapistId, title, message, type, options);

  } catch (error) {
    console.error('Create appointment reminder error:', error);
    return null;
  }
};

// Create assessment due notification
const createAssessmentDueNotification = async (assessmentId) => {
  try {
    // Get assessment details
    const assessmentSql = `
      SELECT 
        a.title,
        a.scheduledDate,
        CONCAT(u.firstName, ' ', u.lastName) as patientName,
        a.therapistId
      FROM assessments a
      JOIN patients p ON a.patientId = p.id
      JOIN users u ON p.userId = u.id
      WHERE a.id = ?
    `;

    const assessment = await getRow(assessmentSql, [assessmentId]);
    if (!assessment) return null;

    const title = 'Assessment Due';
    const message = `Assessment "${assessment.title}" for ${assessment.patientName} is due on ${assessment.scheduledDate}`;
    const type = 'assessment';

    return await createNotification(assessment.therapistId, title, message, type);

  } catch (error) {
    console.error('Create assessment due notification error:', error);
    return null;
  }
};

// Create progress review notification
const createProgressReviewNotification = async (patientId, area) => {
  try {
    // Get patient details
    const patientSql = `
      SELECT 
        CONCAT(u.firstName, ' ', u.lastName) as patientName,
        p.therapistId
      FROM patients p
      JOIN users u ON p.userId = u.id
      WHERE p.id = ?
    `;

    const patient = await getRow(patientSql, [patientId]);
    if (!patient) return null;

    const title = 'Progress Review Due';
    const message = `Progress review for ${patient.patientName} in ${area} area is due`;
    const type = 'progress';

    return await createNotification(patient.therapistId, title, message, type);

  } catch (error) {
    console.error('Create progress review notification error:', error);
    return null;
  }
};

// Get notification statistics
const getNotificationStats = async (req, res) => {
  try {
    // Get user ID from request (in real app, get from auth token)
    const userId = req.user.userId;

    // Get total notifications
    const totalSql = `
      SELECT COUNT(*) as total
      FROM notifications n
      WHERE n.userId = ?
    `;

    const [totalResult] = await getAll(totalSql, [userId]);
    const total = totalResult.total;

    // Get unread count
    const unreadSql = `
      SELECT COUNT(*) as unread
      FROM notifications n
      WHERE n.userId = ? AND n.isRead = 0
    `;

    const [unreadResult] = await getAll(unreadSql, [userId]);
    const unreadCount = unreadResult.unread;

    // Get notifications by type
    const typeStatsSql = `
      SELECT 
        n.type,
        COUNT(*) as count
      FROM notifications n
      WHERE n.userId = ?
      GROUP BY n.type
    `;

    const typeStats = await getAll(typeStatsSql, [userId]);

    // Get recent notifications (last 7 days)
    const recentSql = `
      SELECT COUNT(*) as recent
      FROM notifications n
      WHERE n.userId = ? AND n.createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `;

    const [recentResult] = await getAll(recentSql, [userId]);
    const recentCount = recentResult.recent;

    res.json({
      success: true,
      data: {
        total,
        unreadCount,
        recentCount,
        byType: typeStats
      }
    });

  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notification statistics' });
  }
};

// Send SMS notification directly
const sendSMSNotification = async (req, res) => {
  try {
    const { phoneNumber, message, type = 'general' } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and message are required'
      });
    }

    const result = await smsService.sendSMS(phoneNumber, message);
    
    res.json({
      success: result.success,
      message: result.success ? 'SMS sent successfully' : 'Failed to send SMS',
      data: result
    });

  } catch (error) {
    console.error('Send SMS notification error:', error);
    res.status(500).json({ success: false, error: 'Failed to send SMS notification' });
  }
};

// Get SMS delivery status
const getSMSDeliveryStatus = async (req, res) => {
  try {
    const { messageId } = req.params;

    if (!messageId) {
      return res.status(400).json({
        success: false,
        error: 'Message ID is required'
      });
    }

    const result = await smsService.getDeliveryStatus(messageId);
    
    res.json({
      success: result.success,
      data: result
    });

  } catch (error) {
    console.error('Get SMS delivery status error:', error);
    res.status(500).json({ success: false, error: 'Failed to get SMS delivery status' });
  }
};

// Get SMS account balance
const getSMSBalance = async (req, res) => {
  try {
    const result = await smsService.getAccountBalance();
    
    res.json({
      success: result.success,
      data: result
    });

  } catch (error) {
    console.error('Get SMS balance error:', error);
    res.status(500).json({ success: false, error: 'Failed to get SMS balance' });
  }
};

// Test SMS service
const testSMSService = async (req, res) => {
  try {
    const result = await smsService.testConnection();
    
    res.json({
      success: result.success,
      message: result.message,
      data: result
    });

  } catch (error) {
    console.error('Test SMS service error:', error);
    res.status(500).json({ success: false, error: 'Failed to test SMS service' });
  }
};

// Handle SMS delivery status webhook
const handleSMSDeliveryStatus = async (req, res) => {
  try {
    const { results } = req.body;

    if (!results || !Array.isArray(results)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid delivery status data'
      });
    }

    // Process each delivery status update
    for (const result of results) {
      const { messageId, status } = result;
      
      if (messageId && status) {
        // Update notification with delivery status
        await runQuery(
          'UPDATE notifications SET smsStatus = ? WHERE smsMessageId = ?',
          [status.statusName, messageId]
        );
        
        console.log(`SMS delivery status updated: ${messageId} - ${status.statusName}`);
      }
    }

    res.json({ success: true, message: 'Delivery status updated' });

  } catch (error) {
    console.error('Handle SMS delivery status error:', error);
    res.status(500).json({ success: false, error: 'Failed to handle delivery status' });
  }
};

// Subscribe to push notifications
const subscribeToPush = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { subscription, userAgent, endpoint } = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription data'
      });
    }

    // Store subscription in database
    const insertSql = `
      INSERT INTO push_subscriptions (userId, endpoint, p256dh, auth, userAgent, createdAt)
      VALUES (?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        p256dh = VALUES(p256dh),
        auth = VALUES(auth),
        userAgent = VALUES(userAgent),
        updatedAt = NOW()
    `;

    await runQuery(insertSql, [
      userId,
      subscription.endpoint,
      subscription.keys?.p256dh,
      subscription.keys?.auth,
      userAgent
    ]);

    console.log(`✅ Push subscription stored for user ${userId}`);

    res.json({
      success: true,
      message: 'Push subscription successful'
    });

  } catch (error) {
    console.error('Push subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to subscribe to push notifications'
    });
  }
};

// Unsubscribe from push notifications
const unsubscribeFromPush = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Remove subscription from database
    await runQuery(
      'DELETE FROM push_subscriptions WHERE userId = ?',
      [userId]
    );

    console.log(`✅ Push subscription removed for user ${userId}`);

    res.json({
      success: true,
      message: 'Push unsubscription successful'
    });

  } catch (error) {
    console.error('Push unsubscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unsubscribe from push notifications'
    });
  }
};

// Send push notification
const sendPushNotification = async (userId, title, message, options = {}) => {
  try {
    // Check if VAPID keys are configured
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.log('Push notifications disabled - VAPID keys not configured');
      return { success: false, message: 'Push notifications not configured' };
    }

    // Get user's push subscription
    const subscription = await getRow(
      'SELECT * FROM push_subscriptions WHERE userId = ?',
      [userId]
    );

    if (!subscription) {
      console.log(`No push subscription found for user ${userId}`);
      return { success: false, message: 'No push subscription found' };
    }

    const payload = JSON.stringify({
      title,
      body: message,
      icon: options.icon || '/favicon.ico',
      badge: options.badge || '/favicon.ico',
      tag: options.tag || 'therapease-notification',
      requireInteraction: options.requireInteraction || false,
      silent: options.silent || false,
      data: {
        url: options.url || '/notifications',
        timestamp: Date.now(),
        ...options.data
      },
      actions: options.actions || [
        {
          action: 'view',
          title: 'View',
          icon: '/icons/view.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/dismiss.png'
        }
      ]
    });

    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth
      }
    };

    await webpush.sendNotification(pushSubscription, payload);
    
    console.log(`✅ Push notification sent to user ${userId}`);
    return { success: true, message: 'Push notification sent' };

  } catch (error) {
    console.error('Push notification error:', error);
    return { success: false, message: error.message };
  }
};

// Broadcast push notification to multiple users
const broadcastPushNotification = async (userIds, title, message, options = {}) => {
  const results = [];
  
  for (const userId of userIds) {
    const result = await sendPushNotification(userId, title, message, options);
    results.push({ userId, ...result });
  }
  
  return results;
};

// Send push notification to role
const sendPushToRole = async (role, title, message, options = {}) => {
  try {
    // Get all users with the specified role
    const users = await getAll(
      'SELECT id FROM users WHERE role = ?',
      [role]
    );

    const userIds = users.map(user => user.id);
    return await broadcastPushNotification(userIds, title, message, options);

  } catch (error) {
    console.error('Push notification to role error:', error);
    return { success: false, message: error.message };
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  createAppointmentReminder,
  createAssessmentDueNotification,
  createProgressReviewNotification,
  getNotificationStats,
  sendSMSNotification,
  getSMSDeliveryStatus,
  getSMSBalance,
  testSMSService,
  handleSMSDeliveryStatus,
  subscribeToPush,
  unsubscribeFromPush,
  sendPushNotification,
  broadcastPushNotification,
  sendPushToRole
};

