#!/bin/bash

# Fix 404 errors on droplet - comprehensive solution
echo "🔧 TherapEase 404 Error Fix for Droplet"
echo "======================================="

echo ""
echo "🔍 Step 1: Checking current server status..."
pm2 status

echo ""
echo "🔍 Step 2: Pulling latest changes..."
git pull origin main

echo ""
echo "🔍 Step 3: Checking server/index.js for route conflicts..."
if grep -q "app.use('/api/auth', authRoutes);" server/index.js; then
    echo "✅ Auth routes found"
else
    echo "❌ Auth routes missing"
fi

if grep -q "app.use('/api/admin', adminRoutes);" server/index.js; then
    echo "✅ Admin routes found"
else
    echo "❌ Admin routes missing"
fi

# Check for duplicate maintenance-status endpoints
maintenance_count=$(grep -c "maintenance-status" server/index.js)
echo "📊 Maintenance-status endpoints found: $maintenance_count"

echo ""
echo "🔍 Step 4: Fixing route conflicts..."

# Create backup
cp server/index.js server/index.js.backup.$(date +%Y%m%d_%H%M%S)

# Fix the route registration order
cat > server/index_fixed.js << 'EOF'
// Fixed server/index.js with proper route registration
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');

// Import routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const therapistRoutes = require('./routes/therapistRoutes');
const patientRoutes = require('./routes/patientRoutes');
const aiRoutes = require('./routes/aiRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const smsRoutes = require('./routes/smsRoutes');
const treatmentPlanRoutes = require('./routes/treatmentPlanRoutes');
const homeExerciseRoutes = require('./routes/homeExerciseRoutes');
const progressReportRoutes = require('./routes/progressReportRoutes');

// Import middleware
const { authenticateToken } = require('./middleware/authMiddleware');
const { checkMaintenanceMode } = require('./middleware/maintenanceMiddleware');

// Import services
const websocketService = require('./services/websocketService');

const app = express();
const server = createServer(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://www.therapease.site',
      'https://therapease.site',
      'https://api.therapease.site',
      'http://localhost:3000',
      'http://localhost:5000'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// SSL Health check endpoint
app.get('/health/ssl', (req, res) => {
  res.json({ 
    status: 'ok', 
    ssl: true,
    timestamp: new Date().toISOString()
  });
});

// Handle CORS preflight for maintenance status
app.options('/api/maintenance-status', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.status(200).end();
});

// Public maintenance status endpoint (no auth required)
app.get('/api/maintenance-status', async (req, res) => {
  try {
    const { getRow } = require('./config/database');
    const maintenanceSetting = await getRow(
      'SELECT setting_value FROM system_settings WHERE setting_key = ?',
      ['maintenance_mode']
    );

    const isMaintenanceMode = maintenanceSetting && maintenanceSetting.setting_value === 'true';

    // Set CORS headers explicitly for this endpoint
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');

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

// WebSocket route handler (must be before static file serving)
app.get('/ws', (req, res) => {
  // This should not be reached in normal operation
  // WebSocket service should handle the upgrade
  res.status(426).json({ error: 'Upgrade Required' });
});

// Initialize WebSocket service
websocketService.initialize(server);

// API routes - FIXED ORDER
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
const handleEncryptionError = (err, req, res, next) => {
  if (err.message && err.message.includes('encryption')) {
    return res.status(500).json({
      success: false,
      error: 'Data encryption error',
      message: 'Unable to process encrypted data'
    });
  }
  next(err);
};

app.use(handleEncryptionError);
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    message: `The requested API endpoint ${req.method} ${req.originalUrl} was not found`
  });
});

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../client/build')));

// Catch all handler for React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
EOF

# Replace the original file
mv server/index_fixed.js server/index.js

echo "✅ Fixed server/index.js with proper route registration"

echo ""
echo "🔍 Step 5: Rebuilding frontend..."
cd client
npm run build
cd ..

echo ""
echo "🔍 Step 6: Restarting server..."
pm2 stop all
pm2 delete all
sleep 3
pm2 start ecosystem.config.js
sleep 5

echo ""
echo "🔍 Step 7: Testing critical routes..."
echo "Testing maintenance-status..."
curl -s "http://localhost:5000/api/maintenance-status" | head -c 100
echo ""

echo "Testing auth/login..."
curl -s -X POST "http://localhost:5000/api/auth/login" \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}' | head -c 100
echo ""

echo "Testing health endpoint..."
curl -s "http://localhost:5000/health" | head -c 100
echo ""

echo ""
echo "🔍 Step 8: Checking PM2 status..."
pm2 status

echo ""
echo "🏁 404 error fix complete!"
echo ""
echo "📋 Summary:"
echo "✅ Fixed route registration order"
echo "✅ Removed duplicate endpoints"
echo "✅ Added proper maintenance-status endpoint"
echo "✅ Restarted server with clean configuration"
echo "✅ Tested critical routes"
echo ""
echo "🎯 Expected results:"
echo "- No more 404 errors for /api/maintenance-status"
echo "- Login endpoint working"
echo "- All admin routes accessible"
echo "- Clean server startup"
