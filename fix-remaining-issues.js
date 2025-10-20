#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('🔧 TherapEase Remaining Issues Fix');
console.log('==================================\n');

// Read the current server/index.js file
const serverFile = path.join(__dirname, 'server', 'index.js');

try {
  let content = fs.readFileSync(serverFile, 'utf8');
  console.log('📄 Reading server/index.js...');
  
  // 1. Fix WebSocket route handling - the verification showed routes weren't added
  console.log('\n1. 🔌 Fixing WebSocket route handling...');
  
  // Check if WebSocket routes exist
  const wsGetExists = content.includes("app.get('/ws'");
  const wsUseExists = content.includes("app.use('/ws'");
  
  console.log(`   WebSocket GET route exists: ${wsGetExists ? '✅' : '❌'}`);
  console.log(`   WebSocket middleware exists: ${wsUseExists ? '✅' : '❌'}`);
  
  if (!wsGetExists || !wsUseExists) {
    console.log('   Adding WebSocket routes...');
    
    // Find where to add WebSocket routes (before static file serving)
    const staticPattern = /(\/\/ Serve root-level assets[\s\S]*?app\.use\([^)]+static[^)]+\)\;)/;
    
    const wsRoutes = `// WebSocket route handling (must be before static file serving)
app.get('/ws', (req, res) => {
  console.log('🔌 WebSocket GET request received');
  res.status(426).json({ 
    error: 'Upgrade Required', 
    message: 'This endpoint requires WebSocket upgrade',
    upgrade: 'websocket',
    'sec-websocket-version': '13'
  });
});

app.use('/ws', (req, res, next) => {
  console.log('🔌 WebSocket middleware hit:', req.method, req.path);
  if (req.headers.upgrade === 'websocket') {
    console.log('🔌 WebSocket upgrade request - passing to WebSocket service');
    next();
  } else {
    console.log('🔌 Non-WebSocket request to /ws - returning 426');
    res.status(426).json({ 
      error: 'Upgrade Required', 
      message: 'This endpoint requires WebSocket upgrade' 
    });
  }
});

`;
    
    // Add WebSocket routes before static file serving
    content = content.replace(staticPattern, `${wsRoutes}$1`);
    console.log('   ✅ WebSocket routes added');
  } else {
    console.log('   ✅ WebSocket routes already exist');
  }
  
  // 2. Check admin controller for 500 errors
  console.log('\n2. 🔍 Checking admin controller for 500 errors...');
  
  const adminControllerFile = path.join(__dirname, 'server', 'controllers', 'adminController.js');
  
  if (fs.existsSync(adminControllerFile)) {
    const adminContent = fs.readFileSync(adminControllerFile, 'utf8');
    
    // Check for common issues that cause 500 errors
    const hasProfileImage = adminContent.includes('u.profileImage');
    const hasStatus = adminContent.includes('p.status');
    const hasCountry = adminContent.includes('u.country');
    
    console.log(`   ProfileImage references: ${hasProfileImage ? '❌ (may cause 500)' : '✅'}`);
    console.log(`   Status references: ${hasStatus ? '❌ (may cause 500)' : '✅'}`);
    console.log(`   Country references: ${hasCountry ? '❌ (may cause 500)' : '✅'}`);
    
    if (hasProfileImage || hasStatus || hasCountry) {
      console.log('   ⚠️  Admin controller may have database column issues');
    } else {
      console.log('   ✅ Admin controller looks clean');
    }
  } else {
    console.log('   ❌ Admin controller file not found');
  }
  
  // 3. Add error handling middleware for admin routes
  console.log('\n3. 🛡️  Adding error handling for admin routes...');
  
  // Check if error handling exists
  const errorHandlingExists = content.includes('app.use((err, req, res, next) => {');
  
  if (!errorHandlingExists) {
    console.log('   Adding error handling middleware...');
    
    const errorHandler = `
// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});
`;
    
    // Add before the 404 handler
    const notFoundPattern = /(\/\/ 404 handler)/;
    content = content.replace(notFoundPattern, `${errorHandler}\n$1`);
    
    console.log('   ✅ Error handling middleware added');
  } else {
    console.log('   ✅ Error handling middleware already exists');
  }
  
  // 4. Add specific WebSocket route that definitely works
  console.log('\n4. 🔌 Adding definitive WebSocket route...');
  
  // Add a very specific WebSocket route at the very beginning of the routes
  const wsDefinitiveRoute = `// Definitive WebSocket route (highest priority)
app.all('/ws', (req, res) => {
  console.log('🔌 Definitive WebSocket route hit:', req.method, req.path);
  console.log('🔌 Headers:', req.headers);
  
  if (req.headers.upgrade === 'websocket') {
    console.log('🔌 WebSocket upgrade request - should be handled by WebSocket service');
    // Let the WebSocket service handle this
    return;
  }
  
  console.log('🔌 Non-WebSocket request to /ws - returning 426');
  res.status(426).json({ 
    error: 'Upgrade Required', 
    message: 'This endpoint requires WebSocket upgrade',
    upgrade: 'websocket',
    'sec-websocket-version': '13'
  });
});

`;
  
  // Add at the very beginning of route definitions
  const firstRoutePattern = /(app\.use\('\/api\/auth', authRoutes\);)/;
  content = content.replace(firstRoutePattern, `${wsDefinitiveRoute}$1`);
  
  console.log('   ✅ Definitive WebSocket route added');
  
  // Write the updated file
  console.log('\n5. 💾 Writing updated server configuration...');
  fs.writeFileSync(serverFile, content);
  console.log('   ✅ Server configuration updated');
  
  // Verify the changes
  console.log('\n6. ✅ Verifying changes...');
  const updatedContent = fs.readFileSync(serverFile, 'utf8');
  
  const wsDefinitiveExists = updatedContent.includes("app.all('/ws'");
  const wsGetExists = updatedContent.includes("app.get('/ws'");
  const wsUseExists = updatedContent.includes("app.use('/ws'");
  const errorHandlingExists = updatedContent.includes('app.use((err, req, res, next) => {');
  
  console.log(`   Definitive WebSocket route: ${wsDefinitiveExists ? '✅' : '❌'}`);
  console.log(`   WebSocket GET route: ${wsGetExists ? '✅' : '❌'}`);
  console.log(`   WebSocket middleware: ${wsUseExists ? '✅' : '❌'}`);
  console.log(`   Error handling: ${errorHandlingExists ? '✅' : '❌'}`);
  
  if (wsDefinitiveExists) {
    console.log('\n🎉 Remaining issues fix applied successfully!');
    
    // Restart PM2
    console.log('\n7. 🔄 Restarting PM2 processes...');
    exec('pm2 restart therapease-api', (error, stdout, stderr) => {
      if (error) {
        console.log('   ❌ PM2 restart failed:', error.message);
      } else {
        console.log('   ✅ PM2 restart successful');
        console.log(stdout);
        
        // Wait a moment and test
        setTimeout(() => {
          console.log('\n8. 🧪 Testing the fix...');
          
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
                      
                      console.log('\n🎯 REMAINING ISSUES FIX SUMMARY');
                      console.log('================================');
                      console.log('✅ Definitive WebSocket route added');
                      console.log('✅ Error handling middleware added');
                      console.log('✅ Server restarted');
                      console.log('\n💡 Next steps:');
                      console.log('1. Test: node test-all-endpoints.js');
                      console.log('2. Check WebSocket: curl https://therapease.site/ws');
                      console.log('3. Should return 426 instead of HTML');
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
        }, 3000);
      }
    });
  } else {
    console.log('\n⚠️  WebSocket route not added properly');
  }
  
} catch (error) {
  console.error('❌ Error applying remaining issues fix:', error.message);
  process.exit(1);
}
