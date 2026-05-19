const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const { createHTTPSServer, securityHeaders, sslHealthCheck } = require('./config/ssl');
const { 
  encryptRequestData, 
  decryptResponseData, 
  addEncryptionHeaders,
  handleEncryptionError 
} = require('./middleware/encryptionMiddleware');
const websocketService = require('./services/websocketService');
const { checkMaintenanceMode, checkPublicMaintenanceMode } = require('./middleware/maintenanceMiddleware');
const { validateEnvironmentSecurity, securityHeaders: customSecurityHeaders, checkEnvironmentExposure } = require('./middleware/securityMiddleware');
const logger = require('./utils/logger');
const { validateProductionEnv, getCorsOrigins, isProduction } = require('./config/env');

validateProductionEnv();

// Import database configuration using the loader
const loadDatabase = require('./config/database-loader');
const db = loadDatabase();
const dbType = process.env.DB_TYPE || 'sqlite';

const app = express();
const PORT = process.env.PORT || 5000;

// Import routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const therapistRoutes = require('./routes/therapistRoutes');
const patientRoutes = require('./routes/patientRoutes');
const aiRoutes = require('./routes/aiRoutes');
const smsRoutes = require('./routes/smsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const treatmentPlanRoutes = require('./routes/treatmentPlanRoutes');
const homeExerciseRoutes = require('./routes/homeExerciseRoutes');
const progressReportRoutes = require('./routes/progressReportRoutes');
const contactRoutes = require('./routes/contactRoutes');

// CORS MUST be before security headers to work properly
// Exclude /uploads from global CORS since we have a specific middleware for it
app.use((req, res, next) => {
  // Skip CORS for /uploads routes (handled by corsStaticMiddleware)
  if (req.path.startsWith('/uploads/')) {
    return next();
  }
  // Apply CORS for all other routes
  return cors({
    origin: isProduction ? getCorsOrigins() : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Data-Protection', 'X-Content-Encryption'],
    exposedHeaders: ['X-Data-Protection', 'X-Content-Encryption'],
    optionsSuccessStatus: 200
  })(req, res, next);
});

// Compression Middleware (Enable gzip compression with optimization)
app.use(compression({
  level: 6, // Compression level (1-9, 6 is good balance)
  threshold: 1024, // Only compress if response is larger than 1KB
  filter: (req, res) => {
    // Don't compress if request has no-transform cache-control
    if (req.headers['cache-control']?.includes('no-transform')) {
      return false;
    }
    // Use compression filter for all other requests
    return compression.filter(req, res);
  }
}));

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      mediaSrc: ["'self'", 'blob:', 'https:'],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https:'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
      connectSrc: ["'self'", 'https:', 'wss:'],
      fontSrc: ["'self'", 'data:', 'https:'],
      workerSrc: ["'self'", 'blob:']
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Environment security validation (run early)
app.use(validateEnvironmentSecurity);
app.use(checkEnvironmentExposure);

app.use(securityHeaders);
app.use(customSecurityHeaders);
app.use(addEncryptionHeaders);

// Simple in-memory cache for frequently accessed data
const cache = new Map();
const CACHE_TTL = 30000; // 30 seconds default TTL

// Cache middleware helper
const getCached = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }
  cache.delete(key);
  return null;
};

const setCache = (key, data, ttl = CACHE_TTL) => {
  cache.set(key, {
    data,
    expiry: Date.now() + ttl
  });
};
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Encryption Middleware (disabled for auth routes)
app.use((req, res, next) => {
  // Skip encryption middleware for auth routes
  if (req.path.startsWith('/api/auth/')) {
    return next();
  }
  return encryptRequestData(req, res, next);
});

app.use((req, res, next) => {
  // Skip decryption middleware for auth routes
  if (req.path.startsWith('/api/auth/')) {
    return next();
  }
  return decryptResponseData(req, res, next);
});

// Health check endpoints (both /health and /api/health for compatibility)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'TherapEase API is running',
    database: dbType,
    encryption: 'AES-256-GCM',
    timestamp: new Date().toISOString()
  });
});

app.get('/health/db', async (req, res) => {
  try {
    const { getRow } = require('./config/database');
    await getRow('SELECT 1 as ok');
    res.status(200).json({
      status: 'OK',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Database health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      database: 'unavailable',
      message: 'Database connection failed'
    });
  }
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'TherapEase API is running',
    database: dbType,
    encryption: 'AES-256-GCM',
    timestamp: new Date().toISOString()
  });
});

