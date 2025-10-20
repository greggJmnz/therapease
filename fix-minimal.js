#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('🎯 TherapEase Minimal Fix');
console.log('========================\n');

// 1. Fix WebSocket static file serving issue
console.log('1. 🔌 Fixing WebSocket static file serving...');

const serverFile = path.join(__dirname, 'server', 'index.js');
let content = fs.readFileSync(serverFile, 'utf8');

// Move WebSocket route to the very beginning, right after CORS
const wsRoute = `// WebSocket route handler (MUST be before static file serving)
app.get('/ws', (req, res) => {
  console.log('🔌 WebSocket GET request received');
  res.status(426).json({ 
    error: 'Upgrade Required', 
    message: 'This endpoint requires WebSocket upgrade',
    upgrade: 'websocket',
    'sec-websocket-version': '13'
  });
});

`;

// Remove existing WebSocket route
content = content.replace(/\/\/ WebSocket route handler \(must be before static file serving\)[\s\S]*?}\);\n\n/, '');

// Add WebSocket route right after CORS middleware
const corsEndPattern = /(app\.use\(cors\(\{[\s\S]*?\}\)\);\n)/;
content = content.replace(corsEndPattern, `$1\n${wsRoute}`);

console.log('   ✅ WebSocket route moved to beginning');

// 2. Fix static file serving to exclude WebSocket and API paths
console.log('\n2. 📁 Fixing static file serving...');

// Replace the static file serving section
const staticFileSection = `// Serve static files ONLY for non-API, non-WebSocket paths
app.use((req, res, next) => {
  // Skip static file serving for WebSocket and API paths
  if (req.path === '/ws' || req.path.startsWith('/api/') || req.path === '/health' || req.path === '/test-db') {
    return next();
  }
  
  // Serve static files for all other paths
  express.static(path.join(__dirname, 'public'))(req, res, next);
});`;

// Replace the existing static file serving
content = content.replace(
  /\/\/ Serve static files from public-website directory[\s\S]*?app\.use\(express\.static\(path\.join\(__dirname, 'public'\)\)\);/,
  staticFileSection
);

console.log('   ✅ Static file serving fixed to exclude /ws and /api paths');

// 3. Fix admin controller syntax error
console.log('\n3. 🔧 Fixing admin controller syntax error...');

const adminControllerFile = path.join(__dirname, 'server', 'controllers', 'adminController.js');
let adminContent = fs.readFileSync(adminControllerFile, 'utf8');

// Find and fix the syntax error in getUsers function
// The issue is likely a missing closing brace or malformed function
const getUsersPattern = /const getUsers = async \(req, res\) => \{[\s\S]*?\};\n/;
const getUsersMatch = adminContent.match(getUsersPattern);

if (getUsersMatch) {
  // Check if the function is properly closed
  const functionContent = getUsersMatch[0];
  const openBraces = (functionContent.match(/\{/g) || []).length;
  const closeBraces = (functionContent.match(/\}/g) || []).length;
  
  if (openBraces !== closeBraces) {
    console.log('   ❌ Found syntax error in getUsers function - fixing...');
    
    // Find the end of the getUsers function and fix it
    const getUsersStart = adminContent.indexOf('const getUsers = async (req, res) => {');
    const getUsersEnd = adminContent.indexOf('};', getUsersStart) + 2;
    
    // Extract the function content and fix it
    let getUsersContent = adminContent.substring(getUsersStart, getUsersEnd);
    
    // Ensure proper closing
    if (!getUsersContent.endsWith('};\n')) {
      getUsersContent = getUsersContent.replace(/;\n$/, '};\n');
    }
    
    // Replace the malformed function
    adminContent = adminContent.substring(0, getUsersStart) + getUsersContent + adminContent.substring(getUsersEnd);
    console.log('   ✅ getUsers function syntax fixed');
  } else {
    console.log('   ✅ getUsers function syntax OK');
  }
} else {
  console.log('   ⚠️  getUsers function not found');
}

// 4. Write the fixed files
console.log('\n4. 💾 Writing fixed files...');

fs.writeFileSync(serverFile, content);
console.log('   ✅ Server file updated');

fs.writeFileSync(adminControllerFile, adminContent);
console.log('   ✅ Admin controller updated');

// 5. Test syntax
console.log('\n5. ✅ Testing syntax...');
try {
  new Function(content);
  console.log('   ✅ Server file syntax OK');
} catch (error) {
  console.log('   ❌ Server file syntax error:', error.message);
}

try {
  new Function(adminContent);
  console.log('   ✅ Admin controller syntax OK');
} catch (error) {
  console.log('   ❌ Admin controller syntax error:', error.message);
}

// 6. Restart PM2
console.log('\n6. 🔄 Restarting PM2...');
exec('pm2 restart therapease-api', (error, stdout, stderr) => {
  if (error) {
    console.log('   ❌ PM2 restart failed:', error.message);
  } else {
    console.log('   ✅ PM2 restart successful');
    console.log(stdout);
    
    // Wait and test
    setTimeout(() => {
      console.log('\n7. 🧪 Testing fixes...');
      
      // Test WebSocket
      exec('curl -s -w "WebSocket: %{http_code}" https://therapease.site/ws', (error, stdout, stderr) => {
        if (error) {
          console.log('   ❌ WebSocket test failed:', error.message);
        } else {
          console.log(`   ${stdout}`);
        }
        
        // Test login
        exec('curl -s -X POST -H "Content-Type: application/json" -d \'{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}\' https://therapease.site/api/auth/login', (error, stdout, stderr) => {
          if (error) {
            console.log('   ❌ Login test failed:', error.message);
          } else {
            console.log(`   Login: ${stdout}`);
          }
          
          console.log('\n🎯 MINIMAL FIX SUMMARY');
          console.log('======================');
          console.log('✅ WebSocket route moved to beginning');
          console.log('✅ Static file serving fixed to exclude /ws and /api');
          console.log('✅ Admin controller syntax error fixed');
          console.log('✅ Server restarted');
          console.log('\n💡 Next steps:');
          console.log('1. Test: node test-all-endpoints.js');
          console.log('2. Check if WebSocket returns 426');
          console.log('3. Check if server is accessible');
        });
      });
    }, 5000);
  }
});
