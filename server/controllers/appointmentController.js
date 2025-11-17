const { runQuery, getRow, getAll } = require('../config/database');
const websocketService = require('../services/websocketService');
const { decryptSensitiveFields, encryptField } = require('../utils/encryption');

// Helper function to convert 24-hour time to 12-hour format
const formatTime12Hour = (time24) => {
  if (!time24) return '';
  
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  
  return `${hour12}:${minutes} ${ampm}`;
};

// Get therapist schedule
const getSchedule = async (req, res) => {
  try {
    // Get therapist ID from authenticated user
    const therapistId = req.user.id;
    const { date, startDate, endDate, status } = req.query;
    

    // Build WHERE clause (show approved appointments and pending appointments for this therapist)
    let whereConditions = ['a.therapistId = ?', '(a.approvalStatus = "approved" OR a.approvalStatus = "pending")'];
    let params = [therapistId];

    if (date) {
      whereConditions.push('a.appointmentDate = ?');
      params.push(date);
    } else if (startDate && endDate) {
      whereConditions.push('a.appointmentDate BETWEEN ? AND ?');
      params.push(startDate, endDate);
    }

    if (status) {
      whereConditions.push('a.status = ?');
      params.push(status);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Get appointments with patient info (only appointments created by this therapist)
    const sql = `
      SELECT 
        a.id,
        a.patientId,
        a.therapistId,
        a.appointmentDate,
        a.startTime,
        a.endTime,
        a.duration,
        a.type,
        a.status,
        a.approvalStatus,
        a.approvedBy,
        a.createdBy,
        a.reason,
        a.notes,
        a.createdAt,
        a.updatedAt,
        CONCAT(u.firstName, ' ', u.lastName) as patientName,
        p.diagnosis,
        u.phone as patientPhone,
        creator.role as creatorRole
      FROM appointments a
      JOIN patients p ON a.patientId = p.id
      JOIN users u ON p.userId = u.id
      LEFT JOIN users creator ON a.createdBy = creator.id
      ${whereClause}
      ORDER BY a.appointmentDate ASC, a.startTime ASC
    `;

    const appointments = await getAll(sql, params);
    
    // Decrypt sensitive fields (notes)
    const decryptedAppointments = appointments.map(appointment => {
      try {
        return decryptSensitiveFields(appointment, ['notes']);
      } catch (error) {
        console.error('Decryption error for appointment', appointment.id, ':', error);
        return appointment; // Return original if decryption fails
      }
    });

    // Get sessions for the same therapist (only sessions created by this therapist)
    const sessionsSql = `
      SELECT 
        s.id,
        s.patientId,
        s.therapistId,
        s.sessionDate,
        s.startTime,
        s.endTime,
        s.duration,
        s.sessionType as type,
        s.status,
        s.notes,
        s.objectives,
        s.createdAt,
        s.updatedAt,
        CONCAT(u.firstName, ' ', u.lastName) as patientName,
        p.diagnosis,
        u.phone as patientPhone
      FROM sessions s
      JOIN patients p ON s.patientId = p.id
      JOIN users u ON p.userId = u.id
      WHERE s.therapistId = ?
      ORDER BY s.sessionDate ASC, s.startTime ASC
    `;

    let sessions = [];
    try {
      sessions = await getAll(sessionsSql, [therapistId]);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      // Continue without sessions if there's an error
    }

    // Group appointments by date
    const scheduleByDate = {};
    appointments.forEach(appointment => {
      const date = appointment.appointmentDate;
      if (!scheduleByDate[date]) {
        scheduleByDate[date] = [];
      }
      scheduleByDate[date].push(appointment);
    });

    // Group sessions by date
    sessions.forEach(session => {
      try {
        const date = new Date(session.sessionDate).toISOString().split('T')[0]; // Convert to date string
        if (!scheduleByDate[date]) {
          scheduleByDate[date] = [];
        }
        scheduleByDate[date].push(session);
      } catch (error) {
        console.error('Error processing session date:', error, 'Session:', session);
      }
    });

    // Get available time slots for scheduling
    const availableSlots = []; // Temporarily disabled
    // const availableSlots = await getAvailableTimeSlots(therapistId, startDate || date || new Date().toISOString().split('T')[0], endDate || date || new Date().toISOString().split('T')[0]);

    res.json({
      success: true,
      data: {
        appointments: decryptedAppointments,
        sessions,
        scheduleByDate,
        availableSlots,
        total: decryptedAppointments.length + sessions.length
      }
    });

  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch schedule' });
  }
};

// Create new appointment
const createAppointment = async (req, res) => {
  try {
    const {
      patientId,
      appointmentDate,
      startTime,
      endTime,
      duration,
      type,
      reason,
      notes
    } = req.body;

    // Validate required fields
    if (!patientId || !appointmentDate || !startTime || !endTime || !duration || !type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: patientId, appointmentDate, startTime, endTime, duration, type'
      });
    }

    // Get therapist ID from request (in real app, get from auth token)
    const therapistId = req.user.id;

    // Validate patient exists and belongs to therapist
    const patientSql = `
      SELECT p.id, CONCAT(u.firstName, ' ', u.lastName) as patientName
      FROM patients p
      JOIN users u ON p.userId = u.id
      WHERE p.id = ? AND p.therapistId = ?
    `;
    
    const patient = await getRow(patientSql, [parseInt(patientId), therapistId]);
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found or not assigned to you'
      });
    }

    // Check for scheduling conflicts
    const conflictSql = `
      SELECT id FROM appointments 
      WHERE therapistId = ? AND appointmentDate = ? AND status != 'cancelled'
      AND (
        (startTime <= ? AND endTime > ?) OR
        (startTime < ? AND endTime >= ?) OR
        (startTime >= ? AND endTime <= ?)
      )
    `;

    const conflicts = await getAll(conflictSql, [
      therapistId, 
      appointmentDate, 
      startTime, endTime, 
      startTime, endTime, 
      startTime, endTime
    ]);

    if (conflicts.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Time slot conflicts with existing appointment'
      });
    }

    // Insert appointment
    const insertSql = `
      INSERT INTO appointments (
        patientId, therapistId, appointmentDate, startTime, endTime, 
        duration, type, status, approvalStatus, approvedBy, approvedAt, createdBy, reason, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)
    `;

    const insertParams = [
      parseInt(patientId),
      therapistId,
      appointmentDate,
      startTime,
      endTime,
      parseInt(duration),
      type,
      'scheduled',
      'approved', // Therapist-created appointments are automatically approved
      therapistId, // Therapist who created the appointment
      therapistId, // Therapist who created the appointment (createdBy)
      reason || null, // Include reason field from request
      notes && notes.trim() !== '' ? encryptField(notes) : null // Encrypt notes if not empty
    ];

    const result = await runQuery(insertSql, insertParams);
    const appointmentId = result.insertId;

    // Get the created appointment with full details
    const getAppointmentSql = `
      SELECT 
        a.*,
        CONCAT(pu.firstName, ' ', pu.lastName) as patientName,
        CONCAT(tu.firstName, ' ', tu.lastName) as therapistName,
        pu.phone as patientPhone,
        tu.phone as therapistPhone,
        pu.id as patientUserId,
        tu.id as therapistUserId
      FROM appointments a
      JOIN patients p ON a.patientId = p.id
      JOIN users pu ON p.userId = pu.id
      JOIN users tu ON a.therapistId = tu.id
      WHERE a.id = ?
    `;

    const newAppointment = await getRow(getAppointmentSql, [appointmentId]);

    // Create notifications for patient, therapist, and admin
    try {
      const notificationController = require('./notificationController');
      
      // Create notification for patient
      await notificationController.createAppointmentCreationNotificationForPatient(appointmentId);

      // Create notification for therapist
      await notificationController.createNotification(
        newAppointment.therapistUserId,
        'Appointment Created',
        `You have created a ${type} appointment with ${newAppointment.patientName} on ${appointmentDate} at ${formatTime12Hour(startTime)}`,
        'appointment',
        { relatedId: appointmentId }
      );

      // Create notification for admin (get all admin users)
      const adminUsers = await getAll('SELECT id FROM users WHERE role = "admin"');
      for (const admin of adminUsers) {
        await notificationController.createNotification(
          admin.id,
          'New Appointment Created',
          `${newAppointment.therapistName} has created a ${type} appointment with ${newAppointment.patientName} on ${appointmentDate} at ${formatTime12Hour(startTime)}`,
          'appointment',
          { relatedId: appointmentId }
        );
      }
    } catch (notificationError) {
      console.error('Notification creation error:', notificationError);
      // Continue without notifications if there's an error
    }

    // Broadcast appointment change to all relevant portals
    websocketService.broadcastAppointmentChange(newAppointment, 'created');

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      data: newAppointment
    });

  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ success: false, error: 'Failed to create appointment' });
  }
};

