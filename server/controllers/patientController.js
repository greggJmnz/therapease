const { runQuery, getRow, getAll, getConnection } = require('../config/database');
const { decryptSensitiveFields } = require('../utils/encryption');
const websocketService = require('../services/websocketService');

// Helper function to convert 24-hour time to 12-hour format
const formatTime12Hour = (time24) => {
  if (!time24) return '';
  
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  
  return `${hour12}:${minutes} ${ampm}`;
};

// Helper function to calculate time ago (same as admin controller)
const getTimeAgo = (date) => {
  const now = new Date();
  const diffInMs = now - date;
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  } else {
    return date.toLocaleDateString('en-US');
  }
};

// Get all patients for a therapist
const getPatients = async (req, res) => {
  try {
    // Get therapist ID from JWT token
    const therapistId = req.user.id;

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
        u.zipCode,
        -- Progress tracking data
        (SELECT COUNT(*) FROM sessions s WHERE s.patientId = p.id AND s.status = 'completed') as sessionsCompleted,
        (SELECT COUNT(*) FROM specific_objectives so 
         JOIN main_objectives mo ON so.mainObjectiveId = mo.id 
         JOIN treatment_plans tp ON mo.treatmentPlanId = tp.id 
         WHERE tp.patientId = p.id AND so.isCompleted = 1) as goalsAchieved,
        (SELECT AVG(tp.overallProgress) FROM treatment_plans tp WHERE tp.patientId = p.id AND tp.status = 'active') as overallProgress,
        (SELECT COUNT(*) FROM treatment_plans tp WHERE tp.patientId = p.id AND tp.status = 'active') as activeTreatmentPlans,
        (SELECT COUNT(*) FROM assessments a WHERE a.patientId = p.id AND a.status = 'completed') as assessmentsCompleted
      FROM patients p
      JOIN users u ON p.userId = u.id
      WHERE p.id IN (
        SELECT pta.patientId 
        FROM patient_therapist_assignments pta 
        WHERE pta.therapistId = ? AND pta.status = 'active'
      )
      ORDER BY u.firstName, u.lastName
    `;

    const patients = await getAll(sql, [therapistId]);

    // Get assignment details for each patient
    const patientsWithAssignments = await Promise.all(patients.map(async (patient) => {
      const assignmentSql = `
        SELECT 
          pta.assignmentType,
          pta.assignedAt,
          pta.status as assignmentStatus,
          CONCAT(u.firstName, ' ', u.lastName) as therapistName,
          u.id as therapistUserId
        FROM patient_therapist_assignments pta
        JOIN users u ON pta.therapistId = u.id
        WHERE pta.patientId = ? AND pta.status = 'active'
        ORDER BY pta.assignmentType, pta.assignedAt
      `;
      
      const assignments = await getAll(assignmentSql, [patient.id]);
      
      return {
        ...patient,
        therapistAssignments: assignments
      };
    }));

    // Import decryption utility
    const { decryptField } = require('../utils/encryption');

    // Format patient data and decrypt sensitive fields
    const formattedPatients = patientsWithAssignments.map(patient => ({
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      email: decryptField(patient.email),
      phone: decryptField(patient.phone),
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      address: decryptField(patient.address),
      city: patient.city,
      state: patient.state,
      zipCode: patient.zipCode,
      diagnosis: patient.diagnosis,
      medicalHistory: patient.medicalHistory,
      goals: patient.goals,
      status: patient.status,
      emergencyContact: decryptField(patient.emergencyContact),
      insuranceInfo: decryptField(patient.insuranceInfo),
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
      // Progress tracking data
      progress: {
        overallProgress: parseFloat(patient.overallProgress || 0).toFixed(1),
        sessionsCompleted: patient.sessionsCompleted || 0,
        goalsAchieved: patient.goalsAchieved || 0,
        activeTreatmentPlans: patient.activeTreatmentPlans || 0,
        assessmentsCompleted: patient.assessmentsCompleted || 0
      },
      // Therapist assignments
      therapistAssignments: patient.therapistAssignments || []
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

    // Import decryption utility
    const { decryptField } = require('../utils/encryption');

    // Format patient data and decrypt sensitive fields
    const formattedPatient = {
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      email: decryptField(patient.email),
      phone: decryptField(patient.phone),
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      address: decryptField(patient.address),
      city: patient.city,
      state: patient.state,
      zipCode: patient.zipCode,
      diagnosis: patient.diagnosis,
      medicalHistory: patient.medicalHistory,
      goals: patient.goals,
      emergencyContact: decryptField(patient.emergencyContact),
      insuranceInfo: decryptField(patient.insuranceInfo),
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
          u.zipCode,
          u.country
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
        // Convert ISO date string to YYYY-MM-DD format for MySQL
        const dateValue = updateData.dateOfBirth instanceof Date 
          ? updateData.dateOfBirth.toISOString().split('T')[0]
          : new Date(updateData.dateOfBirth).toISOString().split('T')[0];
        userUpdateParams.push(dateValue);
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

      if (updateData.country !== undefined) {
        userUpdateFields.push('country = ?');
        userUpdateParams.push(updateData.country);
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
          u.zipCode,
          u.country
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
    const userId = req.user.id;
    
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

    // Get upcoming appointments with approval status
    const appointments = await getAll(`
      SELECT id, appointmentDate, startTime, endTime, type, status, approvalStatus, reason
      FROM appointments
      WHERE patientId = ? AND appointmentDate >= CURDATE()
      ORDER BY appointmentDate, startTime
      LIMIT 5
    `, [patient.id]);

    // Get recent progress entries from treatment plans
    const progress = await getAll(`
      SELECT 
        mo.title as area,
        mo.progress as currentScore,
        100 as targetScore,
        mo.updatedAt as measurementDate,
        mo.description as progressNotes
      FROM main_objectives mo
      JOIN treatment_plans tp ON mo.treatmentPlanId = tp.id
      WHERE tp.patientId = ? AND tp.status = 'active'
      ORDER BY mo.updatedAt DESC
      LIMIT 5
    `, [patient.id]);

    // Clean up daily notes from other therapists (keep only assigned therapist's notes)
    if (patient.therapistId) {
      await runQuery(`
        DELETE FROM daily_notes 
        WHERE patientId = ? AND therapistId != ?
      `, [patient.id, patient.therapistId]);
    }

    // Get daily notes count for the patient from assigned therapist only
    const dailyNotesCount = await getRow(`
      SELECT COUNT(*) as total
      FROM daily_notes
      WHERE patientId = ? AND therapistId = ?
    `, [patient.id, patient.therapistId]);

    // Get pending home exercises count (assigned or in_progress, not completed)
    const pendingExercisesCount = await getRow(`
      SELECT COUNT(*) as total
      FROM home_exercises
      WHERE patientId = ? AND status IN ('assigned', 'in_progress')
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
        upcomingAppointments: appointments.map(appointment => {
          let displayStatus = appointment.status;
          if (appointment.approvalStatus === 'pending') {
            displayStatus = 'pending';
          } else if (appointment.approvalStatus === 'rejected') {
            displayStatus = 'cancelled';
          }
          
          return {
            ...appointment,
            status: displayStatus,
            approvalStatus: appointment.approvalStatus,
            reason: appointment.reason || 'No reason provided'
          };
        }),
        recentProgress: progress,
        dailyNotesCount: dailyNotesCount?.total || 0,
        pendingExercisesCount: pendingExercisesCount?.total || 0
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
    const userId = req.user.id;
    
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
    const userId = req.user.id;
    
    // Get patient ID
    const patient = await getRow('SELECT id FROM patients WHERE userId = ?', [userId]);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    // Get appointments with therapist information (therapist data is in users table)
    const appointments = await getAll(`
      SELECT 
        a.id, 
        a.appointmentDate, 
        a.startTime, 
        a.endTime, 
        a.duration, 
        a.type, 
        a.status, 
        a.approvalStatus,
        a.therapistApprovedBy,
        a.adminApprovedBy,
        a.reason,
        a.notes,
        a.createdAt,
        a.updatedAt,
        COALESCE(CONCAT(u.firstName, ' ', u.lastName), 'Your Therapist') as therapistName,
        COALESCE(t.specialization, 'Occupational Therapy') as therapistSpecialization,
        CONCAT(therapistApprover.firstName, ' ', therapistApprover.lastName) as therapistApproverName,
        CONCAT(adminApprover.firstName, ' ', adminApprover.lastName) as adminApproverName
      FROM appointments a
      JOIN patients p ON a.patientId = p.id
      LEFT JOIN users u ON a.therapistId = u.id
      LEFT JOIN therapists t ON u.id = t.userId
      LEFT JOIN users therapistApprover ON a.therapistApprovedBy = therapistApprover.id
      LEFT JOIN users adminApprover ON a.adminApprovedBy = adminApprover.id
      WHERE a.patientId = ?
      ORDER BY a.appointmentDate DESC, a.startTime DESC
    `, [patient.id]);

    // Decrypt sensitive fields (notes) and format status
    const decryptedAppointments = appointments.map(appointment => {
      try {
        const decrypted = decryptSensitiveFields(appointment, ['notes']);
        
        // Show correct status based on approval status
        let displayStatus = decrypted.status;
        if (decrypted.approvalStatus === 'pending') {
          displayStatus = 'pending';
        } else if (decrypted.approvalStatus === 'rejected') {
          displayStatus = 'cancelled';
        }
        
        return {
          ...decrypted,
          status: displayStatus,
          approvalStatus: decrypted.approvalStatus,
          reason: decrypted.reason || 'No reason provided'
        };
      } catch (error) {
        console.error('Decryption error for appointment', appointment.id, ':', error);
        return appointment; // Return original if decryption fails
      }
    });

    res.json({
      success: true,
      data: decryptedAppointments
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
    const { reason } = req.body;
    const userId = req.user.id;
    
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

    // Check if appointment can be cancelled (not already completed or cancelled)
    if (appointment.status === 'completed' || appointment.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel a completed or already cancelled appointment'
      });
    }

    // Check if appointment is on the same day (cannot cancel on appointment day)
    const appointmentDate = new Date(appointment.appointmentDate);
    const today = new Date();
    
    // Compare dates in local timezone by comparing year, month, and day
    const appointmentYear = appointmentDate.getFullYear();
    const appointmentMonth = appointmentDate.getMonth();
    const appointmentDay = appointmentDate.getDate();
    
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();
    
    const isSameDay = appointmentYear === todayYear && 
                     appointmentMonth === todayMonth && 
                     appointmentDay === todayDay;
    
    if (isSameDay) {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel an appointment on the same day. Please contact the clinic directly.'
      });
    }

    // Update appointment status with reason
    await runQuery(`
      UPDATE appointments 
      SET status = 'cancelled', notes = CONCAT(COALESCE(notes, ''), '\nCancellation reason: ', ?), updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [reason || 'No reason provided', parseInt(id)]);

    // Get updated appointment for broadcasting
    const updatedAppointment = await getRow(`
      SELECT 
        a.*,
        CONCAT(u.firstName, ' ', u.lastName) as patientName,
        p.diagnosis,
        u.phone as patientPhone
      FROM appointments a
      JOIN patients p ON a.patientId = p.id
      JOIN users u ON p.userId = u.id
      WHERE a.id = ?
    `, [parseInt(id)]);

    // Broadcast appointment change to therapist portal
    const websocketService = require('../services/websocketService');
    websocketService.broadcastAppointmentChange(updatedAppointment, 'updated');

    res.json({
      success: true,
      message: 'Appointment cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel appointment' });
  }
};

// Postpone appointment
const postponeAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { newDate, newTime, reason } = req.body;
    const userId = req.user.id;
    
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

    // Check if appointment can be postponed (not already completed or cancelled)
    if (appointment.status === 'completed' || appointment.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Cannot postpone a completed or cancelled appointment'
      });
    }

    // Check if appointment is on the same day (cannot postpone on appointment day)
    const appointmentDate = new Date(appointment.appointmentDate);
    const today = new Date();
    
    // Compare dates in local timezone by comparing year, month, and day
    const appointmentYear = appointmentDate.getFullYear();
    const appointmentMonth = appointmentDate.getMonth();
    const appointmentDay = appointmentDate.getDate();
    
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();
    
    const isSameDay = appointmentYear === todayYear && 
                     appointmentMonth === todayMonth && 
                     appointmentDay === todayDay;
    
    if (isSameDay) {
      return res.status(400).json({
        success: false,
        error: 'Cannot postpone an appointment on the same day. Please contact the clinic directly.'
      });
    }

    // Validate new date and time
    if (!newDate || !newTime) {
      return res.status(400).json({
        success: false,
        error: 'New date and time are required'
      });
    }

    // Convert time format from "10:00 AM" to "10:00" if needed
    let formattedTime = newTime;
    if (newTime.includes('AM') || newTime.includes('PM')) {
      try {
        const timeObj = new Date(`2000-01-01 ${newTime}`);
        formattedTime = timeObj.toTimeString().slice(0, 5); // Get HH:MM format
      } catch (error) {
        console.error('Time conversion error:', error);
        return res.status(400).json({
          success: false,
          error: 'Invalid time format. Please use HH:MM format.'
        });
      }
    }

    // Calculate new end time based on original duration
    const startTime = new Date(`2000-01-01T${formattedTime}`);
    const endTime = new Date(startTime.getTime() + (appointment.duration || 60) * 60000);
    const endTimeStr = endTime.toTimeString().slice(0, 5);

    // Update appointment with new date/time and reason
    await runQuery(`
      UPDATE appointments 
      SET 
        appointmentDate = ?,
        startTime = ?,
        endTime = ?,
        status = 'scheduled',
        notes = CONCAT(COALESCE(notes, ''), '\nPostponement reason: ', ?),
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newDate, formattedTime, endTimeStr, reason || 'No reason provided', parseInt(id)]);

    // Get updated appointment for broadcasting
    const updatedAppointment = await getRow(`
      SELECT 
        a.*,
        CONCAT(u.firstName, ' ', u.lastName) as patientName,
        p.diagnosis,
        u.phone as patientPhone
      FROM appointments a
      JOIN patients p ON a.patientId = p.id
      JOIN users u ON p.userId = u.id
      WHERE a.id = ?
    `, [parseInt(id)]);

    // Broadcast appointment change to therapist portal
    const websocketService = require('../services/websocketService');
    websocketService.broadcastAppointmentChange(updatedAppointment, 'updated');

    res.json({
      success: true,
      message: 'Appointment postponed successfully'
    });

  } catch (error) {
    console.error('Postpone appointment error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      appointmentId: req.params.id,
      newDate: req.body.newDate,
      newTime: req.body.newTime,
      reason: req.body.reason
    });
    res.status(500).json({ success: false, error: 'Failed to postpone appointment' });
  }
};

