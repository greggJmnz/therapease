const { runQuery, getRow, getAll } = require('../config/database');
const { decryptSensitiveFields } = require('../utils/encryption');
const websocketService = require('../services/websocketService');

// Get all patients for a therapist
const getPatients = async (req, res) => {
  try {
    // Get therapist ID from JWT token
    const therapistId = req.user.userId;

    const sql = `
      SELECT 
        p.id,
        p.userId,
        p.diagnosis,
        p.medicalHistory,
        p.goals,
        p.therapistId,
        p.emergencyContact,
        p.insuranceInfo,
        p.status,
        p.createdAt,
        p.updatedAt,
        u.firstName,
        u.lastName,
        u.email,
        u.phone,
        u.dateOfBirth,
        u.gender,
        u.address,
        u.city,
        u.state,
        u.zipCode
      FROM patients p
      JOIN users u ON p.userId = u.id
      WHERE p.therapistId = ?
      ORDER BY u.firstName, u.lastName
    `;

    const patients = await getAll(sql, [therapistId]);

    // Format patient data
    const formattedPatients = patients.map(patient => ({
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      email: patient.email,
      phone: patient.phone,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      address: patient.address,
      city: patient.city,
      state: patient.state,
      zipCode: patient.zipCode,
      diagnosis: patient.diagnosis,
      medicalHistory: patient.medicalHistory,
      goals: patient.goals,
      status: patient.status,
      emergencyContact: patient.emergencyContact,
      insuranceInfo: patient.insuranceInfo,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt
    }));

    res.json({
      success: true,
      data: {
        patients: formattedPatients,
        total: formattedPatients.length
      }
    });

  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch patients' });
  }
};

