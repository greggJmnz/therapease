const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { body, validationResult } = require('express-validator');
const gptService = require('../ai/services/gptService');
const { 
  saveAIAssessmentData, 
  getAIAssessmentData, 
  saveAIPDFRecord, 
  getAIPDFRecords,
  deleteAIPDFRecord,
  getQuestionTemplates,
  saveQuestionTemplate,
  deleteQuestionTemplate,
  migrateTemplatesFromLocalStorage
} = require('../controllers/assessmentController');

// Apply authentication to all AI routes
router.use(authenticateToken);


// Analyze assessment data with enhanced OT prompt engineering
router.post('/analyze-assessment', [
  body('patientData').isObject().withMessage('Patient data is required'),
  body('assessmentData').isObject().withMessage('Assessment data is required'),
  body('assessmentType').optional().isString().withMessage('Assessment type must be a string'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { patientData, assessmentData, assessmentType = 'combined' } = req.body;

    // Add assessment type to assessment data
    const enhancedAssessmentData = { ...assessmentData, assessmentType };

    const analysis = await gptService.analyzeAssessmentData(patientData, enhancedAssessmentData, {
      model: 'gpt-4.1',
      maxTokens: 2500,
      temperature: 0.6,
    });

    if (analysis.success) {
      res.json({
        success: true,
        data: {
          insights: analysis.content,
          usage: analysis.usage,
          model: analysis.model,
          assessmentType: assessmentType,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to analyze assessment',
        error: analysis.error,
      });
    }
  } catch (error) {
    console.error('Assessment analysis error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', JSON.stringify(req.body, null, 2));
    res.status(500).json({
      success: false,
      message: 'Internal server error during assessment analysis',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});


// Check AI service usage and costs
router.get('/usage', async (req, res) => {
  try {
    const usage = await gptService.checkUsage();
    
    if (usage.success) {
      res.json({
        success: true,
        data: usage.usage,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to check usage',
        error: usage.error,
      });
    }
  } catch (error) {
    console.error('Usage check error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during usage check',
    });
  }
});

// Health check for AI service
router.get('/health', async (req, res) => {
  try {
    // Test AI service with a simple prompt
    const testResponse = await gptService.generateResponse('Hello, this is a health check.', {
      maxTokens: 10,
      temperature: 0,
    });

    if (testResponse.success) {
      res.json({
        success: true,
        message: 'AI service is healthy',
        model: testResponse.model,
      });
    } else {
      res.status(503).json({
        success: false,
        message: 'AI service is not responding properly',
        error: testResponse.error,
      });
    }
  } catch (error) {
    console.error('AI health check error:', error);
    res.status(503).json({
      success: false,
      message: 'AI service is unavailable',
      error: error.message,
    });
  }
});

// AI Assessment Data Storage Routes
router.post('/assessment-data', [
  body('patientId').isInt().withMessage('Patient ID is required'),
  body('interviewQuestions').optional().isArray().withMessage('Interview questions must be an array'),
  body('observations').optional().isString().withMessage('Observations must be a string'),
  body('insights').optional().isArray().withMessage('Insights must be an array'),
], saveAIAssessmentData);

router.get('/assessment-data/:patientId', getAIAssessmentData);

router.post('/pdf-records', [
  body('patientId').isInt().withMessage('Patient ID is required'),
  body('therapistId').isInt().withMessage('Therapist ID is required'),
  body('filename').isString().withMessage('Filename is required'),
  body('type').optional().isString().withMessage('Type must be a string'),
  body('insights').optional().isArray().withMessage('Insights must be an array'),
  body('assessmentData').optional().isObject().withMessage('Assessment data must be an object'),
  body('model').optional().isString().withMessage('Model must be a string'),
  body('score').optional().isInt().withMessage('Score must be an integer'),
  body('usage').optional().isObject().withMessage('Usage must be an object'),
], saveAIPDFRecord);

router.get('/pdf-records/:patientId', getAIPDFRecords);
router.delete('/pdf-records/:recordId', deleteAIPDFRecord);

// Question Templates Routes
router.get('/question-templates', getQuestionTemplates);
router.post('/question-templates', [
  body('name').isString().withMessage('Template name is required'),
  body('questions').isArray().withMessage('Questions must be an array'),
], saveQuestionTemplate);
router.put('/question-templates/:id', [
  body('name').isString().withMessage('Template name is required'),
  body('questions').isArray().withMessage('Questions must be an array'),
], saveQuestionTemplate);
router.delete('/question-templates/:id', deleteQuestionTemplate);
router.post('/question-templates/migrate', [
  body('templates').isArray().withMessage('Templates must be an array'),
], migrateTemplatesFromLocalStorage);

module.exports = router;
