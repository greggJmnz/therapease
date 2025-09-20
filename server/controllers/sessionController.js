const { runQuery, getRow, getAll } = require('../config/database');
const websocketService = require('../services/websocketService');

// Get all sessions for a therapist
const getSessions = async (req, res) => {
  try {
    const therapistId = req.user.userId;
    const { patientId, date, startDate, endDate, status } = req.query;

    // Build WHERE clause
    let whereConditions = ['s.therapistId = ?'];
    let params = [therapistId];

    if (patientId) {
      whereConditions.push('s.patientId = ?');
      params.push(parseInt(patientId));
    }

    if (date) {
      whereConditions.push('s.sessionDate = ?');
      params.push(date);
    } else if (startDate && endDate) {
      whereConditions.push('s.sessionDate BETWEEN ? AND ?');
      params.push(startDate, endDate);
    }

    if (status) {
      whereConditions.push('s.status = ?');
      params.push(status);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Get sessions with patient info
    const sql = `
      SELECT 
        s.id,
        s.patientId,
        s.therapistId,
        s.sessionDate,
        s.startTime,
        s.endTime,
        s.duration,
        s.sessionType,
        s.status,
        s.objectives,
        s.activities,
        s.observations,
        s.progress,
        s.challenges,
        s.nextSteps,
        s.goals,
        s.mood,
        s.engagement,
        s.notes,
        s.createdAt,
        s.updatedAt,
        CONCAT(u.firstName, ' ', u.lastName) as patientName,
        p.diagnosis,
        u.phone as patientPhone
      FROM sessions s
      JOIN patients p ON s.patientId = p.id
      JOIN users u ON p.userId = u.id
      ${whereClause}
      ORDER BY s.sessionDate DESC, s.startTime DESC
    `;

    const sessions = await getAll(sql, params);

    res.json({
      success: true,
      data: { sessions }
    });

  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch sessions' });
  }
};

// Create new session
const createSession = async (req, res) => {
  try {
    const {
      patientId,
      sessionDate,
      startTime,
      endTime,
      duration,
      sessionType,
      objectives,
      activities,
      observations,
      progress,
      challenges,
      nextSteps,
      goals,
      mood,
      engagement,
      notes
    } = req.body;

    // Validate required fields
    if (!patientId || !sessionDate || !startTime || !endTime || !duration || !sessionType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: patientId, sessionDate, startTime, endTime, duration, sessionType'
      });
    }

    // Get therapist ID from authenticated user
    const therapistId = req.user.userId;

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
      SELECT id FROM sessions 
      WHERE therapistId = ? AND sessionDate = ? AND status != 'cancelled'
      AND (
        (startTime <= ? AND endTime > ?) OR
        (startTime < ? AND endTime >= ?) OR
        (startTime >= ? AND endTime <= ?)
      )
    `;

    const conflicts = await getAll(conflictSql, [
      therapistId, 
      sessionDate, 
      startTime, endTime, 
      startTime, endTime, 
      startTime, endTime
    ]);

    if (conflicts.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Time slot conflicts with existing session'
      });
    }

    // Insert session
    const insertSql = `
      INSERT INTO sessions (
        patientId, therapistId, sessionDate, startTime, endTime, 
        duration, sessionType, status, objectives, activities,
        observations, progress, challenges, nextSteps, goals,
        mood, engagement, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const insertParams = [
      parseInt(patientId),
      therapistId,
      sessionDate,
      startTime,
      endTime,
      parseInt(duration),
      sessionType,
      'scheduled',
      objectives || null,
      activities || null,
      observations || null,
      progress || null,
      challenges || null,
      nextSteps || null,
      goals || null,
      mood || null,
      engagement || null,
      notes || null
    ];

    const result = await runQuery(insertSql, insertParams);
    const sessionId = result.insertId;

    // Get the created session
    const getSessionSql = `
      SELECT 
        s.*,
        CONCAT(u.firstName, ' ', u.lastName) as patientName,
        p.diagnosis,
        u.phone as patientPhone
      FROM sessions s
      JOIN patients p ON s.patientId = p.id
      JOIN users u ON p.userId = u.id
      WHERE s.id = ?
    `;

    const newSession = await getRow(getSessionSql, [sessionId]);

    // Broadcast session change to all relevant portals
    websocketService.broadcastSessionChange(newSession, 'created');

    res.status(201).json({
      success: true,
      message: 'Session created successfully',
      data: newSession
    });

  } catch (error) {
    console.error('Create session error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      stack: error.stack
    });
    res.status(500).json({ success: false, error: 'Failed to create session' });
  }
};

