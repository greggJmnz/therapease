const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { body, validationResult } = require('express-validator');
const gptService = require('../../ai/services/gptService');

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
          model: 'gpt-4o', // Using GPT-4o for reliable AI insights
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
    res.status(500).json({
      success: false,
      message: 'Internal server error during assessment analysis',
      error: error.message,
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

module.exports = router;