// Reschedule appointment
const rescheduleAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { appointmentDate, startTime, endTime } = req.body;
    const userId = req.user.id;
    
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
    const userId = req.user.id;
    
    // Get patient ID and assigned therapist
    const patient = await getRow('SELECT id, therapistId FROM patients WHERE userId = ?', [userId]);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    if (!patient.therapistId) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Get daily notes with comments - only from assigned therapist
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
        dn.videoPath,
        dn.videoFileName,
        dn.videoSize,
        dn.videoMimeType,
        dn.createdAt,
        CONCAT(u.firstName, ' ', u.lastName) as therapistName
      FROM daily_notes dn
      JOIN users u ON dn.therapistId = u.id
      WHERE dn.patientId = ? AND dn.therapistId = ?
      ORDER BY dn.sessionDate DESC
    `, [patient.id, patient.therapistId]);

    // Decrypt sensitive fields for patient and parse comments
    const decryptedNotes = notes.map(note => {
      const decryptedNote = decryptSensitiveFields(note, ['content', 'activities', 'observations', 'progress', 'challenges', 'nextSteps', 'goals']);
      
      // Handle specific fields that might have decryption issues
      if (decryptedNote.activities === 'Data unavailable - please contact support if this persists') {
        decryptedNote.activities = 'Activities data is temporarily unavailable. Please contact your therapist for assistance.';
      }
      if (decryptedNote.nextSteps === 'Data unavailable - please contact support if this persists') {
        decryptedNote.nextSteps = 'Next steps data is temporarily unavailable. Please contact your therapist for assistance.';
      }
      
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

// Clean up daily notes from unassigned therapists
const cleanupDailyNotes = async (req, res) => {
  try {
    // Get all patients with their assigned therapists
    const patients = await getAll(`
      SELECT p.id as patientId, p.therapistId
      FROM patients p
      WHERE p.therapistId IS NOT NULL
    `);

    let totalDeleted = 0;

    for (const patient of patients) {
      // Delete daily notes from other therapists for this patient
      const result = await runQuery(`
        DELETE FROM daily_notes 
        WHERE patientId = ? AND therapistId != ?
      `, [patient.patientId, patient.therapistId]);
      
      totalDeleted += result.affectedRows || 0;
    }

    res.json({
      success: true,
      message: `Cleaned up ${totalDeleted} daily notes from unassigned therapists`,
      deletedCount: totalDeleted
    });

  } catch (error) {
    console.error('Cleanup daily notes error:', error);
    res.status(500).json({ success: false, error: 'Failed to cleanup daily notes' });
  }
};

// Add comment to daily note
const addNoteComment = async (req, res) => {
  try {
    
    const { id } = req.params;
    const { comment } = req.body;
    const userId = req.user.id;
    
    
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

    // Create the comment object
    const newComment = {
      id: Date.now(), // Simple ID generation
      author: 'Patient',
      content: comment,
      timestamp: new Date().toISOString()
    };


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
    const userId = req.user.id;
    
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
    const userId = req.user.id;
    
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
    const userId = req.user.id;
    
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
    const userId = req.user.id;
    
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
    const userId = req.user.id;
    
    // Get patient ID
    const patient = await getRow('SELECT id FROM patients WHERE userId = ?', [userId]);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    // Get home exercises with therapist info and proof count
    const exercises = await getAll(`
      SELECT 
        he.id, he.title, he.description, he.category, he.instructions, he.duration, he.frequency, 
        he.difficulty, he.equipment, he.progressScore, he.lastCompleted, he.streak, he.isCompleted, 
        he.assignedDate, he.dueDate, he.status, he.therapistId,
        u.firstName as therapistFirstName, u.lastName as therapistLastName,
        COUNT(hep.id) as proofCount
      FROM home_exercises he
      LEFT JOIN users u ON he.therapistId = u.id
      LEFT JOIN home_exercise_proofs hep ON he.id = hep.exerciseId
      WHERE he.patientId = ?
      GROUP BY he.id
      ORDER BY he.assignedDate DESC
    `, [patient.id]);

    // Parse JSON fields for equipment and instructions
    const parseJsonField = (field) => {
      if (!field) return [];
      if (Array.isArray(field)) return field;
      if (typeof field === 'string') {
        try {
          return JSON.parse(field);
        } catch (error) {
          console.error('Error parsing JSON field:', error);
          return [];
        }
      }
      return [];
    };

    const parsedExercises = exercises.map(exercise => ({
      ...exercise,
      equipment: parseJsonField(exercise.equipment),
      instructions: parseJsonField(exercise.instructions)
    }));

    res.json({
      success: true,
      data: parsedExercises
    });

  } catch (error) {
    console.error('Get home exercises error:', error);
    res.status(500).json({ success: false, error: 'Failed to get home exercises' });
  }
};

// Get patient notifications
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get notifications - handle missing priority column gracefully
    // Use CONVERT_TZ to ensure createdAt is in UTC regardless of server timezone
    let notifications;
    try {
      // Try with priority column first
      notifications = await getAll(`
        SELECT id, title, message, type, isRead, priority, createdAt
        FROM notifications
        WHERE userId = ?
        ORDER BY createdAt DESC
      `, [userId]);
    } catch (error) {
      // If priority column doesn't exist, query without it
      if (error.code === 'ER_BAD_FIELD_ERROR' && error.message.includes('priority')) {
        console.warn('⚠️ Priority column not found in notifications table, querying without it');
        notifications = await getAll(`
          SELECT id, title, message, type, isRead, createdAt
          FROM notifications
          WHERE userId = ?
          ORDER BY createdAt DESC
        `, [userId]);
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

    res.json({
      success: true,
      data: {
        notifications: formattedNotifications,
        total: formattedNotifications.length
      }
    });

  } catch (error) {
    console.error('Get patient notifications error:', error);
    res.status(500).json({ success: false, error: 'Failed to get notifications' });
  }
};

// Get patient settings
const getSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    
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

// Get notification statistics
const getNotificationStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get total notifications
    const totalResult = await getRow(`
      SELECT COUNT(*) as total
      FROM notifications
      WHERE userId = ?
    `, [userId]);
    const total = totalResult.total || 0;

    // Get unread count
    const unreadResult = await getRow(`
      SELECT COUNT(*) as unread
      FROM notifications
      WHERE userId = ? AND isRead = 0
    `, [userId]);
    const unreadCount = unreadResult.unread || 0;

    res.json({
      success: true,
      data: {
        total,
        unreadCount: unreadCount,
        unread: unreadCount,
        read: total - unreadCount
      }
    });

  } catch (error) {
    console.error('Get patient notification stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to get notification stats' });
  }
};

// Book new appointment
const bookAppointment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date, time, duration, type, reason, notes, therapistId } = req.body;

    // Validate required fields
    if (!date || !time || !type || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: date, time, type, reason'
      });
    }

    // Get patient profile ID and available therapists
    const patient = await getRow(`
      SELECT p.id, p.therapistId as primaryTherapistId, CONCAT(u.firstName, ' ', u.lastName) as patientName
      FROM patients p
      JOIN users u ON p.userId = u.id
      WHERE p.userId = ?
    `, [userId]);

    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient profile not found' });
    }

    // Get all assigned therapists (primary + secondary)
    const assignedTherapists = await getAll(`
      SELECT 
        pta.therapistId,
        pta.assignmentType,
        CONCAT(u.firstName, ' ', u.lastName) as therapistName,
        u.email as therapistEmail
      FROM patient_therapist_assignments pta
      JOIN users u ON pta.therapistId = u.id
      WHERE pta.patientId = ? AND pta.status = 'active'
      UNION
      SELECT 
        p.therapistId,
        'primary' as assignmentType,
        CONCAT(u2.firstName, ' ', u2.lastName) as therapistName,
        u2.email as therapistEmail
      FROM patients p
      JOIN users u2 ON p.therapistId = u2.id
      WHERE p.id = ? AND p.therapistId IS NOT NULL
    `, [patient.id, patient.id]);

    if (assignedTherapists.length === 0) {
      return res.status(400).json({ success: false, error: 'No therapist assigned' });
    }

    // Determine which therapist to use
    let selectedTherapistId;
    let selectedTherapistName;

    if (therapistId) {
      // Patient specified a therapist - validate they are assigned
      const selectedTherapist = assignedTherapists.find(t => t.therapistId == therapistId);
      if (!selectedTherapist) {
        return res.status(400).json({ 
          success: false, 
          error: 'Selected therapist is not assigned to you' 
        });
      }
      selectedTherapistId = therapistId;
      selectedTherapistName = selectedTherapist.therapistName;
    } else {
      // No therapist specified - use primary therapist as default
      const primaryTherapist = assignedTherapists.find(t => t.assignmentType === 'primary');
      if (!primaryTherapist) {
        return res.status(400).json({ 
          success: false, 
          error: 'No primary therapist assigned. Please specify which therapist you want to book with.' 
        });
      }
      selectedTherapistId = primaryTherapist.therapistId;
      selectedTherapistName = primaryTherapist.therapistName;
    }

    // Calculate end time
    const startTime = new Date(`2000-01-01T${time}`);
    const endTime = new Date(startTime.getTime() + (duration || 60) * 60000);
    const endTimeStr = endTime.toTimeString().slice(0, 8);

    // Insert appointment with pending approval status
    const insertResult = await runQuery(`
      INSERT INTO appointments (patientId, therapistId, appointmentDate, startTime, endTime, duration, type, status, approvalStatus, createdBy, reason, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', 'pending', ?, ?, ?)
    `, [
      patient.id,
      selectedTherapistId,
      date,
      time,
      endTimeStr,
      duration || 60,
      type,
      userId, // Patient who created the appointment (createdBy)
      reason || null,
      notes || null
    ]);

    const appointmentId = insertResult.insertId;

    // Get therapist details for notification
    const therapist = await getRow(`
      SELECT CONCAT(u.firstName, ' ', u.lastName) as therapistName, u.email as therapistEmail
      FROM users u
      WHERE u.id = ?
    `, [selectedTherapistId]);

    // Create notifications for the approval workflow
    try {
      const notificationController = require('./notificationController');
      
      // Notify patient - appointment request submitted
      await notificationController.createNotification(
        userId,
        'Appointment Request Submitted',
        `Your ${type} appointment request has been submitted for ${new Date(date).toLocaleDateString()} at ${formatTime12Hour(time)}. It is pending admin approval.`,
        'appointment',
        { relatedId: appointmentId }
      );
      
      // Notify therapist - new appointment request (pending approval)
      await notificationController.createNotification(
        selectedTherapistId,
        'New Appointment Request (Pending Approval)',
        `${patient.patientName} has requested a ${type} appointment on ${new Date(date).toLocaleDateString()} at ${formatTime12Hour(time)}. This appointment is pending admin approval.`,
        'appointment',
        { relatedId: appointmentId }
      );
      
      // Notify all admins - new appointment request requires approval
      const adminUsers = await getAll('SELECT id FROM users WHERE role = "admin"');
      for (const admin of adminUsers) {
        try {
          await notificationController.createNotification(
            admin.id,
            'New Appointment Request - Approval Required',
            `${patient.patientName} has requested a ${type} appointment with ${therapist.therapistName} on ${new Date(date).toLocaleDateString()} at ${formatTime12Hour(time)}. Please review and approve.`,
            'admin_notification',
            { relatedId: appointmentId }
          );
        } catch (adminNotificationError) {
          console.error('Admin notification error for admin', admin.id, ':', adminNotificationError);
        }
      }
    } catch (notificationError) {
      console.error('Notification creation error:', notificationError);
      // Continue without notifications if there's an error
    }

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      data: { appointmentId }
    });

  } catch (error) {
    console.error('Book appointment error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    res.status(500).json({ success: false, error: 'Failed to book appointment' });
  }
};

// Get patient profile for patient portal
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

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
        u.zipCode,
        u.country
      FROM patients p
      JOIN users u ON p.userId = u.id
      WHERE p.userId = ?
    `;

    const patient = await getRow(sql, [parseInt(userId)]);

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient profile not found'
      });
    }

    // Import decryption utility
    const { decryptField } = require('../utils/encryption');

    // Format patient data and decrypt sensitive fields
    const formattedPatient = {
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      email: decryptField(patient.email),
      phone: decryptField(patient.phone),
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      address: decryptField(patient.address),
      city: patient.city,
      state: patient.state,
      zipCode: patient.zipCode,
      country: patient.country,
      diagnosis: patient.diagnosis,
      medicalHistory: patient.medicalHistory,
      goals: patient.goals,
      therapistId: patient.therapistId,
      emergencyContact: decryptField(patient.emergencyContact),
      insuranceInfo: decryptField(patient.insuranceInfo),
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt
    };

    res.json({
      success: true,
      data: formattedPatient
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to get profile' });
  }
};

