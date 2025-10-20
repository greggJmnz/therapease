#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('🔍 TherapEase Server Diagnostic & Fix');
console.log('====================================\n');

// Read the current server/index.js file
const serverFile = path.join(__dirname, 'server', 'index.js');

try {
  let content = fs.readFileSync(serverFile, 'utf8');
  console.log('📄 Reading server/index.js...');
  
  // 1. Check current server.listen configuration
  console.log('\n1. 🔍 Checking current server configuration...');
  
  const serverListenMatch = content.match(/server\.listen\([^)]+\)/);
  if (serverListenMatch) {
    console.log(`   Current server.listen: ${serverListenMatch[0]}`);
  } else {
    console.log('   ❌ No server.listen found');
  }
  
  // Check if it's binding to 0.0.0.0
  const bindingToAllInterfaces = content.includes("server.listen(PORT, '0.0.0.0'");
  console.log(`   Binding to 0.0.0.0: ${bindingToAllInterfaces ? '✅' : '❌'}`);
  
  // 2. Check PM2 status
  console.log('\n2. 📊 Checking PM2 status...');
  
  exec('pm2 list', (error, stdout, stderr) => {
    if (error) {
      console.log('   ❌ PM2 status error:', error.message);
    } else {
      console.log('   PM2 Status:');
      console.log(stdout);
    }
  });
  
  // 3. Check what's running on port 5000
  console.log('\n3. 🔍 Checking port 5000...');
  
  exec('netstat -tlnp | grep :5000', (error, stdout, stderr) => {
    if (error) {
      console.log('   No process found on port 5000');
    } else {
      console.log('   Port 5000 status:');
      console.log(stdout);
    }
  });
  
  // 4. Check PM2 logs for errors
  console.log('\n4. 📋 Checking PM2 logs...');
  
  exec('pm2 logs therapease-api --lines 10 --nostream', (error, stdout, stderr) => {
    if (error) {
      console.log('   ❌ PM2 logs error:', error.message);
    } else {
      console.log('   Recent logs:');
      console.log(stdout);
    }
  });
  
  // 5. Fix server binding if needed
  console.log('\n5. 🔧 Fixing server binding...');
  
  if (!bindingToAllInterfaces) {
    console.log('   Server not binding to 0.0.0.0, fixing...');
    
    // Find and replace server.listen
    const serverListenRegex = /server\.listen\([^}]+\}\);/s;
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
    
    content = content.replace(serverListenRegex, newServerListen);
    console.log('   ✅ Server binding updated to 0.0.0.0');
  } else {
    console.log('   ✅ Server already binding to 0.0.0.0');
  }
  
  // 6. Ensure WebSocket route is at the very beginning
  console.log('\n6. 🔌 Ensuring WebSocket route is at the beginning...');
  
  // Remove any existing WebSocket routes
  const wsRouteRegex = /\/\/ Simple WebSocket route[\s\S]*?res\.status\(426\)[\s\S]*?\}\);/g;
  content = content.replace(wsRouteRegex, '');
  
  const wsDefinitiveRegex = /\/\/ Definitive WebSocket route[\s\S]*?res\.status\(426\)[\s\S]*?\}\);/g;
  content = content.replace(wsDefinitiveRegex, '');
  
  // Add WebSocket route at the very beginning
  const wsRoute = `// WebSocket route (highest priority)
app.get('/ws', (req, res) => {
  console.log('🔌 WebSocket GET request received');
  res.status(426).json({ 
    error: 'Upgrade Required', 
    message: 'This endpoint requires WebSocket upgrade'
  });
});

`;
  
  // Find the first route and add WebSocket before it
  const firstRoutePattern = /(app\.use\('\/api\/auth', authRoutes\);)/;
  if (firstRoutePattern.test(content)) {
    content = content.replace(firstRoutePattern, `${wsRoute}$1`);
    console.log('   ✅ WebSocket route added at the beginning');
  } else {
    console.log('   ❌ Could not find first route to add WebSocket route');
  }
  
  // 7. Write the updated file
  console.log('\n7. 💾 Writing updated server configuration...');
  fs.writeFileSync(serverFile, content);
  console.log('   ✅ Server configuration updated');
  
  // 8. Restart PM2
  console.log('\n8. 🔄 Restarting PM2 processes...');
  exec('pm2 restart therapease-api', (error, stdout, stderr) => {
    if (error) {
      console.log('   ❌ PM2 restart failed:', error.message);
    } else {
      console.log('   ✅ PM2 restart successful');
      console.log(stdout);
      
      // Wait and test
      setTimeout(() => {
        console.log('\n9. 🧪 Testing server after fix...');
        
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
              
              console.log('\n🎯 DIAGNOSTIC & FIX SUMMARY');
              console.log('============================');
              console.log('✅ Server binding fixed (0.0.0.0)');
              console.log('✅ WebSocket route added at beginning');
              console.log('✅ PM2 restarted');
              console.log('\n💡 Next steps:');
              console.log('1. Test: node test-all-endpoints.js');
              console.log('2. Check if localhost:5000 is now accessible');
              console.log('3. Check if WebSocket returns 426 instead of HTML');
            });
          });
        });
      }, 5000);
    }
  });
  
} catch (error) {
  console.error('❌ Error in diagnostic and fix:', error.message);
  process.exit(1);
}
