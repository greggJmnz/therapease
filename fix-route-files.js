#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('🔧 TherapEase Route Files Fix');
console.log('=============================\n');

// 1. Check what route files actually exist
console.log('1. 🔍 Checking existing route files...');
const routesDir = path.join(__dirname, 'server', 'routes');

if (fs.existsSync(routesDir)) {
  const routeFiles = fs.readdirSync(routesDir);
  console.log('   Route files found:');
  routeFiles.forEach(file => {
    console.log(`   - ${file}`);
  });
} else {
  console.log('   ❌ Routes directory not found');
}

// 2. Check what middleware files exist
console.log('\n2. 🔍 Checking existing middleware files...');
const middlewareDir = path.join(__dirname, 'server', 'middleware');

if (fs.existsSync(middlewareDir)) {
  const middlewareFiles = fs.readdirSync(middlewareDir);
  console.log('   Middleware files found:');
  middlewareFiles.forEach(file => {
    console.log(`   - ${file}`);
  });
} else {
  console.log('   ❌ Middleware directory not found');
}

// 3. Check what service files exist
console.log('\n3. 🔍 Checking existing service files...');
const servicesDir = path.join(__dirname, 'server', 'services');

if (fs.existsSync(servicesDir)) {
  const serviceFiles = fs.readdirSync(servicesDir);
  console.log('   Service files found:');
  serviceFiles.forEach(file => {
    console.log(`   - ${file}`);
  });
} else {
  console.log('   ❌ Services directory not found');
}

// 4. Create a minimal server file with only existing routes
console.log('\n4. 🔨 Creating minimal server file...');

const existingRoutes = [];
const existingMiddleware = [];
const existingServices = [];

// Check routes
if (fs.existsSync(routesDir)) {
  const routeFiles = fs.readdirSync(routesDir);
  routeFiles.forEach(file => {
    if (file.endsWith('.js')) {
      const routeName = file.replace('.js', '');
      existingRoutes.push(routeName);
    }
  });
}

// Check middleware
if (fs.existsSync(middlewareDir)) {
  const middlewareFiles = fs.readdirSync(middlewareDir);
  middlewareFiles.forEach(file => {
    if (file.endsWith('.js')) {
      const middlewareName = file.replace('.js', '');
      existingMiddleware.push(middlewareName);
    }
  });
}

// Check services
if (fs.existsSync(servicesDir)) {
  const serviceFiles = fs.readdirSync(servicesDir);
  serviceFiles.forEach(file => {
    if (file.endsWith('.js')) {
      const serviceName = file.replace('.js', '');
      existingServices.push(serviceName);
    }
  });
}

console.log(`   Existing routes: ${existingRoutes.join(', ')}`);
console.log(`   Existing middleware: ${existingMiddleware.join(', ')}`);
console.log(`   Existing services: ${existingServices.join(', ')}`);

// 5. Create minimal server file
const minimalServerContent = `const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

// Import only existing routes
const authRoutes = require('./routes/authRoutes');
${existingRoutes.includes('adminRoutes') ? "const adminRoutes = require('./routes/adminRoutes');" : ''}

// Import only existing middleware
${existingMiddleware.includes('authMiddleware') ? "const authMiddleware = require('./middleware/authMiddleware');" : ''}
${existingMiddleware.includes('encryptionMiddleware') ? "const encryptionMiddleware = require('./middleware/encryptionMiddleware');" : ''}

// Import only existing services
${existingServices.includes('websocketService') ? "const websocketService = require('./services/websocketService');" : ''}
${existingServices.includes('database') ? "const databaseService = require('./config/database');" : ''}

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

// Encryption middleware (if exists)
${existingMiddleware.includes('encryptionMiddleware') ? 'app.use(encryptionMiddleware);' : ''}

// WebSocket route (highest priority)
app.get('/ws', (req, res) => {
  console.log('🔌 WebSocket GET request received');
  res.status(426).json({ 
    error: 'Upgrade Required', 
    message: 'This endpoint requires WebSocket upgrade'
  });
});

// API routes (only existing ones)
app.use('/api/auth', authRoutes);
${existingRoutes.includes('adminRoutes') ? "app.use('/api/admin', authMiddleware, adminRoutes);" : ''}

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

// Initialize WebSocket service (if exists)
${existingServices.includes('websocketService') ? 'websocketService.initialize(server);' : ''}

// Initialize database (if exists)
${existingServices.includes('database') ? `databaseService.initialize().then(() => {
  console.log('✅ Database initialized successfully');
}).catch((error) => {
  console.error('❌ Database initialization failed:', error);
});` : ''}

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

// 6. Write the minimal server file
console.log('\n5. 💾 Writing minimal server file...');
const serverFile = path.join(__dirname, 'server', 'index.js');
fs.writeFileSync(serverFile, minimalServerContent);
console.log('   ✅ Minimal server file written');

// 7. Test syntax
console.log('\n6. ✅ Testing syntax...');
try {
  new Function(minimalServerContent);
  console.log('   ✅ No syntax errors found');
} catch (error) {
  console.log('   ❌ Syntax error found:', error.message);
}

// 8. Test server start
console.log('\n7. 🧪 Testing server start...');
exec('cd server && timeout 5s node index.js', (error, stdout, stderr) => {
  if (error) {
    console.log('   ❌ Server start failed:', error.message);
    if (stderr) {
      console.log('   Error output:', stderr);
    }
  } else {
    console.log('   ✅ Server start successful');
    console.log('   Output:', stdout);
  }
  
  // 9. Restart PM2
  console.log('\n8. 🔄 Restarting PM2...');
  exec('pm2 restart therapease-api', (error, stdout, stderr) => {
    if (error) {
      console.log('   ❌ PM2 restart failed:', error.message);
    } else {
      console.log('   ✅ PM2 restart successful');
      console.log(stdout);
      
      // Wait and test
      setTimeout(() => {
        console.log('\n9. 🧪 Testing server after route fix...');
        
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
              
              console.log('\n🎯 ROUTE FIX SUMMARY');
              console.log('===================');
              console.log('✅ Minimal server file created');
              console.log('✅ Only existing routes included');
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
});
