const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeTherapist } = require('../middleware/authMiddleware');
const { decryptResponseData } = require('../middleware/encryptionMiddleware');
const therapistController = require('../controllers/therapistController');
const assessmentController = require('../controllers/assessmentController');
const patientController = require('../controllers/patientController');
const dailyNotesController = require('../controllers/dailyNotesController');
const progressTrackingController = require('../controllers/progressTrackingController');
const appointmentController = require('../controllers/appointmentController');
const sessionController = require('../controllers/sessionController');
const profileController = require('../controllers/profileController');
const upload = require('../middleware/uploadMiddleware');
const notificationController = require('../controllers/notificationController');
const dashboardController = require('../controllers/dashboardController');
const settingsController = require('../controllers/settingsController');

// Apply authentication and therapist role authorization to all routes
router.use(authenticateToken);
router.use(authorizeTherapist);
router.use(decryptResponseData);

// Dashboard
router.get('/dashboard', dashboardController.getDashboard); // Full dashboard (backward compatible)
router.get('/dashboard/stats', dashboardController.getDashboardStats); // Fast stats only
router.get('/dashboard/recent', dashboardController.getRecentItems); // Recent items only
router.get('/dashboard/progress-trends', dashboardController.getProgressAndTrends); // Progress and trends only
router.get('/dashboard/quick-actions', dashboardController.getQuickActions);
router.get('/dashboard/charts', dashboardController.getDashboardCharts);

// Patient management
router.get('/patients', patientController.getPatients);
router.get('/patients/:id', patientController.getPatientById);
router.post('/patients', patientController.createPatient);
router.put('/patients/:id', patientController.updatePatient);
router.delete('/patients/:id', patientController.deletePatient);

// Schedule management
router.get('/schedule', appointmentController.getSchedule);
router.post('/schedule', appointmentController.createAppointment);
router.put('/schedule/:id', appointmentController.updateAppointment);
router.delete('/schedule/:id', appointmentController.deleteAppointment);
router.post('/schedule/:id/approve', appointmentController.approveAppointment);
router.get('/schedule/stats', appointmentController.getAppointmentStats);

// Session management
router.get('/sessions', sessionController.getSessions);
router.post('/sessions', sessionController.createSession);
router.get('/sessions/:id', sessionController.getSessionById);
router.put('/sessions/:id', sessionController.updateSession);
router.delete('/sessions/:id', sessionController.deleteSession);

// Daily notes
const dailyNotesUpload = require('../middleware/dailyNotesUploadMiddleware');
router.get('/daily-notes', dailyNotesController.getDailyNotes);
router.get('/daily-notes/past-appointments', dailyNotesController.getPastAppointmentsForPatient);
router.post('/daily-notes', (req, res, next) => {
  dailyNotesUpload.single('video')(req, res, (err) => {
    if (err) {
      console.error('Daily notes video upload error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          success: false,
          error: 'Video file too large. Maximum file size is 50MB.' 
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ 
          success: false,
          error: 'Unexpected file field. Please use "video" as the field name.' 
        });
      }
      return res.status(400).json({ 
        success: false,
        error: err.message || 'Video upload error' 
      });
    }
    next();
  });
}, dailyNotesController.createDailyNote);
router.get('/daily-notes/:id', dailyNotesController.getDailyNoteById);
router.put('/daily-notes/:id', dailyNotesController.updateDailyNote);
router.delete('/daily-notes/:id', dailyNotesController.deleteDailyNote);
router.post('/daily-notes/:id/comments', dailyNotesController.addNoteComment);
router.put('/daily-notes/:id/comments/:commentId', dailyNotesController.editNoteComment);
router.delete('/daily-notes/:id/comments/:commentId', dailyNotesController.deleteNoteComment);

// Progress tracking
router.get('/progress-tracking', progressTrackingController.getProgressTracking);
router.post('/progress-tracking', progressTrackingController.createProgressEntry);
router.put('/progress-tracking/:id', progressTrackingController.updateProgressEntry);
router.delete('/progress-tracking/:id', progressTrackingController.deleteProgressEntry);
router.get('/progress-tracking/patient/:patientId', progressTrackingController.getPatientProgressSummary);


router.post('/assessments', assessmentController.createAssessment);
router.put('/assessments/:id', assessmentController.updateAssessment);
router.delete('/assessments/:id', assessmentController.deleteAssessment);

// Notifications
router.get('/notifications', notificationController.getNotifications);
router.put('/notifications/:id/read', notificationController.markAsRead);
router.put('/notifications/read-all', notificationController.markAllAsRead);
router.delete('/notifications/:id', notificationController.deleteNotification);
router.get('/notifications/stats', notificationController.getNotificationStats);

// Profile management
router.get('/profile', therapistController.getProfile);
router.put('/profile', therapistController.updateProfile);
router.post('/change-password', therapistController.changePassword);
router.post('/upload-profile-image', upload.single('profileImage'), therapistController.uploadProfileImage);

// Onboarding management
router.get('/onboarding/status', therapistController.getOnboardingStatus);
router.put('/onboarding', therapistController.updateOnboardingData);
router.post('/onboarding/complete', therapistController.completeOnboarding);
router.get('/onboarding/progress', therapistController.getOnboardingProgress);

// Settings management
router.get('/settings', settingsController.getSettings);
router.put('/settings', settingsController.updateSettings);

// AI Insights (placeholder for now)
router.get('/ai-insights', (req, res) => {
    res.json({
      success: true,
    data: {
      message: 'AI insights will be integrated here',
      features: [
        'Session analysis',
        'Progress predictions',
        'Treatment recommendations',
        'Goal suggestions'
      ]
    }
  });
});

module.exports = router;
