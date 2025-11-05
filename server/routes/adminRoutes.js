const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');
const profileController = require('../controllers/profileController');
const upload = require('../middleware/uploadMiddleware');
const settingsController = require('../controllers/settingsController');
const systemSettingsController = require('../controllers/systemSettingsController');

// Apply authentication and admin role authorization to all routes
router.use(authenticateToken);
router.use(authorizeRole(['admin']));

// Debug middleware to log all admin requests
router.use((req, res, next) => {
  if (req.method === 'DELETE' && req.path.includes('users')) {
    console.log('🔍 Admin DELETE request:', {
      method: req.method,
      path: req.path,
      originalUrl: req.originalUrl,
      baseUrl: req.baseUrl,
      url: req.url
    });
  }
  next();
});

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// Patient management
router.get('/patients', adminController.getUsers);
router.get('/patients/with-assignments', adminController.getPatientsWithAssignments);
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
router.get('/therapists/:therapistId/working-hours', adminController.getTherapistWorkingHours);
router.put('/therapists/:therapistId/availability', adminController.updateTherapistAvailability);

// Appointment management
router.get('/appointments', adminController.getAppointments);
router.post('/appointments', adminController.createAppointment);
router.put('/appointments/:id', adminController.updateAppointment);
router.delete('/appointments/:id', adminController.deleteAppointment);
router.get('/appointments/pending', adminController.getPendingAppointments);
router.post('/appointments/:appointmentId/approve', adminController.approveAppointment);
router.post('/appointments/:appointmentId/reject', adminController.rejectAppointment);

// User management
// Note: More specific routes should come before less specific ones
router.get('/users', adminController.getAllUsers);
router.post('/users', adminController.createUser);
router.put('/users/:userId/status', adminController.updateUserStatus);
router.post('/users/:userId/reset-password', adminController.resetUserPassword);
router.post('/users/:userId/send-reset-link', adminController.sendPasswordResetLink);
router.put('/users/:userId', adminController.updateUser);

// DELETE route with logging middleware
router.delete('/users/:userId', (req, res, next) => {
  console.log('🔍 DELETE /users/:userId route hit:', {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    params: req.params,
    userId: req.params.userId
  });
  next();
}, adminController.deleteUser);


// Reports
router.get('/reports', adminController.getReports);
router.get('/system-stats', adminController.getSystemStats);
router.get('/daily-trends', adminController.getDailyTrends);

// Profile management
router.get('/profile', profileController.getProfile);
router.put('/profile', profileController.updateProfile);
router.post('/change-password', profileController.changePassword);
router.post('/upload-profile-image', upload.single('profileImage'), profileController.uploadProfileImage);

// Settings management
router.get('/settings', settingsController.getSettings);
router.put('/settings', settingsController.updateSettings);

// System settings management
router.get('/system-settings', systemSettingsController.getSystemSettings);
router.put('/system-settings', systemSettingsController.updateSystemSettings);

// Public maintenance mode check (no auth required)
router.get('/maintenance-status', systemSettingsController.getMaintenanceStatus);

// Notifications
router.get('/notifications', adminController.getNotifications);
router.patch('/notifications/:id/read', adminController.markNotificationAsRead);
router.patch('/notifications/read-all', adminController.markAllNotificationsAsRead);
router.delete('/notifications/:id', adminController.deleteNotification);

// Catch-all route for debugging (should be last)
router.use((req, res, next) => {
  console.log('⚠️ Unmatched admin route:', {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    url: req.url,
    baseUrl: req.baseUrl
  });
  res.status(404).json({
    success: false,
    error: 'Route not found',
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl
  });
});

module.exports = router;
