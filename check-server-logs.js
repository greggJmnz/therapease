#!/usr/bin/env node

const { exec } = require('child_process');

console.log('🔍 TherapEase Server Logs Check');
console.log('================================\n');

// Check PM2 logs
console.log('1. 📋 Checking PM2 logs...');
exec('pm2 logs therapease-api --lines 20', (error, stdout, stderr) => {
  if (error) {
    console.log('   ❌ Failed to get PM2 logs:', error.message);
  } else {
    console.log('   📋 PM2 logs:');
    console.log(stdout);
  }
  
  // Check PM2 status
  console.log('\n2. 📊 Checking PM2 status...');
  exec('pm2 list', (error, stdout, stderr) => {
    if (error) {
      console.log('   ❌ Failed to get PM2 status:', error.message);
    } else {
      console.log('   📊 PM2 status:');
      console.log(stdout);
    }
    
    // Check if server is listening on port 5000
    console.log('\n3. 🔌 Checking port 5000...');
    exec('lsof -i :5000', (error, stdout, stderr) => {
      if (error) {
        console.log('   ❌ No process found on port 5000');
      } else {
        console.log('   🔌 Port 5000 usage:');
        console.log(stdout);
      }
      
      // Try to start server directly to see error
      console.log('\n4. 🚀 Testing server start directly...');
      exec('cd server && timeout 10s node index.js', (error, stdout, stderr) => {
        if (error) {
          console.log('   ❌ Server start failed:');
          console.log('   Error:', error.message);
          if (stderr) {
            console.log('   Stderr:', stderr);
          }
        } else {
          console.log('   ✅ Server started successfully');
          console.log('   Output:', stdout);
        }
      });
    });
  });
});