// Test database connection
app.get('/test-db', async (req, res) => {
  try {
    const { getRow } = require('./config/database');
    const result = await getRow('SELECT 1 as test');
    res.json({ 
      success: true, 
      message: 'Database connection working',
      result: result
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Database connection failed',
      message: error.message
    });
  }
});

// SSL Health check endpoint
app.get('/health/ssl', sslHealthCheck);

// Handle CORS preflight for maintenance status
app.options('/api/maintenance-status', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// Public maintenance status endpoint
const systemSettingsController = require('./controllers/systemSettingsController');
app.get('/api/maintenance-status', systemSettingsController.getMaintenanceStatus);

// WebSocket route handler (must be before static file serving)
app.get('/ws', (req, res) => {
  // This should not be reached in normal operation
  // WebSocket service should handle the upgrade
  res.status(426).json({ 
    error: 'Upgrade Required', 
    message: 'This endpoint requires WebSocket upgrade' 
  });
});

// Serve static files from public-website directory
app.use('/public-website', express.static(path.join(__dirname, '../public-website')));

// Middleware to add CORS headers for static file serving
const corsStaticMiddleware = (req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = getCorsOrigins();
  
  // Check if CORS headers are already set (to avoid duplicates)
  if (res.getHeader('Access-Control-Allow-Origin')) {
    // Headers already set, skip
    return next();
  }
  
  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    // Check if origin is allowed
    if (allowedOrigins === true || (Array.isArray(allowedOrigins) && allowedOrigins.includes(origin))) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    return res.status(200).end();
  }
  
  // Check if origin is allowed
  if (allowedOrigins === true || (Array.isArray(allowedOrigins) && allowedOrigins.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  next();
};

// Serve uploaded files with CORS headers and proper MIME types
// Mount at root path since we'll handle /uploads prefix manually
const staticMiddleware = express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath, stat) => {
    // Log file serving for debugging (only in development or when DEBUG is enabled)
    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG === 'true') {
      console.log(`[Static File] Serving: ${filePath}`);
    }
    
    // Set proper Content-Type based on file extension to prevent CORB issues
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.webm': 'video/webm',
      '.mkv': 'video/x-matroska',
      '.flv': 'video/x-flv',
      '.wmv': 'video/x-ms-wmv',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain'
    };
    
    if (mimeTypes[ext]) {
      res.setHeader('Content-Type', mimeTypes[ext]);
      if (process.env.NODE_ENV !== 'production' || process.env.DEBUG === 'true') {
        console.log(`[Static File] Set Content-Type: ${mimeTypes[ext]} for ${filePath}`);
      }
    }
    
    // Set cache control for images
    if (ext.match(/\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
    }
    
    // Set headers for videos to support Range requests and streaming
    if (ext.match(/\.(mp4|mov|avi|webm|mkv|flv|wmv)$/i)) {
      res.setHeader('Accept-Ranges', 'bytes'); // Enable Range requests for video seeking
      res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour for videos
      // Don't set X-Content-Type-Options for videos as it can interfere with playback
    } else {
      // Set X-Content-Type-Options to prevent MIME type sniffing (helps with CORB)
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
    
    // Note: CORS headers are set by corsStaticMiddleware before this function is called
    // This ensures CORS headers are present for both images and videos
  },
  fallthrough: false // Don't fall through to next middleware if file not found
});

