#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('🔍 TherapEase Final Diagnostic');
console.log('==============================\n');

// 1. Check PM2 status and logs
console.log('1. 📊 Checking PM2 status...');
exec('pm2 list', (error, stdout, stderr) => {
  if (error) {
    console.log('   ❌ PM2 status error:', error.message);
  } else {
    console.log('   PM2 Status:');
    console.log(stdout);
  }
});

// 2. Check PM2 logs for errors
console.log('\n2. 📋 Checking PM2 logs...');
exec('pm2 logs therapease-api --lines 20 --nostream', (error, stdout, stderr) => {
  if (error) {
    console.log('   ❌ PM2 logs error:', error.message);
  } else {
    console.log('   Recent logs:');
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

// 4. Check if server file exists and is readable
console.log('\n4. 📄 Checking server file...');
const serverFile = path.join(__dirname, 'server', 'index.js');

if (fs.existsSync(serverFile)) {
  console.log('   ✅ Server file exists');
  
  try {
    const content = fs.readFileSync(serverFile, 'utf8');
    console.log(`   File size: ${content.length} characters`);
    
    // Check for server.listen
    const serverListenMatch = content.match(/server\.listen\([^)]+\)/);
    if (serverListenMatch) {
      console.log(`   Server.listen: ${serverListenMatch[0]}`);
    } else {
      console.log('   ❌ No server.listen found');
    }
    
    // Check for WebSocket route
    const wsRouteMatch = content.match(/app\.get\('\/ws'/);
    if (wsRouteMatch) {
      console.log('   ✅ WebSocket route found');
    } else {
      console.log('   ❌ No WebSocket route found');
    }
    
    // Test syntax
    try {
      new Function(content);
      console.log('   ✅ No syntax errors');
    } catch (error) {
      console.log('   ❌ Syntax error:', error.message);
    }
  } catch (error) {
    console.log('   ❌ Error reading server file:', error.message);
  }
} else {
  console.log('   ❌ Server file not found');
}

// 5. Check if server is actually running
console.log('\n5. 🔍 Checking if server is running...');
exec('ps aux | grep node', (error, stdout, stderr) => {
  if (error) {
    console.log('   ❌ Error checking processes:', error.message);
  } else {
    const nodeProcesses = stdout.split('\n').filter(line => line.includes('node') && !line.includes('grep'));
    console.log(`   Node processes found: ${nodeProcesses.length}`);
    nodeProcesses.forEach(process => {
      console.log(`   ${process.trim()}`);
    });
  }
});

// 6. Test direct server start
console.log('\n6. 🧪 Testing direct server start...');
exec('cd server && timeout 5s node index.js', (error, stdout, stderr) => {
  if (error) {
    console.log('   ❌ Direct server start failed:', error.message);
    if (stderr) {
      console.log('   Error output:', stderr);
    }
  } else {
    console.log('   ✅ Direct server start successful');
    console.log('   Output:', stdout);
  }
});

// 7. Check environment variables
console.log('\n7. 🔧 Checking environment variables...');
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  console.log('   ✅ .env file exists');
  try {
    const envContent = fs.readFileSync(envFile, 'utf8');
    const portMatch = envContent.match(/PORT=(\d+)/);
    if (portMatch) {
      console.log(`   PORT in .env: ${portMatch[1]}`);
    } else {
      console.log('   ❌ No PORT found in .env');
    }
  } catch (error) {
    console.log('   ❌ Error reading .env file:', error.message);
  }
} else {
  console.log('   ❌ .env file not found');
}

// 8. Check if there are any dependency issues
console.log('\n8. 📦 Checking dependencies...');
exec('cd server && npm list --depth=0', (error, stdout, stderr) => {
  if (error) {
    console.log('   ❌ Dependency check failed:', error.message);
  } else {
    console.log('   Dependencies:');
    console.log(stdout);
  }
});

// 9. Try to restart PM2 and check again
console.log('\n9. 🔄 Restarting PM2 and checking again...');
exec('pm2 restart therapease-api', (error, stdout, stderr) => {
  if (error) {
    console.log('   ❌ PM2 restart failed:', error.message);
  } else {
    console.log('   ✅ PM2 restart successful');
    
    // Wait a moment and check again
    setTimeout(() => {
      console.log('\n10. 🔍 Checking after restart...');
      
      // Check port again
      exec('netstat -tlnp | grep :5000', (error, stdout, stderr) => {
        if (error) {
          console.log('   ❌ Still no process on port 5000');
        } else {
          console.log('   ✅ Process found on port 5000:');
          console.log(stdout);
        }
      });
      
      // Test local connection
      exec('curl -s -w "Local: %{http_code}" http://127.0.0.1:5000/health', (error, stdout, stderr) => {
        if (error) {
          console.log('   ❌ Local connection failed:', error.message);
        } else {
          console.log(`   ${stdout}`);
        }
      });
      
      // Check PM2 logs again
      exec('pm2 logs therapease-api --lines 10 --nostream', (error, stdout, stderr) => {
        if (error) {
          console.log('   ❌ PM2 logs error:', error.message);
        } else {
          console.log('   Recent logs after restart:');
          console.log(stdout);
        }
      });
      
    }, 3000);
  }
});

console.log('\n🎯 FINAL DIAGNOSTIC SUMMARY');
console.log('============================');
console.log('This diagnostic will help identify why the server is not accessible on localhost:5000');
console.log('Check the results above to see what might be causing the issue.');
console.log('\n💡 Common issues:');
console.log('1. Server not actually starting due to errors');
console.log('2. Port already in use by another process');
console.log('3. Missing dependencies or environment variables');
console.log('4. Server binding to wrong interface');
console.log('5. PM2 not actually running the server');
