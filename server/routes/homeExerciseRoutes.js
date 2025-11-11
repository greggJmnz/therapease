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
  getPatientProofs,
  updateExerciseStatus
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
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allowed file extensions
    const allowedExtensions = /\.(jpeg|jpg|png|gif|webp|bmp|mp4|mov|avi|webm|mkv|m4v|flv|wmv|pdf|doc|docx|txt)$/i;
    
    // Allowed MIME types (more lenient - check base type first, then specific)
    const allowedMimeTypes = [
      // Images
      /^image\/(jpeg|jpg|png|gif|webp|bmp)/i,
      // Videos - be more lenient, accept any video/* type for common extensions
      /^video\//i,
      // Documents
      /^application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/i,
      /^text\/(plain)$/i
    ];
    
    const ext = path.extname(file.originalname).toLowerCase();
    const extname = allowedExtensions.test(ext);
    
    // For video files, be more lenient with MIME type checking
    const isVideoExt = /\.(mp4|mov|avi|webm|mkv|m4v|flv|wmv)$/i.test(ext);
    const isImageExt = /\.(jpeg|jpg|png|gif|webp|bmp)$/i.test(ext);
    
    let mimetype = false;
    
    if (isVideoExt) {
      // For video files, accept any video/* MIME type
      mimetype = /^video\//i.test(file.mimetype);
    } else if (isImageExt) {
      // For image files, check image/* MIME type
      mimetype = /^image\//i.test(file.mimetype);
    } else {
      // For other files, check against specific patterns
      mimetype = allowedMimeTypes.some(pattern => pattern.test(file.mimetype));
    }
    
    // Log for debugging
    if (!extname || !mimetype) {
      console.log('❌ File rejected:', {
        filename: file.originalname,
        extension: ext,
        mimetype: file.mimetype,
        extnameMatch: extname,
        mimetypeMatch: mimetype,
        isVideoExt,
        isImageExt
      });
    } else {
      console.log('✅ File accepted:', {
        filename: file.originalname,
        extension: ext,
        mimetype: file.mimetype
      });
    }
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Only images, videos, and documents are allowed. Received: ${file.mimetype} (${ext})`));
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
router.put('/patient/exercises/:id/status', authenticateToken, updateExerciseStatus);
router.post('/patient/exercises/:exerciseId/proof', authenticateToken, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('Multer upload error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          success: false,
          error: 'File too large. Maximum file size is 50MB.' 
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ 
          success: false,
          error: 'Unexpected file field. Please use "file" as the field name.' 
        });
      }
      return res.status(400).json({ 
        success: false,
        error: err.message || 'File upload error' 
      });
    }
    next();
  });
}, submitProof);
router.get('/patient/exercises/:exerciseId/proofs', authenticateToken, getExerciseProofs);
router.get('/patient/proofs', authenticateToken, getPatientProofs);

module.exports = router;