// Apply static file serving (CORS headers are handled by Nginx)
// Skip corsStaticMiddleware to prevent duplicate CORS headers since Nginx handles them
app.use('/uploads', (req, res, next) => {
  // Log the request for debugging (always log in production for now to diagnose)
  console.log(`[Static File Request] ${req.method} ${req.path}`);
  console.log(`[Static File Request] Full URL: ${req.protocol}://${req.get('host')}${req.originalUrl}`);
  
  // Strip /uploads prefix from path (express.static mounted at /uploads should do this automatically,
  // but we need to handle it manually to prevent path duplication)
  let filePath = req.path;
  
  // If path is already a full absolute path, extract just the relative part
  if (filePath.startsWith('/home/') || filePath.startsWith(path.join(__dirname, 'uploads'))) {
    // Extract relative path from full path
    const uploadsDir = path.join(__dirname, 'uploads');
    if (filePath.startsWith(uploadsDir)) {
      filePath = filePath.substring(uploadsDir.length);
    } else {
      // Try to extract from /uploads/ in the path
      const uploadsIndex = filePath.indexOf('/uploads/');
      if (uploadsIndex !== -1) {
        filePath = filePath.substring(uploadsIndex + 8); // Skip '/uploads/'
      }
    }
  }
  
  // Remove /uploads prefix if present
  if (filePath.startsWith('/uploads/')) {
    filePath = filePath.substring(8); // Remove '/uploads'
  } else if (filePath.startsWith('/uploads')) {
    filePath = filePath.substring(8); // Remove '/uploads'
  }
  
  // Ensure path starts with / for express.static
  if (!filePath.startsWith('/')) {
    filePath = '/' + filePath;
  }
  
  // Log the normalized path for debugging
  console.log(`[Static File] Normalized path: ${filePath} (original: ${req.path})`);
  
  // Create a modified request object with the corrected path
  const modifiedReq = Object.create(req);
  Object.setPrototypeOf(modifiedReq, req);
  modifiedReq.url = filePath;
  modifiedReq.path = filePath;
  modifiedReq.originalUrl = filePath;
  
  // Call the static middleware with modified request
  staticMiddleware(modifiedReq, res, (err) => {
    // Handle 404 errors
    if (err && err.status === 404) {
      console.error(`[Static File] File not found: ${filePath}`);
      const fs = require('fs');
      const fullPath = path.join(__dirname, 'uploads', filePath);
      console.error(`[Static File] Full path would be: ${fullPath}`);
      console.error(`[Static File] File exists: ${fs.existsSync(fullPath)}`);
      
      // List files in the directory to help debug
      const dirPath = path.dirname(fullPath);
      if (fs.existsSync(dirPath)) {
        try {
          const files = fs.readdirSync(dirPath);
          console.error(`[Static File] Files in directory: ${files.join(', ')}`);
        } catch (dirErr) {
          console.error(`[Static File] Error reading directory: ${dirErr.message}`);
        }
      }
      
      res.status(404).json({ error: 'File not found', path: filePath });
    } else if (err) {
      console.error(`[Static File] Error serving file: ${err.message}`);
      res.status(500).json({ error: 'Error serving file' });
    } else {
      // File was served successfully
      console.log(`[Static File] File served successfully: ${filePath}`);
      next();
    }
  });
});

// Diagnostic endpoint to check if a file exists (for debugging)
app.get('/uploads/check/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', 'exercise-proofs', filename);
  const fs = require('fs');
  
  if (fs.existsSync(filePath)) {
    res.json({
      exists: true,
      path: filePath,
      size: fs.statSync(filePath).size,
      url: `/uploads/exercise-proofs/${filename}`
    });
  } else {
    // Check if file exists in any subdirectory
    const uploadsDir = path.join(__dirname, 'uploads');
    let foundPath = null;
    
    function findFile(dir, targetFile) {
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            const found = findFile(filePath, targetFile);
            if (found) return found;
          } else if (file === targetFile) {
            return filePath;
          }
        }
      } catch (err) {
        // Ignore errors
      }
      return null;
    }
    
    foundPath = findFile(uploadsDir, filename);
    
    res.json({
      exists: false,
      requestedPath: filePath,
      foundPath: foundPath,
      message: foundPath ? `File found at: ${foundPath}` : 'File not found in uploads directory'
    });
  }
});

// Root-level assets are no longer served from the backend (frontend handled by Vite client)

// Test auth route
app.get('/api/auth/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Auth route is working',
    timestamp: new Date().toISOString()
  });
});

