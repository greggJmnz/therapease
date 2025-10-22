const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
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
// Load environment variables - use .env.production in production, .env in development
const envFile = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, '.env.production')
  : path.join(__dirname, '../.env');
require('dotenv').config({ path: envFile });

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

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Temporarily disable CSP to test image loading
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
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? [
    'https://therapease.site',
    'https://www.therapease.site',
    'https://api.therapease.site'
  ] : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Data-Protection', 'X-Content-Encryption'],
  exposedHeaders: ['X-Data-Protection', 'X-Content-Encryption'],
  optionsSuccessStatus: 200
}));
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

// Health check endpoints
app.get('/health', (req, res) => {
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

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve root-level assets
app.use(express.static(path.join(__dirname, 'public')));

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
    console.error('Test notification error:', error);
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
    console.error('Test tables error:', error);
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
    console.error('Test admin users error:', error);
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
    console.error('Test columns error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);

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
  console.error(err.stack);
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

// Create HTTP server for development (temporarily disable SSL)
const http = require('http');
const server = http.createServer(app);

// Initialize WebSocket service
websocketService.initialize(server);

// Initialize notification schedulers
const { initializeNotificationSchedulers } = require('./scripts/notificationScheduler');
initializeNotificationSchedulers();

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 TherapEase API server running on port ${PORT}`);
  console.log(`🌐 HTTP mode (SSL disabled for development)`);
  console.log(`📊 Database: ${dbType}`);
  console.log(`🔐 Encryption: AES-256-GCM`);
  console.log(`🌐 WebSocket service initialized`);
  console.log(`🔔 Notification schedulers initialized`);
  console.log(`🔗 Server accessible on all interfaces (0.0.0.0:${PORT})`);
});

module.exports = app;
