const { runQuery, getRow, getAll } = require('../config/database');

// Progress calculation helpers - updated

// Helper function to calculate progress based on specific objectives
const calculateMainObjectiveProgress = async (mainObjectiveId) => {
  try {
    const specificObjectives = await getAll(`
      SELECT isCompleted FROM specific_objectives 
      WHERE mainObjectiveId = ?
    `, [mainObjectiveId]);
    
    if (specificObjectives.length === 0) {
      return 0;
    }
    
    const completedCount = specificObjectives.filter(obj => obj.isCompleted === 1 || obj.isCompleted === true).length;
    const progress = (completedCount / specificObjectives.length) * 100;
    
    return Math.round(progress * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    console.error('Error calculating main objective progress:', error);
    return 0;
  }
};

// Helper function to calculate treatment plan overall progress
const calculateTreatmentPlanProgress = async (treatmentPlanId) => {
  try {
    const mainObjectives = await getAll(`
      SELECT progress FROM main_objectives 
      WHERE treatmentPlanId = ?
    `, [treatmentPlanId]);
    
    if (mainObjectives.length === 0) {
      return 0;
    }
    
    const totalProgress = mainObjectives.reduce((sum, obj) => sum + (parseFloat(obj.progress) || 0), 0);
    const averageProgress = totalProgress / mainObjectives.length;
    
    return Math.round(averageProgress * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    console.error('Error calculating treatment plan progress:', error);
    return 0;
  }
};

// Get all treatment plans for a therapist
const getTreatmentPlans = async (req, res) => {
  try {
    const therapistId = req.user.id;
    const { patientId } = req.query;

    let sql = `
      SELECT 
        tp.id,
        tp.patientId,
        tp.therapistId,
        tp.title,
        tp.description,
        tp.startDate,
        tp.endDate,
        tp.status,
        tp.overallProgress,
        tp.createdAt,
        tp.updatedAt,
        'Unknown' as patientFirstName,
        'Patient' as patientLastName,
        u.firstName as therapistFirstName,
        u.lastName as therapistLastName
      FROM treatment_plans tp
      JOIN users u ON tp.therapistId = u.id
      WHERE tp.therapistId = ?
    `;
    
    const params = [therapistId];
    
    if (patientId) {
      sql += ' AND tp.patientId = ?';
      params.push(patientId);
    }
    
    sql += ' ORDER BY tp.createdAt DESC';

    const treatmentPlans = await getAll(sql, params);

    res.json({
      success: true,
      data: treatmentPlans
    });
  } catch (error) {
    console.error('Error fetching treatment plans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch treatment plans'
    });
  }
};

// Get a specific treatment plan by ID
const getTreatmentPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const therapistId = req.user.id;

    const treatmentPlan = await getRow(`
      SELECT 
        tp.*,
        'Unknown' as patientFirstName,
        'Patient' as patientLastName,
        u.firstName as therapistFirstName,
        u.lastName as therapistLastName
      FROM treatment_plans tp
      JOIN users u ON tp.therapistId = u.id
      WHERE tp.id = ? AND tp.therapistId = ?
    `, [id, therapistId]);

    if (!treatmentPlan) {
      return res.status(404).json({
        success: false,
        error: 'Treatment plan not found'
      });
    }

    // Get main objectives
    const mainObjectives = await getAll(`
      SELECT 
        mo.id,
        mo.title,
        mo.description,
        mo.category,
        mo.priority,
        mo.status,
        mo.progress,
        mo.createdAt,
        mo.updatedAt
      FROM main_objectives mo
      WHERE mo.treatmentPlanId = ?
      ORDER BY mo.priority DESC, mo.createdAt ASC
    `, [id]);

    // Get specific objectives for each main objective
    for (const mainObj of mainObjectives) {
      const specificObjectives = await getAll(`
        SELECT 
          so.id,
          so.title,
          so.description,
          so.targetDate,
          so.isCompleted,
          so.remarks,
          so.patientComments,
          so.createdAt,
          so.updatedAt
        FROM specific_objectives so
        WHERE so.mainObjectiveId = ?
        ORDER BY so.targetDate ASC
      `, [mainObj.id]);
      
      mainObj.specificObjectives = specificObjectives;
    }

    treatmentPlan.mainObjectives = mainObjectives;

    res.json({
      success: true,
      data: treatmentPlan
    });
  } catch (error) {
    console.error('Error fetching treatment plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch treatment plan'
    });
  }
};

