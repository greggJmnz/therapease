const express = require('express');
const router = express.Router();
const progressReportController = require('../controllers/progressReportController');
const progressReportUpload = require('../middleware/progressReportUploadMiddleware');
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');

// Upload progress report (therapist only)
router.post('/upload', 
  authenticateToken, 
  authorizeRole(['therapist']), 
  progressReportUpload.single('file'), 
  progressReportController.uploadProgressReport
);

// Get progress reports for a specific patient (therapist only)
router.get('/patient/:patientId', 
  authenticateToken, 
  authorizeRole(['therapist']), 
  progressReportController.getProgressReports
);

// Get my progress reports (patient only)
router.get('/my-reports', 
  authenticateToken, 
  authorizeRole(['patient']), 
  progressReportController.getMyProgressReports
);

// Download progress report (therapist and patient)
router.get('/download/:reportId', 
  authenticateToken, 
  authorizeRole(['therapist', 'patient']), 
  progressReportController.downloadProgressReport
);

// Delete progress report (therapist only)
router.delete('/:reportId', 
  authenticateToken, 
  authorizeRole(['therapist']), 
  progressReportController.deleteProgressReport
);

module.exports = router;
