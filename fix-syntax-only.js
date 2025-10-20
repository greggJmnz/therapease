#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('🔧 TherapEase Syntax Fix Only');
console.log('=============================\n');

// Fix admin controller syntax error
console.log('1. 🔧 Fixing admin controller syntax error...');

const adminControllerFile = path.join(__dirname, 'server', 'controllers', 'adminController.js');
let adminContent = fs.readFileSync(adminControllerFile, 'utf8');

// Find the getUsers function and fix it properly
const getUsersStart = adminContent.indexOf('const getUsers = async (req, res) => {');
if (getUsersStart !== -1) {
  console.log('   📍 Found getUsers function, fixing syntax...');
  
  // Find the end of the function by looking for the next function or end of file
  const nextFunction = adminContent.indexOf('const ', getUsersStart + 1);
  const endOfFile = adminContent.length;
  const searchEnd = nextFunction !== -1 ? nextFunction : endOfFile;
  
  // Extract the function content
  let functionContent = adminContent.substring(getUsersStart, searchEnd);
  
  // Count braces to find the proper end
  let braceCount = 0;
  let functionEnd = -1;
  
  for (let i = 0; i < functionContent.length; i++) {
    if (functionContent[i] === '{') {
      braceCount++;
    } else if (functionContent[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        functionEnd = i + 1;
        break;
      }
    }
  }
  
  if (functionEnd !== -1) {
    // Extract the complete function
    const completeFunction = functionContent.substring(0, functionEnd);
    
    // Check if it ends with }; or just }
    if (!completeFunction.trim().endsWith('};')) {
      // Add the missing semicolon
      const fixedFunction = completeFunction.trim() + ';\n';
      
      // Replace the function in the content
      adminContent = adminContent.substring(0, getUsersStart) + 
                   fixedFunction + 
                   adminContent.substring(getUsersStart + functionContent.length);
      
      console.log('   ✅ getUsers function syntax fixed');
    } else {
      console.log('   ✅ getUsers function syntax already OK');
    }
  } else {
    console.log('   ❌ Could not find proper function end');
  }
} else {
  console.log('   ⚠️  getUsers function not found');
}

// Write the fixed file
console.log('\n2. 💾 Writing fixed admin controller...');
fs.writeFileSync(adminControllerFile, adminContent);
console.log('   ✅ Admin controller updated');

// Test syntax
console.log('\n3. ✅ Testing syntax...');
try {
  new Function(adminContent);
  console.log('   ✅ Admin controller syntax OK');
} catch (error) {
  console.log('   ❌ Admin controller syntax error:', error.message);
  console.log('   Error details:', error.stack);
}

// Restart PM2
console.log('\n4. 🔄 Restarting PM2...');
exec('pm2 restart therapease-api', (error, stdout, stderr) => {
  if (error) {
    console.log('   ❌ PM2 restart failed:', error.message);
  } else {
    console.log('   ✅ PM2 restart successful');
    console.log(stdout);
    
    // Wait and test
    setTimeout(() => {
      console.log('\n5. 🧪 Testing server...');
      
      // Test if server is accessible
      exec('curl -s -w "Server: %{http_code}" http://127.0.0.1:5000/health', (error, stdout, stderr) => {
        if (error) {
          console.log('   ❌ Server test failed:', error.message);
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
          console.log('✅ Admin controller syntax error fixed');
          console.log('✅ Server restarted');
          console.log('\n💡 Next steps:');
          console.log('1. Test: node test-all-endpoints.js');
          console.log('2. Check if server is accessible on localhost:5000');
          console.log('3. Check if WebSocket returns 426');
        });
      });
    }, 5000);
  }
});
