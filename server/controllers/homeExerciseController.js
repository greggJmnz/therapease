const { runQuery, getRow, getAll } = require('../config/database');
const websocketService = require('../services/websocketService');

// Helper function to safely parse JSON fields
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
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/exercise-proofs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `proof-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, videos, and documents are allowed.'));
    }
  }
});

// Get all home exercises for a therapist
const getTherapistExercises = async (req, res) => {
  try {
    const { therapistId } = req.query;
    
    if (!therapistId) {
      return res.status(400).json({ error: 'Therapist ID is required' });
    }

    const query = `
      SELECT 
        he.*,
        p.userId as patientUserId,
        u.firstName as patientFirstName,
        u.lastName as patientLastName,
        u.email as patientEmail,
        COUNT(hep.id) as proofCount,
        MAX(hep.submittedAt) as lastProofSubmitted
      FROM home_exercises he
      JOIN patients p ON he.patientId = p.id
      JOIN users u ON p.userId = u.id
      LEFT JOIN home_exercise_proofs hep ON he.id = hep.exerciseId
      WHERE he.therapistId = ?
      GROUP BY he.id
      ORDER BY he.createdAt DESC
    `;

    const exercises = await runQuery(query, [therapistId]);

    // Parse JSON fields for equipment and instructions
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
    console.error('Error fetching therapist exercises:', error);
    res.status(500).json({ error: 'Failed to fetch exercises' });
  }
};

// Get all home exercises for a patient
const getPatientExercises = async (req, res) => {
  try {
    const { patientId } = req.query;
    
    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    // First, check if the provided ID is a user ID or patient ID
    // If it's a user ID, look up the corresponding patient ID
    let actualPatientId = parseInt(patientId);
    
    // Check if the ID exists in the patients table (as patient ID)
    const patientCheck = await getRow('SELECT id FROM patients WHERE id = ?', [actualPatientId]);
    
    if (!patientCheck) {
      // If not found in patients table, try to find by userId
      const userPatientCheck = await getRow('SELECT id FROM patients WHERE userId = ?', [actualPatientId]);
      if (userPatientCheck) {
        actualPatientId = userPatientCheck.id;
      } else {
        console.error(`Patient not found for ID: ${patientId} (parsed as: ${actualPatientId})`);
        return res.status(404).json({ error: 'Patient not found' });
      }
    }

    const query = `
      SELECT 
        he.*,
        u.firstName as therapistFirstName,
        u.lastName as therapistLastName,
        COUNT(hep.id) as proofCount,
        MAX(hep.submittedAt) as lastProofSubmitted
      FROM home_exercises he
      JOIN users u ON he.therapistId = u.id
      LEFT JOIN home_exercise_proofs hep ON he.id = hep.exerciseId
      WHERE he.patientId = ?
      GROUP BY he.id
      ORDER BY he.assignedDate DESC, he.createdAt DESC
    `;

    const exercises = await runQuery(query, [actualPatientId]);

    console.log(`Found ${exercises.length} exercises for patient ID: ${actualPatientId}`);

    // Parse JSON fields for equipment and instructions
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
    console.error('Error fetching patient exercises:', error);
    res.status(500).json({ error: 'Failed to fetch exercises' });
  }
};

// Create a new home exercise
const createExercise = async (req, res) => {
  try {
    const {
      patientId,
      therapistId,
      title,
      description,
      category,
      instructions,
      duration,
      frequency,
      difficulty,
      equipment,
      dueDate
    } = req.body;

    // Validate required fields
    if (!patientId || !therapistId || !title || !description || !instructions || !frequency || !difficulty) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const query = `
      INSERT INTO home_exercises (
        patientId, therapistId, title, description, category, instructions,
        duration, frequency, difficulty, equipment, assignedDate, dueDate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?)
    `;

    const result = await runQuery(query, [
      patientId,
      therapistId,
      title,
      description,
      category || 'General',
      JSON.stringify(instructions),
      duration || 30,
      frequency,
      difficulty,
      equipment ? JSON.stringify(equipment) : null,
      dueDate || null
    ]);

    const exerciseId = result.insertId;

    // Get the created exercise with patient details
    const getExerciseQuery = `
      SELECT 
        he.*,
        p.userId as patientUserId,
        u.firstName as patientFirstName,
        u.lastName as patientLastName,
        u.email as patientEmail
      FROM home_exercises he
      JOIN patients p ON he.patientId = p.id
      JOIN users u ON p.userId = u.id
      WHERE he.id = ?
    `;

    const exercise = await getRow(getExerciseQuery, [exerciseId]);

    // Parse JSON fields for equipment and instructions
    const parsedExercise = {
      ...exercise,
      equipment: parseJsonField(exercise.equipment),
      instructions: parseJsonField(exercise.instructions)
    };

    // Create notification for patient
    try {
      const notificationController = require('./notificationController');
      await notificationController.createExerciseReminderNotificationForPatient(exerciseId);
    } catch (notificationError) {
      console.error('Exercise notification creation error:', notificationError);
      // Continue without notifications if there's an error
    }

    // Broadcast home exercise change
    websocketService.broadcastHomeExerciseChange(parsedExercise, 'created');

    res.status(201).json({
      success: true,
      data: parsedExercise,
      message: 'Exercise created successfully'
    });
  } catch (error) {
    console.error('Error creating exercise:', error);
    res.status(500).json({ error: 'Failed to create exercise' });
  }
};

// Update a home exercise
const updateExercise = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; // Get user ID from authenticated user
    
    // Get therapist ID from therapists table (therapistId in home_exercises is the user ID, not therapist table ID)
    // The therapistId field in home_exercises stores the user ID directly
    const therapistUserId = userId;
    
    const {
      title,
      description,
      category,
      instructions,
      duration,
      frequency,
      difficulty,
      equipment,
      dueDate,
      status
    } = req.body;

    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({ 
        success: false,
        error: 'Title and description are required' 
      });
    }

    // Validate user is a therapist
    if (req.user.role !== 'therapist' && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        error: 'Only therapists can update exercises' 
      });
    }

    // First, check if exercise exists and belongs to this therapist
    // Get current status to use as fallback if status is not provided
    const existingExercise = await getRow(`
      SELECT id, therapistId, status FROM home_exercises WHERE id = ?
    `, [id]);

    if (!existingExercise) {
      return res.status(404).json({ 
        success: false,
        error: 'Exercise not found' 
      });
    }

    // Verify therapist owns this exercise (therapistId in table is user ID)
    // Convert both to numbers for comparison (handle string/int mismatch)
    const existingTherapistId = parseInt(existingExercise.therapistId);
    const currentTherapistId = parseInt(therapistUserId);
    
    if (existingTherapistId !== currentTherapistId) {
      // Admin can update any exercise
      if (req.user.role !== 'admin') {
        return res.status(403).json({ 
          success: false,
          error: 'You do not have permission to update this exercise' 
        });
      }
    }

    // Prepare update query
    // For admin: allow updating without therapistId check
    // For therapist: only update their own exercises
    const query = req.user.role === 'admin'
      ? `
        UPDATE home_exercises 
        SET title = ?, description = ?, category = ?, instructions = ?, 
            duration = ?, frequency = ?, difficulty = ?, equipment = ?, 
            dueDate = ?, status = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `
      : `
        UPDATE home_exercises 
        SET title = ?, description = ?, category = ?, instructions = ?, 
            duration = ?, frequency = ?, difficulty = ?, equipment = ?, 
            dueDate = ?, status = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ? AND therapistId = ?
      `;

    // Ensure instructions is an array before stringifying
    const instructionsArray = Array.isArray(instructions) 
      ? instructions 
      : (typeof instructions === 'string' && instructions.trim() 
          ? instructions.split('\n').filter(i => i.trim())
          : []);

    // Ensure equipment is an array before stringifying
    const equipmentArray = Array.isArray(equipment) 
      ? equipment 
      : (equipment ? [equipment] : []);

    // Validate and map status to valid ENUM values
    // Valid values: 'assigned', 'in_progress', 'completed', 'overdue'
    const validStatuses = ['assigned', 'in_progress', 'completed', 'overdue'];
    let validStatus = status || existingExercise.status || 'assigned';
    
    // Map common invalid status values to valid ones
    const statusMap = {
      'active': 'assigned',
      'in-progress': 'in_progress',
      'in progress': 'in_progress',
      'inprocess': 'in_progress',
      'pending': 'assigned',
      'done': 'completed',
      'finished': 'completed'
    };
    
    // Check if status needs mapping
    if (statusMap[validStatus.toLowerCase()]) {
      validStatus = statusMap[validStatus.toLowerCase()];
    }
    
    // Ensure status is valid
    if (!validStatuses.includes(validStatus)) {
      validStatus = 'assigned'; // Default to 'assigned' if invalid
    }

    // Prepare query parameters
    const queryParams = [
      title,
      description,
      category || 'General',
      JSON.stringify(instructionsArray),
      duration || 30,
      frequency || 'daily',
      difficulty || 'Beginner',
      equipmentArray.length > 0 ? JSON.stringify(equipmentArray) : null,
      dueDate || null,
      validStatus, // Use validated status
      id
    ];
    
    // Add therapistId check for non-admin users
    if (req.user.role !== 'admin') {
      queryParams.push(therapistUserId);
    }

    await runQuery(query, queryParams);

    // Get updated exercise
    const getExerciseQuery = `
      SELECT 
        he.*,
        p.userId as patientUserId,
        u.firstName as patientFirstName,
        u.lastName as patientLastName
      FROM home_exercises he
      JOIN patients p ON he.patientId = p.id
      JOIN users u ON p.userId = u.id
      WHERE he.id = ?
    `;

    const exercise = await getRow(getExerciseQuery, [id]);

    if (!exercise) {
      return res.status(404).json({ 
        success: false,
        error: 'Exercise not found after update' 
      });
    }

    // Parse JSON fields for equipment and instructions
    const parsedExercise = {
      ...exercise,
      equipment: parseJsonField(exercise.equipment),
      instructions: parseJsonField(exercise.instructions)
    };

    // Broadcast home exercise change
    websocketService.broadcastHomeExerciseChange(parsedExercise, 'updated');

    res.json({
      success: true,
      data: parsedExercise,
      message: 'Exercise updated successfully'
    });
  } catch (error) {
    console.error('Error updating exercise:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      stack: error.stack
    });
    
    // Provide more specific error messages
    let errorMessage = 'Failed to update exercise';
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      errorMessage = 'Invalid patient or therapist reference';
    } else if (error.code === 'ER_DATA_TOO_LONG') {
      errorMessage = 'One or more fields exceed maximum length';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      success: false,
      error: errorMessage 
    });
  }
};

// Delete a home exercise
const deleteExercise = async (req, res) => {
  try {
    const { id } = req.params;

    // Get exercise details before deletion for broadcasting
    const getExerciseQuery = `
      SELECT 
        he.*,
        p.userId as patientUserId
      FROM home_exercises he
      JOIN patients p ON he.patientId = p.id
      WHERE he.id = ?
    `;

    const exercise = await getRow(getExerciseQuery, [id]);

    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    const query = 'DELETE FROM home_exercises WHERE id = ?';
    await runQuery(query, [id]);

    // Broadcast home exercise deletion
    websocketService.broadcastHomeExerciseChange({ ...exercise, id }, 'deleted');

    res.json({
      success: true,
      message: 'Exercise deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting exercise:', error);
    res.status(500).json({ error: 'Failed to delete exercise' });
  }
};

// Submit proof for an exercise
const submitProof = async (req, res) => {
  try {
    const { exerciseId, patientId, therapistId, submissionType, content } = req.body;
    const file = req.file;

    if (!exerciseId || !patientId || !therapistId || !submissionType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if the provided patientId is a user ID or patient ID
    // If it's a user ID, look up the corresponding patient ID
    let actualPatientId = patientId;
    
    // Check if the ID exists in the patients table
    const patientCheck = await getRow('SELECT id FROM patients WHERE id = ?', [patientId]);
    
    if (!patientCheck) {
      // If not found in patients table, try to find by userId
      const userPatientCheck = await getRow('SELECT id FROM patients WHERE userId = ?', [patientId]);
      if (userPatientCheck) {
        actualPatientId = userPatientCheck.id;
      } else {
        return res.status(404).json({ error: 'Patient not found' });
      }
    }

    let filePath = null;
    let fileName = null;
    let fileSize = null;
    let mimeType = null;

    if (file) {
      filePath = file.path;
      fileName = file.originalname;
      fileSize = file.size;
      mimeType = file.mimetype;
    }

    const query = `
      INSERT INTO home_exercise_proofs (
        exerciseId, patientId, therapistId, submissionType, content,
        filePath, fileName, fileSize, mimeType
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await runQuery(query, [
      exerciseId,
      actualPatientId,
      therapistId,
      submissionType,
      content || null,
      filePath,
      fileName,
      fileSize,
      mimeType
    ]);

    const proofId = result.insertId;

    // Update exercise status to in_progress
    await runQuery(
      'UPDATE home_exercises SET status = ? WHERE id = ?',
      ['in_progress', exerciseId]
    );

    // Get the proof with exercise details
    const getProofQuery = `
      SELECT 
        hep.*,
        he.title as exerciseTitle,
        u.firstName as patientFirstName,
        u.lastName as patientLastName
      FROM home_exercise_proofs hep
      JOIN home_exercises he ON hep.exerciseId = he.id
      JOIN patients p ON hep.patientId = p.id
      JOIN users u ON p.userId = u.id
      WHERE hep.id = ?
    `;

    const proof = await getRow(getProofQuery, [proofId]);

    // Broadcast proof change
    websocketService.broadcastProofChange(proof, 'submitted');

    res.status(201).json({
      success: true,
      data: proof,
      message: 'Proof submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting proof:', error);
    res.status(500).json({ error: 'Failed to submit proof' });
  }
};

