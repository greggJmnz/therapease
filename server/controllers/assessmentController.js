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
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `;

    const assessments = await getAll(sql, params);

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
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `;

    const assessments = await getAll(sql, params);

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

// Save AI assessment data (interview questions, observations, insights)
const saveAIAssessmentData = async (req, res) => {
  try {
    const { patientId, interviewQuestions, observations, insights } = req.body;
    const therapistId = req.user.id; // Get from JWT token

    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: 'Patient ID is required'
      });
    }

    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      // Save assessment data
      const assessmentData = {
        patientId: parseInt(patientId),
        therapistId: parseInt(therapistId),
        interviewQuestions: JSON.stringify(interviewQuestions || []),
        observations: observations || '',
        insights: JSON.stringify(insights || []),
        timestamp: new Date().toISOString()
      };

      const insertSql = `
        INSERT INTO ai_assessments (patientId, therapistId, interviewQuestions, observations, insights, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
        interviewQuestions = VALUES(interviewQuestions),
        observations = VALUES(observations),
        insights = VALUES(insights),
        updatedAt = NOW()
      `;

      await connection.execute(insertSql, [
        assessmentData.patientId,
        assessmentData.therapistId,
        assessmentData.interviewQuestions,
        assessmentData.observations,
        assessmentData.insights
      ]);

      await connection.commit();

      res.json({
        success: true,
        message: 'AI assessment data saved successfully',
        data: assessmentData
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error saving AI assessment data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save AI assessment data'
    });
  }
};

// Get AI assessment data for a patient
const getAIAssessmentData = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: 'Patient ID is required'
      });
    }

    const sql = `
      SELECT 
        id,
        patientId,
        therapistId,
        interviewQuestions,
        observations,
        insights,
        createdAt,
        updatedAt
      FROM ai_assessments 
      WHERE patientId = ?
      ORDER BY updatedAt DESC
    `;

    const assessments = await getAll(sql, [parseInt(patientId)]);

    // Parse JSON fields (handle both string and object formats)
    const parsedAssessments = assessments.map(assessment => ({
      ...assessment,
      interviewQuestions: typeof assessment.interviewQuestions === 'string' ? JSON.parse(assessment.interviewQuestions || '[]') : assessment.interviewQuestions || [],
      insights: typeof assessment.insights === 'string' ? JSON.parse(assessment.insights || '[]') : assessment.insights || []
    }));

    res.json({
      success: true,
      data: parsedAssessments
    });

  } catch (error) {
    console.error('Error getting AI assessment data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get AI assessment data'
    });
  }
};

// Save AI generated PDF record
const saveAIPDFRecord = async (req, res) => {
  try {
    const { 
      patientId, 
      therapistId, 
      filename, 
      type, 
      insights, 
      assessmentData, 
      model, 
      score, 
      usage 
    } = req.body;

    if (!patientId || !therapistId || !filename) {
      return res.status(400).json({
        success: false,
        error: 'Patient ID, Therapist ID, and filename are required'
      });
    }

    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      const pdfRecord = {
        patientId: parseInt(patientId),
        therapistId: parseInt(therapistId),
        filename,
        type: type || 'AI Insights',
        insights: JSON.stringify(insights || []),
        assessmentData: JSON.stringify(assessmentData || {}),
        model: model || 'gpt-4.1',
        score: score || 0,
        usage: JSON.stringify(usage || null),
        generatedAt: new Date().toISOString().replace('T', ' ').replace('Z', '')
      };

      const insertSql = `
        INSERT INTO ai_pdf_records (patientId, therapistId, filename, type, insights, assessmentData, model, score, \`usage\`, generatedAt, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;

      const result = await connection.execute(insertSql, [
        pdfRecord.patientId,
        pdfRecord.therapistId,
        pdfRecord.filename,
        pdfRecord.type,
        pdfRecord.insights,
        pdfRecord.assessmentData,
        pdfRecord.model,
        pdfRecord.score,
        pdfRecord.usage,
        pdfRecord.generatedAt
      ]);

      await connection.commit();

      res.json({
        success: true,
        message: 'AI PDF record saved successfully',
        data: {
          id: result[0].insertId,
          ...pdfRecord
        }
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error saving AI PDF record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save AI PDF record'
    });
  }
};

// Get AI PDF records for a patient
const getAIPDFRecords = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: 'Patient ID is required'
      });
    }

    const sql = `
      SELECT 
        apr.id,
        apr.patientId,
        apr.therapistId,
        apr.filename,
        apr.type,
        apr.insights,
        apr.assessmentData,
        apr.model,
        apr.score,
        apr.\`usage\`,
        apr.generatedAt,
        apr.createdAt,
        apr.updatedAt,
        CONCAT(u.firstName, ' ', u.lastName) as patientName
      FROM ai_pdf_records apr
      JOIN patients p ON apr.patientId = p.id
      JOIN users u ON p.userId = u.id
      WHERE apr.patientId = ?
      ORDER BY apr.generatedAt DESC
    `;

    const records = await getAll(sql, [parseInt(patientId)]);

    // Parse JSON fields (handle both string and object formats)
    const parsedRecords = records.map(record => ({
      ...record,
      insights: typeof record.insights === 'string' ? JSON.parse(record.insights || '[]') : record.insights || [],
      assessmentData: typeof record.assessmentData === 'string' ? JSON.parse(record.assessmentData || '{}') : record.assessmentData || {},
      usage: typeof record.usage === 'string' ? JSON.parse(record.usage || 'null') : record.usage || null
    }));

    res.json({
      success: true,
      data: parsedRecords
    });

  } catch (error) {
    console.error('Error getting AI PDF records:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get AI PDF records'
    });
  }
};

