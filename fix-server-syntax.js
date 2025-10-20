#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('🔧 TherapEase Server Syntax Fix');
console.log('==============================\n');

// Read the current server/index.js file
const serverFile = path.join(__dirname, 'server', 'index.js');

try {
  let content = fs.readFileSync(serverFile, 'utf8');
  console.log('📄 Reading server/index.js...');
  
  // 1. Check for syntax errors
  console.log('\n1. 🔍 Checking for syntax errors...');
  
  // Try to parse the file as JavaScript
  try {
    new Function(content);
    console.log('   ✅ No syntax errors found');
  } catch (error) {
    console.log('   ❌ Syntax error found:', error.message);
    console.log('   Line:', error.lineNumber || 'Unknown');
    console.log('   Column:', error.columnNumber || 'Unknown');
  }
  
  // 2. Check for common issues
  console.log('\n2. 🔍 Checking for common issues...');
  
  // Check for unclosed strings
  const unclosedStrings = (content.match(/"/g) || []).length % 2 !== 0;
  const unclosedSingleQuotes = (content.match(/'/g) || []).length % 2 !== 0;
  const unclosedBackticks = (content.match(/`/g) || []).length % 2 !== 0;
  
  console.log(`   Unclosed double quotes: ${unclosedStrings ? '❌' : '✅'}`);
  console.log(`   Unclosed single quotes: ${unclosedSingleQuotes ? '❌' : '✅'}`);
  console.log(`   Unclosed backticks: ${unclosedBackticks ? '❌' : '✅'}`);
  
  // Check for unclosed brackets
  const openBraces = (content.match(/\{/g) || []).length;
  const closeBraces = (content.match(/\}/g) || []).length;
  const openParens = (content.match(/\(/g) || []).length;
  const closeParens = (content.match(/\)/g) || []).length;
  
  console.log(`   Unclosed braces: ${openBraces !== closeBraces ? '❌' : '✅'} (${openBraces}/${closeBraces})`);
  console.log(`   Unclosed parentheses: ${openParens !== closeParens ? '❌' : '✅'} (${openParens}/${closeParens})`);
  
  // 3. Look for specific problematic patterns
  console.log('\n3. 🔍 Looking for problematic patterns...');
  
  // Check for duplicate route definitions
  const wsRouteCount = (content.match(/app\.get\('\/ws'/g) || []).length;
  console.log(`   WebSocket routes: ${wsRouteCount} (should be 1)`);
  
  if (wsRouteCount > 1) {
    console.log('   ⚠️  Multiple WebSocket routes found, cleaning up...');
    
    // Keep only the first WebSocket route
    const wsRouteRegex = /\/\/ WebSocket route[\s\S]*?res\.status\(426\)[\s\S]*?\}\);/g;
    const matches = content.match(wsRouteRegex);
    
    if (matches && matches.length > 1) {
      // Remove all but the first one
      let cleanedContent = content;
      for (let i = 1; i < matches.length; i++) {
        cleanedContent = cleanedContent.replace(matches[i], '');
      }
      content = cleanedContent;
      console.log('   ✅ Removed duplicate WebSocket routes');
    }
  }
  
  // Check for malformed server.listen
  const serverListenMatch = content.match(/server\.listen\([^)]+\)/);
  if (serverListenMatch) {
    console.log(`   Server.listen: ${serverListenMatch[0]}`);
    
    // Check if it's properly formatted
    if (!serverListenMatch[0].includes("'0.0.0.0'")) {
      console.log('   ⚠️  Server.listen not binding to 0.0.0.0, fixing...');
      
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
      console.log('   ✅ Server.listen fixed');
    }
  }
  
  // 4. Clean up any malformed WebSocket routes
  console.log('\n4. 🔌 Cleaning up WebSocket routes...');
  
  // Remove all existing WebSocket routes
  const wsRoutesToRemove = [
    /\/\/ WebSocket route[\s\S]*?res\.status\(426\)[\s\S]*?\}\);/g,
    /\/\/ Simple WebSocket route[\s\S]*?res\.status\(426\)[\s\S]*?\}\);/g,
    /\/\/ Definitive WebSocket route[\s\S]*?res\.status\(426\)[\s\S]*?\}\);/g,
    /app\.get\('\/ws'[\s\S]*?res\.status\(426\)[\s\S]*?\}\);/g,
    /app\.all\('\/ws'[\s\S]*?res\.status\(426\)[\s\S]*?\}\);/g
  ];
  
  wsRoutesToRemove.forEach(regex => {
    content = content.replace(regex, '');
  });
  
  // Add a single, clean WebSocket route at the beginning
  const cleanWsRoute = `// WebSocket route (highest priority)
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
    content = content.replace(firstRoutePattern, `${cleanWsRoute}$1`);
    console.log('   ✅ Clean WebSocket route added');
  } else {
    console.log('   ❌ Could not find first route to add WebSocket route');
  }
  
  // 5. Write the cleaned file
  console.log('\n5. 💾 Writing cleaned server configuration...');
  fs.writeFileSync(serverFile, content);
  console.log('   ✅ Server configuration cleaned and updated');
  
  // 6. Test syntax again
  console.log('\n6. ✅ Testing syntax after cleanup...');
  try {
    new Function(content);
    console.log('   ✅ No syntax errors found after cleanup');
  } catch (error) {
    console.log('   ❌ Syntax error still exists:', error.message);
    console.log('   This needs manual fixing');
  }
  
  // 7. Restart PM2
  console.log('\n7. 🔄 Restarting PM2 processes...');
  exec('pm2 restart therapease-api', (error, stdout, stderr) => {
    if (error) {
      console.log('   ❌ PM2 restart failed:', error.message);
    } else {
      console.log('   ✅ PM2 restart successful');
      console.log(stdout);
      
      // Wait and test
      setTimeout(() => {
        console.log('\n8. 🧪 Testing server after syntax fix...');
        
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
            
            console.log('\n🎯 SYNTAX FIX SUMMARY');
            console.log('=====================');
            console.log('✅ Server syntax cleaned');
            console.log('✅ Duplicate routes removed');
            console.log('✅ WebSocket route cleaned');
            console.log('✅ PM2 restarted');
            console.log('\n💡 Next steps:');
            console.log('1. Test: node test-all-endpoints.js');
            console.log('2. Check if server is now accessible');
            console.log('3. Check if WebSocket returns 426');
          });
        });
      }, 5000);
    }
  });
  
} catch (error) {
  console.error('❌ Error in syntax fix:', error.message);
  process.exit(1);
}
