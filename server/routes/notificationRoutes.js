const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const notificationController = require('../controllers/notificationController');

// Apply authentication to all notification routes
router.use(authenticateToken);

// Get notifications for a user
router.get('/', notificationController.getNotifications);

// Mark notification as read
router.patch('/:id/read', notificationController.markAsRead);

// Mark all notifications as read
router.patch('/read-all', notificationController.markAllAsRead);

// Delete all notifications (must come before /:id route)
router.delete('/delete-all', notificationController.deleteAllNotifications);

// Delete notification
router.delete('/:id', notificationController.deleteNotification);

// Get notification statistics
router.get('/stats', notificationController.getNotificationStats);

// Push notification routes
router.post('/subscribe', notificationController.subscribeToPush);
router.post('/unsubscribe', notificationController.unsubscribeFromPush);

// SMS notification routes
router.post('/sms/send', notificationController.sendSMSNotification);
router.get('/sms/delivery-status/:messageId', notificationController.getSMSDeliveryStatus);
router.get('/sms/balance', notificationController.getSMSBalance);
router.get('/sms/test', notificationController.testSMSService);

// SMS webhook (no auth required)
router.post('/sms/delivery-status', notificationController.handleSMSDeliveryStatus);

module.exports = router;
