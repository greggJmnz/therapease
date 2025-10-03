const { runQuery, getRow, getAll, getConnection } = require('../config/database');

// Get all assessments with pagination and filtering
const getAssessmentHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, patientId, status, category, dateFrom, dateTo, search } = req.query;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereConditions = [];
    let params = [];

    if (patientId) {
      whereConditions.push('a.patientId = ?');
      params.push(parseInt(patientId));
    }

    if (status) {
      whereConditions.push('a.status = ?');
      params.push(status);
    }

    if (category) {
      whereConditions.push('a.category = ?');
      params.push(category);
    }

    if (dateFrom) {
      whereConditions.push('a.assessmentDate >= ?');
      params.push(dateFrom);
    }

    if (dateTo) {
      whereConditions.push('a.assessmentDate <= ?');
      params.push(dateTo);
    }

    if (search) {
      whereConditions.push('(a.title LIKE ? OR a.summary LIKE ? OR CONCAT(u.firstName, " ", u.lastName) LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countSql = `
      SELECT COUNT(*) as total
      FROM assessments a
      JOIN patients p ON a.patientId = p.id
      JOIN users u ON p.userId = u.id
      ${whereClause}
    `;
    
    const countParams = [...params];
    const [countResult] = await getAll(countSql, countParams);
    const total = countResult.total;

    // Get assessments with patient and therapist info
    const sql = `
      SELECT 
        a.id,
        a.patientId,
        a.therapistId,
        a.title,
        a.type,
        a.category,
        a.assessmentDate as date,
        a.status,
        a.score,
        a.maxScore,
        a.summary,
        a.recommendations,
        a.areas,
        a.aiInsights,
        a.scheduledDate,
        a.createdAt,
        a.updatedAt,
        CONCAT(u.firstName, ' ', u.lastName) as patientName,
        CONCAT(tu.firstName, ' ', tu.lastName) as therapistName,
        p.diagnosis
      FROM assessments a
      JOIN patients p ON a.patientId = p.id
      JOIN users u ON p.userId = u.id
      JOIN users tu ON a.therapistId = tu.id
      ${whereClause}
      ORDER BY a.assessmentDate DESC, a.createdAt DESC
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...params, parseInt(limit), offset];
    const assessments = await getAll(sql, queryParams);

    // Parse JSON fields
    const parsedAssessments = assessments.map(assessment => ({
      ...assessment,
      recommendations: assessment.recommendations ? JSON.parse(assessment.recommendations) : [],
      areas: assessment.areas ? JSON.parse(assessment.areas) : []
    }));

    // Get available filters
    const filters = await getAvailableFilters();

    res.json({
      success: true,
      data: {
        assessments: parsedAssessments,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        filters
      }
    });

  } catch (error) {
    console.error('Get assessment history error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch assessment history' });
  }
};