// Test notification creation
app.post('/api/test-notification', async (req, res) => {
  try {
    const { getRow, runQuery } = require('./config/database');
    
    // Create a test notification for admin user (ID 2)
    const result = await runQuery(
      'INSERT INTO notifications (userId, title, message, type, createdAt) VALUES (?, ?, ?, ?, ?)',
      [2, 'Test Notification', 'This is a test notification', 'system', new Date()]
    );
    
    res.json({
      success: true,
      message: 'Test notification created',
      notificationId: result.insertId
    });
  } catch (error) {
    logger.error('Test notification error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test database tables
app.get('/api/test-tables', async (req, res) => {
  try {
    const { getAll } = require('./config/database');
    
    // Check if tables exist
    const tables = await getAll('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);
    
    // Check specific tables
    const checks = {
      users: tableNames.includes('users'),
      therapists: tableNames.includes('therapists'),
      patients: tableNames.includes('patients'),
      notifications: tableNames.includes('notifications')
    };
    
    res.json({
      success: true,
      tables: tableNames,
      checks
    });
  } catch (error) {
    logger.error('Test tables error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test admin users query
app.get('/api/test-admin-users', async (req, res) => {
  try {
    const { getAll } = require('./config/database');
    
    // Test the exact query from getUsers function
    const sql = `
      SELECT 
        u.id,
        u.email,
        u.role,
        u.firstName,
        u.lastName,
        u.phone,
        u.dateOfBirth,
        u.gender,
        u.address,
        u.city,
        u.state,
        u.zipCode,
        u.status,
        u.createdAt,
        u.updatedAt,
        t.licenseNumber,
        t.specialization,
        t.yearsOfExperience,
        t.education,
        t.certifications,
        t.availability,
        p.id as patientId,
        p.diagnosis,
        p.medicalHistory,
        p.goals,
        p.therapistId,
        (SELECT CONCAT(u2.firstName, ' ', u2.lastName) FROM users u2 WHERE u2.id = p.therapistId) as therapistName,
        (SELECT COUNT(*) FROM patients pt WHERE pt.therapistId = t.userId) as patientCount
      FROM users u
      LEFT JOIN therapists t ON u.id = t.userId
      LEFT JOIN patients p ON u.id = p.userId
      ORDER BY u.createdAt DESC
      LIMIT 5 OFFSET 0
    `;
    
    const users = await getAll(sql);
    
    res.json({
      success: true,
      count: users.length,
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      }))
    });
  } catch (error) {
    logger.error('Test admin users error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
  }
});

// Test database columns
app.get('/api/test-columns', async (req, res) => {
  try {
    const { getAll } = require('./config/database');
    
    // Check users table columns
    const usersColumns = await getAll('DESCRIBE users');
    const therapistsColumns = await getAll('DESCRIBE therapists');
    const patientsColumns = await getAll('DESCRIBE patients');
    
    res.json({
      success: true,
      users: usersColumns.map(col => col.Field),
      therapists: therapistsColumns.map(col => col.Field),
      patients: patientsColumns.map(col => col.Field)
    });
  } catch (error) {
    logger.error('Test columns error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);

// Contact form route (public - no authentication required)
app.use('/api/contact', contactRoutes);

// Admin routes (no maintenance mode check - admins can always access)
app.use('/api/admin', adminRoutes);

// Other routes with maintenance mode check
app.use('/api/therapist', checkMaintenanceMode);
app.use('/api/therapist', therapistRoutes);
app.use('/api/patient', checkMaintenanceMode);
app.use('/api/patient', patientRoutes);
app.use('/api/ai', checkMaintenanceMode);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', checkMaintenanceMode);
app.use('/api/notifications', notificationRoutes);
app.use('/api/notifications/sms', checkMaintenanceMode);
app.use('/api/notifications/sms', smsRoutes);
app.use('/api/treatment-plans', checkMaintenanceMode);
app.use('/api/treatment-plans', treatmentPlanRoutes);
app.use('/api/home-exercises', checkMaintenanceMode);
app.use('/api/home-exercises', homeExerciseRoutes);
app.use('/api/progress-reports', checkMaintenanceMode);
app.use('/api/progress-reports', progressReportRoutes);

// Error handling middleware
app.use(handleEncryptionError);
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Make cache available to the app
app.locals.cache = { get: getCached, set: setCache };

// Create HTTP server for development (temporarily disable SSL)
const http = require('http');
const server = http.createServer(app);

// Initialize WebSocket service
websocketService.initialize(server);

// Initialize notification schedulers
const { initializeNotificationSchedulers } = require('./scripts/notificationScheduler');
initializeNotificationSchedulers();

// Start server
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`❌ Port ${PORT} is already in use. Stop the existing process or set a different PORT value.`);
    process.exit(1);
  }

  logger.error('❌ Server failed to start:', error);
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', () => {
  logger.startup(`🚀 TherapEase API server running on port ${PORT}`);
  logger.startup(`🌐 HTTP mode (SSL disabled for development)`);
  logger.startup(`📊 Database: ${dbType}`);
  logger.startup(`🔐 Encryption: AES-256-GCM`);
  logger.startup(`🌐 WebSocket service initialized`);
  logger.startup(`🔔 Notification schedulers initialized`);
  logger.startup(`🔗 Server accessible on all interfaces (0.0.0.0:${PORT})`);
});

module.exports = app;
