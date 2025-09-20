const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');
const profileController = require('../controllers/profileController');
const settingsController = require('../controllers/settingsController');

// Apply authentication and admin role authorization to all routes
router.use(authenticateToken);
router.use(authorizeRole(['admin']));

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// Patient management
router.get('/patients', adminController.getUsers);

// Therapist management
router.get('/therapists', adminController.getUsers);

// Appointment management
router.get('/appointments', adminController.getAppointments);

// User management
router.put('/users/:userId', adminController.updateUser);

// Reports
router.get('/reports', adminController.getSystemStats);

// Profile management
router.get('/profile', profileController.getProfile);
router.put('/profile', profileController.updateProfile);
router.post('/change-password', profileController.changePassword);

// Settings management
router.get('/settings', settingsController.getSettings);
router.put('/settings', settingsController.updateSettings);

// Notifications
router.get('/notifications', adminController.getNotifications);

// Settings
router.get('/settings', adminController.getSystemStats);

module.exports = router;