// Get onboarding status
const getOnboardingStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user and patient data
    const userSql = `
      SELECT 
        u.id,
        u.email,
        u.firstName,
        u.lastName,
        u.phone,
        u.dateOfBirth,
        u.gender,
        u.address,
        u.city,
        u.state,
        u.zipCode,
        u.termsAccepted,
        u.hipaaAcknowledged,
        u.acceptedAt,
        u.createdAt,
        u.onboardingCompleted
      FROM users u
      WHERE u.id = ?
    `;

    const patientSql = `
      SELECT 
        p.id,
        p.diagnosis,
        p.medicalHistory,
        p.goals,
        p.emergencyContact,
        p.insuranceInfo,
        p.therapistId,
        t.firstName as therapistFirstName,
        t.lastName as therapistLastName,
        t.email as therapistEmail,
        p.createdAt
      FROM patients p
      LEFT JOIN users t ON p.therapistId = t.id
      WHERE p.userId = ?
    `;

    const user = await getRow(userSql, [userId]);
    const patient = await getRow(patientSql, [userId]);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Calculate individual step completion for progress tracking
    const requiredFields = [
      'firstName', 'lastName', 'phone', 'dateOfBirth', 'gender', 
      'address', 'city', 'state', 'zipCode'
    ];

    const personalInfoComplete = requiredFields.every(field => user[field] !== null && user[field] !== '');
    const medicalInfoComplete = patient && patient.diagnosis && patient.goals;
    const complianceComplete = user.termsAccepted && user.hipaaAcknowledged;
    
    // Check if onboarding is completed from database OR if patient has existing data
    // This handles existing patients who were created before the onboarding system
    const hasExistingPatientData = !!(patient && (patient.diagnosis || patient.goals || patient.medicalHistory));
    const isOnboardingComplete = !!(user.onboardingCompleted === 1 || user.onboardingCompleted === true || hasExistingPatientData);
    const shouldShowPersonalInfo = isOnboardingComplete || personalInfoComplete;
    
    // Import decryption utility
    const { decryptField: decryptUserField } = require('../utils/encryption');
    
    const sanitizedUser = {
      id: user.id,
      email: decryptUserField(user.email),
      firstName: shouldShowPersonalInfo ? user.firstName : null,
      lastName: shouldShowPersonalInfo ? user.lastName : null,
      phone: shouldShowPersonalInfo ? decryptUserField(user.phone) : null,
      dateOfBirth: shouldShowPersonalInfo ? user.dateOfBirth : null,
      gender: shouldShowPersonalInfo ? user.gender : null,
      address: shouldShowPersonalInfo ? decryptUserField(user.address) : null,
      city: shouldShowPersonalInfo ? user.city : null,
      state: shouldShowPersonalInfo ? user.state : null,
      zipCode: shouldShowPersonalInfo ? user.zipCode : null,
      termsAccepted: user.termsAccepted,
      hipaaAcknowledged: user.hipaaAcknowledged,
      acceptedAt: user.acceptedAt,
      createdAt: user.createdAt
    };

    // Create sanitized patient data for onboarding form
    // Show medical data if medical info is complete OR if patient has existing data
    const shouldShowMedicalInfo = medicalInfoComplete || hasExistingPatientData;
    const sanitizedPatient = patient ? {
      id: patient.id,
      diagnosis: shouldShowMedicalInfo ? patient.diagnosis : null,
      medicalHistory: shouldShowMedicalInfo ? patient.medicalHistory : null,
      goals: shouldShowMedicalInfo ? patient.goals : null,
      emergencyContact: shouldShowMedicalInfo ? patient.emergencyContact : null,
      insuranceInfo: shouldShowMedicalInfo ? patient.insuranceInfo : null,
      therapistId: patient.therapistId,
      therapist: patient.therapistId ? {
        id: patient.therapistId,
        firstName: patient.therapistFirstName,
        lastName: patient.therapistLastName,
        email: patient.therapistEmail
      } : null,
      createdAt: patient.createdAt
    } : null;

    const onboardingStatus = {
      isComplete: isOnboardingComplete,
      steps: {
        personalInfo: {
          completed: personalInfoComplete,
          required: requiredFields,
          completedFields: requiredFields.filter(field => user[field] !== null && user[field] !== '')
        },
        medicalInfo: {
          completed: medicalInfoComplete,
          hasDiagnosis: patient && patient.diagnosis,
          hasGoals: patient && patient.goals
        },
        compliance: {
          completed: complianceComplete,
          termsAccepted: user.termsAccepted,
          hipaaAcknowledged: user.hipaaAcknowledged,
          acceptedAt: user.acceptedAt
        }
      },
      user: sanitizedUser,
      patient: sanitizedPatient
    };

    res.json({
      success: true,
      data: onboardingStatus
    });

  } catch (error) {
    console.error('Get onboarding status error:', error);
    res.status(500).json({ success: false, error: 'Failed to get onboarding status' });
  }
};

