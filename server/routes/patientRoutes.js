const express = require('express');
const router = express.Router();
const { authenticateToken, authorizePatient } = require('../middleware/authMiddleware');
const { decryptResponseData } = require('../middleware/encryptionMiddleware');
const patientController = require('../controllers/patientController');
const profileController = require('../controllers/profileController');
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
router.put('/appointments/:id/reschedule', patientController.rescheduleAppointment);

// Daily notes
router.get('/daily-notes', patientController.getDailyNotes);
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

// Settings management
router.get('/settings', settingsController.getSettings);
router.put('/settings', settingsController.updateSettings);

module.exports = router;
