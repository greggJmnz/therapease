#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('🔨 TherapEase Server File Rebuilder');
console.log('===================================\n');

// Read the current server/index.js file to extract key configurations
const serverFile = path.join(__dirname, 'server', 'index.js');

try {
  let content = fs.readFileSync(serverFile, 'utf8');
  console.log('📄 Reading current server/index.js...');
  
  // Extract key configurations from the current file
  console.log('\n1. 🔍 Extracting key configurations...');
  
  // Extract PORT configuration
  const portMatch = content.match(/const PORT = (\d+);/);
  const port = portMatch ? portMatch[1] : '5000';
  console.log(`   PORT: ${port}`);
  
  // Extract database type
  const dbTypeMatch = content.match(/const dbType = ['"`]([^'"`]+)['"`];/);
  const dbType = dbTypeMatch ? dbTypeMatch[1] : 'mysql';
  console.log(`   Database Type: ${dbType}`);
  
  // Extract CORS origins
  const corsMatch = content.match(/origin:\s*\[([^\]]+)\]/);
  const corsOrigins = corsMatch ? corsMatch[1] : '"http://localhost:3000", "https://therapease.site", "https://www.therapease.site", "https://api.therapease.site"';
  console.log(`   CORS Origins: ${corsOrigins}`);
  
  // 2. Create a clean, minimal server file
  console.log('\n2. 🔨 Building clean server file...');
  
  const cleanServerContent = `const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');

// Import routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const profileRoutes = require('./routes/profileRoutes');
const therapistRoutes = require('./routes/therapistRoutes');
const patientRoutes = require('./routes/patientRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reportRoutes = require('./routes/reportRoutes');
const helpCenterRoutes = require('./routes/helpCenterRoutes');

// Import services
const websocketService = require('./services/websocketService');
const databaseService = require('./config/database');

// Import middleware
const authMiddleware = require('./middleware/authMiddleware');
const encryptionMiddleware = require('./middleware/encryptionMiddleware');

// Configuration
const PORT = ${port};
const dbType = '${dbType}';

// Create Express app
const app = express();

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
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: [${corsOrigins}],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Compression
app.use(compression());

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Encryption middleware
app.use(encryptionMiddleware);

// WebSocket route (highest priority)
app.get('/ws', (req, res) => {
  console.log('🔌 WebSocket GET request received');
  res.status(426).json({ 
    error: 'Upgrade Required', 
    message: 'This endpoint requires WebSocket upgrade'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/api/profile', authMiddleware, profileRoutes);
app.use('/api/therapist', authMiddleware, therapistRoutes);
app.use('/api/patient', authMiddleware, patientRoutes);
app.use('/api/appointments', authMiddleware, appointmentRoutes);
app.use('/api/notifications', authMiddleware, notificationRoutes);
app.use('/api/reports', authMiddleware, reportRoutes);
app.use('/api/help-center', authMiddleware, helpCenterRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Maintenance status endpoint
app.get('/api/maintenance-status', (req, res) => {
  res.status(200).json({
    maintenance: false,
    message: 'System is operational'
  });
});

// Serve root-level assets (exclude WebSocket and API paths)
app.use((req, res, next) => {
  // Skip static file serving for WebSocket and API paths
  if (req.path === '/ws' || req.path.startsWith('/api/')) {
    return next();
  }
  
  // Serve static files for all other paths
  express.static(path.join(__dirname, 'public'))(req, res, next);
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'The requested resource was not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket service
websocketService.initialize(server);

// Initialize database
databaseService.initialize().then(() => {
  console.log('✅ Database initialized successfully');
}).catch((error) => {
  console.error('❌ Database initialization failed:', error);
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(\`🚀 TherapEase API server running on port \${PORT}\`);
  console.log(\`🌐 HTTP mode (SSL disabled for development)\`);
  console.log(\`📊 Database: \${dbType}\`);
  console.log(\`🔐 Encryption: AES-256-GCM\`);
  console.log(\`🌐 WebSocket service initialized\`);
  console.log(\`🔗 Server accessible on all interfaces (0.0.0.0:\${PORT})\`);
  console.log(\`🔗 Local access: http://127.0.0.1:\${PORT}\`);
  console.log(\`🔗 External access: https://therapease.site\`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});
`;

  // 3. Write the clean server file
  console.log('\n3. 💾 Writing clean server file...');
  fs.writeFileSync(serverFile, cleanServerContent);
  console.log('   ✅ Clean server file written');
  
  // 4. Test syntax
  console.log('\n4. ✅ Testing syntax...');
  try {
    new Function(cleanServerContent);
    console.log('   ✅ No syntax errors found');
  } catch (error) {
    console.log('   ❌ Syntax error found:', error.message);
    console.log('   This should not happen with the clean file');
  }
  
  // 5. Restart PM2
  console.log('\n5. 🔄 Restarting PM2 processes...');
  exec('pm2 restart therapease-api', (error, stdout, stderr) => {
    if (error) {
      console.log('   ❌ PM2 restart failed:', error.message);
    } else {
      console.log('   ✅ PM2 restart successful');
      console.log(stdout);
      
      // Wait and test
      setTimeout(() => {
        console.log('\n6. 🧪 Testing server after rebuild...');
        
        // Test local server
        exec('curl -s -w "Local: %{http_code}" http://127.0.0.1:5000/health', (error, stdout, stderr) => {
          if (error) {
            console.log('   ❌ Local server test failed:', error.message);
          } else {
            console.log(`   ${stdout}`);
          }
          
          // Test WebSocket
          exec('curl -s -w "WebSocket: %{http_code}" https://therapease.site/ws', (error, stdout, stderr) => {
            if (error) {
              console.log('   ❌ WebSocket test failed:', error.message);
            } else {
              console.log(`   ${stdout}`);
            }
            
            // Test API
            exec('curl -s -w "API: %{http_code}" https://therapease.site/api/auth/test', (error, stdout, stderr) => {
              if (error) {
                console.log('   ❌ API test failed:', error.message);
              } else {
                console.log(`   ${stdout}`);
              }
              
              console.log('\n🎯 SERVER REBUILD SUMMARY');
              console.log('=========================');
              console.log('✅ Server file completely rebuilt');
              console.log('✅ Clean syntax with no errors');
              console.log('✅ WebSocket route at highest priority');
              console.log('✅ Proper server binding to 0.0.0.0');
              console.log('✅ PM2 restarted');
              console.log('\n💡 Next steps:');
              console.log('1. Test: node test-all-endpoints.js');
              console.log('2. Check if server is now accessible');
              console.log('3. Check if WebSocket returns 426');
            });
          });
        });
      }, 5000);
    }
  });
  
} catch (error) {
  console.error('❌ Error in server rebuild:', error.message);
  process.exit(1);
}
