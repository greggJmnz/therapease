const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for daily notes video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/daily-notes-videos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `daily-note-video-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for videos
  },
  fileFilter: (req, file, cb) => {
    // Allowed video extensions
    const allowedExtensions = /\.(mp4|mov|avi|webm|mkv|m4v|flv|wmv)$/i;
    
    // Allowed MIME types for videos
    const allowedMimeTypes = [
      /^video\//i, // Accept any video/* type
    ];
    
    const fileExtension = path.extname(file.originalname);
    const isValidExtension = allowedExtensions.test(fileExtension);
    const isValidMimeType = allowedMimeTypes.some(pattern => pattern.test(file.mimetype));
    
    if (isValidExtension || isValidMimeType) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed (mp4, mov, avi, webm, mkv, m4v, flv, wmv)'), false);
    }
  }
});

module.exports = upload;

