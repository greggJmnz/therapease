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
const homeExerciseRoutes = require('./routes/homeExerciseRoutes');

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Temporarily disable CSP to test image loading
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
      user: { id: 119 }, // Alexandra Santos user ID (correct user ID)
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

// Test endpoint for patient home exercises (bypasses authentication)
app.get('/api/test/patient/home-exercises', async (req, res) => {
  try {
    const { getPatientExercises } = require('./controllers/homeExerciseController');
    const mockReq = {
      query: { patientId: 49 } // Alexandra Santos patient ID
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
    
    await getPatientExercises(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Test endpoint error: ' + error.message
    });
  }
});

// Test endpoint for patient exercise proofs (bypasses authentication)
app.get('/api/test/patient/exercise-proofs', async (req, res) => {
  try {
    const { getPatientProofs } = require('./controllers/homeExerciseController');
    const mockReq = {
      query: { patientId: 49 } // Alexandra Santos patient ID
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
    
    await getPatientProofs(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Test endpoint error: ' + error.message
    });
  }
});

// Test endpoint for creating treatment plans
app.post('/api/test/treatment-plans', async (req, res) => {
  try {
    const { createTreatmentPlan } = require('./controllers/treatmentPlanController');
    const mockReq = {
      body: req.body,
      user: { id: 114, role: 'therapist' }
    };
    
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    
    await createTreatmentPlan(mockReq, mockRes);
  } catch (error) {
    console.error('Treatment plan creation test endpoint error:', error);
    res.status(500).json({ success: false, error: `Test endpoint error: ${error.message}` });
  }
});

// Test endpoint to directly query treatment plans table
app.get('/api/test/treatment-plans-raw', async (req, res) => {
  try {
    const { getAll } = require('./config/database');
    const treatmentPlans = await getAll('SELECT * FROM treatment_plans WHERE therapistId = ?', [62]);
    res.json({
      success: true,
      data: treatmentPlans,
      count: treatmentPlans.length
    });
  } catch (error) {
    console.error('Raw treatment plans query error:', error);
    res.status(500).json({ success: false, error: `Query error: ${error.message}` });
  }
});

// Simple test endpoint to verify server is running updated code
app.get('/api/test/server-status', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running with updated code',
    timestamp: new Date().toISOString()
  });
});

// Direct test endpoint for main objective creation (bypasses treatment plan lookup)
app.post('/api/test/main-objectives-direct', async (req, res) => {
  try {
    const { runQuery } = require('./config/database');
    const { title, description, category, priority } = req.body;
    
    console.log('Direct main objective creation with:', { title, description, category, priority });
    
    const result = await runQuery(`
      INSERT INTO main_objectives (treatmentPlanId, title, description, category, priority, status)
      VALUES (?, ?, ?, ?, ?, 'not-started')
    `, [39, title, description, category || 'General', priority || 'medium']);
    
    res.json({
      success: true,
      data: { id: result.insertId },
      message: 'Main objective created successfully'
    });
  } catch (error) {
    console.error('Direct main objective creation error:', error);
    res.status(500).json({ success: false, error: `Creation error: ${error.message}` });
  }
});

// Test endpoint to check main_objectives table schema
app.get('/api/test/main-objectives-schema', async (req, res) => {
  try {
    const { getAll } = require('./config/database');
    const schema = await getAll('DESCRIBE main_objectives');
    res.json({
      success: true,
      data: schema
    });
  } catch (error) {
    console.error('Schema check error:', error);
    res.status(500).json({ success: false, error: `Schema error: ${error.message}` });
  }
});