// Get proofs for an exercise
const getExerciseProofs = async (req, res) => {
  try {
    const { exerciseId } = req.params;

    const query = `
      SELECT 
        hep.*,
        u.firstName as patientFirstName,
        u.lastName as patientLastName
      FROM home_exercise_proofs hep
      JOIN patients p ON hep.patientId = p.id
      JOIN users u ON p.userId = u.id
      WHERE hep.exerciseId = ?
      ORDER BY hep.submittedAt DESC
    `;

    const proofs = await runQuery(query, [exerciseId]);

    // Convert file paths to proper URLs
    const proofsWithUrls = proofs.map(proof => {
      if (proof.filePath) {
        // Check if it's a data URL
        if (proof.filePath.startsWith('data:')) {
          proof.fileUrl = proof.filePath;
        } else {
          // Convert local file path to HTTP URL
          // Extract filename from path (handles both Windows and Unix paths)
          const pathParts = proof.filePath.split(/[/\\]/);
          const fileName = pathParts[pathParts.length - 1];
          
          // Ensure we have the correct path structure
          // Files are stored in server/uploads/exercise-proofs/
          // Server serves from /uploads, so URL should be /uploads/exercise-proofs/filename
          proof.fileUrl = `/uploads/exercise-proofs/${fileName}`;
        }
      }
      return proof;
    });

    res.json({
      success: true,
      data: proofsWithUrls
    });
  } catch (error) {
    console.error('Error fetching exercise proofs:', error);
    res.status(500).json({ error: 'Failed to fetch proofs' });
  }
};