// Update session
const updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if session exists and belongs to therapist
    const existingSession = await getRow(`
      SELECT * FROM sessions 
      WHERE id = ? AND therapistId = ?
    `, [parseInt(id), req.user.userId]);

    if (!existingSession) {
      return res.status(404).json({
        success: false,
        error: 'Session not found or not authorized'
      });
    }

    // Check for scheduling conflicts if time is being changed
    if (updateData.sessionDate || updateData.startTime || updateData.endTime) {
      const newDate = updateData.sessionDate || existingSession.sessionDate;
      const newStartTime = updateData.startTime || existingSession.startTime;
      const newEndTime = updateData.endTime || existingSession.endTime;

      const conflictSql = `
        SELECT id FROM sessions 
        WHERE therapistId = ? AND sessionDate = ? AND status != 'cancelled' AND id != ?
        AND (
          (startTime <= ? AND endTime > ?) OR
          (startTime < ? AND endTime >= ?) OR
          (startTime >= ? AND endTime <= ?)
        )
      `;

      const conflicts = await getAll(conflictSql, [
        req.user.userId,
        newDate, 
        parseInt(id),
        newStartTime, newEndTime, 
        newStartTime, newEndTime, 
        newStartTime, newEndTime
      ]);

      if (conflicts.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Time slot conflicts with existing session'
        });
      }
    }

    // Prepare update data
    const updateFields = [];
    const updateParams = [];

    const allowedFields = [
      'sessionDate', 'startTime', 'endTime', 'duration', 'sessionType', 'status',
      'objectives', 'activities', 'observations', 'progress', 'challenges',
      'nextSteps', 'goals', 'mood', 'engagement', 'notes'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateParams.push(updateData[field]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    // Add session ID to params
    updateParams.push(parseInt(id));

    // Update session
    const updateSql = `
      UPDATE sessions 
      SET ${updateFields.join(', ')}, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await runQuery(updateSql, updateParams);

    // Get updated session
    const getSessionSql = `
      SELECT 
        s.*,
        CONCAT(u.firstName, ' ', u.lastName) as patientName,
        p.diagnosis,
        u.phone as patientPhone
      FROM sessions s
      JOIN patients p ON s.patientId = p.id
      JOIN users u ON p.userId = u.id
      WHERE s.id = ?
    `;

    const updatedSession = await getRow(getSessionSql, [parseInt(id)]);

    res.json({
      success: true,
      message: 'Session updated successfully',
      data: updatedSession
    });

  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ success: false, error: 'Failed to update session' });
  }
};

// Delete session
const deleteSession = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if session exists and belongs to therapist
    const existingSession = await getRow(`
      SELECT * FROM sessions 
      WHERE id = ? AND therapistId = ?
    `, [parseInt(id), req.user.userId]);

    if (!existingSession) {
      return res.status(404).json({
        success: false,
        error: 'Session not found or not authorized'
      });
    }

    // Delete session
    await runQuery(`
      DELETE FROM sessions WHERE id = ?
    `, [parseInt(id)]);

    res.json({
      success: true,
      message: 'Session deleted successfully'
    });

  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete session' });
  }
};

// Get session by ID
const getSessionById = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await getRow(`
      SELECT 
        s.*,
        CONCAT(u.firstName, ' ', u.lastName) as patientName,
        p.diagnosis,
        u.phone as patientPhone
      FROM sessions s
      JOIN patients p ON s.patientId = p.id
      JOIN users u ON p.userId = u.id
      WHERE s.id = ? AND s.therapistId = ?
    `, [parseInt(id), req.user.userId]);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found or not authorized'
      });
    }

    res.json({
      success: true,
      data: session
    });

  } catch (error) {
    console.error('Get session by ID error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch session' });
  }
};

module.exports = {
  getSessions,
  createSession,
  updateSession,
  deleteSession,
  getSessionById
};
