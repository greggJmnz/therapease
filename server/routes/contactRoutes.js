const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');

// Contact form route (public - no authentication required)
router.post('/submit', contactController.submitContactForm);

module.exports = router;

