const { runQuery, getRow, getAll } = require('../config/database');
const { decryptSensitiveFields } = require('../utils/encryption');
const websocketService = require('../services/websocketService');

// Get daily notes for a therapist
const getDailyNotes = async (req, res) => {
  try {
    // Ensure comments column exists and is properly structured
    try {
      // Check if comments column exists first
      const [columns] = await runQuery(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'daily_notes' 
        AND COLUMN_NAME = 'comments'
      `);
      
      if (columns.length === 0) {
        await runQuery(`ALTER TABLE daily_notes ADD COLUMN comments TEXT`);
      } else {
      }
    } catch (error) {
    }

    // Get therapist ID from JWT token (this is the user ID from users table)
    const therapistId = req.user.id;
    const { page = 1, limit = 20, patientId, dateFrom, dateTo } = req.query || {};
    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereConditions = ['dn.therapistId = ?'];
    let params = [therapistId];

    if (patientId) {
      whereConditions.push('dn.patientId = ?');
      params.push(parseInt(patientId));
    }

    if (dateFrom) {
      whereConditions.push('dn.sessionDate >= ?');
      params.push(dateFrom);
    }

    if (dateTo) {
      whereConditions.push('dn.sessionDate <= ?');
      params.push(dateTo);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Get total count
    const countSql = `
      SELECT COUNT(*) as total
      FROM daily_notes dn
      ${whereClause}
    `;
    
    const [countResult] = await getAll(countSql, params);
    const total = countResult.total;

    // Get daily notes with patient info
    const sql = `
      SELECT 
        dn.id,
        dn.patientId,
        dn.therapistId,
        dn.sessionDate,
        dn.sessionDuration,
        dn.content,
        dn.activities,
        dn.observations,
        dn.progress,
        dn.challenges,
        dn.nextSteps,
        dn.goals,
        dn.mood,
        dn.engagement,
        dn.comments,
        dn.createdAt,
        dn.updatedAt,
        CONCAT(u.firstName, ' ', u.lastName) as patientName,
        p.diagnosis
      FROM daily_notes dn
      JOIN patients p ON dn.patientId = p.id
      JOIN users u ON p.userId = u.id
      ${whereClause}
      ORDER BY dn.sessionDate DESC, dn.createdAt DESC
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...params, parseInt(limit), offset];
    const dailyNotes = await getAll(sql, queryParams);
    

    // Process notes and handle encryption gracefully
    const decryptedNotes = dailyNotes.map(note => {
      // Try to decrypt sensitive fields, but handle errors gracefully
      let processedNote = { ...note };
      
      try {
        processedNote = decryptSensitiveFields(note, ['content', 'activities', 'observations', 'progress', 'challenges', 'nextSteps', 'goals']);
      } catch (error) {
        // If decryption fails, use original data
        processedNote = note;
      }
      
      // Parse comments from JSON string or initialize empty array
      let comments = [];
      try {
        if (note.comments) {
          comments = JSON.parse(note.comments);
        }
      } catch (error) {
        console.log('Error parsing comments for note', note.id, ':', error.message);
        comments = [];
      }
      
      return {
        ...processedNote,
        comments: Array.isArray(comments) ? comments : []
      };
    });

    const response = {
      success: true,
      data: {
        dailyNotes: decryptedNotes,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    };


    res.json(response);

  } catch (error) {
    console.error('Get daily notes error:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ success: false, error: 'Failed to fetch daily notes', details: error.message });
  }
};

// Create new daily note
const createDailyNote = async (req, res) => {
  try {
    const {
      patientId,
      sessionDate,
      sessionDuration,
      content,
      activities,
      observations,
      progress,
      challenges,
      nextSteps,
      goals,
      mood,
      engagement
    } = req.body;

    // Validate required fields
    if (!patientId || !sessionDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: patientId, sessionDate'
      });
    }

    // Get therapist ID from JWT token
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

    // Insert daily note
    const insertSql = `
      INSERT INTO daily_notes (
        patientId, therapistId, sessionDate, sessionDuration, content, activities,
        observations, progress, challenges, nextSteps, goals, mood, engagement
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const insertParams = [
      parseInt(patientId),
      therapistId,
      sessionDate,
      sessionDuration || null,
      content || null,
      activities || null,
      observations || null,
      progress || null,
      challenges || null,
      nextSteps || null,
      goals || null,
      mood || null,
      engagement || null
    ];

    const result = await runQuery(insertSql, insertParams);
    const noteId = result.insertId;

    // Get the created note
    const getNoteSql = `
      SELECT 
        dn.*,
        CONCAT(u.firstName, ' ', u.lastName) as patientName,
        p.diagnosis
      FROM daily_notes dn
      JOIN patients p ON dn.patientId = p.id
      JOIN users u ON p.userId = u.id
      WHERE dn.id = ?
    `;

    const newNote = await getRow(getNoteSql, [noteId]);

    // Broadcast daily note change
    websocketService.broadcastDailyNoteChange(newNote, 'created');

    res.status(201).json({
      success: true,
      message: 'Daily note created successfully',
      data: newNote
    });

  } catch (error) {
    console.error('Create daily note error:', error);
    res.status(500).json({ success: false, error: 'Failed to create daily note' });
  }
};

// Update daily note
const updateDailyNote = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const therapistId = req.user.id;

    // Check if note exists and belongs to therapist
    const existingNote = await getRow(`
      SELECT * FROM daily_notes 
      WHERE id = ? AND therapistId = ?
    `, [parseInt(id), therapistId]);

    if (!existingNote) {
      return res.status(404).json({
        success: false,
        error: 'Daily note not found or not authorized'
      });
    }

    // Prepare update data
    const updateFields = [];
    const updateParams = [];

    if (updateData.sessionDate !== undefined) {
      updateFields.push('sessionDate = ?');
      updateParams.push(updateData.sessionDate);
    }

    if (updateData.sessionDuration !== undefined) {
      updateFields.push('sessionDuration = ?');
      updateParams.push(updateData.sessionDuration);
    }

    if (updateData.activities !== undefined) {
      updateFields.push('activities = ?');
      updateParams.push(updateData.activities);
    }

    if (updateData.observations !== undefined) {
      updateFields.push('observations = ?');
      updateParams.push(updateData.observations);
    }

    if (updateData.progress !== undefined) {
      updateFields.push('progress = ?');
      updateParams.push(updateData.progress);
    }

    if (updateData.challenges !== undefined) {
      updateFields.push('challenges = ?');
      updateParams.push(updateData.challenges);
    }

    if (updateData.nextSteps !== undefined) {
      updateFields.push('nextSteps = ?');
      updateParams.push(updateData.nextSteps);
    }

    if (updateData.mood !== undefined) {
      updateFields.push('mood = ?');
      updateParams.push(updateData.mood);
    }

    if (updateData.engagement !== undefined) {
      updateFields.push('engagement = ?');
      updateParams.push(updateData.engagement);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    // Add note ID to params
    updateParams.push(parseInt(id));

    // Update note
    const updateSql = `
      UPDATE daily_notes 
      SET ${updateFields.join(', ')}, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await runQuery(updateSql, updateParams);

    // Get updated note
    const getNoteSql = `
      SELECT 
        dn.*,
        CONCAT(u.firstName, ' ', u.lastName) as patientName,
        p.diagnosis
      FROM daily_notes dn
      JOIN patients p ON dn.patientId = p.id
      JOIN users u ON p.userId = u.id
      WHERE dn.id = ?
    `;

    const updatedNote = await getRow(getNoteSql, [parseInt(id)]);

    // Broadcast daily note change
    websocketService.broadcastDailyNoteChange(updatedNote, 'updated');

    res.json({
      success: true,
      message: 'Daily note updated successfully',
      data: updatedNote
    });

  } catch (error) {
    console.error('Update daily note error:', error);
    res.status(500).json({ success: false, error: 'Failed to update daily note' });
  }
};

// Delete daily note
const deleteDailyNote = async (req, res) => {
  try {
    const { id } = req.params;
    const therapistId = req.user.id;

    // Check if note exists and belongs to therapist
    const existingNote = await getRow(`
      SELECT * FROM daily_notes 
      WHERE id = ? AND therapistId = ?
    `, [parseInt(id), therapistId]);

    if (!existingNote) {
      return res.status(404).json({
        success: false,
        error: 'Daily note not found or not authorized'
      });
    }

    // Delete note
    await runQuery('DELETE FROM daily_notes WHERE id = ?', [parseInt(id)]);

    // Broadcast daily note change
    websocketService.broadcastDailyNoteChange(existingNote, 'deleted');

    res.json({
      success: true,
      message: 'Daily note deleted successfully',
      data: existingNote
    });

  } catch (error) {
    console.error('Delete daily note error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete daily note' });
  }
};

