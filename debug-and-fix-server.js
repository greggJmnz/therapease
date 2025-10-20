#!/usr/bin/env node

const { exec } = require('child_process');
const net = require('net');

console.log('🔍 TherapEase Server Debug & Fix');
console.log('================================\n');

// Check what's running on port 5000
function checkPort5000() {
  return new Promise((resolve) => {
    console.log('1. 🔍 Checking what\'s running on port 5000...');
    
    exec('netstat -tlnp | grep :5000', (error, stdout, stderr) => {
      if (error) {
        console.log('   No process found on port 5000');
        resolve(null);
      } else {
        console.log('   Port 5000 status:');
        console.log(stdout);
        resolve(stdout);
      }
    });
  });
}

// Check PM2 processes
function checkPM2Processes() {
  return new Promise((resolve) => {
    console.log('\n2. 📊 Checking PM2 processes...');
    
    exec('pm2 list', (error, stdout, stderr) => {
      if (error) {
        console.log('   PM2 error:', error.message);
        resolve(null);
      } else {
        console.log('   PM2 processes:');
        console.log(stdout);
        resolve(stdout);
      }
    });
  });
}

// Check PM2 logs
function checkPM2Logs() {
  return new Promise((resolve) => {
    console.log('\n3. 📋 Checking PM2 logs...');
    
    exec('pm2 logs therapease-api --lines 20 --nostream', (error, stdout, stderr) => {
      if (error) {
        console.log('   PM2 logs error:', error.message);
        resolve(null);
      } else {
        console.log('   Recent logs:');
        console.log(stdout);
        resolve(stdout);
      }
    });
  });
}

// Test server binding
function testServerBinding() {
  return new Promise((resolve) => {
    console.log('\n4. 🔗 Testing server binding...');
    
    // Test IPv4 localhost
    const server = net.createConnection({ port: 5000, host: '127.0.0.1' }, () => {
      console.log('   ✅ 127.0.0.1:5000 - Server is listening');
      server.end();
      resolve(true);
    });
    
    server.on('error', (err) => {
      console.log('   ❌ 127.0.0.1:5000 - Connection failed:', err.message);
      resolve(false);
    });
    
    setTimeout(() => {
      console.log('   ⏰ 127.0.0.1:5000 - Connection timeout');
      resolve(false);
    }, 3000);
  });
}

// Check server configuration
function checkServerConfig() {
  return new Promise((resolve) => {
    console.log('\n5. ⚙️  Checking server configuration...');
    
    exec('grep -n "server.listen" server/index.js', (error, stdout, stderr) => {
      if (error) {
        console.log('   Could not find server.listen in index.js');
        resolve(null);
      } else {
        console.log('   Server listen configuration:');
        console.log(stdout);
        resolve(stdout);
      }
    });
  });
}

// Fix server binding
function fixServerBinding() {
  return new Promise((resolve) => {
    console.log('\n6. 🔧 Applying server binding fix...');
    
    // Read current server/index.js
    const fs = require('fs');
    const path = require('path');
    
    try {
      const serverFile = path.join(__dirname, 'server', 'index.js');
      let content = fs.readFileSync(serverFile, 'utf8');
      
      // Check if already fixed
      if (content.includes("server.listen(PORT, '0.0.0.0'")) {
        console.log('   ✅ Server binding already fixed');
        resolve(true);
        return;
      }
      
      // Apply the fix
      const oldPattern = /server\.listen\(PORT,\s*\(\)\s*=>\s*{/;
      const newPattern = "server.listen(PORT, '0.0.0.0', () => {";
      
      if (oldPattern.test(content)) {
        content = content.replace(oldPattern, newPattern);
        fs.writeFileSync(serverFile, content);
        console.log('   ✅ Server binding fix applied');
        resolve(true);
      } else {
        console.log('   ⚠️  Server listen pattern not found or already different');
        console.log('   Current pattern:', content.match(/server\.listen\([^)]+\)/));
        resolve(false);
      }
    } catch (error) {
      console.log('   ❌ Error applying fix:', error.message);
      resolve(false);
    }
  });
}

// Restart PM2
function restartPM2() {
  return new Promise((resolve) => {
    console.log('\n7. 🔄 Restarting PM2 processes...');
    
    exec('pm2 restart therapease-api', (error, stdout, stderr) => {
      if (error) {
        console.log('   ❌ PM2 restart failed:', error.message);
        resolve(false);
      } else {
        console.log('   ✅ PM2 restart successful');
        console.log(stdout);
        resolve(true);
      }
    });
  });
}

// Test after fix
function testAfterFix() {
  return new Promise((resolve) => {
    console.log('\n8. 🧪 Testing after fix...');
    
    setTimeout(() => {
      testServerBinding().then((result) => {
        if (result) {
          console.log('   ✅ Server binding fix successful!');
        } else {
          console.log('   ❌ Server binding fix failed');
        }
        resolve(result);
      });
    }, 5000); // Wait 5 seconds for server to start
  });
}

// Main function
async function runDebugAndFix() {
  console.log('Starting comprehensive server debug and fix...\n');
  
  await checkPort5000();
  await checkPM2Processes();
  await checkPM2Logs();
  
  const bindingWorks = await testServerBinding();
  
  if (!bindingWorks) {
    await checkServerConfig();
    const fixApplied = await fixServerBinding();
    
    if (fixApplied) {
      const restartSuccess = await restartPM2();
      if (restartSuccess) {
        await testAfterFix();
      }
    }
  } else {
    console.log('\n✅ Server binding is already working correctly!');
  }
  
  console.log('\n🎯 DEBUG & FIX SUMMARY');
  console.log('======================');
  console.log('Check the results above to see what was fixed.');
  console.log('\n💡 Next steps:');
  console.log('1. If server binding works: Test the API endpoints');
  console.log('2. If still issues: Check PM2 logs for specific errors');
  console.log('3. Run: node fix-server-binding-and-websocket.js');
}

// Run the debug and fix
runDebugAndFix().catch(error => {
  console.error('❌ Debug and fix failed:', error.message);
  process.exit(1);
});