// Get onboarding progress
const getOnboardingProgress = async (req, res) => {
  try {
    const userId = req.user.id;

    const sql = `
      SELECT 
        u.firstName,
        u.lastName,
        u.phone,
        u.dateOfBirth,
        u.gender,
        u.address,
        u.city,
        u.state,
        u.zipCode,
        u.termsAccepted,
        u.hipaaAcknowledged,
        p.diagnosis,
        p.goals,
        p.medicalHistory,
        p.emergencyContact,
        p.insuranceInfo
      FROM users u
      LEFT JOIN patients p ON u.id = p.userId
      WHERE u.id = ?
    `;

    const data = await getRow(sql, [userId]);

    if (!data) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Calculate progress percentage
    const totalSteps = 4;
    let completedSteps = 0;

    // Step 1: Personal Information
    const personalFields = ['firstName', 'lastName', 'phone', 'dateOfBirth', 'gender', 'address', 'city', 'state', 'zipCode'];
    const personalComplete = personalFields.every(field => data[field] !== null && data[field] !== '');
    if (personalComplete) completedSteps++;

    // Step 2: Medical Information
    const medicalComplete = data.diagnosis && data.goals;
    if (medicalComplete) completedSteps++;

    // Step 3: Compliance
    const complianceComplete = data.termsAccepted && data.hipaaAcknowledged;
    if (complianceComplete) completedSteps++;

    // Step 4: Final setup (always complete if we reach this point)
    if (completedSteps >= 3) completedSteps++;

    const progressPercentage = Math.round((completedSteps / totalSteps) * 100);

    // Create sanitized data for onboarding form
    // Return actual data if the respective step is complete, otherwise return null values
    // Also handle existing patients who have data but incomplete onboarding status
    const hasExistingPatientData = !!(data.diagnosis || data.goals || data.medicalHistory);
    const isOnboardingComplete = !!(completedSteps === totalSteps || hasExistingPatientData);
    const shouldShowPersonalInfo = personalComplete || hasExistingPatientData;
    const shouldShowMedicalInfo = medicalComplete || hasExistingPatientData;
    
    const sanitizedData = {
      firstName: shouldShowPersonalInfo ? data.firstName : null,
      lastName: shouldShowPersonalInfo ? data.lastName : null,
      phone: shouldShowPersonalInfo ? data.phone : null,
      dateOfBirth: shouldShowPersonalInfo ? data.dateOfBirth : null,
      gender: shouldShowPersonalInfo ? data.gender : null,
      address: shouldShowPersonalInfo ? data.address : null,
      city: shouldShowPersonalInfo ? data.city : null,
      state: shouldShowPersonalInfo ? data.state : null,
      zipCode: shouldShowPersonalInfo ? data.zipCode : null,
      termsAccepted: data.termsAccepted,
      hipaaAcknowledged: data.hipaaAcknowledged,
      diagnosis: shouldShowMedicalInfo ? data.diagnosis : null,
      goals: shouldShowMedicalInfo ? data.goals : null,
      medicalHistory: shouldShowMedicalInfo ? data.medicalHistory : null,
      emergencyContact: shouldShowMedicalInfo ? data.emergencyContact : null,
      insuranceInfo: shouldShowMedicalInfo ? data.insuranceInfo : null
    };

    res.json({
      success: true,
      data: {
        progressPercentage,
        completedSteps,
        totalSteps,
        currentStep: Math.min(completedSteps + 1, totalSteps),
        isComplete: isOnboardingComplete,
        data: sanitizedData
      }
    });

  } catch (error) {
    console.error('Get onboarding progress error:', error);
    res.status(500).json({ success: false, error: 'Failed to get onboarding progress' });
  }
};

