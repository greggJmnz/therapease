const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const {
  getTreatmentPlans,
  getTreatmentPlan,
  createTreatmentPlan,
  updateTreatmentPlan,
  deleteTreatmentPlan,
  createMainObjective,
  updateMainObjective,
  deleteMainObjective,
  createSpecificObjective,
  updateSpecificObjective,
  deleteSpecificObjective,
  getPatientTreatmentPlan
} = require('../controllers/treatmentPlanController');

// Therapist routes
router.get('/', authenticateToken, getTreatmentPlans);
router.get('/:id', authenticateToken, getTreatmentPlan);
router.post('/', authenticateToken, createTreatmentPlan);
router.put('/:id', authenticateToken, updateTreatmentPlan);
router.delete('/:id', authenticateToken, deleteTreatmentPlan);

// Main objectives routes
router.post('/:treatmentPlanId/main-objectives', authenticateToken, createMainObjective);
router.put('/main-objectives/:id', authenticateToken, updateMainObjective);
router.delete('/main-objectives/:id', authenticateToken, deleteMainObjective);

// Specific objectives routes
router.post('/main-objectives/:mainObjectiveId/specific-objectives', authenticateToken, createSpecificObjective);
router.put('/specific-objectives/:id', authenticateToken, updateSpecificObjective);
router.delete('/specific-objectives/:id', authenticateToken, deleteSpecificObjective);

// Patient routes
router.get('/patient/current', authenticateToken, getPatientTreatmentPlan);

module.exports = router;
