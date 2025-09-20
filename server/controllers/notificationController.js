const { runQuery, getRow, getAll } = require('../config/database');

// Get notifications for a user
const getNotifications = async (req, res) => {
  try {
    // Get user ID from request (in real app, get from auth token)
    const userId = 2; // Hardcoded for now, should come from JWT token
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
    const userId = 2; // Hardcoded for now, should come from JWT token

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
const createNotification = async (userId, title, message, type = 'system') => {
  try {
    const insertSql = `
      INSERT INTO notifications (userId, title, message, type)
      VALUES (?, ?, ?, ?)
    `;

    const result = await runQuery(insertSql, [userId, title, message, type]);
    return result.insertId;

  } catch (error) {
    console.error('Create notification error:', error);
    return null;
  }
};

// Create appointment reminder notification
const createAppointmentReminder = async (appointmentId) => {
  try {
    // Get appointment details
    const appointmentSql = `
      SELECT 
        a.appointmentDate,
        a.startTime,
        a.type,
        CONCAT(u.firstName, ' ', u.lastName) as patientName,
        a.therapistId
      FROM appointments a
      JOIN patients p ON a.patientId = p.id
      JOIN users u ON p.userId = u.id
      WHERE a.id = ?
    `;

    const appointment = await getRow(appointmentSql, [appointmentId]);
    if (!appointment) return null;

    const title = 'Appointment Reminder';
    const message = `Reminder: You have a ${appointment.type} appointment with ${appointment.patientName} on ${appointment.appointmentDate} at ${appointment.startTime}`;
    const type = 'appointment';

    return await createNotification(appointment.therapistId, title, message, type);

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
    const userId = 2; // Hardcoded for now, should come from JWT token

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

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  createAppointmentReminder,
  createAssessmentDueNotification,
  createProgressReviewNotification,
  getNotificationStats
};

