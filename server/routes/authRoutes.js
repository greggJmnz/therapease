const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const twoFactorController = require('../controllers/twoFactorController');
const { authenticateToken } = require('../middleware/authMiddleware');

// User authentication routes
router.post('/login', authController.login);
router.post('/login-2fa', authController.loginWith2FA);
router.post('/register', authController.register);
router.post('/verify', authController.verify);
router.get('/verify', authController.verify); // Add GET route for frontend compatibility
router.post('/change-password', authController.changePassword);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/verify-reset-token/:token', authController.verifyResetToken);

// Two-Factor Authentication routes
router.post('/2fa/send-code', twoFactorController.send2FALoginCode);
router.post('/2fa/verify-code', twoFactorController.verify2FALoginCode);
router.get('/2fa/status', authenticateToken, twoFactorController.get2FAStatus);
router.post('/2fa/enable', authenticateToken, twoFactorController.enable2FA);
router.post('/2fa/verify-setup', authenticateToken, twoFactorController.verify2FASetup);
router.post('/2fa/disable', authenticateToken, twoFactorController.disable2FA);

module.exports = router;