// Test endpoint to check specific_objectives table schema
app.get('/api/test/specific-objectives-schema', async (req, res) => {
  try {
    const { getAll } = require('./config/database');
    const schema = await getAll('DESCRIBE specific_objectives');
    res.json({
      success: true,
      data: schema
    });
  } catch (error) {
    console.error('Schema check error:', error);
    res.status(500).json({ success: false, error: `Schema error: ${error.message}` });
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

// Test endpoints for treatment plan main objectives
app.post('/api/test/treatment-plans/:treatmentPlanId/main-objectives', async (req, res) => {
  try {
    const { createMainObjective } = require('./controllers/treatmentPlanController');
    const mockReq = {
      params: req.params,
      body: req.body,
      user: { id: 114, role: 'therapist' }
    };
    
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    
    await createMainObjective(mockReq, mockRes);
  } catch (error) {
    console.error('Main objective creation test endpoint error:', error);
    res.status(500).json({ success: false, error: `Test endpoint error: ${error.message}` });
  }
});

app.put('/api/test/main-objectives/:id', async (req, res) => {
  try {
    const { updateMainObjective } = require('./controllers/treatmentPlanController');
    const mockReq = {
      params: req.params,
      body: req.body,
      user: { id: 114, role: 'therapist' }
    };
    
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    
    await updateMainObjective(mockReq, mockRes);
  } catch (error) {
    console.error('Main objective update test endpoint error:', error);
    res.status(500).json({ success: false, error: `Test endpoint error: ${error.message}` });
  }
});

app.delete('/api/test/main-objectives/:id', async (req, res) => {
  try {
    const { deleteMainObjective } = require('./controllers/treatmentPlanController');
    const mockReq = {
      params: req.params,
      user: { id: 114, role: 'therapist' }
    };
    
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    
    await deleteMainObjective(mockReq, mockRes);
  } catch (error) {
    console.error('Main objective deletion test endpoint error:', error);
    res.status(500).json({ success: false, error: `Test endpoint error: ${error.message}` });
  }
});

// Test endpoints for treatment plan specific objectives
app.post('/api/test/main-objectives/:mainObjectiveId/specific-objectives', async (req, res) => {
  try {
    const { createSpecificObjective } = require('./controllers/treatmentPlanController');
    const mockReq = {
      params: req.params,
      body: req.body,
      user: { id: 114, role: 'therapist' }
    };
    
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    
    await createSpecificObjective(mockReq, mockRes);
  } catch (error) {
    console.error('Specific objective creation test endpoint error:', error);
    res.status(500).json({ success: false, error: `Test endpoint error: ${error.message}` });
  }
});

app.put('/api/test/specific-objectives/:id', async (req, res) => {
  try {
    const { updateSpecificObjective } = require('./controllers/treatmentPlanController');
    const mockReq = {
      params: req.params,
      body: req.body,
      user: { id: 114, role: 'therapist' }
    };
    
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    
    await updateSpecificObjective(mockReq, mockRes);
  } catch (error) {
    console.error('Specific objective update test endpoint error:', error);
    res.status(500).json({ success: false, error: `Test endpoint error: ${error.message}` });
  }
});

app.delete('/api/test/specific-objectives/:id', async (req, res) => {
  try {
    const { deleteSpecificObjective } = require('./controllers/treatmentPlanController');
    const mockReq = {
      params: req.params,
      user: { id: 114, role: 'therapist' }
    };
    
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    
    await deleteSpecificObjective(mockReq, mockRes);
  } catch (error) {
    console.error('Specific objective deletion test endpoint error:', error);
    res.status(500).json({ success: false, error: `Test endpoint error: ${error.message}` });
  }
});

// Temporary test endpoint for admin dashboard (bypasses authentication)
app.get('/api/test/admin/dashboard', async (req, res) => {
  try {
    const { getDashboard } = require('./controllers/adminController');
    const mockReq = {
      user: { id: 31, role: 'admin' }
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
    
    await getDashboard(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Test endpoint error: ' + error.message
    });
  }
});

// Temporary test endpoint for admin patients (bypasses authentication)
app.get('/api/test/admin/patients', async (req, res) => {
  try {
    const { getUsers } = require('./controllers/adminController');
    const mockReq = {
      query: { role: 'patient' },
      user: { id: 31, role: 'admin' }
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
    
    await getUsers(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Test endpoint error: ' + error.message
    });
  }
});

// Temporary test endpoint for admin therapists (bypasses authentication)
app.get('/api/test/admin/therapists', async (req, res) => {
  try {
    const { getTherapists } = require('./controllers/adminController');
    const mockReq = {
      user: { id: 31, role: 'admin' }
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
    
    await getTherapists(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Test endpoint error: ' + error.message
    });
  }
});

// Temporary test endpoint for admin notifications (bypasses authentication)
app.get('/api/test/admin/notifications', async (req, res) => {
  try {
    const { getNotifications } = require('./controllers/adminController');
    const mockReq = {
      user: { id: 31, role: 'admin' }
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
    
    await getNotifications(mockReq, mockRes);
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

// Test endpoints for admin (bypasses authentication)
app.get('/api/test/admin/dashboard', async (req, res) => {
  try {
    const { getDashboard } = require('./controllers/adminController');
    const mockReq = { user: { id: 31, role: 'admin' } };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await getDashboard(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/test/admin/patients', async (req, res) => {
  try {
    const { getPatients } = require('./controllers/adminController');
    const mockReq = { user: { id: 31, role: 'admin' } };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await getPatients(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/test/admin/therapists', async (req, res) => {
  try {
    const { getTherapists } = require('./controllers/adminController');
    const mockReq = { user: { id: 31, role: 'admin' } };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await getTherapists(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/test/admin/therapists/available', async (req, res) => {
  try {
    const { getAvailableTherapists } = require('./controllers/adminController');
    const mockReq = { user: { id: 31, role: 'admin' }, query: req.query };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await getAvailableTherapists(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/test/admin/therapists/:therapistId/availability', async (req, res) => {
  try {
    const { updateTherapistAvailability } = require('./controllers/adminController');
    const mockReq = { user: { id: 31, role: 'admin' }, params: req.params, body: req.body };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await updateTherapistAvailability(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/test/admin/patients/assign-therapist', async (req, res) => {
  try {
    const { assignTherapistToPatient } = require('./controllers/adminController');
    const mockReq = { user: { id: 31, role: 'admin' }, body: req.body };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await assignTherapistToPatient(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/test/admin/patients/:patientId/unassign-therapist', async (req, res) => {
  try {
    const { unassignTherapistFromPatient } = require('./controllers/adminController');
    const mockReq = { user: { id: 31, role: 'admin' }, params: req.params };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await unassignTherapistFromPatient(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/test/admin/patients/add-therapist', async (req, res) => {
  try {
    const { addTherapistToPatient } = require('./controllers/adminController');
    const mockReq = { user: { id: 31, role: 'admin' }, body: req.body };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await addTherapistToPatient(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/test/admin/patients/:patientId/therapists/:therapistId', async (req, res) => {
  try {
    const { removeTherapistFromPatient } = require('./controllers/adminController');
    const mockReq = { user: { id: 31, role: 'admin' }, params: req.params, body: req.body };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await removeTherapistFromPatient(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/test/admin/patients/:patientId/therapists', async (req, res) => {
  try {
    const { getPatientTherapists } = require('./controllers/adminController');
    const mockReq = { user: { id: 31, role: 'admin' }, params: req.params };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await getPatientTherapists(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/test/admin/appointments', async (req, res) => {
  try {
    const { getAppointments } = require('./controllers/adminController');
    const mockReq = { user: { id: 31, role: 'admin' } };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await getAppointments(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/test/admin/notifications', async (req, res) => {
  try {
    const { getNotifications } = require('./controllers/adminController');
    const mockReq = { user: { id: 31, role: 'admin' } };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await getNotifications(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/test/admin/users', async (req, res) => {
  try {
    const { getAllUsers } = require('./controllers/adminController');
    const mockReq = { user: { id: 31, role: 'admin' }, query: req.query };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await getAllUsers(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/test/admin/reports', async (req, res) => {
  try {
    const { getReports } = require('./controllers/adminController');
    const mockReq = { user: { id: 31, role: 'admin' } };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await getReports(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/test/admin/settings', async (req, res) => {
  try {
    const { getSettings } = require('./controllers/settingsController');
    const mockReq = { user: { id: 31, role: 'admin' } };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await getSettings(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// User management endpoints
app.put('/api/test/admin/users/:id', async (req, res) => {
  try {
    const { updateUser } = require('./controllers/adminController');
    const mockReq = { user: { id: 31, role: 'admin' }, params: req.params, body: req.body };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await updateUser(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/test/admin/users/:id', async (req, res) => {
  try {
    const { deleteUser } = require('./controllers/adminController');
    const mockReq = { user: { id: 31, role: 'admin' }, params: req.params };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await deleteUser(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/test/admin/users/:id/status', async (req, res) => {
  try {
    const { updateUserStatus } = require('./controllers/adminController');
    const mockReq = { 
      user: { id: 31, role: 'admin' }, 
      params: { userId: req.params.id }, 
      body: req.body 
    };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await updateUserStatus(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Appointment management endpoints
app.put('/api/test/admin/appointments/:id', async (req, res) => {
  try {
    const { updateAppointment } = require('./controllers/adminController');
    const mockReq = { 
      user: { id: 31, role: 'admin' }, 
      params: req.params, 
      body: req.body 
    };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await updateAppointment(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/test/admin/appointments/:id', async (req, res) => {
  try {
    const { deleteAppointment } = require('./controllers/adminController');
    const mockReq = { 
      user: { id: 31, role: 'admin' }, 
      params: req.params
    };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await deleteAppointment(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/test/admin/appointments', async (req, res) => {
  try {
    const { createAppointment } = require('./controllers/adminController');
    const mockReq = { 
      user: { id: 31, role: 'admin' }, 
      body: req.body
    };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await createAppointment(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test endpoints for patient data
app.get('/api/test/patient/dashboard', async (req, res) => {
  try {
    const { getDashboard } = require('./controllers/patientController');
    const mockReq = { user: { userId: 119, role: 'patient' } }; // Use actual patient user ID
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await getDashboard(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/test/patient/appointments', async (req, res) => {
  try {
    const { getAppointments } = require('./controllers/patientController');
    const mockReq = { user: { userId: 119, role: 'patient' } }; // Use actual patient user ID
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await getAppointments(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/test/patient/profile', async (req, res) => {
  try {
    const { getProfile } = require('./controllers/patientController');
    const mockReq = { user: { userId: 119, role: 'patient' } }; // Use actual patient user ID
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await getProfile(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test endpoint for patient postpone appointment
app.put('/api/test/patient/appointments/:id/postpone', async (req, res) => {
  try {
    const { postponeAppointment } = require('./controllers/patientController');
    const appointmentId = parseInt(req.params.id);
    const mockReq = { 
      user: { userId: 119, role: 'patient' }, // Use actual patient user ID
      params: { id: appointmentId },
      body: req.body
    };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await postponeAppointment(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test endpoint for patient cancel appointment
app.put('/api/test/patient/appointments/:id/cancel', async (req, res) => {
  try {
    const { cancelAppointment } = require('./controllers/patientController');
    const appointmentId = parseInt(req.params.id);
    const mockReq = { 
      user: { userId: 119, role: 'patient' }, // Use actual patient user ID
      params: { id: appointmentId },
      body: req.body
    };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await cancelAppointment(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/test/patient/daily-notes', async (req, res) => {
  try {
    const { getDailyNotes } = require('./controllers/patientController');
    const mockReq = { user: { userId: 119, role: 'patient' } }; // Use actual patient user ID
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await getDailyNotes(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/test/patient/assessments', async (req, res) => {
  try {
    const { getAssessments } = require('./controllers/patientController');
    const mockReq = { user: { userId: 119, role: 'patient' } }; // Use actual patient user ID
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await getAssessments(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/test/patient/settings', async (req, res) => {
  try {
    const { getSettings } = require('./controllers/patientController');
    const mockReq = { user: { userId: 119, role: 'patient' } }; // Use actual patient user ID
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await getSettings(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test endpoints for therapist data
app.get('/api/test/therapist/dashboard', async (req, res) => {
  try {
    const { getDashboard } = require('./controllers/dashboardController');
    // Allow testing with different therapist IDs via query parameter
    const therapistId = req.query.therapistId ? parseInt(req.query.therapistId) : 62;
    const mockReq = { user: { id: therapistId, role: 'therapist' } };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await getDashboard(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/test/therapist/patients', async (req, res) => {
  try {
    const { getPatients } = require('./controllers/patientController');
    const { decryptSensitiveFields } = require('./utils/encryption');
    
    // Allow testing with different therapist IDs via query parameter
    const therapistId = req.query.therapistId ? parseInt(req.query.therapistId) : 62;
    const mockReq = { user: { id: therapistId, role: 'therapist' } };
    const mockRes = {
      json: (data) => {
        // Manually decrypt sensitive fields for test endpoint
        if (data && data.success && data.data && data.data.patients) {
          data.data.patients = data.data.patients.map(patient => 
            decryptSensitiveFields(patient, ['emergencyContact', 'insuranceInfo'])
          );
        }
        res.json(data);
      },
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await getPatients(mockReq, mockRes);
  } catch (error) {
    console.error('Therapist patients test endpoint error:', error);
    res.status(500).json({ success: false, error: `Test endpoint error: ${error.message}` });
  }
});

app.get('/api/test/therapist/appointments', async (req, res) => {
  try {
    const { getSchedule } = require('./controllers/appointmentController');
    const mockReq = { 
      user: { id: 114, role: 'therapist' },
      query: req.query || {}
    };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await getSchedule(mockReq, mockRes);
  } catch (error) {
    console.error('Therapist appointments test endpoint error:', error);
    res.status(500).json({ success: false, error: `Test endpoint error: ${error.message}` });
  }
});

// Therapist create appointment test endpoint
app.post('/api/test/therapist/appointments', async (req, res) => {
  try {
    const { createAppointment } = require('./controllers/appointmentController');
    const therapistId = req.query.therapistId ? parseInt(req.query.therapistId) : 62;
    const mockReq = { 
      user: { id: therapistId, role: 'therapist' },
      body: req.body
    };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await createAppointment(mockReq, mockRes);
  } catch (error) {
    console.error('Therapist create appointment test endpoint error:', error);
    res.status(500).json({ success: false, error: `Test endpoint error: ${error.message}` });
  }
});

// Therapist update appointment test endpoint
app.put('/api/test/therapist/appointments/:id', async (req, res) => {
  try {
    const { updateAppointment } = require('./controllers/appointmentController');
    const therapistId = req.query.therapistId ? parseInt(req.query.therapistId) : 62;
    const mockReq = { 
      user: { id: therapistId, role: 'therapist' },
      params: req.params,
      body: req.body
    };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await updateAppointment(mockReq, mockRes);
  } catch (error) {
    console.error('Therapist update appointment test endpoint error:', error);
    res.status(500).json({ success: false, error: `Test endpoint error: ${error.message}` });
  }
});

app.get('/api/test/therapist/daily-notes', async (req, res) => {
  try {
    const { getDailyNotes } = require('./controllers/dailyNotesController');
    const mockReq = { 
      user: { id: 114, role: 'therapist' }, // Use Aleli Ong's ID (114) instead of non-existent 62
      query: req.query || {}
    };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await getDailyNotes(mockReq, mockRes);
  } catch (error) {
    console.error('Therapist daily notes test endpoint error:', error);
    res.status(500).json({ success: false, error: `Test endpoint error: ${error.message}` });
  }
});

app.get('/api/test/therapist/progress-tracking', async (req, res) => {
  try {
    const { getProgressTracking } = require('./controllers/progressTrackingController');
    const mockReq = { 
      user: { id: 114, role: 'therapist' },
      query: req.query || {}
    };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await getProgressTracking(mockReq, mockRes);
  } catch (error) {
    console.error('Therapist progress tracking test endpoint error:', error);
    res.status(500).json({ success: false, error: `Test endpoint error: ${error.message}` });
  }
});

app.get('/api/test/therapist/settings', async (req, res) => {
  try {
    const { getSettings } = require('./controllers/settingsController');
    const mockReq = { user: { id: 114, role: 'therapist' } };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await getSettings(mockReq, mockRes);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test endpoint for therapist sessions
app.get('/api/test/therapist/sessions', async (req, res) => {
  try {
    const { getSessions } = require('./controllers/sessionController');
    const therapistId = req.query.therapistId ? parseInt(req.query.therapistId) : 62;
    const mockReq = { user: { id: therapistId, role: 'therapist' }, query: req.query || {} };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await getSessions(mockReq, mockRes);
  } catch (error) {
    console.error('Therapist sessions test endpoint error:', error);
    res.status(500).json({ success: false, error: `Test endpoint error: ${error.message}` });
  }
});

// Test endpoint for creating sessions
app.post('/api/test/therapist/sessions', async (req, res) => {
  try {
    const { createSession } = require('./controllers/sessionController');
    const therapistId = req.query.therapistId ? parseInt(req.query.therapistId) : 62;
    const mockReq = { 
      user: { id: therapistId, role: 'therapist' }, 
      body: req.body 
    };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await createSession(mockReq, mockRes);
  } catch (error) {
    console.error('Create session test endpoint error:', error);
    res.status(500).json({ success: false, error: `Test endpoint error: ${error.message}` });
  }
});

// Therapist notifications test endpoint
app.get('/api/test/therapist/notifications', async (req, res) => {
  try {
    const { getNotifications } = require('./controllers/notificationController');
    const therapistId = req.query.therapistId ? parseInt(req.query.therapistId) : 62;
    const mockReq = { 
      user: { id: therapistId, role: 'therapist' }, 
      query: req.query || {} 
    };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await getNotifications(mockReq, mockRes);
  } catch (error) {
    console.error('Therapist notifications test endpoint error:', error);
    res.status(500).json({ success: false, error: `Test endpoint error: ${error.message}` });
  }
});

// Patient notifications test endpoint
app.get('/api/test/patient/notifications', async (req, res) => {
  try {
    const { getNotifications } = require('./controllers/notificationController');
    const patientId = req.query.patientId ? parseInt(req.query.patientId) : 37; // Default to Alexandra Santos
    const mockReq = { 
      user: { id: patientId, role: 'patient' }, 
      query: req.query || {} 
    };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await getNotifications(mockReq, mockRes);
  } catch (error) {
    console.error('Patient notifications test endpoint error:', error);
    res.status(500).json({ success: false, error: `Test endpoint error: ${error.message}` });
  }
});

// Test onboarding completion with admin notifications
app.post('/api/test/patient/onboarding/complete', async (req, res) => {
  try {
    const { completeOnboarding } = require('./controllers/patientController');
    const patientId = req.body.patientId ? parseInt(req.body.patientId) : 37; // Default to Alexandra Santos
    const mockReq = { 
      user: { id: patientId, role: 'patient' }, 
      body: req.body || {},
      ip: req.ip || '127.0.0.1',
      connection: { remoteAddress: req.ip || '127.0.0.1' },
      get: (header) => req.get(header)
    };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await completeOnboarding(mockReq, mockRes);
  } catch (error) {
    console.error('Test onboarding completion error:', error);
    res.status(500).json({ success: false, error: `Test endpoint error: ${error.message}` });
  }
});

// Test endpoint to update notification priority
app.put('/api/test/admin/notifications/:id/priority', async (req, res) => {
  try {
    const { runQuery } = require('./config/database');
    const notificationId = req.params.id;
    const { priority } = req.body;
    
    await runQuery(
      'UPDATE notifications SET priority = ? WHERE id = ?',
      [priority, notificationId]
    );
    
    res.json({ success: true, message: `Notification ${notificationId} priority updated to ${priority}` });
  } catch (error) {
    console.error('Update notification priority error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Therapist notification operations test endpoints
app.delete('/api/test/therapist/notifications/:id', async (req, res) => {
  try {
    const { deleteNotification } = require('./controllers/notificationController');
    const therapistId = req.query.therapistId ? parseInt(req.query.therapistId) : 62;
    const mockReq = { 
      user: { id: therapistId, role: 'therapist' },
      params: req.params
    };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await deleteNotification(mockReq, mockRes);
  } catch (error) {
    console.error('Therapist delete notification test endpoint error:', error);
    res.status(500).json({ success: false, error: `Test endpoint error: ${error.message}` });
  }
});

app.patch('/api/test/therapist/notifications/:id/read', async (req, res) => {
  try {
    const { markAsRead } = require('./controllers/notificationController');
    const therapistId = req.query.therapistId ? parseInt(req.query.therapistId) : 62;
    const mockReq = { 
      user: { id: therapistId, role: 'therapist' },
      params: req.params
    };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await markAsRead(mockReq, mockRes);
  } catch (error) {
    console.error('Therapist mark as read test endpoint error:', error);
    res.status(500).json({ success: false, error: `Test endpoint error: ${error.message}` });
  }
});

// Admin notification operations test endpoints
app.delete('/api/test/admin/notifications/:id', async (req, res) => {
  try {
    const { deleteNotification } = require('./controllers/notificationController');
    const mockReq = { 
      user: { id: 31, role: 'admin' },
      params: req.params
    };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await deleteNotification(mockReq, mockRes);
  } catch (error) {
    console.error('Admin delete notification test endpoint error:', error);
    res.status(500).json({ success: false, error: `Test endpoint error: ${error.message}` });
  }
});

app.patch('/api/test/admin/notifications/:id/read', async (req, res) => {
  try {
    const { markAsRead } = require('./controllers/notificationController');
    const mockReq = { 
      user: { id: 31, role: 'admin' },
      params: req.params
    };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await markAsRead(mockReq, mockRes);
  } catch (error) {
    console.error('Admin mark as read test endpoint error:', error);
    res.status(500).json({ success: false, error: `Test endpoint error: ${error.message}` });
  }
});

app.patch('/api/test/admin/notifications/read-all', async (req, res) => {
  try {
    const { markAllAsRead } = require('./controllers/notificationController');
    const mockReq = { 
      user: { id: 31, role: 'admin' }
    };
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };
    await markAllAsRead(mockReq, mockRes);
  } catch (error) {
    console.error('Admin mark all as read test endpoint error:', error);
    res.status(500).json({ success: false, error: `Test endpoint error: ${error.message}` });
  }
});

// Test endpoint for AI features (bypasses authentication)
app.post('/api/test/ai/analyze-assessment', async (req, res) => {
  try {
    const gptService = require('../ai/services/gptService');
    const { patientData, assessmentData, assessmentType = 'combined' } = req.body;
    
    // Ensure proper data structure for the AI service
    const enhancedAssessmentData = {
      ...assessmentData,
      assessmentType,
      interviewQuestions: assessmentData.interviewQuestions || [],
      observations: assessmentData.observations || assessmentData.observations || "No specific observations provided"
    };
    
    const analysis = await gptService.analyzeAssessmentData(patientData, enhancedAssessmentData, {
      model: 'gpt-4o',
      maxTokens: 2500,
      temperature: 0.6,
    });

    if (analysis.success) {
      res.json({
        success: true,
        data: {
          insights: analysis.content,
          usage: analysis.usage,
          model: analysis.model,
          assessmentType: assessmentType,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to analyze assessment',
        error: analysis.error,
      });
    }
  } catch (error) {
    console.error('AI test endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during assessment analysis',
      error: error.message,
    });
  }
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
app.use('/api/home-exercises', homeExerciseRoutes);

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
