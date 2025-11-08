const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const {
  getTherapistExercises,
  getPatientExercises,
  createExercise,
  updateExercise,
  deleteExercise,
  submitProof,
  getExerciseProofs,
  reviewProof,
  getTherapistProofs,
  getPatientProofs
} = require('../controllers/homeExerciseController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/exercise-proofs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `proof-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit (matches Nginx client_max_body_size)
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, videos, and documents are allowed.'));
    }
  }
});

// Therapist routes
router.get('/therapist/exercises', authenticateToken, getTherapistExercises);
router.post('/therapist/exercises', authenticateToken, createExercise);
router.put('/therapist/exercises/:id', authenticateToken, updateExercise);
router.delete('/therapist/exercises/:id', authenticateToken, deleteExercise);
router.get('/therapist/proofs', authenticateToken, getTherapistProofs);
router.put('/therapist/proofs/:proofId/review', authenticateToken, reviewProof);

// Patient routes
router.get('/patient/exercises', authenticateToken, getPatientExercises);
router.post('/patient/exercises/:exerciseId/proof', authenticateToken, upload.single('file'), submitProof);
// Support both /proof and /proofs for backward compatibility
router.get('/patient/exercises/:exerciseId/proof', authenticateToken, getExerciseProofs);
router.get('/patient/exercises/:exerciseId/proofs', authenticateToken, getExerciseProofs);
router.get('/patient/proofs', authenticateToken, getPatientProofs);

module.exports = router;
