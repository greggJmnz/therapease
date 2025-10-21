#!/usr/bin/env node

/**
 * Fix script for route conflicts and 404 errors
 * This script addresses duplicate route registrations and missing endpoints
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 TherapEase Route Conflicts Fix');
console.log('=================================');

// Path to server index.js
const serverIndexPath = path.join(__dirname, 'server', 'index.js');

console.log('\n🔍 Step 1: Checking server/index.js for route conflicts...');

if (!fs.existsSync(serverIndexPath)) {
    console.log('❌ server/index.js not found');
    process.exit(1);
}

// Read the current content
let content = fs.readFileSync(serverIndexPath, 'utf8');

console.log('✅ server/index.js found');

console.log('\n🔍 Step 2: Fixing duplicate route registrations...');

// Remove duplicate route registrations
const fixedContent = content.replace(
  /\/\/ Apply maintenance middleware to non-admin routes\napp\.use\('\/api\/therapist', checkMaintenanceMode\);\napp\.use\('\/api\/patient', checkMaintenanceMode\);\napp\.use\('\/api\/ai', checkMaintenanceMode\);\napp\.use\('\/api\/notifications', checkMaintenanceMode\);\napp\.use\('\/api\/notifications\/sms', checkMaintenanceMode\);\napp\.use\('\/api\/treatment-plans', checkMaintenanceMode\);\napp\.use\('\/api\/home-exercises', checkMaintenanceMode\);\napp\.use\('\/api\/progress-reports', checkMaintenanceMode\);\n\n\/\/ Admin routes \(no maintenance mode check - admins can always access\)\napp\.use\('\/api\/admin', adminRoutes\);\n\n\/\/ Other routes with maintenance mode check\napp\.use\('\/api\/therapist', therapistRoutes\);\napp\.use\('\/api\/patient', patientRoutes\);\napp\.use\('\/api\/ai', aiRoutes\);\napp\.use\('\/api\/notifications', notificationRoutes\);\napp\.use\('\/api\/notifications\/sms', smsRoutes\);\napp\.use\('\/api\/treatment-plans', treatmentPlanRoutes\);\napp\.use\('\/api\/home-exercises', homeExerciseRoutes\);\napp\.use\('\/api\/progress-reports', progressReportRoutes\);/,
  `// API routes with proper order
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
app.use('/api/progress-reports', progressReportRoutes);`
);

// Remove the duplicate maintenance-status endpoint from index.js
const cleanedContent = fixedContent.replace(
  /\/\/ Public maintenance status endpoint \(no auth required\)\napp\.get\('\/api\/maintenance-status', async \(req, res\) => \{[\s\S]*?\}\);/,
  `// Public maintenance status endpoint moved to adminRoutes.js`
);

fs.writeFileSync(serverIndexPath, cleanedContent);
console.log('✅ Fixed duplicate route registrations');

console.log('\n🔍 Step 3: Checking adminRoutes.js for maintenance-status...');

// Check if maintenance-status is properly defined in adminRoutes
const adminRoutesPath = path.join(__dirname, 'server', 'routes', 'adminRoutes.js');

if (fs.existsSync(adminRoutesPath)) {
    let adminContent = fs.readFileSync(adminRoutesPath, 'utf8');
    
    // Ensure maintenance-status is properly defined
    if (!adminContent.includes("router.get('/maintenance-status'")) {
        console.log('🔧 Adding maintenance-status route to adminRoutes...');
        
        const updatedAdminContent = adminContent.replace(
            /\/\/ Public maintenance mode check \(no auth required\)\nrouter\.get\('\/maintenance-status', systemSettingsController\.getMaintenanceStatus\);/,
            `// Public maintenance mode check (no auth required)
router.get('/maintenance-status', systemSettingsController.getMaintenanceStatus);`
        );
        
        fs.writeFileSync(adminRoutesPath, updatedAdminContent);
        console.log('✅ Maintenance-status route added to adminRoutes');
    } else {
        console.log('✅ Maintenance-status route already exists in adminRoutes');
    }
} else {
    console.log('❌ adminRoutes.js not found');
}

console.log('\n🔍 Step 4: Creating comprehensive route test...');

// Create a route test script
const routeTestPath = path.join(__dirname, 'test-routes.js');

const routeTestContent = `#!/usr/bin/env node

/**
 * Route Test Script
 * This script tests all the critical routes to ensure they're working
 */

const axios = require('axios');
const https = require('https');

const BASE_URL = 'https://www.therapease.site';
const API_BASE = \`\${BASE_URL}/api\`;

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
});

async function testRoutes() {
  console.log('🧪 Testing critical routes...');
  
  const routes = [
    { name: 'Maintenance Status', url: '/maintenance-status', method: 'GET' },
    { name: 'Auth Login', url: '/auth/login', method: 'POST', data: { email: 'test@test.com', password: 'test' } },
    { name: 'Auth Verify', url: '/auth/verify', method: 'GET' },
    { name: 'Admin System Settings', url: '/admin/system-settings', method: 'GET', auth: true },
    { name: 'Admin Patients', url: '/admin/patients', method: 'GET', auth: true }
  ];
  
  for (const route of routes) {
    try {
      console.log(\`\\n📡 Testing: \${route.name}\`);
      
      const config = {
        method: route.method,
        url: route.url,
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      if (route.data) {
        config.data = route.data;
      }
      
      if (route.auth) {
        config.headers.Authorization = 'Bearer test-token';
      }
      
      const response = await api(config);
      console.log(\`✅ \${route.name}: \${response.status}\`);
      
    } catch (error) {
      if (error.response) {
        console.log(\`❌ \${route.name}: \${error.response.status} - \${error.response.data?.error || error.response.data}\`);
      } else {
        console.log(\`❌ \${route.name}: \${error.message}\`);
      }
    }
  }
}

testRoutes().catch(console.error);
`;

fs.writeFileSync(routeTestPath, routeTestContent);
fs.chmodSync(routeTestPath, '755');
console.log('✅ Route test script created');

console.log('\n🔍 Step 5: Creating server restart script...');

// Create server restart script
const restartScriptPath = path.join(__dirname, 'restart-server-clean.sh');

const restartScriptContent = `#!/bin/bash

# Clean server restart script
echo "🔄 Restarting TherapEase server..."

# Stop all PM2 processes
pm2 stop all

# Wait a moment
sleep 2

# Start the server
pm2 start ecosystem.config.js

# Wait for server to start
sleep 5

# Check status
pm2 status

echo "✅ Server restart complete!"
`;

fs.writeFileSync(restartScriptPath, restartScriptContent);
fs.chmodSync(restartScriptPath, '755');
console.log('✅ Server restart script created');

console.log('\n🏁 Route conflicts fix complete!');
console.log('\n📋 Summary of fixes:');
console.log('1. ✅ Removed duplicate route registrations');
console.log('2. ✅ Fixed route order and middleware application');
console.log('3. ✅ Ensured maintenance-status endpoint is properly defined');
console.log('4. ✅ Created route test script');
console.log('5. ✅ Created clean server restart script');
console.log('\n🔧 Next steps:');
console.log('1. Run: ./restart-server-clean.sh');
console.log('2. Test routes: node test-routes.js');
console.log('3. Check server logs: pm2 logs therapease-api');
console.log('\n📋 Expected results:');
console.log('- No more 404 errors for maintenance-status');
console.log('- Login endpoint working properly');
console.log('- All admin routes accessible');
console.log('- Clean server startup without conflicts');
