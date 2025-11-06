const { runQuery, getRow, getAll } = require('../config/database');
const smsService = require('../services/smsService');
const emailService = require('../services/emailService');
const webpush = require('web-push');
const websocketService = require('../services/websocketService');

// Helper function to calculate time ago
const getTimeAgo = (date) => {
  const now = new Date();
  const diffInMs = now - date;
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString('en-US');
  }
};

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
    const userId = req.user.id;
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

    // Get notifications - handle missing priority column gracefully
    // Use CONVERT_TZ to ensure createdAt is in UTC regardless of server timezone
    let notifications;
    try {
      // Try with priority column first
      const sql = `
        SELECT 
          n.id,
          n.userId,
          n.title,
          n.message,
          n.type,
          n.isRead,
          n.priority,
          CONVERT_TZ(n.createdAt, @@session.time_zone, '+00:00') as createdAt
        FROM notifications n
        ${whereClause}
        ORDER BY n.createdAt DESC
        LIMIT ${parseInt(limit)} OFFSET ${offset}
      `;
      notifications = await getAll(sql, params);
    } catch (error) {
      // If priority column doesn't exist, query without it
      if (error.code === 'ER_BAD_FIELD_ERROR' && error.message.includes('priority')) {
        console.warn('⚠️ Priority column not found in notifications table, querying without it');
        const sql = `
          SELECT 
            n.id,
            n.userId,
            n.title,
            n.message,
            n.type,
            n.isRead,
            CONVERT_TZ(n.createdAt, @@session.time_zone, '+00:00') as createdAt
          FROM notifications n
          ${whereClause}
          ORDER BY n.createdAt DESC
          LIMIT ${parseInt(limit)} OFFSET ${offset}
        `;
        notifications = await getAll(sql, params);
        // Add default priority for backward compatibility
        notifications = notifications.map(n => ({ ...n, priority: 'medium' }));
      } else {
        throw error; // Re-throw if it's a different error
      }
    }

    // Format notification data with date and time
    // Note: Frontend will format using user's local timezone from createdAt ISO string
    const formattedNotifications = notifications.map(notification => {
      // createdAt is already in UTC from CONVERT_TZ, parse it correctly
      let createdAt;
      if (notification.createdAt instanceof Date) {
        createdAt = notification.createdAt;
      } else if (typeof notification.createdAt === 'string') {
        // If it's a string, ensure it's treated as UTC
        // MySQL CONVERT_TZ returns datetime string, append 'Z' to indicate UTC
        const dateStr = notification.createdAt.endsWith('Z') 
          ? notification.createdAt 
          : notification.createdAt + 'Z';
        createdAt = new Date(dateStr);
      } else {
        createdAt = new Date(notification.createdAt);
      }
      
      // Format date and time in UTC to avoid server timezone issues
      // Frontend will use createdAt ISO string for proper timezone conversion
      const date = createdAt.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC'
      });
      const time = createdAt.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC'
      });
      
      return {
        ...notification,
        createdAt: createdAt.toISOString(), // Ensure ISO string for frontend
        date: date,
        time: time,
        timeAgo: getTimeAgo(createdAt)
      };
    });

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
        notifications: formattedNotifications,
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
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if notification exists
    const existingNotification = await getRow(`
      SELECT * FROM notifications 
      WHERE id = ?
    `, [parseInt(id)]);

    if (!existingNotification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    // Allow admins to mark any notification as read, others can only mark their own
    if (userRole !== 'admin' && existingNotification.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to mark this notification as read'
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
    const userId = req.user.id;
    const userRole = req.user.role;

    // For admins, mark all notifications as read; for others, only their own
    let result;
    if (userRole === 'admin') {
      result = await runQuery('UPDATE notifications SET isRead = 1');
    } else {
      result = await runQuery('UPDATE notifications SET isRead = 1 WHERE userId = ?', [userId]);
    }

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
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if notification exists
    const existingNotification = await getRow(`
      SELECT * FROM notifications 
      WHERE id = ?
    `, [parseInt(id)]);

    if (!existingNotification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    // Allow admins to delete any notification, others can only delete their own
    if (userRole !== 'admin' && existingNotification.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this notification'
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

// Delete all notifications
const deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // For admins, delete all notifications; for others, only their own
    let result;
    if (userRole === 'admin') {
      result = await runQuery('DELETE FROM notifications');
    } else {
      result = await runQuery('DELETE FROM notifications WHERE userId = ?', [userId]);
    }

    // Check if any notifications were deleted
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'No notifications found to delete'
      });
    }

    res.json({
      success: true,
      message: 'All notifications deleted successfully',
      data: { deletedCount: result.affectedRows }
    });

  } catch (error) {
    console.error('Delete all notifications error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete all notifications' });
  }
};

