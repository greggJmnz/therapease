const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeAdmin } = require('../middleware/authMiddleware');
const notificationController = require('../controllers/notificationController');

// Apply authentication to all SMS routes
router.use(authenticateToken);

// Send SMS notification (Admin only)
router.post('/send', authorizeAdmin, notificationController.sendSMSNotification);

// Get SMS delivery status
router.get('/delivery-status/:messageId', notificationController.getSMSDeliveryStatus);

// Get SMS account balance (Admin only)
router.get('/balance', authorizeAdmin, notificationController.getSMSBalance);

// Test SMS service (Admin only)
router.get('/test', authorizeAdmin, notificationController.testSMSService);

// Handle SMS delivery status webhook (no auth required for webhook)
router.post('/delivery-status', notificationController.handleSMSDeliveryStatus);

module.exports = router;
