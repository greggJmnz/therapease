const { runQuery, getRow, getAll } = require('../config/database');

// Get progress tracking for a therapist's patients
const getProgressTracking = async (req, res) => {
  try {
    // Get therapist ID from JWT token
    const therapistId = req.user.id;
    const { page = 1, limit = 20, patientId, area, dateFrom, dateTo } = req.query;
    const offset = (page - 1) * limit;

    // Build WHERE clause for treatment plan progress
    let whereConditions = ['p.therapistId = ?'];
    let params = [therapistId];

    if (patientId) {
      whereConditions.push('tp.patientId = ?');
      params.push(parseInt(patientId));
    }

    if (area) {
      whereConditions.push('mo.title LIKE ?');
      params.push(`%${area}%`);
    }

    if (dateFrom) {
      whereConditions.push('mo.updatedAt >= ?');
      params.push(dateFrom);
    }

    if (dateTo) {
      whereConditions.push('mo.updatedAt <= ?');
      params.push(dateTo);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Get total count
    const countSql = `
      SELECT COUNT(*) as total
      FROM main_objectives mo
      JOIN treatment_plans tp ON mo.treatmentPlanId = tp.id
      JOIN patients p ON tp.patientId = p.id
      ${whereClause}
    `;
    
    const countResult = await getAll(countSql, params);
    const total = countResult[0].total;

    // Get progress tracking with patient info from treatment plans
    const sql = `
      SELECT 
        mo.id,
        tp.patientId,
        NULL as assessmentId,
        mo.title as area,
        NULL as baselineScore,
        mo.progress as currentScore,
        100 as targetScore,
        mo.description as progressNotes,
        mo.updatedAt as measurementDate,
        mo.targetDate as nextReviewDate,
        mo.createdAt,
        mo.updatedAt,
        CONCAT(u.firstName, ' ', u.lastName) as patientName,
        p.diagnosis,
        tp.title as assessmentTitle
      FROM main_objectives mo
      JOIN treatment_plans tp ON mo.treatmentPlanId = tp.id
      JOIN patients p ON tp.patientId = p.id
      JOIN users u ON p.userId = u.id
      ${whereClause}
      ORDER BY mo.updatedAt DESC, mo.createdAt DESC
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `;

    const progressTracking = await getAll(sql, params);

    // Calculate progress percentages
    const progressWithPercentages = progressTracking.map(progress => {
      let progressPercentage = 0;
      if (progress.baselineScore !== null && progress.currentScore !== null && progress.targetScore !== null) {
        const totalRange = progress.targetScore - progress.baselineScore;
        const currentProgress = progress.currentScore - progress.baselineScore;
        if (totalRange > 0) {
          progressPercentage = Math.round((currentProgress / totalRange) * 100);
        }
      }
      
      return {
        ...progress,
        progressPercentage: Math.max(0, Math.min(100, progressPercentage))
      };
    });

    // Get available areas for filtering (using treatment plans)
    const areasSql = `
      SELECT DISTINCT mo.title as area
      FROM main_objectives mo
      JOIN treatment_plans tp ON mo.treatmentPlanId = tp.id
      JOIN patients p ON tp.patientId = p.id
      WHERE p.therapistId = ?
      ORDER BY mo.title
    `;
    
    const areas = await getAll(areasSql, [therapistId]);

    res.json({
      success: true,
      data: {
        progressTracking: progressWithPercentages,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        filters: {
          areas: areas.map(a => a.area)
        }
      }
    });

  } catch (error) {
    console.error('Get progress tracking error:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ success: false, error: 'Failed to fetch progress tracking', details: error.message });
  }
};

// Create new progress entry
const createProgressEntry = async (req, res) => {
  try {
    const {
      patientId,
      assessmentId,
      area,
      baselineScore,
      currentScore,
      targetScore,
      progressNotes,
      measurementDate,
      nextReviewDate
    } = req.body;

    // Validate required fields
    if (!patientId || !area || !measurementDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: patientId, area, measurementDate'
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

    // Validate assessment if provided
    if (assessmentId) {
      const assessmentSql = `
        SELECT id, title FROM assessments 
        WHERE id = ? AND patientId = ?
      `;
      
      const assessment = await getRow(assessmentSql, [parseInt(assessmentId), parseInt(patientId)]);
      if (!assessment) {
        return res.status(404).json({
          success: false,
          error: 'Assessment not found or not associated with this patient'
        });
      }
    }

    // Insert progress entry
    const insertSql = `
      INSERT INTO progress_tracking (
        patientId, assessmentId, area, baselineScore, currentScore, 
        targetScore, progressNotes, measurementDate, nextReviewDate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const insertParams = [
      parseInt(patientId),
      assessmentId ? parseInt(assessmentId) : null,
      area,
      baselineScore || null,
      currentScore || null,
      targetScore || null,
      progressNotes || null,
      measurementDate,
      nextReviewDate || null
    ];

    const result = await runQuery(insertSql, insertParams);
    const progressId = result.insertId;

    // Get the created progress entry
    const getProgressSql = `
      SELECT 
        pt.*,
        CONCAT(u.firstName, ' ', u.lastName) as patientName,
        p.diagnosis,
        a.title as assessmentTitle
      FROM progress_tracking pt
      JOIN patients p ON pt.patientId = p.id
      JOIN users u ON p.userId = u.id
      LEFT JOIN assessments a ON pt.assessmentId = a.id
      WHERE pt.id = ?
    `;

    const newProgress = await getRow(getProgressSql, [progressId]);

    // Calculate progress percentage
    let progressPercentage = 0;
    if (newProgress.baselineScore !== null && newProgress.currentScore !== null && newProgress.targetScore !== null) {
      const totalRange = newProgress.targetScore - newProgress.baselineScore;
      const currentProgress = newProgress.currentScore - newProgress.baselineScore;
      if (totalRange > 0) {
        progressPercentage = Math.round((currentProgress / totalRange) * 100);
      }
    }

    const progressWithPercentage = {
      ...newProgress,
      progressPercentage: Math.max(0, Math.min(100, progressPercentage))
    };

    res.status(201).json({
      success: true,
      message: 'Progress entry created successfully',
      data: progressWithPercentage
    });

  } catch (error) {
    console.error('Create progress entry error:', error);
    res.status(500).json({ success: false, error: 'Failed to create progress entry' });
  }
};

// Update progress entry
const updateProgressEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if progress entry exists and belongs to therapist's patient
    const existingProgress = await getRow(`
      SELECT pt.* FROM progress_tracking pt
      JOIN patients p ON pt.patientId = p.id
      WHERE pt.id = ? AND p.therapistId = ?
    `, [parseInt(id), 2]); // Hardcoded therapist ID

    if (!existingProgress) {
      return res.status(404).json({
        success: false,
        error: 'Progress entry not found or not authorized'
      });
    }

    // Prepare update data
    const updateFields = [];
    const updateParams = [];

    if (updateData.area !== undefined) {
      updateFields.push('area = ?');
      updateParams.push(updateData.area);
    }

    if (updateData.baselineScore !== undefined) {
      updateFields.push('baselineScore = ?');
      updateParams.push(updateData.baselineScore);
    }

    if (updateData.currentScore !== undefined) {
      updateFields.push('currentScore = ?');
      updateParams.push(updateData.currentScore);
    }

    if (updateData.targetScore !== undefined) {
      updateFields.push('targetScore = ?');
      updateParams.push(updateData.targetScore);
    }

    if (updateData.progressNotes !== undefined) {
      updateFields.push('progressNotes = ?');
      updateParams.push(updateData.progressNotes);
    }

    if (updateData.measurementDate !== undefined) {
      updateFields.push('measurementDate = ?');
      updateParams.push(updateData.measurementDate);
    }

    if (updateData.nextReviewDate !== undefined) {
      updateFields.push('nextReviewDate = ?');
      updateParams.push(updateData.nextReviewDate);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    // Add progress ID to params
    updateParams.push(parseInt(id));

    // Update progress entry
    const updateSql = `
      UPDATE progress_tracking 
      SET ${updateFields.join(', ')}, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await runQuery(updateSql, updateParams);

    // Get updated progress entry
    const getProgressSql = `
      SELECT 
        pt.*,
        CONCAT(u.firstName, ' ', u.lastName) as patientName,
        p.diagnosis,
        a.title as assessmentTitle
      FROM progress_tracking pt
      JOIN patients p ON pt.patientId = p.id
      JOIN users u ON p.userId = u.id
      LEFT JOIN assessments a ON pt.assessmentId = a.id
      WHERE pt.id = ?
    `;

    const updatedProgress = await getRow(getProgressSql, [parseInt(id)]);

    // Calculate progress percentage
    let progressPercentage = 0;
    if (updatedProgress.baselineScore !== null && updatedProgress.currentScore !== null && updatedProgress.targetScore !== null) {
      const totalRange = updatedProgress.targetScore - updatedProgress.baselineScore;
      const currentProgress = updatedProgress.currentScore - updatedProgress.baselineScore;
      if (totalRange > 0) {
        progressPercentage = Math.round((currentProgress / totalRange) * 100);
      }
    }

    const progressWithPercentage = {
      ...updatedProgress,
      progressPercentage: Math.max(0, Math.min(100, progressPercentage))
    };

    res.json({
      success: true,
      message: 'Progress entry updated successfully',
      data: progressWithPercentage
    });

  } catch (error) {
    console.error('Update progress entry error:', error);
    res.status(500).json({ success: false, error: 'Failed to update progress entry' });
  }
};

// Delete progress entry
const deleteProgressEntry = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if progress entry exists and belongs to therapist's patient
    const existingProgress = await getRow(`
      SELECT pt.* FROM progress_tracking pt
      JOIN patients p ON pt.patientId = p.id
      WHERE pt.id = ? AND p.therapistId = ?
    `, [parseInt(id), 2]); // Hardcoded therapist ID

    if (!existingProgress) {
      return res.status(404).json({
        success: false,
        error: 'Progress entry not found or not authorized'
      });
    }

    // Delete progress entry
    await runQuery('DELETE FROM progress_tracking WHERE id = ?', [parseInt(id)]);

    res.json({
      success: true,
      message: 'Progress entry deleted successfully',
      data: existingProgress
    });

  } catch (error) {
    console.error('Delete progress entry error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete progress entry' });
  }
};

