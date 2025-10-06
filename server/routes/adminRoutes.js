const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');
const profileController = require('../controllers/profileController');
const upload = require('../middleware/uploadMiddleware');
const settingsController = require('../controllers/settingsController');

// Apply authentication and admin role authorization to all routes
router.use(authenticateToken);
router.use(authorizeRole(['admin']));

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// Patient management
router.get('/patients', adminController.getUsers);
router.get('/patients/:patientId/assessments', adminController.getPatientAssessments);
router.get('/patients/:patientId/sessions', adminController.getPatientSessions);
router.get('/patients/:patientId/progress', adminController.getPatientProgress);
router.post('/patients/assign-therapist', adminController.assignTherapistToPatient);
router.delete('/patients/:patientId/unassign-therapist', adminController.unassignTherapistFromPatient);
router.post('/patients/add-therapist', adminController.addTherapistToPatient);
router.delete('/patients/:patientId/therapists/:therapistId', adminController.removeTherapistFromPatient);
router.get('/patients/:patientId/therapists', adminController.getPatientTherapists);

// Therapist management
router.get('/therapists', adminController.getTherapists);
router.get('/therapists/available', adminController.getAvailableTherapists);
router.put('/therapists/:therapistId/availability', adminController.updateTherapistAvailability);

// Appointment management
router.get('/appointments', adminController.getAppointments);
router.post('/appointments', adminController.createAppointment);

// User management
router.get('/users', adminController.getAllUsers);
router.put('/users/:userId', adminController.updateUser);
router.delete('/users/:userId', adminController.deleteUser);
router.put('/users/:userId/status', adminController.updateUserStatus);
router.post('/users/:userId/reset-password', adminController.resetUserPassword);
router.post('/users/:userId/send-reset-link', adminController.sendPasswordResetLink);

// Reports
router.get('/reports', adminController.getSystemStats);

// Profile management
router.get('/profile', profileController.getProfile);
router.put('/profile', profileController.updateProfile);
router.post('/change-password', profileController.changePassword);
router.post('/upload-profile-image', upload.single('profileImage'), profileController.uploadProfileImage);

// Settings management
router.get('/settings', settingsController.getSettings);
router.put('/settings', settingsController.updateSettings);

// Notifications
router.get('/notifications', adminController.getNotifications);

// Settings
router.get('/settings', adminController.getSystemStats);

module.exports = router;