// Delete AI PDF record
const deleteAIPDFRecord = async (req, res) => {
  try {
    const { recordId } = req.params;
    const therapistId = req.user.id;

    if (!recordId) {
      return res.status(400).json({
        success: false,
        error: 'Record ID is required'
      });
    }

    // First, verify the record exists and belongs to the therapist
    const existingRecord = await getRow(
      'SELECT id, therapistId, filename FROM ai_pdf_records WHERE id = ?',
      [parseInt(recordId)]
    );

    if (!existingRecord) {
      return res.status(404).json({
        success: false,
        error: 'AI PDF record not found'
      });
    }

    if (existingRecord.therapistId !== therapistId) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to delete this record'
      });
    }

    // Delete the record
    await runQuery('DELETE FROM ai_pdf_records WHERE id = ?', [parseInt(recordId)]);

    res.json({
      success: true,
      message: `AI PDF record "${existingRecord.filename}" deleted successfully`
    });

  } catch (error) {
    console.error('Error deleting AI PDF record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete AI PDF record'
    });
  }
};

// Question Templates CRUD operations

// Get all templates for a therapist
const getQuestionTemplates = async (req, res) => {
  try {
    const therapistId = req.user.id;

    const sql = `
      SELECT 
        id,
        name,
        questions,
        createdAt,
        updatedAt
      FROM question_templates 
      WHERE therapistId = ?
      ORDER BY updatedAt DESC
    `;

    const templates = await getAll(sql, [therapistId]);

    // Parse JSON fields
    const parsedTemplates = templates.map(template => ({
      ...template,
      questions: typeof template.questions === 'string' 
        ? JSON.parse(template.questions || '[]') 
        : template.questions || []
    }));

    res.json({
      success: true,
      data: parsedTemplates
    });

  } catch (error) {
    console.error('Error getting question templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get question templates'
    });
  }
};

// Create or update a template
const saveQuestionTemplate = async (req, res) => {
  try {
    const therapistId = req.user.id;
    const { id, name, questions } = req.body;

    if (!name || !questions || !Array.isArray(questions)) {
      return res.status(400).json({
        success: false,
        error: 'Template name and questions array are required'
      });
    }

    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      if (id) {
        // Update existing template
        const updateSql = `
          UPDATE question_templates 
          SET name = ?, questions = ?, updatedAt = NOW()
          WHERE id = ? AND therapistId = ?
        `;

        await connection.execute(updateSql, [
          name,
          JSON.stringify(questions),
          id,
          therapistId
        ]);

        await connection.commit();

        res.json({
          success: true,
          message: 'Template updated successfully',
          data: { id, name, questions }
        });
      } else {
        // Create new template
        const insertSql = `
          INSERT INTO question_templates (therapistId, name, questions, createdAt, updatedAt)
          VALUES (?, ?, ?, NOW(), NOW())
        `;

        const [result] = await connection.execute(insertSql, [
          therapistId,
          name,
          JSON.stringify(questions)
        ]);

        await connection.commit();

        res.json({
          success: true,
          message: 'Template saved successfully',
          data: { 
            id: result.insertId, 
            name, 
            questions 
          }
        });
      }
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error saving question template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save question template'
    });
  }
};

// Delete a template
const deleteQuestionTemplate = async (req, res) => {
  try {
    const therapistId = req.user.id;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Template ID is required'
      });
    }

    const sql = `
      DELETE FROM question_templates 
      WHERE id = ? AND therapistId = ?
    `;

    await runQuery(sql, [id, therapistId]);

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting question template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete question template'
    });
  }
};

// Migrate localStorage templates to database
const migrateTemplatesFromLocalStorage = async (req, res) => {
  try {
    const therapistId = req.user.id;
    const { templates } = req.body; // Array of templates from localStorage

    if (!templates || !Array.isArray(templates)) {
      return res.status(400).json({
        success: false,
        error: 'Templates array is required'
      });
    }

    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      const migratedTemplates = [];

      for (const template of templates) {
        // Skip if template already exists (check by name)
        const checkSql = `
          SELECT id FROM question_templates 
          WHERE therapistId = ? AND name = ?
        `;
        const existing = await getRow(checkSql, [therapistId, template.name]);

        if (!existing) {
          const insertSql = `
            INSERT INTO question_templates (therapistId, name, questions, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, NOW())
          `;

          const [result] = await connection.execute(insertSql, [
            therapistId,
            template.name,
            JSON.stringify(template.questions),
            template.createdAt || new Date().toISOString()
          ]);

          migratedTemplates.push({
            id: result.insertId,
            name: template.name,
            questions: template.questions
          });
        }
      }

      await connection.commit();

      res.json({
        success: true,
        message: `Migrated ${migratedTemplates.length} templates successfully`,
        data: migratedTemplates
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error migrating templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to migrate templates'
    });
  }
};

module.exports = {
  getAssessmentHistory,
  getPatientAssessments,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  saveAIAssessmentData,
  getAIAssessmentData,
  saveAIPDFRecord,
  getAIPDFRecords,
  deleteAIPDFRecord,
  getQuestionTemplates,
  saveQuestionTemplate,
  deleteQuestionTemplate,
  migrateTemplatesFromLocalStorage
};