// Get progress summary for a patient
const getPatientProgressSummary = async (req, res) => {
  try {
    const { patientId } = req.params;

    // Get therapist ID from JWT token
    const therapistId = req.user.id;

    // Validate patient exists and belongs to therapist
    const patientSql = `
      SELECT p.id, CONCAT(u.firstName, ' ', u.lastName) as patientName, p.diagnosis
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

    // Get progress tracking for the patient
    const progressSql = `
      SELECT 
        pt.*,
        a.title as assessmentTitle
      FROM progress_tracking pt
      LEFT JOIN assessments a ON pt.assessmentId = a.id
      WHERE pt.patientId = ?
      ORDER BY pt.area, pt.measurementDate DESC
    `;

    const progressEntries = await getAll(progressSql, [parseInt(patientId)]);

    // Group by area and calculate summary
    const progressByArea = {};
    progressEntries.forEach(entry => {
      if (!progressByArea[entry.area]) {
        progressByArea[entry.area] = [];
      }
      progressByArea[entry.area].push(entry);
    });

    // Calculate summary for each area
    const progressSummary = Object.keys(progressByArea).map(area => {
      const entries = progressByArea[area];
      const latestEntry = entries[0]; // Already sorted by date DESC
      
      let progressPercentage = 0;
      if (latestEntry.baselineScore !== null && latestEntry.currentScore !== null && latestEntry.targetScore !== null) {
        const totalRange = latestEntry.targetScore - latestEntry.baselineScore;
        const currentProgress = latestEntry.currentScore - latestEntry.baselineScore;
        if (totalRange > 0) {
          progressPercentage = Math.round((currentProgress / totalRange) * 100);
        }
      }

      return {
        area,
        baselineScore: latestEntry.baselineScore,
        currentScore: latestEntry.currentScore,
        targetScore: latestEntry.targetScore,
        progressPercentage: Math.max(0, Math.min(100, progressPercentage)),
        lastMeasurement: latestEntry.measurementDate,
        nextReview: latestEntry.nextReviewDate,
        totalEntries: entries.length,
        assessmentTitle: latestEntry.assessmentTitle
      };
    });

    res.json({
      success: true,
      data: {
        patient,
        progressSummary,
        totalAreas: progressSummary.length
      }
    });

  } catch (error) {
    console.error('Get patient progress summary error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch patient progress summary' });
  }
};

module.exports = {
  getProgressTracking,
  createProgressEntry,
  updateProgressEntry,
  deleteProgressEntry,
  getPatientProgressSummary
};

