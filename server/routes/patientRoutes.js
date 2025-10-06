const express = require('express');
const router = express.Router();
const { authenticateToken, authorizePatient } = require('../middleware/authMiddleware');
const { decryptResponseData } = require('../middleware/encryptionMiddleware');
const patientController = require('../controllers/patientController');
const profileController = require('../controllers/profileController');
const upload = require('../middleware/uploadMiddleware');
const settingsController = require('../controllers/settingsController');

// Apply authentication and patient role authorization to all routes
router.use(authenticateToken);
router.use(authorizePatient);
router.use(decryptResponseData);

// Dashboard
router.get('/dashboard', patientController.getDashboard);

// Progress tracking
router.get('/progress', patientController.getProgress);

// Appointments
router.get('/appointments', patientController.getAppointments);
router.post('/appointments', patientController.bookAppointment);
router.put('/appointments/:id/cancel', patientController.cancelAppointment);
router.put('/appointments/:id/postpone', patientController.postponeAppointment);
router.put('/appointments/:id/reschedule', patientController.rescheduleAppointment);

// Daily notes
router.get('/daily-notes', patientController.getDailyNotes);
router.post('/daily-notes/cleanup', patientController.cleanupDailyNotes);
router.post('/daily-notes/:id/comments', patientController.addNoteComment);
router.put('/daily-notes/:id/comments/:commentId', patientController.editNoteComment);
router.delete('/daily-notes/:id/comments/:commentId', patientController.deleteNoteComment);

// Sessions
router.get('/sessions', patientController.getSessions);

// Assessments
router.get('/assessments', patientController.getAssessments);

// Home exercises
router.get('/exercises', patientController.getHomeExercises);

// Notifications
router.get('/notifications', patientController.getNotifications);

// Settings
router.get('/settings', patientController.getSettings);

// Profile management
router.get('/profile', profileController.getProfile);
router.put('/profile', profileController.updateProfile);
router.post('/change-password', profileController.changePassword);
router.post('/upload-profile-image', upload.single('profileImage'), profileController.uploadProfileImage);

// Settings management
router.get('/settings', settingsController.getSettings);
router.put('/settings', settingsController.updateSettings);

// Onboarding management
router.get('/onboarding/status', patientController.getOnboardingStatus);
router.get('/onboarding/progress', patientController.getOnboardingProgress);
router.put('/onboarding', patientController.updateOnboardingData);
router.post('/onboarding/complete', patientController.completeOnboarding);

module.exports = router;
