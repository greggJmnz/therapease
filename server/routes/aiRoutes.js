const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { body, validationResult } = require('express-validator');
const gptService = require('../../ai/services/gptService');

// Apply authentication to all AI routes
router.use(authenticateToken);

// Analyze session notes and generate insights
router.post('/analyze-session', [
  body('patientData').isObject().withMessage('Patient data is required'),
  body('sessionNotes').isArray().withMessage('Session notes must be an array'),
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

    const { patientData, sessionNotes, assessmentType } = req.body;

    const analysis = await gptService.analyzeSessionNotes(patientData, sessionNotes, {
      assessmentType,
      maxTokens: 1500,
      temperature: 0.7,
    });

    if (analysis.success) {
      res.json({
        success: true,
        data: {
          insights: analysis.content,
          usage: analysis.usage,
          model: analysis.model,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to analyze session',
        error: analysis.error,
      });
    }
  } catch (error) {
    console.error('Session analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during analysis',
    });
  }
});

// Generate progress summary
router.post('/progress-summary', [
  body('patientData').isObject().withMessage('Patient data is required'),
  body('progressData').isObject().withMessage('Progress data is required'),
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

    const { patientData, progressData } = req.body;

    const summary = await gptService.generateProgressSummary(patientData, progressData, {
      maxTokens: 1200,
      temperature: 0.6,
    });

    if (summary.success) {
      res.json({
        success: true,
        data: {
          summary: summary.content,
          usage: summary.usage,
          model: summary.model,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to generate progress summary',
        error: summary.error,
      });
    }
  } catch (error) {
    console.error('Progress summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during summary generation',
    });
  }
});

// Generate home exercise plan
router.post('/home-exercise-plan', [
  body('patientData').isObject().withMessage('Patient data is required'),
  body('currentAbilities').isString().withMessage('Current abilities description is required'),
  body('goals').isArray().withMessage('Goals must be an array'),
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

    const { patientData, currentAbilities, goals } = req.body;

    const exercisePlan = await gptService.generateHomeExercisePlan(patientData, currentAbilities, goals, {
      maxTokens: 1800,
      temperature: 0.8,
    });

    if (exercisePlan.success) {
      res.json({
        success: true,
        data: {
          exercisePlan: exercisePlan.content,
          usage: exercisePlan.usage,
          model: exercisePlan.model,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to generate exercise plan',
        error: exercisePlan.error,
      });
    }
  } catch (error) {
    console.error('Exercise plan generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during exercise plan generation',
    });
  }
});

// Generate parent summary
router.post('/parent-summary', [
  body('patientData').isObject().withMessage('Patient data is required'),
  body('sessionSummary').isString().withMessage('Session summary is required'),
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

    const { patientData, sessionSummary } = req.body;

    const parentSummary = await gptService.generateParentSummary(patientData, sessionSummary, {
      maxTokens: 1000,
      temperature: 0.7,
    });

    if (parentSummary.success) {
      res.json({
        success: true,
        data: {
          parentSummary: parentSummary.content,
          usage: parentSummary.usage,
          model: parentSummary.model,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to generate parent summary',
        error: parentSummary.error,
      });
    }
  } catch (error) {
    console.error('Parent summary generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during parent summary generation',
    });
  }
});

// Analyze assessment data
router.post('/analyze-assessment', [
  body('patientData').isObject().withMessage('Patient data is required'),
  body('assessmentData').isObject().withMessage('Assessment data is required'),
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

    const { patientData, assessmentData } = req.body;

    const analysis = await gptService.analyzeAssessmentData(patientData, assessmentData, {
      maxTokens: 2500,
      temperature: 0.6,
    });

    if (analysis.success) {
      res.json({
        success: true,
        data: {
          analysis: analysis.content,
          usage: analysis.usage,
          model: analysis.model,
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
    });
  }
});

// Generate treatment recommendations
router.post('/treatment-recommendations', [
  body('patientData').isObject().withMessage('Patient data is required'),
  body('assessmentResults').isObject().withMessage('Assessment results are required'),
  body('currentInterventions').optional().isArray().withMessage('Current interventions must be an array'),
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

    const { patientData, assessmentResults, currentInterventions } = req.body;

    const prompt = `
    As an expert Occupational Therapist, provide evidence-based treatment recommendations:
    
    Patient: ${patientData.firstName} ${patientData.lastName}
    Age: ${patientData.age || 'Not specified'}
    Diagnosis: ${patientData.diagnosis || 'Not specified'}
    
    Assessment Results: ${JSON.stringify(assessmentResults, null, 2)}
    Current Interventions: ${currentInterventions ? JSON.stringify(currentInterventions, null, 2) : 'None'}
    
    Please provide:
    1. Evidence-based intervention strategies
    2. Frequency and duration recommendations
    3. Progress monitoring methods
    4. Family/caregiver education needs
    5. Expected outcomes and timelines
    6. Contraindications and precautions
    
    Format the response in a clear, professional manner suitable for healthcare documentation.
    `;

    const recommendations = await gptService.generateResponse(prompt, {
      maxTokens: 2500,
      temperature: 0.6,
    });

    if (recommendations.success) {
      res.json({
        success: true,
        data: {
          recommendations: recommendations.content,
          usage: recommendations.usage,
          model: recommendations.model,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to generate treatment recommendations',
        error: recommendations.error,
      });
    }
  } catch (error) {
    console.error('Treatment recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during treatment recommendations generation',
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