// Create a new treatment plan
const createTreatmentPlan = async (req, res) => {
  try {
    const therapistId = req.user.id;
    const { patientId, title, description, startDate, endDate } = req.body;

    if (!patientId || !title || !description || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const result = await runQuery(`
      INSERT INTO treatment_plans (patientId, therapistId, title, description, startDate, endDate, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `, [patientId, therapistId, title, description, startDate, endDate]);

    res.status(201).json({
      success: true,
      data: { id: result.insertId },
      message: 'Treatment plan created successfully'
    });
  } catch (error) {
    console.error('Error creating treatment plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create treatment plan'
    });
  }
};

// Update a treatment plan
const updateTreatmentPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const therapistId = req.user.id;
    const { title, description, startDate, endDate, status } = req.body;

    const existingPlan = await getRow(`
      SELECT id FROM treatment_plans WHERE id = ? AND therapistId = ?
    `, [id, therapistId]);

    if (!existingPlan) {
      return res.status(404).json({
        success: false,
        error: 'Treatment plan not found'
      });
    }

    // Build dynamic update query based on provided fields
    const updateFields = [];
    const updateValues = [];
    
    if (title !== undefined) {
      updateFields.push('title = ?');
      updateValues.push(title);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    if (startDate !== undefined) {
      updateFields.push('startDate = ?');
      updateValues.push(startDate);
    }
    if (endDate !== undefined) {
      updateFields.push('endDate = ?');
      updateValues.push(endDate);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }
    
    // Always update the updatedAt timestamp
    updateFields.push('updatedAt = CURRENT_TIMESTAMP');
    updateValues.push(id);
    
    if (updateFields.length === 1) { // Only updatedAt
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }
    
    await runQuery(`
      UPDATE treatment_plans 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, updateValues);

    res.json({
      success: true,
      message: 'Treatment plan updated successfully'
    });
  } catch (error) {
    console.error('Error updating treatment plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update treatment plan'
    });
  }
};

// Delete a treatment plan
const deleteTreatmentPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const therapistId = req.user.id;

    const existingPlan = await getRow(`
      SELECT id FROM treatment_plans WHERE id = ? AND therapistId = ?
    `, [id, therapistId]);

    if (!existingPlan) {
      return res.status(404).json({
        success: false,
        error: 'Treatment plan not found'
      });
    }

    await runQuery(`
      DELETE FROM treatment_plans WHERE id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'Treatment plan deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting treatment plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete treatment plan'
    });
  }
};

// Create a main objective
const createMainObjective = async (req, res) => {
  try {
    const { treatmentPlanId } = req.params;
    const therapistId = req.user.id;
    const { title, description, category, priority, status } = req.body;

    // Validate required fields
    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Title is required'
      });
    }

    // Verify treatment plan exists and belongs to this therapist
    const treatmentPlan = await getRow(`
      SELECT id FROM treatment_plans WHERE id = ? AND therapistId = ?
    `, [treatmentPlanId, therapistId]);

    if (!treatmentPlan) {
      return res.status(404).json({
        success: false,
        error: 'Treatment plan not found or you do not have permission to access it'
      });
    }

    // Validate and map status to valid ENUM values
    // Valid values: 'pending', 'in_progress', 'completed', 'cancelled'
    const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
    let validStatus = status || 'pending'; // Default to 'pending' not 'not-started'
    
    // Map common invalid status values to valid ones
    const statusMap = {
      'not-started': 'pending',
      'not_started': 'pending',
      'notstarted': 'pending',
      'in-progress': 'in_progress',
      'in progress': 'in_progress',
      'inprocess': 'in_progress',
      'active': 'in_progress',
      'done': 'completed',
      'finished': 'completed'
    };
    
    // Check if status needs mapping
    if (statusMap[validStatus.toLowerCase()]) {
      validStatus = statusMap[validStatus.toLowerCase()];
    }
    
    // Ensure status is valid
    if (!validStatuses.includes(validStatus)) {
      validStatus = 'pending'; // Default to 'pending' if invalid
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high'];
    let validPriority = priority || 'medium';
    if (!validPriorities.includes(validPriority.toLowerCase())) {
      validPriority = 'medium';
    } else {
      validPriority = validPriority.toLowerCase();
    }

    const result = await runQuery(`
      INSERT INTO main_objectives (treatmentPlanId, title, description, category, priority, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [treatmentPlanId, title, description || null, category || 'General', validPriority, validStatus]);

    // Calculate and update treatment plan overall progress
    const newOverallProgress = await calculateTreatmentPlanProgress(treatmentPlanId);
    await runQuery(`
      UPDATE treatment_plans 
      SET overallProgress = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newOverallProgress, treatmentPlanId]);

    res.status(201).json({
      success: true,
      data: { id: result.insertId },
      message: 'Main objective created successfully'
    });
  } catch (error) {
    console.error('Error creating main objective:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      stack: error.stack
    });
    
    // Provide more specific error messages
    let errorMessage = 'Failed to create main objective';
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      errorMessage = 'Invalid treatment plan reference';
    } else if (error.code === 'ER_DATA_TOO_LONG') {
      errorMessage = 'One or more fields exceed maximum length';
    } else if (error.code === 'WARN_DATA_TRUNCATED') {
      errorMessage = 'Invalid data format. Please check status and priority values.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
};