// Update appointment
const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if appointment exists and belongs to therapist
    const existingAppointment = await getRow(`
      SELECT * FROM appointments 
      WHERE id = ? AND therapistId = ?
    `, [parseInt(id), req.user.id]);

    if (!existingAppointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found or not authorized'
      });
    }

    // Check appointment editing permissions
    // Therapists can edit:
    // 1. Appointments they created themselves (approvedBy === therapistId)
    // 2. Patient-created appointments that were confirmed by admin (createdBy !== therapistId AND approvedBy === admin)
    // Therapists cannot edit:
    // 1. Admin-created appointments (createdBy === admin)
    
    // Get the creator of the appointment
    const appointmentCreator = await getRow(`
      SELECT createdBy FROM appointments WHERE id = ?
    `, [parseInt(id)]);
    
    if (appointmentCreator && appointmentCreator.createdBy) {
      // Check if the appointment was created by an admin
      const creatorRole = await getRow(`
        SELECT role FROM users WHERE id = ?
      `, [appointmentCreator.createdBy]);
      
      if (creatorRole && creatorRole.role === 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Cannot edit appointments created by administrators. Please contact an administrator for changes.'
        });
      }
    }

    // Check for scheduling conflicts if time is being changed
    if (updateData.appointmentDate || updateData.startTime || updateData.endTime) {
      const newDate = updateData.appointmentDate || existingAppointment.appointmentDate;
      const newStartTime = updateData.startTime || existingAppointment.startTime;
      const newEndTime = updateData.endTime || existingAppointment.endTime;

      const conflictSql = `
        SELECT id FROM appointments 
        WHERE therapistId = ? AND appointmentDate = ? AND status != 'cancelled' AND id != ?
        AND (
          (startTime <= ? AND endTime > ?) OR
          (startTime < ? AND endTime >= ?) OR
          (startTime >= ? AND endTime <= ?)
        )
      `;

      const conflicts = await getAll(conflictSql, [
        req.user.id,
        newDate, 
        parseInt(id),
        newStartTime, newEndTime, 
        newStartTime, newEndTime, 
        newStartTime, newEndTime
      ]);

      if (conflicts.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Time slot conflicts with existing appointment'
        });
      }
    }

    // Prepare update data
    const updateFields = [];
    const updateParams = [];

    if (updateData.appointmentDate !== undefined) {
      updateFields.push('appointmentDate = ?');
      updateParams.push(updateData.appointmentDate);
    }

    if (updateData.startTime !== undefined) {
      updateFields.push('startTime = ?');
      updateParams.push(updateData.startTime);
    }

    if (updateData.endTime !== undefined) {
      updateFields.push('endTime = ?');
      updateParams.push(updateData.endTime);
    }

    if (updateData.duration !== undefined) {
      updateFields.push('duration = ?');
      updateParams.push(parseInt(updateData.duration));
    }

    if (updateData.type !== undefined) {
      updateFields.push('type = ?');
      updateParams.push(updateData.type);
    }

    if (updateData.status !== undefined) {
      updateFields.push('status = ?');
      updateParams.push(updateData.status);
    }

    if (updateData.notes !== undefined) {
      updateFields.push('notes = ?');
      // Encrypt notes if they are not empty
      const encryptedNotes = updateData.notes && updateData.notes.trim() !== '' 
        ? encryptField(updateData.notes) 
        : updateData.notes;
      updateParams.push(encryptedNotes);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    // Add appointment ID to params
    updateParams.push(parseInt(id));

    // Update appointment
    const updateSql = `
      UPDATE appointments 
      SET ${updateFields.join(', ')}, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await runQuery(updateSql, updateParams);

    // Get updated appointment
    const getAppointmentSql = `
      SELECT 
        a.*,
        CONCAT(u.firstName, ' ', u.lastName) as patientName,
        p.diagnosis,
        p.userId as patientUserId,
        u.phone as patientPhone
      FROM appointments a
      JOIN patients p ON a.patientId = p.id
      JOIN users u ON p.userId = u.id
      WHERE a.id = ?
    `;

    const updatedAppointment = await getRow(getAppointmentSql, [parseInt(id)]);

    // Create notifications for patient and admin when therapist updates appointment
    try {
      const notificationController = require('./notificationController');
      
      // Get therapist name for notifications
      const therapistInfo = await getRow(`
        SELECT CONCAT(firstName, ' ', lastName) as therapistName 
        FROM users WHERE id = ?
      `, [req.user.id]);

      // Create notification for patient
      await notificationController.createNotification(
        updatedAppointment.patientUserId,
        'Appointment Updated',
        `Your appointment with ${therapistInfo.therapistName} has been updated. New time: ${updatedAppointment.appointmentDate} at ${formatTime12Hour(updatedAppointment.startTime)}`,
        'appointment',
        { relatedId: parseInt(id) }
      );

      // Create notification for all admin users
      const adminUsers = await getAll('SELECT id FROM users WHERE role = "admin"');
      for (const admin of adminUsers) {
        await notificationController.createNotification(
          admin.id,
          'Appointment Updated by Therapist',
          `${therapistInfo.therapistName} has updated an appointment with ${updatedAppointment.patientName}. New time: ${updatedAppointment.appointmentDate} at ${formatTime12Hour(updatedAppointment.startTime)}`,
          'appointment',
          { relatedId: parseInt(id) }
        );
      }

      console.log(`📧 Created notifications for appointment update ${id}`);
    } catch (notificationError) {
      console.error('Notification creation error:', notificationError);
      // Continue without failing the update if notifications fail
    }

    // Broadcast appointment update to all relevant users via WebSocket
    try {
      const websocketService = require('../services/websocketService');
      websocketService.broadcastAppointmentChange(updatedAppointment, 'updated');
      console.log(`📢 Broadcasted appointment update for appointment ${id}`);
    } catch (error) {
      console.error('Error broadcasting appointment update:', error);
    }

    res.json({
      success: true,
      message: 'Appointment updated successfully',
      data: updatedAppointment
    });

  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ success: false, error: 'Failed to update appointment' });
  }
};

// Delete appointment
const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if appointment exists and belongs to therapist
    const existingAppointment = await getRow(`
      SELECT * FROM appointments 
      WHERE id = ? AND therapistId = ?
    `, [parseInt(id), req.user.id]);

    if (!existingAppointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found or not authorized'
      });
    }

    // Delete appointment
    await runQuery('DELETE FROM appointments WHERE id = ?', [parseInt(id)]);

    res.json({
      success: true,
      message: 'Appointment deleted successfully',
      data: existingAppointment
    });

  } catch (error) {
    console.error('Delete appointment error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete appointment' });
  }
};

// Get available time slots
const getAvailableTimeSlots = async (therapistId, startDate, endDate) => {
  try {
    // Default business hours: 9 AM to 5 PM
    const businessHours = {
      start: '09:00:00',
      end: '17:00:00',
      slotDuration: 60 // minutes
    };

    // Get existing appointments for the date range
    const appointmentsSql = `
      SELECT appointmentDate, startTime, endTime, status
      FROM appointments 
      WHERE therapistId = ? AND appointmentDate BETWEEN ? AND ? AND status != 'cancelled'
      ORDER BY appointmentDate, startTime
    `;

    const appointments = await getAll(appointmentsSql, [therapistId, startDate, endDate]);

    // Generate available slots
    const availableSlots = [];
    const currentDate = new Date(startDate);
    const endDateObj = new Date(endDate);

    while (currentDate <= endDateObj) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay();

      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const dayAppointments = appointments.filter(apt => apt.appointmentDate === dateStr);
        
        // Generate time slots for the day
        let currentTime = new Date(`2000-01-01T${businessHours.start}`);
        const endTime = new Date(`2000-01-01T${businessHours.end}`);

        while (currentTime < endTime) {
          const slotStart = currentTime.toTimeString().slice(0, 8);
          const slotEnd = new Date(currentTime.getTime() + businessHours.slotDuration * 60000).toTimeString().slice(0, 8);

          // Check if slot conflicts with existing appointments
          const hasConflict = dayAppointments.some(apt => {
            return (slotStart < apt.endTime && slotEnd > apt.startTime);
          });

          if (!hasConflict) {
            availableSlots.push({
              date: dateStr,
              startTime: slotStart,
              endTime: slotEnd,
              duration: businessHours.slotDuration
            });
          }

          currentTime = new Date(currentTime.getTime() + businessHours.slotDuration * 60000);
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return availableSlots;

  } catch (error) {
    console.error('Get available time slots error:', error);
    return [];
  }
};

// Get appointment statistics
const getAppointmentStats = async (req, res) => {
  try {
    // Get therapist ID from request (in real app, get from auth token)
    const therapistId = req.user.id;
    const { startDate, endDate } = req.query;

    // Build WHERE clause
    let whereConditions = ['a.therapistId = ?'];
    let params = [therapistId];

    if (startDate && endDate) {
      whereConditions.push('a.appointmentDate BETWEEN ? AND ?');
      params.push(startDate, endDate);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Get appointment counts by status
    const statusStatsSql = `
      SELECT 
        a.status,
        COUNT(*) as count
      FROM appointments a
      ${whereClause}
      GROUP BY a.status
    `;

    const statusStats = await getAll(statusStatsSql, params);

    // Get appointment counts by type
    const typeStatsSql = `
      SELECT 
        a.type,
        COUNT(*) as count
      FROM appointments a
      ${whereClause}
      GROUP BY a.type
    `;

    const typeStats = await getAll(typeStatsSql, params);

    // Get total appointments
    const totalSql = `
      SELECT COUNT(*) as total
      FROM appointments a
      ${whereClause}
    `;

    const [totalResult] = await getAll(totalSql, params);
    const total = totalResult.total;

    // Get upcoming appointments (next 7 days)
    const upcomingSql = `
      SELECT COUNT(*) as upcoming
      FROM appointments a
      WHERE a.therapistId = ? AND a.appointmentDate >= CURDATE() 
      AND a.appointmentDate <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
      AND a.status = 'scheduled'
    `;

    const [upcomingResult] = await getAll(upcomingSql, [therapistId]);
    const upcoming = upcomingResult.upcoming;

    res.json({
      success: true,
      data: {
        total,
        upcoming,
        byStatus: statusStats,
        byType: typeStats
      }
    });

  } catch (error) {
    console.error('Get appointment stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch appointment statistics' });
  }
};

// Approve appointment (therapist)
const approveAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const therapistId = req.user.id;

    // Get appointment details - must be pending and assigned to this therapist
    const appointment = await getRow(`
      SELECT 
        a.*, 
        p.userId as patientUserId, 
        CONCAT(u.firstName, ' ', u.lastName) as patientName,
        u.phone as patientPhone
      FROM appointments a
      JOIN patients p ON a.patientId = p.id
      JOIN users u ON p.userId = u.id
      WHERE a.id = ? AND a.therapistId = ? AND a.approvalStatus = 'pending'
    `, [parseInt(id), therapistId]);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found, not assigned to you, or already processed'
      });
    }

    // Update appointment status
    await runQuery(`
      UPDATE appointments 
      SET status = 'scheduled', 
          approvalStatus = 'approved', 
          approvedBy = ?, 
          approvedAt = NOW()
      WHERE id = ?
    `, [therapistId, parseInt(id)]);

    // Create notifications
    const notificationController = require('./notificationController');
    
    // Get therapist name for notifications
    const therapistInfo = await getRow(`
      SELECT CONCAT(firstName, ' ', lastName) as therapistName 
      FROM users WHERE id = ?
    `, [therapistId]);
    
    // Notify patient
    const patientMessage = `Hi ${appointment.patientName}! Your appointment with ${therapistInfo.therapistName} on ${new Date(appointment.appointmentDate).toLocaleDateString()} at ${formatTime12Hour(appointment.startTime)} has been approved. TherapEase Team`;
    // Import decryption utility
    const { decryptField } = require('../utils/encryption');
    
    // Decrypt patient phone before using
    const decryptedPatientPhone = appointment.patientPhone ? decryptField(appointment.patientPhone) : null;
    
    await notificationController.createNotification(
      appointment.patientUserId,
      'Appointment Approved',
      patientMessage,
      'appointment',
      { 
        relatedId: parseInt(id),
        sendSMS: true,
        phoneNumber: decryptedPatientPhone
      }
    );

    // Notify admin (get all admin users)
    const adminUsers = await getAll('SELECT id FROM users WHERE role = "admin"');
    for (const admin of adminUsers) {
      await notificationController.createNotification(
        admin.id,
        'Appointment Approved by Therapist',
        `${therapistInfo.therapistName} has approved an appointment with ${appointment.patientName} on ${new Date(appointment.appointmentDate).toLocaleDateString()} at ${formatTime12Hour(appointment.startTime)}`,
        'appointment',
        { relatedId: parseInt(id) }
      );
    }

    // Broadcast appointment change via WebSocket
    try {
      const websocketService = require('../services/websocketService');
      const updatedAppointment = await getRow(`
        SELECT a.*, 
          CONCAT(pu.firstName, ' ', pu.lastName) as patientName,
          CONCAT(tu.firstName, ' ', tu.lastName) as therapistName
        FROM appointments a
        JOIN patients p ON a.patientId = p.id
        JOIN users pu ON p.userId = pu.id
        JOIN users tu ON a.therapistId = tu.id
        WHERE a.id = ?
      `, [parseInt(id)]);
      websocketService.broadcastAppointmentChange(updatedAppointment, 'approved');
    } catch (error) {
      console.error('Error broadcasting appointment approval:', error);
    }

    res.json({
      success: true,
      message: 'Appointment approved successfully'
    });

  } catch (error) {
    console.error('Approve appointment error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to approve appointment' 
    });
  }
};

module.exports = {
  getSchedule,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getAppointmentStats,
  approveAppointment
};

