#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('🚀 TherapEase Ultimate Fix');
console.log('==========================\n');

// Read the current server/index.js file
const serverFile = path.join(__dirname, 'server', 'index.js');

try {
  let content = fs.readFileSync(serverFile, 'utf8');
  console.log('📄 Reading server/index.js...');
  
  // 1. Fix server binding to ensure it binds to all interfaces
  console.log('\n1. 🔧 Fixing server binding...');
  
  // Check current server.listen configuration
  const serverListenPattern = /server\.listen\([^)]+\)/;
  const currentListen = content.match(serverListenPattern);
  
  if (currentListen) {
    console.log(`   Current: ${currentListen[0]}`);
  }
  
  // Replace with proper binding
  const newServerListen = `server.listen(PORT, '0.0.0.0', () => {
  console.log(\`🚀 TherapEase API server running on port \${PORT}\`);
  console.log(\`🌐 HTTP mode (SSL disabled for development)\`);
  console.log(\`📊 Database: \${dbType}\`);
  console.log(\`🔐 Encryption: AES-256-GCM\`);
  console.log(\`🌐 WebSocket service initialized\`);
  console.log(\`🔗 Server accessible on all interfaces (0.0.0.0:\${PORT})\`);
  console.log(\`🔗 Local access: http://127.0.0.1:\${PORT}\`);
  console.log(\`🔗 External access: https://therapease.site\`);
});`;
  
  // Replace the server.listen section
  const serverListenRegex = /server\.listen\([^}]+\}\);/s;
  content = content.replace(serverListenRegex, newServerListen);
  
  console.log('   ✅ Server binding updated to bind to 0.0.0.0');
  
  // 2. Fix WebSocket route handling
  console.log('\n2. 🔌 Fixing WebSocket route handling...');
  
  // Remove any existing WebSocket routes
  const wsRouteRegex = /\/\/ WebSocket route handler[\s\S]*?res\.status\(426\)[\s\S]*?\}\);/g;
  content = content.replace(wsRouteRegex, '');
  
  const wsUpgradeRegex = /\/\/ WebSocket upgrade handler[\s\S]*?res\.status\(426\)[\s\S]*?\}\);/g;
  content = content.replace(wsUpgradeRegex, '');
  
  // Add comprehensive WebSocket handling before static file serving
  const wsHandling = `// WebSocket route handling (must be before static file serving)
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
  
  // Find the static file serving section and add WebSocket handling before it
  const staticPattern = /(\/\/ Serve root-level assets[\s\S]*?app\.use\([^)]+static[^)]+\)\;)/;
  content = content.replace(staticPattern, `${wsHandling}$1`);
  
  console.log('   ✅ WebSocket route handling added');
  
  // 3. Fix static file serving to properly exclude WebSocket
  console.log('\n3. 📁 Fixing static file serving...');
  
  // Replace the static file serving with a more robust version
  const newStaticServing = `// Serve root-level assets (exclude WebSocket and API paths)
app.use((req, res, next) => {
  // Skip static file serving for WebSocket and API paths
  if (req.path === '/ws' || req.path.startsWith('/api/')) {
    return next();
  }
  
  // Serve static files for all other paths
  express.static(path.join(__dirname, 'public'))(req, res, next);
});`;
  
  // Replace the existing static file serving
  const staticRegex = /\/\/ Serve root-level assets[\s\S]*?app\.use\([^)]+static[^)]+\)\;/;
  content = content.replace(staticRegex, newStaticServing);
  
  console.log('   ✅ Static file serving updated to exclude /ws and /api paths');
  
  // 4. Ensure WebSocket service is properly initialized
  console.log('\n4. 🔧 Ensuring WebSocket service initialization...');
  
  if (!content.includes("websocketService.initialize(server)")) {
    // Add WebSocket service initialization
    const serverCreatePattern = /(const server = http\.createServer\(app\);)/;
    const wsInit = `$1\n\n// Initialize WebSocket service\nwebsocketService.initialize(server);`;
    content = content.replace(serverCreatePattern, wsInit);
    console.log('   ✅ WebSocket service initialization added');
  } else {
    console.log('   ✅ WebSocket service already initialized');
  }
  
  // Write the updated file
  console.log('\n5. 💾 Writing updated server configuration...');
  fs.writeFileSync(serverFile, content);
  console.log('   ✅ Server configuration updated');
  
  // Verify the changes
  console.log('\n6. ✅ Verifying changes...');
  const updatedContent = fs.readFileSync(serverFile, 'utf8');
  
  const serverBindingFixed = updatedContent.includes("server.listen(PORT, '0.0.0.0'");
  const wsRouteExists = updatedContent.includes("app.get('/ws'");
  const wsMiddlewareExists = updatedContent.includes("app.use('/ws'");
  const staticExcludesWs = updatedContent.includes("if (req.path === '/ws'");
  const wsServiceExists = updatedContent.includes("websocketService.initialize");
  
  console.log(`   Server binding to 0.0.0.0: ${serverBindingFixed ? '✅' : '❌'}`);
  console.log(`   WebSocket GET route: ${wsRouteExists ? '✅' : '❌'}`);
  console.log(`   WebSocket middleware: ${wsMiddlewareExists ? '✅' : '❌'}`);
  console.log(`   Static serving excludes /ws: ${staticExcludesWs ? '✅' : '❌'}`);
  console.log(`   WebSocket service: ${wsServiceExists ? '✅' : '❌'}`);
  
  if (serverBindingFixed && wsRouteExists && wsMiddlewareExists && staticExcludesWs && wsServiceExists) {
    console.log('\n🎉 Ultimate fix applied successfully!');
    
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
          exec('curl -s -o /dev/null -w "Local: %{http_code}" http://127.0.0.1:5000/health', (error, stdout, stderr) => {
            if (error) {
              console.log('   ❌ Local server test failed:', error.message);
            } else {
              console.log(`   Local server: ${stdout}`);
            }
            
            exec('curl -s -o /dev/null -w "WebSocket: %{http_code}" https://therapease.site/ws', (error, stdout, stderr) => {
              if (error) {
                console.log('   ❌ WebSocket test failed:', error.message);
              } else {
                console.log(`   WebSocket: ${stdout}`);
              }
              
              exec('curl -s -o /dev/null -w "API: %{http_code}" https://therapease.site/api/auth/test', (error, stdout, stderr) => {
                if (error) {
                  console.log('   ❌ API test failed:', error.message);
                } else {
                  console.log(`   API: ${stdout}`);
                }
                
                console.log('\n🎯 ULTIMATE FIX SUMMARY');
                console.log('======================');
                console.log('✅ Server binding fixed (0.0.0.0)');
                console.log('✅ WebSocket route handling fixed');
                console.log('✅ Static file serving fixed');
                console.log('✅ WebSocket service initialized');
                console.log('\n💡 Next steps:');
                console.log('1. Test: node test-all-endpoints.js');
                console.log('2. Visit: https://therapease.site');
                console.log('3. Login: admin@therapease.com / SecureAdmin2024!@#$');
              });
            });
          });
        }, 3000);
      }
    });
  } else {
    console.log('\n⚠️  Some configuration issues remain');
    console.log('Check the verification results above');
  }
  
} catch (error) {
  console.error('❌ Error applying ultimate fix:', error.message);
  process.exit(1);
}