// Update a main objective
const updateMainObjective = async (req, res) => {
  try {
    const { id } = req.params;
    const therapistId = req.user.id;
    const { title, description, category, priority, status, progress } = req.body;

    const mainObjective = await getRow(`
      SELECT mo.id FROM main_objectives mo
      JOIN treatment_plans tp ON mo.treatmentPlanId = tp.id
      WHERE mo.id = ? AND tp.therapistId = ?
    `, [id, therapistId]);

    if (!mainObjective) {
      return res.status(404).json({
        success: false,
        error: 'Main objective not found'
      });
    }

    // Build dynamic update query based on provided fields
    const updateFields = [];
    const updateValues = [];
    
    if (title !== undefined) {
      updateFields.push('title = ?');
      updateValues.push(title);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    if (category !== undefined) {
      updateFields.push('category = ?');
      updateValues.push(category);
    }
    if (priority !== undefined) {
      updateFields.push('priority = ?');
      updateValues.push(priority);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }
    if (progress !== undefined) {
      updateFields.push('progress = ?');
      updateValues.push(progress);
    }
    
    // Always update the updatedAt timestamp
    updateFields.push('updatedAt = CURRENT_TIMESTAMP');
    updateValues.push(id);
    
    if (updateFields.length === 1) { // Only updatedAt
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }
    
    await runQuery(`
      UPDATE main_objectives 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, updateValues);

    res.json({
      success: true,
      message: 'Main objective updated successfully'
    });
  } catch (error) {
    console.error('Error updating main objective:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update main objective'
    });
  }
};

// Delete a main objective
const deleteMainObjective = async (req, res) => {
  try {
    const { id } = req.params;
    const therapistId = req.user.id;

    const mainObjective = await getRow(`
      SELECT mo.id FROM main_objectives mo
      JOIN treatment_plans tp ON mo.treatmentPlanId = tp.id
      WHERE mo.id = ? AND tp.therapistId = ?
    `, [id, therapistId]);

    if (!mainObjective) {
      return res.status(404).json({
        success: false,
        error: 'Main objective not found'
      });
    }

    await runQuery(`
      DELETE FROM main_objectives WHERE id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'Main objective deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting main objective:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete main objective'
    });
  }
};

// Create a specific objective
const createSpecificObjective = async (req, res) => {
  try {
    const { mainObjectiveId } = req.params;
    const therapistId = req.user.id;
    const { title, description, targetDate } = req.body;

    const mainObjective = await getRow(`
      SELECT mo.id FROM main_objectives mo
      JOIN treatment_plans tp ON mo.treatmentPlanId = tp.id
      WHERE mo.id = ? AND tp.therapistId = ?
    `, [mainObjectiveId, therapistId]);

    if (!mainObjective) {
      return res.status(404).json({
        success: false,
        error: 'Main objective not found'
      });
    }

    const result = await runQuery(`
      INSERT INTO specific_objectives (mainObjectiveId, title, description, targetDate)
      VALUES (?, ?, ?, ?)
    `, [mainObjectiveId, title, description, targetDate]);

    // Calculate and update main objective progress
    const newProgress = await calculateMainObjectiveProgress(mainObjectiveId);
    await runQuery(`
      UPDATE main_objectives 
      SET progress = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newProgress, mainObjectiveId]);

    // Get the treatment plan ID for this main objective
    const mainObjectiveData = await getRow(`
      SELECT treatmentPlanId FROM main_objectives WHERE id = ?
    `, [mainObjectiveId]);

    if (mainObjectiveData) {
      // Calculate and update treatment plan overall progress
      const newOverallProgress = await calculateTreatmentPlanProgress(mainObjectiveData.treatmentPlanId);
      await runQuery(`
        UPDATE treatment_plans 
        SET overallProgress = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [newOverallProgress, mainObjectiveData.treatmentPlanId]);
    }

    res.status(201).json({
      success: true,
      data: { id: result.insertId },
      message: 'Specific objective created successfully'
    });
  } catch (error) {
    console.error('Error creating specific objective:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create specific objective'
    });
  }
};