// Update onboarding data
const updateOnboardingData = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;

    // Start transaction
    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      // Update user table
      const userFields = [
        'firstName', 'lastName', 'phone', 'dateOfBirth', 'gender',
        'address', 'city', 'state', 'zipCode'
      ];

      const userUpdates = [];
      const userValues = [];

      userFields.forEach(field => {
        if (updateData[field] !== undefined) {
          userUpdates.push(`${field} = ?`);
          userValues.push(updateData[field]);
        }
      });

      if (userUpdates.length > 0) {
        userValues.push(userId);
        const userSql = `UPDATE users SET ${userUpdates.join(', ')}, updatedAt = NOW() WHERE id = ?`;
        await connection.execute(userSql, userValues);
      }

      // Update patient table
      const patientFields = [
        'diagnosis', 'medicalHistory', 'goals', 'emergencyContact', 'insuranceInfo'
      ];

      const patientUpdates = [];
      const patientValues = [];

      patientFields.forEach(field => {
        if (updateData[field] !== undefined) {
          patientUpdates.push(`${field} = ?`);
          patientValues.push(updateData[field]);
        }
      });

      if (patientUpdates.length > 0) {
        patientValues.push(userId);
        const patientSql = `UPDATE patients SET ${patientUpdates.join(', ')}, updatedAt = NOW() WHERE userId = ?`;
        await connection.execute(patientSql, patientValues);
      }

      await connection.commit();

      res.json({
        success: true,
        message: 'Onboarding data updated successfully'
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Update onboarding data error:', error);
    res.status(500).json({ success: false, error: 'Failed to update onboarding data' });
  }
};