// Create notification (for system use)
// Multi-channel notification function
const sendMultiChannelNotification = async (userId, title, message, type = 'system', options = {}) => {
  const results = {
    sms: { success: false, attempted: false },
    email: { success: false, attempted: false },
    push: { success: false, attempted: false }
  };

  // Get user information for multi-channel delivery
  let userInfo = null;
  if (options.userInfo) {
    userInfo = options.userInfo;
  } else {
    try {
      userInfo = await getRow(
        'SELECT id, email, firstName, lastName, phone FROM users WHERE id = ?',
        [userId]
      );
    } catch (error) {
      console.error('Error fetching user info for multi-channel notification:', error);
    }
  }

  // Channel 1: Try SMS (best effort - may be filtered by carrier even if "delivered")
  // Note: SMS may show "delivered" in PhilSMS but still be filtered by carrier
  // So we always send email as well to ensure delivery
  if (options.sendSMS && options.phoneNumber) {
    results.sms.attempted = true;
    try {
      const smsResult = await smsService.sendSMS(options.phoneNumber, message);
      results.sms.success = smsResult.success;
      results.sms.messageId = smsResult.messageId;
      results.sms.error = smsResult.error;
      
      if (results.sms.success) {
        console.log(`✅ SMS sent to PhilSMS (may be filtered by carrier): ${options.phoneNumber}`);
      } else {
        console.log(`⚠️ SMS failed: ${results.sms.error}`);
      }
    } catch (smsError) {
      console.error('SMS send error:', smsError);
      results.sms.error = smsError.message;
    }
  } else if (userInfo && userInfo.phone && options.sendSMS !== false) {
    // Try SMS if user has phone number and SMS is not explicitly disabled
    results.sms.attempted = true;
    try {
      const smsResult = await smsService.sendSMS(userInfo.phone, message);
      results.sms.success = smsResult.success;
      results.sms.messageId = smsResult.messageId;
      results.sms.error = smsResult.error;
      
      if (results.sms.success) {
        console.log(`✅ SMS sent to PhilSMS (may be filtered by carrier): ${userInfo.phone}`);
      } else {
        console.log(`⚠️ SMS failed: ${results.sms.error}`);
      }
    } catch (smsError) {
      console.error('SMS send error:', smsError);
      results.sms.error = smsError.message;
    }
  }

  // Channel 2: Always send Email (regardless of SMS status, since SMS can be filtered by carrier)
  // SMS may show "delivered" in PhilSMS but still be filtered by carrier, so email is always sent
  const shouldSendEmail = options.sendEmail !== false && userInfo && userInfo.email;
  if (shouldSendEmail) {
    results.email.attempted = true;
    try {
      // For appointment notifications, use specialized email template
      if (type === 'appointment_created' && options.appointmentDetails) {
        const emailResult = await emailService.sendAppointmentNotificationEmail(
          userInfo.email,
          userInfo.firstName || 'User',
          options.appointmentDetails
        );
        results.email.success = emailResult.success;
        results.email.messageId = emailResult.messageId;
        results.email.error = emailResult.error;
      } else {
        // Generic email notification
        const emailResult = await emailService.sendViaSendGridAPI(
          userInfo.email,
          title,
          `<p>${message}</p>`,
          message,
          process.env.EMAIL_FROM || 'therapease16@gmail.com'
        );
        results.email.success = emailResult.success;
        results.email.messageId = emailResult.messageId;
        results.email.error = emailResult.error;
      }
      
      if (results.email.success) {
        console.log(`✅ Email sent successfully to ${userInfo.email}`);
      } else {
        console.log(`⚠️ Email failed: ${results.email.error}`);
      }
    } catch (emailError) {
      console.error('Email send error:', emailError);
      results.email.error = emailError.message;
    }
  }

  // Channel 3: Send Push Notification (always attempt if user has subscription)
  if (options.sendPush !== false) {
    results.push.attempted = true;
    try {
      const pushResult = await sendPushNotification(userId, title, message, {
        tag: type,
        data: { notificationId: options.relatedId }
      });
      results.push.success = pushResult.success;
      results.push.error = pushResult.message || pushResult.error;
      
      if (results.push.success) {
        console.log(`✅ Push notification sent successfully to user ${userId}`);
      } else {
        console.log(`⚠️ Push notification failed: ${results.push.error}`);
      }
    } catch (pushError) {
      console.error('Push notification error:', pushError);
      results.push.error = pushError.message;
    }
  }

  return results;
};

