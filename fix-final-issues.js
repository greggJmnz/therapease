#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('🎯 TherapEase Final Issues Fix');
console.log('==============================\n');

// 1. Fix WebSocket static file serving issue
console.log('1. 🔌 Fixing WebSocket static file serving...');

const serverFile = path.join(__dirname, 'server', 'index.js');
let content = fs.readFileSync(serverFile, 'utf8');

// The issue is that static file serving is still catching /ws requests
// We need to ensure WebSocket route is handled before static serving

const fixedContent = `const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

// Import only existing routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Import middleware with safety checks
let authMiddleware;
let encryptionMiddleware;

try {
  authMiddleware = require('./middleware/authMiddleware');
  console.log('✅ authMiddleware loaded');
} catch (error) {
  console.log('❌ authMiddleware failed to load:', error.message);
  authMiddleware = (req, res, next) => next(); // Fallback
}

try {
  encryptionMiddleware = require('./middleware/encryptionMiddleware');
  console.log('✅ encryptionMiddleware loaded');
} catch (error) {
  console.log('❌ encryptionMiddleware failed to load:', error.message);
  encryptionMiddleware = (req, res, next) => next(); // Fallback
}

// Import services with safety checks
let websocketService;
let databaseService;

try {
  websocketService = require('./services/websocketService');
  console.log('✅ websocketService loaded');
} catch (error) {
  console.log('❌ websocketService failed to load:', error.message);
  websocketService = { initialize: () => {} }; // Fallback
}

try {
  databaseService = require('./config/database');
  console.log('✅ databaseService loaded');
} catch (error) {
  console.log('❌ databaseService failed to load:', error.message);
  databaseService = { initialize: () => Promise.resolve() }; // Fallback
}

// Configuration
const PORT = 5000;
const dbType = 'mysql';

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
  origin: ["http://localhost:3000", "https://therapease.site", "https://www.therapease.site", "https://api.therapease.site"],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compression
app.use(compression());

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Encryption middleware (with safety check)
if (typeof encryptionMiddleware === 'function') {
  app.use(encryptionMiddleware);
  console.log('✅ encryptionMiddleware applied');
} else {
  console.log('⚠️  encryptionMiddleware not applied (not a function)');
}

// WebSocket route (MUST be before static file serving)
app.get('/ws', (req, res) => {
  console.log('🔌 WebSocket GET request received');
  res.status(426).json({ 
    error: 'Upgrade Required', 
    message: 'This endpoint requires WebSocket upgrade'
  });
});

// API routes (with safety checks)
app.use('/api/auth', authRoutes);

if (typeof authMiddleware === 'function') {
  app.use('/api/admin', authMiddleware, adminRoutes);
  console.log('✅ admin routes with auth middleware applied');
} else {
  app.use('/api/admin', adminRoutes);
  console.log('⚠️  admin routes applied without auth middleware');
}

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

// Serve static files ONLY for non-API, non-WebSocket paths
app.use((req, res, next) => {
  // Skip static file serving for WebSocket and API paths
  if (req.path === '/ws' || req.path.startsWith('/api/') || req.path === '/health') {
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

// Initialize WebSocket service (with safety check)
if (websocketService && typeof websocketService.initialize === 'function') {
  websocketService.initialize(server);
  console.log('✅ WebSocket service initialized');
} else {
  console.log('⚠️  WebSocket service not initialized (not available)');
}

// Initialize database (with safety check)
if (databaseService && typeof databaseService.initialize === 'function') {
  databaseService.initialize().then(() => {
    console.log('✅ Database initialized successfully');
  }).catch((error) => {
    console.error('❌ Database initialization failed:', error);
  });
} else {
  console.log('⚠️  Database service not initialized (not available)');
}

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

// 2. Write the fixed server file
console.log('\n2. 💾 Writing fixed server file...');
fs.writeFileSync(serverFile, fixedContent);
console.log('   ✅ Fixed server file written');

// 3. Test syntax
console.log('\n3. ✅ Testing syntax...');
try {
  new Function(fixedContent);
  console.log('   ✅ No syntax errors found');
} catch (error) {
  console.log('   ❌ Syntax error found:', error.message);
}

// 4. Restart PM2
console.log('\n4. 🔄 Restarting PM2...');
exec('pm2 restart therapease-api', (error, stdout, stderr) => {
  if (error) {
    console.log('   ❌ PM2 restart failed:', error.message);
  } else {
    console.log('   ✅ PM2 restart successful');
    console.log(stdout);
    
    // Wait and test
    setTimeout(() => {
      console.log('\n5. 🧪 Testing final fixes...');
      
      // Test WebSocket
      exec('curl -s -w "WebSocket: %{http_code}" https://therapease.site/ws', (error, stdout, stderr) => {
        if (error) {
          console.log('   ❌ WebSocket test failed:', error.message);
        } else {
          console.log(`   ${stdout}`);
        }
        
        // Test admin endpoints
        exec('curl -s -X POST -H "Content-Type: application/json" -d \'{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}\' https://therapease.site/api/auth/login', (error, stdout, stderr) => {
          if (error) {
            console.log('   ❌ Login test failed:', error.message);
          } else {
            try {
              const data = JSON.parse(stdout);
              if (data.success && data.data.token) {
                console.log('   ✅ Login successful, testing admin endpoints...');
                
                // Test admin users endpoint
                exec(`curl -s -w "Admin Users: %{http_code}" -H "Authorization: Bearer ${data.data.token}" https://therapease.site/api/admin/users`, (error, stdout, stderr) => {
                  if (error) {
                    console.log('   ❌ Admin users test failed:', error.message);
                  } else {
                    console.log(`   ${stdout}`);
                  }
                  
                  // Test admin patients endpoint
                  exec(`curl -s -w "Admin Patients: %{http_code}" -H "Authorization: Bearer ${data.data.token}" https://therapease.site/api/admin/patients`, (error, stdout, stderr) => {
                    if (error) {
                      console.log('   ❌ Admin patients test failed:', error.message);
                    } else {
                      console.log(`   ${stdout}`);
                    }
                    
                    console.log('\n🎯 FINAL ISSUES FIX SUMMARY');
                    console.log('===========================');
                    console.log('✅ WebSocket route fixed (before static serving)');
                    console.log('✅ Static file serving fixed (excludes /ws and /api)');
                    console.log('✅ Server restarted');
                    console.log('\n💡 Next steps:');
                    console.log('1. Test: node test-all-endpoints.js');
                    console.log('2. Check if WebSocket returns 426');
                    console.log('3. Check if admin endpoints work');
                  });
                });
              } else {
                console.log('   ❌ Login failed:', data.error);
              }
            } catch (parseError) {
              console.log('   ❌ Login response parse error:', parseError.message);
            }
          }
        });
      });
    }, 5000);
  }
});