// Get patient by ID
const getPatientById = async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT 
        p.id,
        p.userId,
        p.diagnosis,
        p.medicalHistory,
        p.goals,
        p.therapistId,
        p.emergencyContact,
        p.insuranceInfo,
        p.createdAt,
        p.updatedAt,
        u.firstName,
        u.lastName,
        u.email,
        u.phone,
        u.dateOfBirth,
        u.gender,
        u.address,
        u.city,
        u.state,
        u.zipCode
      FROM patients p
      JOIN users u ON p.userId = u.id
      WHERE p.id = ?
    `;

    const patient = await getRow(sql, [parseInt(id)]);

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }

    // Format patient data
    const formattedPatient = {
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      email: patient.email,
      phone: patient.phone,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      address: patient.address,
      city: patient.city,
      state: patient.state,
      zipCode: patient.zipCode,
      diagnosis: patient.diagnosis,
      medicalHistory: patient.medicalHistory,
      goals: patient.goals,
      emergencyContact: patient.emergencyContact,
      insuranceInfo: patient.insuranceInfo,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt
    };

    res.json({
      success: true,
      data: formattedPatient
    });

  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch patient' });
  }
};

// Create new patient
const createPatient = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      address,
      city,
      state,
      zipCode,
      diagnosis,
      medicalHistory,
      goals,
      emergencyContact,
      insuranceInfo
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: firstName, lastName, email'
      });
    }

    // Get therapist ID from request (in real app, get from auth token)
    const therapistId = 2; // Hardcoded for now, should come from JWT token

    // Check if user with email already exists
    const existingUser = await getRow('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Start transaction
    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      // Create user
      const createUserSql = `
        INSERT INTO users (email, password, role, firstName, lastName, phone, dateOfBirth, gender, address, city, state, zipCode)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const userParams = [
        email,
        'password', // Default password, should be hashed
        'patient',
        firstName,
        lastName,
        phone || null,
        dateOfBirth || null,
        gender || null,
        address || null,
        city || null,
        state || null,
        zipCode || null
      ];

      const userResult = await connection.execute(createUserSql, userParams);
      const userId = userResult[0].insertId;

      // Create patient
      const createPatientSql = `
        INSERT INTO patients (userId, diagnosis, medicalHistory, goals, therapistId, emergencyContact, insuranceInfo)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const patientParams = [
        userId,
        diagnosis || null,
        medicalHistory || null,
        goals || null,
        therapistId,
        emergencyContact || null,
        insuranceInfo || null
      ];

      const patientResult = await connection.execute(createPatientSql, patientParams);
      const patientId = patientResult[0].insertId;

      // Commit transaction
      await connection.commit();

      // Get created patient
      const getPatientSql = `
        SELECT 
          p.id,
          p.userId,
          p.diagnosis,
          p.medicalHistory,
          p.goals,
          p.therapistId,
          p.emergencyContact,
          p.insuranceInfo,
          p.createdAt,
          p.updatedAt,
          u.firstName,
          u.lastName,
          u.email,
          u.phone,
          u.dateOfBirth,
          u.gender,
          u.address,
          u.city,
          u.state,
          u.zipCode
        FROM patients p
        JOIN users u ON p.userId = u.id
        WHERE p.id = ?
      `;

      const newPatient = await getRow(getPatientSql, [patientId]);

      // Format patient data
      const formattedPatient = {
        id: newPatient.id,
        firstName: newPatient.firstName,
        lastName: newPatient.lastName,
        email: newPatient.email,
        phone: newPatient.phone,
        dateOfBirth: newPatient.dateOfBirth,
        gender: newPatient.gender,
        address: newPatient.address,
        city: newPatient.city,
        state: newPatient.state,
        zipCode: newPatient.zipCode,
        diagnosis: newPatient.diagnosis,
        medicalHistory: newPatient.medicalHistory,
        goals: newPatient.goals,
        emergencyContact: newPatient.emergencyContact,
        insuranceInfo: newPatient.insuranceInfo,
        createdAt: newPatient.createdAt,
        updatedAt: newPatient.updatedAt
      };

      // Broadcast patient change to all relevant portals
      websocketService.broadcastPatientChange(formattedPatient, 'created');

      res.status(201).json({
        success: true,
        message: 'Patient created successfully',
        data: formattedPatient
      });

    } catch (error) {
      // Rollback transaction on error
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({ success: false, error: 'Failed to create patient' });
  }
};

// Update patient
const updatePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if patient exists
    const existingPatient = await getRow('SELECT * FROM patients WHERE id = ?', [parseInt(id)]);
    if (!existingPatient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }

    // Start transaction
    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      // Update user fields
      const userUpdateFields = [];
      const userUpdateParams = [];

      if (updateData.firstName !== undefined) {
        userUpdateFields.push('firstName = ?');
        userUpdateParams.push(updateData.firstName);
      }

      if (updateData.lastName !== undefined) {
        userUpdateFields.push('lastName = ?');
        userUpdateParams.push(updateData.lastName);
      }

      if (updateData.phone !== undefined) {
        userUpdateFields.push('phone = ?');
        userUpdateParams.push(updateData.phone);
      }

      if (updateData.dateOfBirth !== undefined) {
        userUpdateFields.push('dateOfBirth = ?');
        userUpdateParams.push(updateData.dateOfBirth);
      }

      if (updateData.gender !== undefined) {
        userUpdateFields.push('gender = ?');
        userUpdateParams.push(updateData.gender);
      }

      if (updateData.address !== undefined) {
        userUpdateFields.push('address = ?');
        userUpdateParams.push(updateData.address);
      }

      if (updateData.city !== undefined) {
        userUpdateFields.push('city = ?');
        userUpdateParams.push(updateData.city);
      }

      if (updateData.state !== undefined) {
        userUpdateFields.push('state = ?');
        userUpdateParams.push(updateData.state);
      }

      if (updateData.zipCode !== undefined) {
        userUpdateFields.push('zipCode = ?');
        userUpdateParams.push(updateData.zipCode);
      }

      // Update patient fields
      const patientUpdateFields = [];
      const patientUpdateParams = [];

      if (updateData.diagnosis !== undefined) {
        patientUpdateFields.push('diagnosis = ?');
        patientUpdateParams.push(updateData.diagnosis);
      }

      if (updateData.medicalHistory !== undefined) {
        patientUpdateFields.push('medicalHistory = ?');
        patientUpdateParams.push(updateData.medicalHistory);
      }

      if (updateData.goals !== undefined) {
        patientUpdateFields.push('goals = ?');
        patientUpdateParams.push(updateData.goals);
      }

      if (updateData.emergencyContact !== undefined) {
        patientUpdateFields.push('emergencyContact = ?');
        patientUpdateParams.push(updateData.emergencyContact);
      }

      if (updateData.insuranceInfo !== undefined) {
        patientUpdateFields.push('insuranceInfo = ?');
        patientUpdateParams.push(updateData.insuranceInfo);
      }

      // Update user if there are user fields to update
      if (userUpdateFields.length > 0) {
        const updateUserSql = `
          UPDATE users 
          SET ${userUpdateFields.join(', ')}, updatedAt = CURRENT_TIMESTAMP
          WHERE id = ?
        `;
        
        userUpdateParams.push(existingPatient.userId);
        await connection.execute(updateUserSql, userUpdateParams);
      }

      // Update patient if there are patient fields to update
      if (patientUpdateFields.length > 0) {
        const updatePatientSql = `
          UPDATE patients 
          SET ${patientUpdateFields.join(', ')}, updatedAt = CURRENT_TIMESTAMP
          WHERE id = ?
        `;
        
        patientUpdateParams.push(parseInt(id));
        await connection.execute(updatePatientSql, patientUpdateParams);
      }

      // Commit transaction
      await connection.commit();

      // Get updated patient
      const getPatientSql = `
        SELECT 
          p.id,
          p.userId,
          p.diagnosis,
          p.medicalHistory,
          p.goals,
          p.therapistId,
          p.emergencyContact,
          p.insuranceInfo,
          p.createdAt,
          p.updatedAt,
          u.firstName,
          u.lastName,
          u.email,
          u.phone,
          u.dateOfBirth,
          u.gender,
          u.address,
          u.city,
          u.state,
          u.zipCode
        FROM patients p
        JOIN users u ON p.userId = u.id
        WHERE p.id = ?
      `;

      const updatedPatient = await getRow(getPatientSql, [parseInt(id)]);

      // Format patient data
      const formattedPatient = {
        id: updatedPatient.id,
        firstName: updatedPatient.firstName,
        lastName: updatedPatient.lastName,
        email: updatedPatient.email,
        phone: updatedPatient.phone,
        dateOfBirth: updatedPatient.dateOfBirth,
        gender: updatedPatient.gender,
        address: updatedPatient.address,
        city: updatedPatient.city,
        state: updatedPatient.state,
        zipCode: updatedPatient.zipCode,
        diagnosis: updatedPatient.diagnosis,
        medicalHistory: updatedPatient.medicalHistory,
        goals: updatedPatient.goals,
        emergencyContact: updatedPatient.emergencyContact,
        insuranceInfo: updatedPatient.insuranceInfo,
        createdAt: updatedPatient.createdAt,
        updatedAt: updatedPatient.updatedAt
      };

      // Broadcast patient change to all relevant portals
      websocketService.broadcastPatientChange(formattedPatient, 'updated');

      res.json({
        success: true,
        message: 'Patient updated successfully',
        data: formattedPatient
      });

    } catch (error) {
      // Rollback transaction on error
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({ success: false, error: 'Failed to update patient' });
  }
};

// Delete patient
const deletePatient = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if patient exists
    const existingPatient = await getRow('SELECT * FROM patients WHERE id = ?', [parseInt(id)]);
    if (!existingPatient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }

    // Delete patient (this will cascade to delete user due to foreign key constraint)
    await runQuery('DELETE FROM patients WHERE id = ?', [parseInt(id)]);

    res.json({
      success: true,
      message: 'Patient deleted successfully',
      data: existingPatient
    });

  } catch (error) {
    console.error('Delete patient error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete patient' });
  }
};

// Patient Portal Methods

// Get patient dashboard
const getDashboard = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get patient data
    const patient = await getRow(`
      SELECT p.*, u.firstName, u.lastName, u.email, u.phone, u.dateOfBirth, u.gender
      FROM patients p
      JOIN users u ON p.userId = u.id
      WHERE p.userId = ?
    `, [userId]);

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }

    // Get therapist info
    const therapist = await getRow(`
      SELECT u.firstName, u.lastName, u.email, u.phone, t.specialization, t.yearsOfExperience
      FROM users u
      JOIN therapists t ON u.id = t.userId
      WHERE u.id = ?
    `, [patient.therapistId]);

    // Get recent assessments
    const assessments = await getAll(`
      SELECT id, title, type, assessmentDate, status, score, maxScore
      FROM assessments
      WHERE patientId = ?
      ORDER BY assessmentDate DESC
      LIMIT 5
    `, [patient.id]);

    // Get upcoming appointments
    const appointments = await getAll(`
      SELECT id, appointmentDate, startTime, endTime, type, status
      FROM appointments
      WHERE patientId = ? AND appointmentDate >= CURDATE()
      ORDER BY appointmentDate, startTime
      LIMIT 5
    `, [patient.id]);

    // Get recent progress entries
    const progress = await getAll(`
      SELECT area, currentScore, targetScore, measurementDate, progressNotes
      FROM progress_tracking
      WHERE patientId = ?
      ORDER BY measurementDate DESC
      LIMIT 5
    `, [patient.id]);

    res.json({
      success: true,
      data: {
        patient: {
          id: patient.id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          email: patient.email,
          phone: patient.phone,
          dateOfBirth: patient.dateOfBirth,
          gender: patient.gender,
          diagnosis: patient.diagnosis,
          goals: patient.goals
        },
        therapist: therapist ? {
          firstName: therapist.firstName,
          lastName: therapist.lastName,
          email: therapist.email,
          phone: therapist.phone,
          specialization: therapist.specialization,
          yearsOfExperience: therapist.yearsOfExperience
        } : null,
        recentAssessments: assessments,
        upcomingAppointments: appointments,
        recentProgress: progress
      }
    });

  } catch (error) {
    console.error('Get patient dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to get dashboard data' });
  }
};

// Get patient progress
const getProgress = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get patient ID
    const patient = await getRow('SELECT id FROM patients WHERE userId = ?', [userId]);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    // Get progress data
    const progress = await getAll(`
      SELECT area, baselineScore, currentScore, targetScore, measurementDate, progressNotes, nextReviewDate
      FROM progress_tracking
      WHERE patientId = ?
      ORDER BY measurementDate DESC
    `, [patient.id]);

    res.json({
      success: true,
      data: progress
    });

  } catch (error) {
    console.error('Get patient progress error:', error);
    res.status(500).json({ success: false, error: 'Failed to get progress data' });
  }
};

// Get patient appointments
const getAppointments = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get patient ID
    const patient = await getRow('SELECT id FROM patients WHERE userId = ?', [userId]);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    // Get appointments
    const appointments = await getAll(`
      SELECT id, appointmentDate, startTime, endTime, duration, type, status, notes
      FROM appointments
      WHERE patientId = ?
      ORDER BY appointmentDate DESC, startTime DESC
    `, [patient.id]);

    res.json({
      success: true,
      data: appointments
    });

  } catch (error) {
    console.error('Get patient appointments error:', error);
    res.status(500).json({ success: false, error: 'Failed to get appointments' });
  }
};

// Cancel appointment
const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    // Get patient ID
    const patient = await getRow('SELECT id FROM patients WHERE userId = ?', [userId]);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    // Check if appointment exists and belongs to patient
    const appointment = await getRow(`
      SELECT * FROM appointments 
      WHERE id = ? AND patientId = ?
    `, [parseInt(id), patient.id]);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found or not authorized'
      });
    }

    // Update appointment status
    await runQuery(`
      UPDATE appointments 
      SET status = 'cancelled', updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [parseInt(id)]);

    res.json({
      success: true,
      message: 'Appointment cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel appointment' });
  }
};

