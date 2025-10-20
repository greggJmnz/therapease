#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 TherapEase Final WebSocket Fix');
console.log('=================================\n');

// Read the current server/index.js file
const serverFile = path.join(__dirname, 'server', 'index.js');

try {
  let content = fs.readFileSync(serverFile, 'utf8');
  console.log('📄 Reading server/index.js...');
  
  // Find the static file serving section
  const staticPattern = /app\.use\(express\.static\(path\.join\(__dirname, 'public'\)\)\);/;
  const staticMatch = content.match(staticPattern);
  
  if (!staticMatch) {
    console.log('❌ Could not find static file serving pattern');
    process.exit(1);
  }
  
  console.log('1. 🔍 Found static file serving section');
  
  // Create a more specific static file serving that excludes /ws
  const newStaticServing = `// Serve root-level assets (exclude WebSocket path)
app.use((req, res, next) => {
  if (req.path === '/ws') {
    // Skip static file serving for WebSocket path
    return next();
  }
  express.static(path.join(__dirname, 'public'))(req, res, next);
});`;
  
  // Replace the static file serving
  content = content.replace(staticPattern, newStaticServing);
  
  console.log('2. 🔄 Updated static file serving to exclude /ws path');
  
  // Ensure WebSocket route is properly placed
  const wsRoutePattern = /app\.get\('\/ws'/;
  if (!wsRoutePattern.test(content)) {
    console.log('3. ➕ Adding WebSocket route...');
    
    const wsRoute = `// WebSocket route handler (must be before static file serving)
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
});

`;
    
    // Add before static file serving
    content = content.replace(newStaticServing, `${wsRoute}\n${newStaticServing}`);
    console.log('   ✅ WebSocket route added');
  } else {
    console.log('3. ✅ WebSocket route already exists');
  }
  
  // Write the updated file
  console.log('\n4. 💾 Writing updated server configuration...');
  fs.writeFileSync(serverFile, content);
  console.log('   ✅ Server configuration updated');
  
  // Verify the changes
  console.log('\n5. ✅ Verifying changes...');
  const updatedContent = fs.readFileSync(serverFile, 'utf8');
  
  const wsRouteExists = updatedContent.includes("app.get('/ws'");
  const wsUpgradeExists = updatedContent.includes("app.use('/ws'");
  const staticExcludesWs = updatedContent.includes("if (req.path === '/ws')");
  
  console.log(`   WebSocket GET route: ${wsRouteExists ? '✅' : '❌'}`);
  console.log(`   WebSocket upgrade handler: ${wsUpgradeExists ? '✅' : '❌'}`);
  console.log(`   Static serving excludes /ws: ${staticExcludesWs ? '✅' : '❌'}`);
  
  if (wsRouteExists && wsUpgradeExists && staticExcludesWs) {
    console.log('\n🎉 Final WebSocket fix applied successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Restart PM2: pm2 restart therapease-api');
    console.log('2. Test WebSocket: curl https://therapease.site/ws');
    console.log('3. Should return 426 (Upgrade Required) instead of HTML');
    console.log('4. Test API: curl https://therapease.site/api/auth/test');
    console.log('5. Should return 200 OK instead of 502');
  } else {
    console.log('\n⚠️  Some WebSocket configuration issues remain');
  }
  
} catch (error) {
  console.error('❌ Error applying final WebSocket fix:', error.message);
  process.exit(1);
}
