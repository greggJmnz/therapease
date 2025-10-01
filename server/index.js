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

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "https://cdn.tailwindcss.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(securityHeaders);
app.use(addEncryptionHeaders);
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? ['https://yourdomain.com'] : true,
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

// SSL Health check endpoint
app.get('/health/ssl', sslHealthCheck);

// Temporary test endpoint for patient selection (bypasses authentication)
app.get('/api/test/patients', async (req, res) => {
  try {
    const { getPatients } = require('./controllers/patientController');
    const mockReq = {
      user: { id: 44, role: 'therapist' },
      query: {}
    };
    
    const mockRes = {
      json: (data) => {
        res.json(data);
      },
      status: (code) => ({
        json: (data) => {
          res.status(code).json(data);
        }
      })
    };
    
    await getPatients(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Test endpoint error: ' + error.message
    });
  }
});

// Temporary test endpoint for patient treatment plan (bypasses authentication)
app.get('/api/test/patient-treatment-plan', async (req, res) => {
  try {
    const { getPatientTreatmentPlan } = require('./controllers/treatmentPlanController');
    const mockReq = {
      user: { id: 49 }, // Alexandra Santos user ID
      query: {}
    };
    
    const mockRes = {
      json: (data) => {
        res.json(data);
      },
      status: (code) => ({
        json: (data) => {
          res.status(code).json(data);
        }
      })
    };
    
    await getPatientTreatmentPlan(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Test endpoint error: ' + error.message
    });
  }
});

// Temporary test endpoint for therapist treatment plans (bypasses authentication)
app.get('/api/test/treatment-plans', async (req, res) => {
  try {
    const { getTreatmentPlans } = require('./controllers/treatmentPlanController');
    const mockReq = {
      user: { id: 44, role: 'therapist' },
      query: req.query
    };
    
    const mockRes = {
      json: (data) => {
        res.json(data);
      },
      status: (code) => ({
        json: (data) => {
          res.status(code).json(data);
        }
      })
    };
    
    await getTreatmentPlans(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Test endpoint error: ' + error.message
    });
  }
});

// Temporary test endpoint for getting treatment plan details (bypasses authentication)
app.get('/api/test/treatment-plan/:id', async (req, res) => {
  try {
    const { getTreatmentPlan } = require('./controllers/treatmentPlanController');
    const mockReq = {
      params: req.params,
      user: { id: 44, role: 'therapist' }
    };
    
    const mockRes = {
      json: (data) => {
        res.json(data);
      },
      status: (code) => ({
        json: (data) => {
          res.status(code).json(data);
        }
      })
    };
    
    await getTreatmentPlan(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Test endpoint error: ' + error.message
    });
  }
});

// Temporary test endpoint for updating specific objectives (bypasses authentication)
app.put('/api/test/specific-objectives/:id', async (req, res) => {
  try {
    const { updateSpecificObjective } = require('./controllers/treatmentPlanController');
    const mockReq = {
      params: req.params,
      body: req.body,
      user: { id: 44, role: 'therapist' }
    };
    
    const mockRes = {
      json: (data) => {
        res.json(data);
      },
      status: (code) => ({
        json: (data) => {
          res.status(code).json(data);
        }
      })
    };
    
    await updateSpecificObjective(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Test endpoint error: ' + error.message
    });
  }
});

// Serve debug page
app.get('/debug', (req, res) => {
  res.sendFile(path.join(__dirname, 'debug.html'));
});

// Serve public website static files
app.use('/public-website', express.static(path.join(__dirname, '../public-website')));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve root-level assets
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'favicon.ico'));
});

app.get('/sw.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'sw.js'));
});

// Redirect root to public website
app.get('/', (req, res) => {
  res.redirect('/public-website/index.html');
});

// Handle public website routes
app.get('/public-website', (req, res) => {
  res.redirect('/public-website/index.html');
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/therapist', therapistRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/notifications/sms', smsRoutes);
app.use('/api/treatment-plans', treatmentPlanRoutes);

// Error handling middleware
app.use(handleEncryptionError);
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server with HTTPS support
const startServer = async () => {
  const PORT = process.env.PORT || 5000;
  const HTTPS_PORT = process.env.HTTPS_PORT || 5443;
  
  try {
    // Create HTTPS server
    const httpsServer = createHTTPSServer(app);
    
    if (httpsServer) {
      // Initialize WebSocket service
      websocketService.initialize(httpsServer);
      
      // Start HTTPS server
      httpsServer.listen(HTTPS_PORT, () => {
        console.log(`🔒 TherapEase HTTPS server running on port ${HTTPS_PORT}`);
        console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🗄️  Database: ${dbType.toUpperCase()}`);
        console.log(`🔐 Encryption: AES-256-CBC`);
        console.log(`🌐 TLS Version: 1.2/1.3`);
        console.log(`🔌 WebSocket: wss://localhost:${HTTPS_PORT}/ws`);
        
        if (dbType === 'mysql') {
          console.log('✅ MySQL database ready');
        } else {
          console.log('✅ SQLite development database ready');
        }
        
        console.log(`🔗 HTTPS URL: https://localhost:${HTTPS_PORT}`);
        console.log(`🔗 Health Check: https://localhost:${HTTPS_PORT}/health`);
        console.log(`🔗 SSL Health Check: https://localhost:${HTTPS_PORT}/health/ssl`);
      });
    } else {
      console.log('⚠️  HTTPS server creation failed, falling back to HTTP');
      startHTTP();
    }
    
    // Also start HTTP server for development
    if (process.env.NODE_ENV !== 'production') {
      startHTTP();
    }
    
  } catch (error) {
    console.error('❌ Failed to start HTTPS server:', error.message);
    console.log('🔄 Falling back to HTTP server...');
    startHTTP();
  }
};

// Start HTTP server (fallback)
const startHTTP = () => {
  const PORT = process.env.PORT || 5000;
  
  const httpServer = app.listen(PORT, () => {
    console.log(`🚀 TherapEase HTTP server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️  Database: ${dbType.toUpperCase()}`);
    console.log(`🔐 Encryption: AES-256-CBC`);
    console.log(`⚠️  WARNING: Running on HTTP - not secure for production!`);
    console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws`);
    
    if (dbType === 'mysql') {
      console.log('✅ MySQL database ready');
    } else {
      console.log('✅ SQLite development database ready');
    }
    
    console.log(`🔗 HTTP URL: http://localhost:${PORT}`);
    console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
  });
  
  // Initialize WebSocket service for HTTP server
  websocketService.initialize(httpServer);
};

// Start the server
startServer();

module.exports = app;