// Complete onboarding
const completeOnboarding = async (req, res) => {
  try {
    const userId = req.user.id;
    const onboardingData = req.body;
    

    // Validate userId
    if (!userId) {
      console.error('Complete onboarding - userId is undefined or null');
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    // Start transaction
    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      // Update user table with all data
      const userSql = `
        UPDATE users SET 
          firstName = ?, lastName = ?, phone = ?, dateOfBirth = ?, gender = ?,
          address = ?, city = ?, state = ?, zipCode = ?,
          termsAccepted = ?, hipaaAcknowledged = ?, acceptedAt = ?,
          onboardingCompleted = true, onboardingCompletedAt = NOW(),
          updatedAt = NOW()
        WHERE id = ?
      `;

      const userParams = [
        onboardingData.firstName || null,
        onboardingData.lastName || null,
        onboardingData.phone || null,
        onboardingData.dateOfBirth || null,
        onboardingData.gender || null,
        onboardingData.address || null,
        onboardingData.city || null,
        onboardingData.state || null,
        onboardingData.zipCode || null,
        onboardingData.termsAccepted !== undefined ? onboardingData.termsAccepted : true,
        onboardingData.hipaaAcknowledged !== undefined ? onboardingData.hipaaAcknowledged : true,
        onboardingData.acceptedAt ? new Date(onboardingData.acceptedAt).toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' '),
        userId
      ];

      // Ensure no undefined values
      const sanitizedUserParams = userParams.map(param => param === undefined ? null : param);

      
      // Check each parameter for undefined
      userParams.forEach((param, index) => {
        if (param === undefined) {
          console.error(`Parameter at index ${index} is undefined:`, param);
        }
      });

      try {
        await connection.execute(userSql, sanitizedUserParams);
      } catch (error) {
        console.error('❌ User table update failed:', error.message);
        throw error;
      }

      // Update patient table
      const patientSql = `
        UPDATE patients SET 
          diagnosis = ?, medicalHistory = ?, goals = ?, 
          emergencyContact = ?, insuranceInfo = ?, updatedAt = NOW()
        WHERE userId = ?
      `;

      const patientParams = [
        onboardingData.diagnosis || null,
        onboardingData.medicalHistory || null,
        onboardingData.goals || null,
        onboardingData.emergencyContact || null,
        onboardingData.insuranceInfo || null,
        userId
      ];

      // Ensure no undefined values
      const sanitizedPatientParams = patientParams.map(param => param === undefined ? null : param);

      try {
        await connection.execute(patientSql, sanitizedPatientParams);
      } catch (error) {
        console.error('❌ Patient table update failed:', error.message);
        throw error;
      }

      // Log compliance action
      const auditSql = `
        INSERT INTO compliance_audit_log (userId, action, newValues, ipAddress, userAgent, timestamp)
        VALUES (?, 'terms_accepted', '{"terms_accepted": true}', ?, ?, NOW())
      `;

      const auditParams = [
        userId,
        req.ip || req.connection?.remoteAddress || '127.0.0.1',
        req.get('User-Agent') || 'unknown'
      ];

      // Ensure no undefined values
      const sanitizedAuditParams = auditParams.map(param => param === undefined ? null : param);

      try {
        await connection.execute(auditSql, sanitizedAuditParams);
      } catch (error) {
        console.error('❌ Compliance audit failed:', error.message);
        throw error;
      }

      await connection.commit();

      // Send welcome notification to user
      const notificationSql = `
        INSERT INTO notifications (userId, type, title, message, createdAt)
        VALUES (?, 'system', 'Welcome to TherapEase!', 'Your account setup is complete. Your therapist will contact you soon to schedule your first session.', NOW())
      `;

      await runQuery(notificationSql, [userId]);

      // Get user details and patient ID for admin notification
      const userDetails = await getRow(`
        SELECT u.firstName, u.lastName, u.email, u.role, p.id as patientId
        FROM users u
        LEFT JOIN patients p ON p.userId = u.id
        WHERE u.id = ?
      `, [userId]);

      // Notify all admins about new user completion
      const adminUsers = await getAll('SELECT id FROM users WHERE role = "admin"');
      const notificationController = require('./notificationController');
      
      for (const admin of adminUsers) {
        const adminMessage = `New ${userDetails.role} user ${userDetails.firstName} ${userDetails.lastName} (${userDetails.email}) has completed their onboarding process and is ready for therapist assignment.`;
        
        // Use notificationController to include relatedId (patientId or userId)
        await notificationController.createNotification(
          admin.id,
          'New User Onboarding Complete',
          adminMessage,
          'admin_notification',
          { relatedId: userDetails.patientId || userId } // Use patientId if available, otherwise userId
        );
      }

      res.json({
        success: true,
        message: 'Onboarding completed successfully',
        data: {
          onboardingCompleted: true,
          onboardingCompletedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Complete onboarding error:', error);
    console.error('Complete onboarding error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      sql: error.sql
    });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to complete onboarding',
      details: error.message 
    });
  }
};