// Get daily note by ID
const getDailyNoteById = async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT 
        dn.*,
        CONCAT(u.firstName, ' ', u.lastName) as patientName,
        p.diagnosis
      FROM daily_notes dn
      JOIN patients p ON dn.patientId = p.id
      JOIN users u ON p.userId = u.id
      WHERE dn.id = ?
    `;

    const dailyNote = await getRow(sql, [parseInt(id)]);

    if (!dailyNote) {
      return res.status(404).json({
        success: false,
        error: 'Daily note not found'
      });
    }

    res.json({
      success: true,
      data: dailyNote
    });

  } catch (error) {
    console.error('Get daily note error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch daily note' });
  }
};

// Add therapist comment to daily note
const addNoteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const therapistId = req.user.id;
    
    
    // Validate comment
    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Comment is required and must be a non-empty string' 
      });
    }
    
    // Verify note belongs to therapist
    const note = await getRow('SELECT * FROM daily_notes WHERE id = ? AND therapistId = ?', [id, therapistId]);
    
    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    // Create the comment object
    const newComment = {
      id: Date.now(),
      author: 'Therapist',
      content: comment,
      timestamp: new Date().toISOString()
    };

    // Store the comment in the database
    let existingComments = [];
    try {
      existingComments = note.comments ? JSON.parse(note.comments) : [];
    } catch (e) {
      console.error('Error parsing existing comments:', e);
      existingComments = [];
    }
    const updatedComments = [...existingComments, newComment];
    
    // Update the note with the new comment
    await runQuery(
      'UPDATE daily_notes SET comments = ? WHERE id = ?',
      [JSON.stringify(updatedComments), id]
    );


    // Get updated note with patient info for broadcasting
    const updatedNote = await getRow(`
      SELECT 
        dn.*,
        CONCAT(u.firstName, ' ', u.lastName) as patientName,
        p.userId as patientUserId
      FROM daily_notes dn
      JOIN patients p ON dn.patientId = p.id
      JOIN users u ON p.userId = u.id
      WHERE dn.id = ?
    `, [id]);

    // Broadcast daily note change
    websocketService.broadcastDailyNoteChange(updatedNote, 'updated');

    res.json({
      success: true,
      message: 'Comment added successfully',
      data: {
        noteId: parseInt(id),
        comment: newComment
      }
    });

  } catch (error) {
    console.error('Add therapist comment error:', error);
    res.status(500).json({ success: false, error: 'Failed to add comment' });
  }
};

// Edit therapist comment in daily note
const editNoteComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const { comment } = req.body;
    const therapistId = req.user.id;
    
    // Validate comment
    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Comment is required and must be a non-empty string' 
      });
    }
    
    // Verify note belongs to therapist
    const note = await getRow('SELECT * FROM daily_notes WHERE id = ? AND therapistId = ?', [id, therapistId]);
    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    // Parse existing comments
    let existingComments = [];
    try {
      existingComments = note.comments ? JSON.parse(note.comments) : [];
    } catch (e) {
      console.error('Error parsing existing comments:', e);
      existingComments = [];
    }
    
    // Find and update the comment
    const commentIndex = existingComments.findIndex(c => c.id === parseInt(commentId));
    if (commentIndex === -1) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    // Check if comment belongs to therapist
    if (existingComments[commentIndex].author !== 'Therapist') {
      return res.status(403).json({ success: false, error: 'Not authorized to edit this comment' });
    }

    // Update the comment
    existingComments[commentIndex].content = comment;
    existingComments[commentIndex].edited = true;
    existingComments[commentIndex].editedAt = new Date().toISOString();

    // Update the note with the edited comment
    await runQuery(
      'UPDATE daily_notes SET comments = ? WHERE id = ?',
      [JSON.stringify(existingComments), id]
    );

    // Get updated note for broadcasting
    const updatedNote = await getRow(`
      SELECT 
        dn.*,
        CONCAT(u.firstName, ' ', u.lastName) as patientName,
        p.userId as patientUserId
      FROM daily_notes dn
      JOIN patients p ON dn.patientId = p.id
      JOIN users u ON p.userId = u.id
      WHERE dn.id = ?
    `, [id]);

    // Broadcast the change
    websocketService.broadcastDailyNoteChange(updatedNote, 'comment_edited');

    res.json({ success: true, message: 'Comment updated successfully' });
  } catch (error) {
    console.error('Error editing therapist comment:', error);
    res.status(500).json({ success: false, error: 'Failed to edit comment' });
  }
};

// Delete therapist comment from daily note
const deleteNoteComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const therapistId = req.user.id;
    
    // Verify note belongs to therapist
    const note = await getRow('SELECT * FROM daily_notes WHERE id = ? AND therapistId = ?', [id, therapistId]);
    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    // Parse existing comments
    let existingComments = [];
    try {
      existingComments = note.comments ? JSON.parse(note.comments) : [];
    } catch (e) {
      console.error('Error parsing existing comments:', e);
      existingComments = [];
    }
    
    // Find and remove the comment
    const commentIndex = existingComments.findIndex(c => c.id === parseInt(commentId));
    if (commentIndex === -1) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    // Check if comment belongs to therapist
    if (existingComments[commentIndex].author !== 'Therapist') {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this comment' });
    }

    // Remove the comment
    existingComments.splice(commentIndex, 1);

    // Update the note with the updated comments
    await runQuery(
      'UPDATE daily_notes SET comments = ? WHERE id = ?',
      [JSON.stringify(existingComments), id]
    );

    // Get updated note for broadcasting
    const updatedNote = await getRow(`
      SELECT 
        dn.*,
        CONCAT(u.firstName, ' ', u.lastName) as patientName,
        p.userId as patientUserId
      FROM daily_notes dn
      JOIN patients p ON dn.patientId = p.id
      JOIN users u ON p.userId = u.id
      WHERE dn.id = ?
    `, [id]);

    // Broadcast the change
    websocketService.broadcastDailyNoteChange(updatedNote, 'comment_deleted');

    res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting therapist comment:', error);
    res.status(500).json({ success: false, error: 'Failed to delete comment' });
  }
};

module.exports = {
  getDailyNotes,
  createDailyNote,
  updateDailyNote,
  deleteDailyNote,
  getDailyNoteById,
  addNoteComment,
  editNoteComment,
  deleteNoteComment
};

