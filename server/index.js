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
require('dotenv').config({ path: path.join(__dirname, '../.env') });

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
  origin: process.env.NODE_ENV === 'production' ? ['https://therapease.site'] : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
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

// Public maintenance status endpoint (no auth required)
app.get('/api/maintenance-status', async (req, res) => {
  try {
    const { getRow } = require('./config/database');
    const maintenanceSetting = await getRow(
      'SELECT setting_value FROM system_settings WHERE setting_key = ?',
      ['maintenance_mode']
    );

    const isMaintenanceMode = maintenanceSetting && maintenanceSetting.setting_value === 'true';

    res.json({
      success: true,
      maintenanceMode: isMaintenanceMode,
      message: isMaintenanceMode 
        ? 'System is currently under maintenance. Please try again later.'
        : 'System is operational'
    });

  } catch (error) {
    console.error('Error fetching maintenance status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch maintenance status'
    });
  }
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

// API routes
app.use('/api/auth', authRoutes);

// Apply maintenance middleware to non-admin routes
app.use('/api/therapist', checkMaintenanceMode);
app.use('/api/patient', checkMaintenanceMode);
app.use('/api/ai', checkMaintenanceMode);
app.use('/api/notifications', checkMaintenanceMode);
app.use('/api/notifications/sms', checkMaintenanceMode);
app.use('/api/treatment-plans', checkMaintenanceMode);
app.use('/api/home-exercises', checkMaintenanceMode);
app.use('/api/progress-reports', checkMaintenanceMode);

// Admin routes (no maintenance mode check - admins can always access)
app.use('/api/admin', adminRoutes);

// Other routes with maintenance mode check
app.use('/api/therapist', therapistRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/notifications/sms', smsRoutes);
app.use('/api/treatment-plans', treatmentPlanRoutes);
app.use('/api/home-exercises', homeExerciseRoutes);
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

// Start server
server.listen(PORT, () => {
  console.log(`🚀 TherapEase API server running on port ${PORT}`);
  console.log(`🌐 HTTP mode (SSL disabled for development)`);
  console.log(`📊 Database: ${dbType}`);
  console.log(`🔐 Encryption: AES-256-GCM`);
  console.log(`🌐 WebSocket service initialized`);
});

module.exports = app;