// Reschedule appointment
const rescheduleAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { appointmentDate, startTime, endTime } = req.body;
    const userId = req.user.userId;
    
    // Get patient ID
    const patient = await getRow('SELECT id FROM patients WHERE userId = ?', [userId]);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    // Check if appointment exists and belongs to patient
    const appointment = await getRow(`
      SELECT * FROM appointments 
      WHERE id = ? AND patientId = ?
    `, [parseInt(id), patient.id]);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found or not authorized'
      });
    }

    // Update appointment
    await runQuery(`
      UPDATE appointments 
      SET appointmentDate = ?, startTime = ?, endTime = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [appointmentDate, startTime, endTime, parseInt(id)]);

    res.json({
      success: true,
      message: 'Appointment rescheduled successfully'
    });
  } catch (error) {
    console.error('Reschedule appointment error:', error);
    res.status(500).json({ success: false, error: 'Failed to reschedule appointment' });
  }
};

// Get patient daily notes
const getDailyNotes = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get patient ID
    const patient = await getRow('SELECT id FROM patients WHERE userId = ?', [userId]);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    // Get daily notes with comments
    const notes = await getAll(`
      SELECT 
        dn.id,
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
        CONCAT(u.firstName, ' ', u.lastName) as therapistName
      FROM daily_notes dn
      JOIN users u ON dn.therapistId = u.id
      WHERE dn.patientId = ?
      ORDER BY dn.sessionDate DESC
    `, [patient.id]);

    // Decrypt sensitive fields for patient and parse comments
    const decryptedNotes = notes.map(note => {
      const decryptedNote = decryptSensitiveFields(note, ['content', 'activities', 'observations', 'progress', 'challenges', 'nextSteps', 'goals']);
      
      // Parse comments from JSON string or initialize empty array
      let comments = [];
      try {
        if (note.comments) {
          comments = JSON.parse(note.comments);
        }
      } catch (error) {
        console.error('Error parsing comments for note', note.id, ':', error);
        comments = [];
      }
      
      return {
        ...decryptedNote,
        comments: Array.isArray(comments) ? comments : []
      };
    });


    res.json({
      success: true,
      data: decryptedNotes
    });

  } catch (error) {
    console.error('Get patient daily notes error:', error);
    res.status(500).json({ success: false, error: 'Failed to get daily notes' });
  }
};

// Add comment to daily note
const addNoteComment = async (req, res) => {
  try {
    console.log('Add note comment called with:', { params: req.params, body: req.body, user: req.user });
    
    const { id } = req.params;
    const { comment } = req.body;
    const userId = req.user.userId;
    
    console.log('Processing comment for note:', id, 'by user:', userId);
    
    // Get patient ID
    const patient = await getRow('SELECT id FROM patients WHERE userId = ?', [userId]);
    console.log('Patient found:', patient);
    
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    // Verify note belongs to patient
    const note = await getRow('SELECT * FROM daily_notes WHERE id = ? AND patientId = ?', [id, patient.id]);
    console.log('Note found:', note);
    
    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    // Create the comment object
    const newComment = {
      id: Date.now(), // Simple ID generation
      author: 'Patient',
      content: comment,
      timestamp: new Date().toISOString()
    };

    console.log('Created comment:', newComment);

    // Store the comment in the database
    // For now, we'll store comments as JSON in a comments field
    // In a real implementation, you would have a separate comments table
    const existingComments = note.comments ? JSON.parse(note.comments) : [];
    const updatedComments = [...existingComments, newComment];
    
    // Update the note with the new comment
    await runQuery(
      'UPDATE daily_notes SET comments = ? WHERE id = ?',
      [JSON.stringify(updatedComments), id]
    );

    console.log('Comment stored in database:', updatedComments);

    // Get updated note with therapist info for broadcasting
    const updatedNote = await getRow(`
      SELECT 
        dn.*,
        CONCAT(u.firstName, ' ', u.lastName) as therapistName,
        dn.therapistId
      FROM daily_notes dn
      JOIN users u ON dn.therapistId = u.id
      WHERE dn.id = ?
    `, [id]);

    // Broadcast daily note change
    websocketService.broadcastDailyNoteChange(updatedNote, 'updated');

    const response = {
      success: true,
      message: 'Comment added successfully',
      data: {
        noteId: parseInt(id),
        comment: newComment
      }
    };
    
    console.log('Sending response:', response);
    res.json(response);

  } catch (error) {
    console.error('Add note comment error:', error);
    res.status(500).json({ success: false, error: 'Failed to add comment' });
  }
};

// Edit comment in daily note
const editNoteComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const { comment } = req.body;
    const userId = req.user.userId;
    
    // Get patient ID
    const patient = await getRow('SELECT id FROM patients WHERE userId = ?', [userId]);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    // Verify note belongs to patient
    const note = await getRow('SELECT * FROM daily_notes WHERE id = ? AND patientId = ?', [id, patient.id]);
    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    // Parse existing comments
    const existingComments = note.comments ? JSON.parse(note.comments) : [];
    
    // Find and update the comment
    const commentIndex = existingComments.findIndex(c => c.id === parseInt(commentId));
    if (commentIndex === -1) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    // Check if comment belongs to patient
    if (existingComments[commentIndex].author !== 'Patient') {
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
        CONCAT(u.firstName, ' ', u.lastName) as therapistName,
        dn.therapistId
      FROM daily_notes dn
      JOIN users u ON dn.therapistId = u.id
      WHERE dn.id = ?
    `, [id]);

    // Broadcast the change
    websocketService.broadcastDailyNoteChange(updatedNote, 'comment_edited');

    res.json({ success: true, message: 'Comment updated successfully' });
  } catch (error) {
    console.error('Error editing comment:', error);
    res.status(500).json({ success: false, error: 'Failed to edit comment' });
  }
};