const createNotification = async (userId, title, message, type = 'system', options = {}) => {
  try {
    const priority = options.priority || 'medium';
    const insertSql = `
      INSERT INTO notifications (userId, title, message, type, relatedId)
      VALUES (?, ?, ?, ?, ?)
    `;

    const result = await runQuery(insertSql, [userId, title, message, type, options.relatedId || null]);
    const notificationId = result.insertId;

    // Use multi-channel notification if enabled (default for appointment notifications)
    const useMultiChannel = options.useMultiChannel !== false && 
                           (type === 'appointment_created' || type === 'appointment_reminder' || options.useMultiChannel === true);

    if (useMultiChannel) {
      // Send via multiple channels with fallback
      const channelResults = await sendMultiChannelNotification(userId, title, message, type, {
        ...options,
        notificationId
      });

      // Update notification with channel statuses
      const smsStatus = channelResults.sms.success ? 'sent' : 
                       (channelResults.sms.attempted ? 'failed' : null);
      const emailStatus = channelResults.email.success ? 'sent' : 
                         (channelResults.email.attempted ? 'failed' : null);
      const pushStatus = channelResults.push.success ? 'sent' : 
                        (channelResults.push.attempted ? 'failed' : null);

      // Update notification with SMS status if attempted
      if (channelResults.sms.attempted) {
        await runQuery(
          'UPDATE notifications SET smsMessageId = ?, smsStatus = ? WHERE id = ?',
          [channelResults.sms.messageId || null, smsStatus, notificationId]
        );
      }

      // Log channel results
      console.log(`📧 Multi-channel notification sent - SMS: ${smsStatus || 'not attempted'}, Email: ${emailStatus || 'not attempted'}, Push: ${pushStatus || 'not attempted'}`);
    } else {
      // Legacy: Send SMS only if requested
      if (options.sendSMS && options.phoneNumber) {
        try {
          const smsResult = await smsService.sendSMS(options.phoneNumber, message);
          
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

// Create appointment reminder notification for patient (day before)
const createAppointmentReminderForPatient = async (appointmentId) => {
  try {
    // Get appointment details with patient information including phone number and email
    const appointmentSql = `
      SELECT 
        a.appointmentDate,
        a.startTime,
        a.endTime,
        a.type,
        a.patientId,
        a.location,
        p.userId as patientUserId,
        CONCAT(u.firstName, ' ', u.lastName) as patientName,
        u.phone as patientPhone,
        u.email as patientEmail,
        u.firstName as patientFirstName,
        CONCAT(t.firstName, ' ', t.lastName) as therapistName
      FROM appointments a
      JOIN patients p ON a.patientId = p.id
      JOIN users u ON p.userId = u.id
      JOIN users t ON a.therapistId = t.id
      WHERE a.id = ?
    `;

    const appointment = await getRow(appointmentSql, [appointmentId]);
    if (!appointment) return null;

    const appointmentDate = new Date(appointment.appointmentDate);
    const formattedDate = appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = new Date(`2000-01-01T${appointment.startTime}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const title = 'Appointment Reminder';
    const message = `Reminder: You have a ${appointment.type} appointment with ${appointment.therapistName} tomorrow (${formattedDate}) at ${formattedTime}. Please arrive 10 minutes early.`;
    const type = 'appointment_reminder';

    // Multi-channel notification options
    const options = {
      relatedId: appointmentId,
      priority: 'high',
      useMultiChannel: true, // Enable multi-channel for appointment reminders
      sendEmail: true, // Always send email as fallback
      sendPush: true, // Always send push notification
      userInfo: {
        id: appointment.patientUserId,
        email: appointment.patientEmail,
        firstName: appointment.patientFirstName,
        phone: appointment.patientPhone
      },
      appointmentDetails: {
        type: appointment.type,
        therapistName: appointment.therapistName,
        appointmentDate: appointment.appointmentDate,
        startTime: appointment.startTime,
        endTime: appointment.endTime || null,
        location: appointment.location || null
      }
    };

    // Add SMS sending if patient has phone number
    if (appointment.patientPhone && appointment.patientPhone.trim()) {
      options.sendSMS = true;
      options.phoneNumber = appointment.patientPhone.trim();
    }

    return await createNotification(appointment.patientUserId, title, message, type, options);

  } catch (error) {
    console.error('Create appointment reminder for patient error:', error);
    return null;
  }
};

// Create progress update notification for patient when therapist completes objectives
const createProgressUpdateNotificationForPatient = async (patientId, objectiveTitle, therapistName) => {
  try {
    // Get patient user ID
    const patientSql = `
      SELECT p.userId
      FROM patients p
      WHERE p.id = ?
    `;

    const patient = await getRow(patientSql, [patientId]);
    if (!patient) return null;

    const title = 'Progress Update';
    const message = `Great news! Your therapist ${therapistName} has marked "${objectiveTitle}" as completed. Keep up the excellent work!`;
    const type = 'progress_update';

    return await createNotification(patient.userId, title, message, type, {
      priority: 'medium'
    });

  } catch (error) {
    console.error('Create progress update notification for patient error:', error);
    return null;
  }
};

// Create exercise reminder notification for patient when therapist creates exercise
const createExerciseReminderNotificationForPatient = async (exerciseId) => {
  try {
    // Get exercise details with patient information
    const exerciseSql = `
      SELECT 
        he.title,
        he.description,
        he.difficulty,
        he.dueDate,
        p.userId as patientUserId,
        CONCAT(u.firstName, ' ', u.lastName) as patientName,
        CONCAT(t.firstName, ' ', t.lastName) as therapistName
      FROM home_exercises he
      JOIN patients p ON he.patientId = p.id
      JOIN users u ON p.userId = u.id
      JOIN users t ON he.therapistId = t.id
      WHERE he.id = ?
    `;

    const exercise = await getRow(exerciseSql, [exerciseId]);
    if (!exercise) return null;

    const dueDateText = exercise.dueDate ? 
      ` (due by ${new Date(exercise.dueDate).toLocaleDateString()})` : '';

    const title = 'New Exercise Assigned';
    const message = `Your therapist ${exercise.therapistName} has assigned you a new ${exercise.difficulty.toLowerCase()} exercise: "${exercise.title}"${dueDateText}. Check your home exercises section to get started!`;
    const type = 'exercise_assignment';

    return await createNotification(exercise.patientUserId, title, message, type, {
      relatedId: exerciseId,
      priority: 'medium'
    });

  } catch (error) {
    console.error('Create exercise reminder notification for patient error:', error);
    return null;
  }
};

// Create appointment creation notification for patient (immediate)
const createAppointmentCreationNotificationForPatient = async (appointmentId) => {
  try {
    // Get appointment details with patient information including phone number and email
    const appointmentSql = `
      SELECT 
        a.appointmentDate,
        a.startTime,
        a.endTime,
        a.type,
        a.patientId,
        a.location,
        p.userId as patientUserId,
        CONCAT(u.firstName, ' ', u.lastName) as patientName,
        u.phone as patientPhone,
        u.email as patientEmail,
        u.firstName as patientFirstName,
        CONCAT(t.firstName, ' ', t.lastName) as therapistName
      FROM appointments a
      JOIN patients p ON a.patientId = p.id
      JOIN users u ON p.userId = u.id
      JOIN users t ON a.therapistId = t.id
      WHERE a.id = ?
    `;

    const appointment = await getRow(appointmentSql, [appointmentId]);
    if (!appointment) return null;

    const appointmentDate = new Date(appointment.appointmentDate);
    const formattedDate = appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = new Date(`2000-01-01T${appointment.startTime}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const title = 'Appointment Scheduled';
    const message = `Your ${appointment.type} appointment with ${appointment.therapistName} has been scheduled for ${formattedDate} at ${formattedTime}. You'll receive a reminder the day before.`;
    const type = 'appointment_created';

    // Multi-channel notification options
    const options = {
      relatedId: appointmentId,
      priority: 'high',
      useMultiChannel: true, // Enable multi-channel for appointment notifications
      sendEmail: true, // Always send email as fallback
      sendPush: true, // Always send push notification
      userInfo: {
        id: appointment.patientUserId,
        email: appointment.patientEmail,
        firstName: appointment.patientFirstName,
        phone: appointment.patientPhone
      },
      appointmentDetails: {
        type: appointment.type,
        therapistName: appointment.therapistName,
        appointmentDate: appointment.appointmentDate,
        startTime: appointment.startTime,
        endTime: appointment.endTime || null,
        location: appointment.location || null
      }
    };

    // Add SMS sending if patient has phone number
    if (appointment.patientPhone && appointment.patientPhone.trim()) {
      options.sendSMS = true;
      options.phoneNumber = appointment.patientPhone.trim();
    }

    return await createNotification(appointment.patientUserId, title, message, type, options);

  } catch (error) {
    console.error('Create appointment creation notification for patient error:', error);
    return null;
  }
};

// Get notification statistics
const getNotificationStats = async (req, res) => {
  try {
    // Get user ID from request (in real app, get from auth token)
    const userId = req.user.id;

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
    // Reload config in case environment variables were updated
    smsService.loadConfig();
    
    // Get current status
    const status = smsService.getStatus();
    
    // Test connection
    const result = await smsService.testConnection();
    
    res.json({
      success: result.success,
      message: result.message,
      status: status,
      data: result
    });

  } catch (error) {
    console.error('Test SMS service error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to test SMS service',
      status: smsService.getStatus(),
      details: error.message 
    });
  }
};

// Handle SMS delivery status webhook
const handleSMSDeliveryStatus = async (req, res) => {
  try {
    // PhilSMS webhook format - may use different field names
    // Support both PhilSMS and legacy formats for compatibility
    const messageId = req.body.message_uuid || req.body.message_id || req.body.id || 
                     req.body.uuid || req.body.messageId;
    const status = req.body.status || req.body.delivery_status || req.body.state;
    const errorCode = req.body.error_code || req.body.error_code_label || req.body.error;

    if (!messageId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid delivery status data - missing message ID'
      });
    }

    // Map PhilSMS status to our internal status
    let mappedStatus = 'unknown';
    const statusLower = (status || '').toLowerCase();
    
    if (statusLower === 'delivered' || statusLower === 'success' || statusLower === 'sent') {
      mappedStatus = 'delivered';
    } else if (statusLower === 'failed' || statusLower === 'error' || errorCode) {
      mappedStatus = 'failed';
    } else if (statusLower === 'accepted' || statusLower === 'pending' || statusLower === 'queued') {
      mappedStatus = 'sent';
    }

    // Update notification with delivery status
    await runQuery(
      'UPDATE notifications SET smsStatus = ? WHERE smsMessageId = ?',
      [mappedStatus, messageId]
    );
    

    res.json({ success: true, message: 'Delivery status updated' });

  } catch (error) {
    console.error('Handle SMS delivery status error:', error);
    res.status(500).json({ success: false, error: 'Failed to handle delivery status' });
  }
};

// Subscribe to push notifications
const subscribeToPush = async (req, res) => {
  try {
    const userId = req.user.id;
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
    const userId = req.user.id;

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
  deleteAllNotifications,
  createNotification,
  createAppointmentReminder,
  createAssessmentDueNotification,
  createProgressReviewNotification,
  createAppointmentReminderForPatient,
  createProgressUpdateNotificationForPatient,
  createExerciseReminderNotificationForPatient,
  createAppointmentCreationNotificationForPatient,
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

