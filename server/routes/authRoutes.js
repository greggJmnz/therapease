const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// User authentication routes
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/verify', authController.verify);
router.get('/verify', authController.verify); // Add GET route for frontend compatibility
router.post('/change-password', authController.changePassword);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/verify-reset-token/:token', authController.verifyResetToken);

module.exports = router;
