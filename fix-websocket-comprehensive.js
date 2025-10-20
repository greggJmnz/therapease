#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 TherapEase WebSocket Comprehensive Fix');
console.log('========================================\n');

// Read the current server/index.js file
const serverFile = path.join(__dirname, 'server', 'index.js');

try {
  let content = fs.readFileSync(serverFile, 'utf8');
  console.log('📄 Reading server/index.js...');
  
  // Check current WebSocket configuration
  console.log('\n1. 🔍 Analyzing current WebSocket configuration...');
  
  const wsRouteExists = content.includes("app.get('/ws'");
  const staticAfterWs = content.indexOf("app.use(express.static") > content.indexOf("app.get('/ws'");
  const wsServiceInit = content.includes("websocketService.initialize");
  
  console.log(`   WebSocket route exists: ${wsRouteExists ? '✅' : '❌'}`);
  console.log(`   Static serving after WebSocket: ${staticAfterWs ? '✅' : '❌'}`);
  console.log(`   WebSocket service initialized: ${wsServiceInit ? '✅' : '❌'}`);
  
  // Create a more robust WebSocket route
  const newWsRoute = `// WebSocket route handler (must be before static file serving)
app.get('/ws', (req, res) => {
  console.log('🔌 WebSocket route hit via HTTP GET');
  res.status(426).json({ 
    error: 'Upgrade Required', 
    message: 'This endpoint requires WebSocket upgrade',
    upgrade: 'websocket',
    'sec-websocket-version': '13'
  });
});

// WebSocket upgrade handler
app.use('/ws', (req, res, next) => {
  if (req.headers.upgrade === 'websocket') {
    console.log('🔌 WebSocket upgrade request detected');
    // Let the WebSocket service handle this
    next();
  } else {
    console.log('🔌 Non-WebSocket request to /ws, returning 426');
    res.status(426).json({ 
      error: 'Upgrade Required', 
      message: 'This endpoint requires WebSocket upgrade' 
    });
  }
});`;

  // Remove existing WebSocket route if it exists
  if (wsRouteExists) {
    console.log('\n2. 🔄 Updating WebSocket route...');
    
    // Remove the old WebSocket route
    const oldWsPattern = /\/\/ WebSocket route handler \(must be before static file serving\)[\s\S]*?res\.status\(426\)\.json\(\{[\s\S]*?\}\);\s*\}\);/;
    content = content.replace(oldWsPattern, '');
    
    // Add the new WebSocket route before static file serving
    const staticPattern = /(\/\/ Serve static files from public-website directory)/;
    content = content.replace(staticPattern, `${newWsRoute}\n\n$1`);
    
    console.log('   ✅ WebSocket route updated');
  } else {
    console.log('\n2. ➕ Adding WebSocket route...');
    
    // Add WebSocket route before static file serving
    const staticPattern = /(\/\/ Serve static files from public-website directory)/;
    content = content.replace(staticPattern, `${newWsRoute}\n\n$1`);
    
    console.log('   ✅ WebSocket route added');
  }
  
  // Ensure WebSocket service is properly initialized
  console.log('\n3. 🔧 Checking WebSocket service initialization...');
  
  if (!content.includes("websocketService.initialize(server)")) {
    console.log('   ❌ WebSocket service not initialized');
    
    // Add WebSocket service initialization
    const serverPattern = /(const server = http\.createServer\(app\);)/;
    const wsInit = `$1\n\n// Initialize WebSocket service\nwebsocketService.initialize(server);`;
    content = content.replace(serverPattern, wsInit);
    
    console.log('   ✅ WebSocket service initialization added');
  } else {
    console.log('   ✅ WebSocket service already initialized');
  }
  
  // Write the updated file
  console.log('\n4. 💾 Writing updated server configuration...');
  fs.writeFileSync(serverFile, content);
  console.log('   ✅ Server configuration updated');
  
  // Verify the changes
  console.log('\n5. ✅ Verifying changes...');
  const updatedContent = fs.readFileSync(serverFile, 'utf8');
  
  const wsRouteAfterUpdate = updatedContent.includes("app.get('/ws'");
  const wsUpgradeAfterUpdate = updatedContent.includes("app.use('/ws'");
  const wsServiceAfterUpdate = updatedContent.includes("websocketService.initialize");
  
  console.log(`   WebSocket GET route: ${wsRouteAfterUpdate ? '✅' : '❌'}`);
  console.log(`   WebSocket upgrade handler: ${wsUpgradeAfterUpdate ? '✅' : '❌'}`);
  console.log(`   WebSocket service: ${wsServiceAfterUpdate ? '✅' : '❌'}`);
  
  if (wsRouteAfterUpdate && wsUpgradeAfterUpdate && wsServiceAfterUpdate) {
    console.log('\n🎉 WebSocket fix applied successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Restart PM2: pm2 restart therapease-api');
    console.log('2. Test WebSocket: curl https://therapease.site/ws');
    console.log('3. Should return 426 (Upgrade Required) instead of HTML');
  } else {
    console.log('\n⚠️  Some WebSocket configuration issues remain');
  }
  
} catch (error) {
  console.error('❌ Error applying WebSocket fix:', error.message);
  process.exit(1);
}