// Get assessments for a specific patient
const getPatientAssessments = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { page = 1, limit = 20, status, category } = req.query;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereConditions = ['a.patientId = ?'];
    let params = [parseInt(patientId)];

    if (status) {
      whereConditions.push('a.status = ?');
      params.push(status);
    }

    if (category) {
      whereConditions.push('a.category = ?');
      params.push(category);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Get total count
    const countSql = `
      SELECT COUNT(*) as total
      FROM assessments a
      ${whereClause}
    `;
    
    const [countResult] = await getAll(countSql, params);
    const total = countResult.total;

    // Get assessments
    const sql = `
      SELECT 
        a.id,
        a.patientId,
        a.therapistId,
        a.title,
        a.type,
        a.category,
        a.assessmentDate as date,
        a.status,
        a.score,
        a.maxScore,
        a.summary,
        a.recommendations,
        a.areas,
        a.aiInsights,
        a.scheduledDate,
        a.createdAt,
        a.updatedAt,
        CONCAT(tu.firstName, ' ', tu.lastName) as therapistName
      FROM assessments a
      JOIN users tu ON a.therapistId = tu.id
      ${whereClause}
      ORDER BY a.assessmentDate DESC, a.createdAt DESC
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...params, parseInt(limit), offset];
    const assessments = await getAll(sql, queryParams);

    // Parse JSON fields
    const parsedAssessments = assessments.map(assessment => ({
      ...assessment,
      recommendations: assessment.recommendations ? JSON.parse(assessment.recommendations) : [],
      areas: assessment.areas ? JSON.parse(assessment.areas) : []
    }));

    // Get patient info
    const patientSql = `
      SELECT 
        p.id,
        p.diagnosis,
        p.medicalHistory,
        p.goals,
        CONCAT(u.firstName, ' ', u.lastName) as patientName,
        u.dateOfBirth,
        u.gender
      FROM patients p
      JOIN users u ON p.userId = u.id
      WHERE p.id = ?
    `;
    
    const patient = await getRow(patientSql, [parseInt(patientId)]);

    res.json({
      success: true,
      data: {
        assessments: parsedAssessments,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        patient
      }
    });

  } catch (error) {
    console.error('Get patient assessments error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch patient assessments' });
  }
};

// Create new assessment
const createAssessment = async (req, res) => {
  try {
    const {
      patientId,
      title,
      type,
      category,
      summary,
      recommendations,
      areas,
      aiInsights,
      scheduledDate,
      status = 'scheduled'
    } = req.body;

    // Validate required fields
    if (!patientId || !title || !type || !category) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: patientId, title, type, category'
      });
    }

    // Get therapist ID from JWT token
    const therapistId = req.user.id;

    // Validate patient exists
    const patientSql = `
      SELECT p.id, CONCAT(u.firstName, ' ', u.lastName) as patientName
      FROM patients p
      JOIN users u ON p.userId = u.id
      WHERE p.id = ?
    `;
    
    const patient = await getRow(patientSql, [parseInt(patientId)]);
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }

    // Prepare data for insertion
    const assessmentData = {
      patientId: parseInt(patientId),
      therapistId,
      title,
      type,
      category,
      assessmentDate: scheduledDate || new Date().toISOString().split('T')[0],
      status,
      summary: summary || '',
      recommendations: JSON.stringify(recommendations || []),
      areas: JSON.stringify(areas || []),
      aiInsights: aiInsights || '',
      scheduledDate: scheduledDate || null
    };

    // Insert assessment
    const insertSql = `
      INSERT INTO assessments (
        patientId, therapistId, title, type, category, assessmentDate, 
        status, summary, recommendations, areas, aiInsights, scheduledDate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const insertParams = [
      assessmentData.patientId,
      assessmentData.therapistId,
      assessmentData.title,
      assessmentData.type,
      assessmentData.category,
      assessmentData.assessmentDate,
      assessmentData.status,
      assessmentData.summary,
      assessmentData.recommendations,
      assessmentData.areas,
      assessmentData.aiInsights,
      assessmentData.scheduledDate
    ];

    const result = await runQuery(insertSql, insertParams);
    const assessmentId = result.insertId;

    // Get the created assessment
    const getAssessmentSql = `
      SELECT 
        a.*,
        CONCAT(u.firstName, ' ', u.lastName) as patientName,
        CONCAT(tu.firstName, ' ', tu.lastName) as therapistName
      FROM assessments a
      JOIN patients p ON a.patientId = p.id
      JOIN users u ON p.userId = u.id
      JOIN users tu ON a.therapistId = tu.id
      WHERE a.id = ?
    `;

    const newAssessment = await getRow(getAssessmentSql, [assessmentId]);

    // Parse JSON fields
    const parsedAssessment = {
      ...newAssessment,
      recommendations: newAssessment.recommendations ? JSON.parse(newAssessment.recommendations) : [],
      areas: newAssessment.areas ? JSON.parse(newAssessment.areas) : []
    };

    res.status(201).json({
      success: true,
      message: 'Assessment created successfully',
      data: parsedAssessment
    });

  } catch (error) {
    console.error('Create assessment error:', error);
    res.status(500).json({ success: false, error: 'Failed to create assessment' });
  }
};