// Get patient's assigned therapists
const getPatientTherapists = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get patient profile
    const patient = await getRow(`
      SELECT p.id, p.therapistId as primaryTherapistId
      FROM patients p
      WHERE p.userId = ?
    `, [userId]);

    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient profile not found' });
    }

    // Get all assigned therapists (primary + secondary)
    const assignedTherapists = await getAll(`
      SELECT 
        pta.therapistId,
        pta.assignmentType,
        CONCAT(u.firstName, ' ', u.lastName) as therapistName,
        u.email as therapistEmail,
        t.specialization,
        t.yearsOfExperience
      FROM patient_therapist_assignments pta
      JOIN users u ON pta.therapistId = u.id
      LEFT JOIN therapists t ON pta.therapistId = t.userId
      WHERE pta.patientId = ? AND pta.status = 'active'
      UNION
      SELECT 
        p.therapistId,
        'primary' as assignmentType,
        CONCAT(u2.firstName, ' ', u2.lastName) as therapistName,
        u2.email as therapistEmail,
        t2.specialization,
        t2.yearsOfExperience
      FROM patients p
      JOIN users u2 ON p.therapistId = u2.id
      LEFT JOIN therapists t2 ON p.therapistId = t2.userId
      WHERE p.id = ? AND p.therapistId IS NOT NULL
      ORDER BY assignmentType, therapistName
    `, [patient.id, patient.id]);

    res.json({
      success: true,
      data: assignedTherapists
    });

  } catch (error) {
    console.error('Get patient therapists error:', error);
    res.status(500).json({ success: false, error: 'Failed to get assigned therapists' });
  }
};

module.exports = {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
  // Patient portal methods
  getProfile,
  getDashboard,
  getProgress,
  getAppointments,
  bookAppointment,
  cancelAppointment,
  postponeAppointment,
  rescheduleAppointment,
  getDailyNotes,
  cleanupDailyNotes,
  addNoteComment,
  editNoteComment,
  deleteNoteComment,
  getSessions,
  getAssessments,
  getHomeExercises,
  getNotifications,
  getNotificationStats,
  getSettings,
  // Onboarding methods
  getOnboardingStatus,
  getOnboardingProgress,
  updateOnboardingData,
  completeOnboarding,
  getPatientTherapists
};