// Review proof (therapist action)
const reviewProof = async (req, res) => {
  try {
    const { proofId } = req.params;
    const { status, therapistFeedback } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const query = `
      UPDATE home_exercise_proofs 
      SET status = ?, therapistFeedback = ?, reviewedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await runQuery(query, [status, therapistFeedback || null, proofId]);

    // Get updated proof with exercise details
    const getProofQuery = `
      SELECT 
        hep.*,
        he.title as exerciseTitle,
        he.patientId,
        he.therapistId,
        p.userId as patientUserId,
        u.firstName as patientFirstName,
        u.lastName as patientLastName
      FROM home_exercise_proofs hep
      JOIN home_exercises he ON hep.exerciseId = he.id
      JOIN patients p ON hep.patientId = p.id
      JOIN users u ON p.userId = u.id
      WHERE hep.id = ?
    `;

    const proof = await getRow(getProofQuery, [proofId]);

    if (!proof) {
      return res.status(404).json({ error: 'Proof not found' });
    }

    // If approved, mark exercise as completed
    if (status === 'approved') {
      await runQuery(
        'UPDATE home_exercises SET status = ?, isCompleted = TRUE, lastCompleted = CURDATE() WHERE id = ?',
        ['completed', proof.exerciseId]
      );
    }

    // Broadcast proof change
    websocketService.broadcastProofChange(proof, 'reviewed');

    res.json({
      success: true,
      data: proof,
      message: 'Proof reviewed successfully'
    });
  } catch (error) {
    console.error('Error reviewing proof:', error);
    res.status(500).json({ error: 'Failed to review proof' });
  }
};

// Get all proofs for a therapist
const getTherapistProofs = async (req, res) => {
  try {
    const { therapistId } = req.query;

    if (!therapistId) {
      return res.status(400).json({ error: 'Therapist ID is required' });
    }

    const query = `
      SELECT 
        hep.*,
        he.title as exerciseTitle,
        he.description as exerciseDescription,
        u.firstName as patientFirstName,
        u.lastName as patientLastName,
        u.email as patientEmail
      FROM home_exercise_proofs hep
      JOIN home_exercises he ON hep.exerciseId = he.id
      JOIN patients p ON hep.patientId = p.id
      JOIN users u ON p.userId = u.id
      WHERE hep.therapistId = ?
      ORDER BY hep.submittedAt DESC
    `;

    const proofs = await runQuery(query, [therapistId]);

    // Convert file paths to proper URLs
    const proofsWithUrls = proofs.map(proof => {
      if (proof.filePath) {
        // Check if it's a data URL
        if (proof.filePath.startsWith('data:')) {
          proof.fileUrl = proof.filePath;
        } else {
          // Convert local file path to HTTP URL
          // Extract filename from path (handles both Windows and Unix paths)
          const pathParts = proof.filePath.split(/[/\\]/);
          const fileName = pathParts[pathParts.length - 1];
          
          // Ensure we have the correct path structure
          // Files are stored in server/uploads/exercise-proofs/
          // Server serves from /uploads, so URL should be /uploads/exercise-proofs/filename
          proof.fileUrl = `/uploads/exercise-proofs/${fileName}`;
        }
      }
      return proof;
    });

    res.json({
      success: true,
      data: proofsWithUrls
    });
  } catch (error) {
    console.error('Error fetching therapist proofs:', error);
    res.status(500).json({ error: 'Failed to fetch proofs' });
  }
};

// Get all proofs for a patient
const getPatientProofs = async (req, res) => {
  try {
    const { patientId } = req.query;

    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    const query = `
      SELECT 
        hep.*,
        he.title as exerciseTitle,
        he.description as exerciseDescription
      FROM home_exercise_proofs hep
      JOIN home_exercises he ON hep.exerciseId = he.id
      WHERE hep.patientId = ?
      ORDER BY hep.submittedAt DESC
    `;

    const proofs = await runQuery(query, [patientId]);

    // Convert file paths to proper URLs
    const proofsWithUrls = proofs.map(proof => {
      if (proof.filePath) {
        // Check if it's a data URL
        if (proof.filePath.startsWith('data:')) {
          proof.fileUrl = proof.filePath;
        } else {
          // Convert local file path to HTTP URL
          // Extract filename from path (handles both Windows and Unix paths)
          const pathParts = proof.filePath.split(/[/\\]/);
          const fileName = pathParts[pathParts.length - 1];
          
          // Ensure we have the correct path structure
          // Files are stored in server/uploads/exercise-proofs/
          // Server serves from /uploads, so URL should be /uploads/exercise-proofs/filename
          proof.fileUrl = `/uploads/exercise-proofs/${fileName}`;
        }
      }
      return proof;
    });

    res.json({
      success: true,
      data: proofsWithUrls
    });
  } catch (error) {
    console.error('Error fetching patient proofs:', error);
    res.status(500).json({ error: 'Failed to fetch proofs' });
  }
};

module.exports = {
  getTherapistExercises,
  getPatientExercises,
  createExercise,
  updateExercise,
  deleteExercise,
  submitProof,
  getExerciseProofs,
  reviewProof,
  getTherapistProofs,
  getPatientProofs
};