// Delete comment from daily note
const deleteNoteComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const userId = req.user.userId;
    
    // Get patient ID
    const patient = await getRow('SELECT id FROM patients WHERE userId = ?', [userId]);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    // Verify note belongs to patient
    const note = await getRow('SELECT * FROM daily_notes WHERE id = ? AND patientId = ?', [id, patient.id]);
    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    // Parse existing comments
    const existingComments = note.comments ? JSON.parse(note.comments) : [];
    
    // Find and remove the comment
    const commentIndex = existingComments.findIndex(c => c.id === parseInt(commentId));
    if (commentIndex === -1) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    // Check if comment belongs to patient
    if (existingComments[commentIndex].author !== 'Patient') {
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
        CONCAT(u.firstName, ' ', u.lastName) as therapistName,
        dn.therapistId
      FROM daily_notes dn
      JOIN users u ON dn.therapistId = u.id
      WHERE dn.id = ?
    `, [id]);

    // Broadcast the change
    websocketService.broadcastDailyNoteChange(updatedNote, 'comment_deleted');

    res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ success: false, error: 'Failed to delete comment' });
  }
};

// Get patient sessions (same as appointments for now)
const getSessions = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get patient ID
    const patient = await getRow('SELECT id FROM patients WHERE userId = ?', [userId]);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    // Get sessions with therapist info
    const sessions = await getAll(`
      SELECT 
        s.id, 
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
        CONCAT(u.firstName, ' ', u.lastName) as therapistName,
        u.phone as therapistPhone
      FROM sessions s
      JOIN therapists t ON s.therapistId = t.id
      JOIN users u ON t.userId = u.id
      WHERE s.patientId = ?
      ORDER BY s.sessionDate DESC, s.startTime DESC
    `, [patient.id]);

    res.json({
      success: true,
      data: { sessions }
    });

  } catch (error) {
    console.error('Get patient sessions error:', error);
    res.status(500).json({ success: false, error: 'Failed to get sessions' });
  }
};

// Get patient assessments
const getAssessments = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get patient ID
    const patient = await getRow('SELECT id FROM patients WHERE userId = ?', [userId]);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    // Get assessments
    const assessments = await getAll(`
      SELECT id, title, type, category, assessmentDate, status, score, maxScore, summary, aiInsights
      FROM assessments
      WHERE patientId = ?
      ORDER BY assessmentDate DESC
    `, [patient.id]);

    res.json({
      success: true,
      data: assessments
    });

  } catch (error) {
    console.error('Get patient assessments error:', error);
    res.status(500).json({ success: false, error: 'Failed to get assessments' });
  }
};

// Get home exercises
const getHomeExercises = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get patient ID
    const patient = await getRow('SELECT id FROM patients WHERE userId = ?', [userId]);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    // Get home exercises
    const exercises = await getAll(`
      SELECT 
        id, title, description, category, instructions, duration, frequency, 
        difficulty, equipment, progressScore, lastCompleted, streak, isCompleted, 
        assignedDate, dueDate
      FROM home_exercises
      WHERE patientId = ?
      ORDER BY assignedDate DESC
    `, [patient.id]);

    res.json({
      success: true,
      data: exercises
    });

  } catch (error) {
    console.error('Get home exercises error:', error);
    res.status(500).json({ success: false, error: 'Failed to get home exercises' });
  }
};

// Get patient notifications
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get notifications
    const notifications = await getAll(`
      SELECT id, title, message, type, isRead, createdAt
      FROM notifications
      WHERE userId = ?
      ORDER BY createdAt DESC
    `, [userId]);

    res.json({
      success: true,
      data: notifications
    });

  } catch (error) {
    console.error('Get patient notifications error:', error);
    res.status(500).json({ success: false, error: 'Failed to get notifications' });
  }
};

// Get patient settings
const getSettings = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user settings
    const user = await getRow(`
      SELECT firstName, lastName, email, phone, dateOfBirth, gender, address, city, state, zipCode
      FROM users
      WHERE id = ?
    `, [userId]);

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Get patient settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to get settings' });
  }
};

module.exports = {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
  // Patient portal methods
  getDashboard,
  getProgress,
  getAppointments,
  cancelAppointment,
  rescheduleAppointment,
  getDailyNotes,
  addNoteComment,
  editNoteComment,
  deleteNoteComment,
  getSessions,
  getAssessments,
  getHomeExercises,
  getNotifications,
  getSettings
};