// Update a specific objective
const updateSpecificObjective = async (req, res) => {
  try {
    const { id } = req.params;
    const therapistId = req.user.id;
    const { title, description, targetDate, isCompleted, remarks, patientComments } = req.body;

    const specificObjective = await getRow(`
      SELECT so.id FROM specific_objectives so
      WHERE so.id = ?
    `, [id]);

    if (!specificObjective) {
      return res.status(404).json({
        success: false,
        error: 'Specific objective not found'
      });
    }

    // Build dynamic update query based on provided fields
    const updateFields = [];
    const updateValues = [];
    
    if (title !== undefined) {
      updateFields.push('title = ?');
      updateValues.push(title);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    if (targetDate !== undefined) {
      updateFields.push('targetDate = ?');
      updateValues.push(targetDate);
    }
    if (isCompleted !== undefined) {
      updateFields.push('isCompleted = ?');
      updateValues.push(isCompleted);
    }
    if (remarks !== undefined) {
      updateFields.push('remarks = ?');
      updateValues.push(remarks);
    }
    if (patientComments !== undefined) {
      updateFields.push('patientComments = ?');
      updateValues.push(patientComments);
    }
    
    // Always update the updatedAt timestamp
    updateFields.push('updatedAt = CURRENT_TIMESTAMP');
    updateValues.push(id);
    
    if (updateFields.length === 1) { // Only updatedAt
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }
    
    await runQuery(`
      UPDATE specific_objectives 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, updateValues);

    // Check if objective was marked as completed and create notification for patient
    if (isCompleted === true) {
      try {
        // Get patient and therapist information for notification
        const objectiveData = await getRow(`
          SELECT 
            so.title as objectiveTitle,
            tp.patientId,
            CONCAT(u.firstName, ' ', u.lastName) as therapistName
          FROM specific_objectives so
          JOIN main_objectives mo ON so.mainObjectiveId = mo.id
          JOIN treatment_plans tp ON mo.treatmentPlanId = tp.id
          JOIN users u ON tp.therapistId = u.id
          WHERE so.id = ?
        `, [id]);

        if (objectiveData) {
          const notificationController = require('./notificationController');
          await notificationController.createProgressUpdateNotificationForPatient(
            objectiveData.patientId,
            objectiveData.objectiveTitle,
            objectiveData.therapistName
          );
        }
      } catch (notificationError) {
        console.error('Progress update notification creation error:', notificationError);
        // Continue without notifications if there's an error
      }
    }

    // Get the main objective ID for this specific objective
    const specificObjectiveData = await getRow(`
      SELECT mainObjectiveId FROM specific_objectives WHERE id = ?
    `, [id]);

    if (specificObjectiveData) {
      // Calculate and update main objective progress
      const newProgress = await calculateMainObjectiveProgress(specificObjectiveData.mainObjectiveId);
      await runQuery(`
        UPDATE main_objectives 
        SET progress = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [newProgress, specificObjectiveData.mainObjectiveId]);

    // Get the treatment plan ID for this main objective
    const mainObjectiveData = await getRow(`
      SELECT treatmentPlanId FROM main_objectives WHERE id = ?
    `, [specificObjectiveData.mainObjectiveId]);

      if (mainObjectiveData) {
        // Calculate and update treatment plan overall progress
        const newOverallProgress = await calculateTreatmentPlanProgress(mainObjectiveData.treatmentPlanId);
        await runQuery(`
          UPDATE treatment_plans 
          SET overallProgress = ?, updatedAt = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [newOverallProgress, mainObjectiveData.treatmentPlanId]);
      }
    }

    res.json({
      success: true,
      message: 'Specific objective updated successfully'
    });
  } catch (error) {
    console.error('Error updating specific objective:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update specific objective'
    });
  }
};

// Delete a specific objective
const deleteSpecificObjective = async (req, res) => {
  try {
    const { id } = req.params;
    const therapistId = req.user.id;

    const specificObjective = await getRow(`
      SELECT so.id, so.mainObjectiveId FROM specific_objectives so
      JOIN main_objectives mo ON so.mainObjectiveId = mo.id
      JOIN treatment_plans tp ON mo.treatmentPlanId = tp.id
      WHERE so.id = ? AND tp.therapistId = ?
    `, [id, therapistId]);

    if (!specificObjective) {
      return res.status(404).json({
        success: false,
        error: 'Specific objective not found'
      });
    }

    await runQuery(`
      DELETE FROM specific_objectives WHERE id = ?
    `, [id]);

    // Recalculate and update main objective progress
    const newProgress = await calculateMainObjectiveProgress(specificObjective.mainObjectiveId);
    await runQuery(`
      UPDATE main_objectives 
      SET progress = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newProgress, specificObjective.mainObjectiveId]);

    // Get the treatment plan ID for this main objective
    const mainObjectiveData = await getRow(`
      SELECT treatmentPlanId FROM main_objectives WHERE id = ?
    `, [specificObjective.mainObjectiveId]);

    if (mainObjectiveData) {
      // Calculate and update treatment plan overall progress
      const newOverallProgress = await calculateTreatmentPlanProgress(mainObjectiveData.treatmentPlanId);
      await runQuery(`
        UPDATE treatment_plans 
        SET overallProgress = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [newOverallProgress, mainObjectiveData.treatmentPlanId]);
    }

    res.json({
      success: true,
      message: 'Specific objective deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting specific objective:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete specific objective'
    });
  }
};

// Get patient's current treatment plans
const getPatientTreatmentPlan = async (req, res) => {
  try {
    const patientId = req.user.id;

    const treatmentPlans = await getAll(`
      SELECT 
        tp.id,
        tp.title,
        tp.description,
        tp.startDate,
        tp.endDate,
        tp.status,
        tp.overallProgress,
        tp.createdAt,
        tp.updatedAt,
        u.firstName as therapistFirstName,
        u.lastName as therapistLastName
      FROM treatment_plans tp
      JOIN patients p ON tp.patientId = p.id
      JOIN users u ON tp.therapistId = u.id
      WHERE p.userId = ? AND tp.status = 'active'
      ORDER BY tp.createdAt DESC
    `, [patientId]);

    // Return empty array instead of 404 for patients with no treatment plans
    if (!treatmentPlans || treatmentPlans.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Get main objectives and specific objectives for each treatment plan
    for (const treatmentPlan of treatmentPlans) {
      const mainObjectives = await getAll(`
        SELECT 
          mo.id,
          mo.title,
          mo.description,
          mo.category,
          mo.priority,
          mo.status,
          mo.progress,
          mo.createdAt,
          mo.updatedAt
        FROM main_objectives mo
        WHERE mo.treatmentPlanId = ?
        ORDER BY mo.priority DESC, mo.createdAt ASC
      `, [treatmentPlan.id]);

      // Get specific objectives for each main objective
      for (const mainObj of mainObjectives) {
        const specificObjectives = await getAll(`
          SELECT 
            so.id,
            so.title,
            so.description,
            so.targetDate,
            so.isCompleted,
            so.remarks,
            so.patientComments,
            so.createdAt,
            so.updatedAt
          FROM specific_objectives so
          WHERE so.mainObjectiveId = ?
          ORDER BY so.targetDate ASC
        `, [mainObj.id]);
        
        mainObj.specificObjectives = specificObjectives;
      }

      treatmentPlan.mainObjectives = mainObjectives;
    }

    res.json({
      success: true,
      data: treatmentPlans
    });
  } catch (error) {
    console.error('Error fetching patient treatment plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch treatment plan'
    });
  }
};

module.exports = {
  getTreatmentPlans,
  getTreatmentPlan,
  createTreatmentPlan,
  updateTreatmentPlan,
  deleteTreatmentPlan,
  createMainObjective,
  updateMainObjective,
  deleteMainObjective,
  createSpecificObjective,
  updateSpecificObjective,
  deleteSpecificObjective,
  getPatientTreatmentPlan
};