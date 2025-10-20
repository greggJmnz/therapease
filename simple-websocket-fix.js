#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('🔧 Simple WebSocket Fix');
console.log('======================\n');

// Read the current server/index.js file
const serverFile = path.join(__dirname, 'server', 'index.js');

try {
  let content = fs.readFileSync(serverFile, 'utf8');
  console.log('📄 Reading server/index.js...');
  
  // Add a simple, direct WebSocket route at the very beginning
  console.log('\n1. 🔌 Adding simple WebSocket route...');
  
  const simpleWsRoute = `// Simple WebSocket route (highest priority)
app.get('/ws', (req, res) => {
  console.log('🔌 WebSocket GET request received');
  res.status(426).json({ 
    error: 'Upgrade Required', 
    message: 'This endpoint requires WebSocket upgrade'
  });
});

`;
  
  // Find the first route and add WebSocket route before it
  const firstRoutePattern = /(app\.use\('\/api\/auth', authRoutes\);)/;
  if (firstRoutePattern.test(content)) {
    content = content.replace(firstRoutePattern, `${simpleWsRoute}$1`);
    console.log('   ✅ Simple WebSocket route added');
  } else {
    console.log('   ❌ Could not find first route to add WebSocket route');
  }
  
  // Write the updated file
  console.log('\n2. 💾 Writing updated server configuration...');
  fs.writeFileSync(serverFile, content);
  console.log('   ✅ Server configuration updated');
  
  // Verify the change
  console.log('\n3. ✅ Verifying change...');
  const updatedContent = fs.readFileSync(serverFile, 'utf8');
  const wsRouteExists = updatedContent.includes("app.get('/ws'");
  
  console.log(`   WebSocket route exists: ${wsRouteExists ? '✅' : '❌'}`);
  
  if (wsRouteExists) {
    console.log('\n🎉 Simple WebSocket fix applied successfully!');
    
    // Restart PM2
    console.log('\n4. 🔄 Restarting PM2 processes...');
    exec('pm2 restart therapease-api', (error, stdout, stderr) => {
      if (error) {
        console.log('   ❌ PM2 restart failed:', error.message);
      } else {
        console.log('   ✅ PM2 restart successful');
        
        // Wait a moment and test
        setTimeout(() => {
          console.log('\n5. 🧪 Testing WebSocket endpoint...');
          exec('curl -s -w "WebSocket: %{http_code}" https://therapease.site/ws', (error, stdout, stderr) => {
            if (error) {
              console.log('   ❌ WebSocket test failed:', error.message);
            } else {
              console.log(`   ${stdout}`);
              
              if (stdout.includes('426')) {
                console.log('   🎉 WebSocket fix successful!');
              } else {
                console.log('   ⚠️  WebSocket still not working correctly');
              }
            }
          });
        }, 3000);
      }
    });
  } else {
    console.log('\n⚠️  WebSocket route not added properly');
  }
  
} catch (error) {
  console.error('❌ Error applying simple WebSocket fix:', error.message);
  process.exit(1);
}