// Update assessment
const updateAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if assessment exists
    const existingAssessment = await getRow('SELECT * FROM assessments WHERE id = ?', [parseInt(id)]);
    if (!existingAssessment) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found'
      });
    }

    // Prepare update data
    const updateFields = [];
    const updateParams = [];

    if (updateData.title !== undefined) {
      updateFields.push('title = ?');
      updateParams.push(updateData.title);
    }

    if (updateData.type !== undefined) {
      updateFields.push('type = ?');
      updateParams.push(updateData.type);
    }

    if (updateData.category !== undefined) {
      updateFields.push('category = ?');
      updateParams.push(updateData.category);
    }

    if (updateData.status !== undefined) {
      updateFields.push('status = ?');
      updateParams.push(updateData.status);
    }

    if (updateData.summary !== undefined) {
      updateFields.push('summary = ?');
      updateParams.push(updateData.summary);
    }

    if (updateData.recommendations !== undefined) {
      updateFields.push('recommendations = ?');
      updateParams.push(JSON.stringify(updateData.recommendations));
    }

    if (updateData.areas !== undefined) {
      updateFields.push('areas = ?');
      updateParams.push(JSON.stringify(updateData.areas));
    }

    if (updateData.aiInsights !== undefined) {
      updateFields.push('aiInsights = ?');
      updateParams.push(updateData.aiInsights);
    }

    if (updateData.scheduledDate !== undefined) {
      updateFields.push('scheduledDate = ?');
      updateParams.push(updateData.scheduledDate);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    // Add assessment ID to params
    updateParams.push(parseInt(id));

    // Update assessment
    const updateSql = `
      UPDATE assessments 
      SET ${updateFields.join(', ')}, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await runQuery(updateSql, updateParams);

    // Get updated assessment
    const getAssessmentSql = `
      SELECT 
        a.*,
        CONCAT(u.firstName, ' ', u.lastName) as patientName,
        CONCAT(tu.firstName, ' ', tu.lastName) as therapistName
      FROM assessments a
      JOIN patients p ON a.patientId = p.id
      JOIN users u ON p.userId = u.id
      JOIN users tu ON a.therapistId = tu.id
      WHERE a.id = ?
    `;

    const updatedAssessment = await getRow(getAssessmentSql, [parseInt(id)]);

    // Parse JSON fields
    const parsedAssessment = {
      ...updatedAssessment,
      recommendations: updatedAssessment.recommendations ? JSON.parse(updatedAssessment.recommendations) : [],
      areas: updatedAssessment.areas ? JSON.parse(updatedAssessment.areas) : []
    };

    res.json({
      success: true,
      message: 'Assessment updated successfully',
      data: parsedAssessment
    });

  } catch (error) {
    console.error('Update assessment error:', error);
    res.status(500).json({ success: false, error: 'Failed to update assessment' });
  }
};

// Delete assessment
const deleteAssessment = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if assessment exists
    const existingAssessment = await getRow('SELECT * FROM assessments WHERE id = ?', [parseInt(id)]);
    if (!existingAssessment) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found'
      });
    }

    // Delete assessment
    await runQuery('DELETE FROM assessments WHERE id = ?', [parseInt(id)]);

    res.json({
      success: true,
      message: 'Assessment deleted successfully',
      data: existingAssessment
    });

  } catch (error) {
    console.error('Delete assessment error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete assessment' });
  }
};

// Get available filters
const getAvailableFilters = async () => {
  try {
    const [categories] = await getAll('SELECT DISTINCT category FROM assessments ORDER BY category');
    const [statuses] = await getAll('SELECT DISTINCT status FROM assessments ORDER BY status');
    
    return {
      categories: categories.map(c => c.category),
      statuses: statuses.map(s => s.status)
    };
  } catch (error) {
    console.error('Error getting filters:', error);
    return { categories: [], statuses: [] };
  }
};

module.exports = {
  getAssessmentHistory,
  getPatientAssessments,
  createAssessment,
  updateAssessment,
  deleteAssessment
};

