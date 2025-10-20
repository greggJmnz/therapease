#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');

console.log('📦 TherapEase Dependencies Fix');
console.log('==============================\n');

// 1. Install missing dependencies
console.log('1. 📦 Installing missing dependencies...');

const dependencies = [
  'express-rate-limit',
  'compression'
];

console.log(`   Installing: ${dependencies.join(', ')}`);

exec(`cd server && npm install ${dependencies.join(' ')}`, (error, stdout, stderr) => {
  if (error) {
    console.log('   ❌ Installation failed:', error.message);
    if (stderr) {
      console.log('   Error output:', stderr);
    }
  } else {
    console.log('   ✅ Dependencies installed successfully');
    console.log(stdout);
    
    // 2. Verify installation
    console.log('\n2. ✅ Verifying installation...');
    exec('cd server && npm list express-rate-limit compression', (error, stdout, stderr) => {
      if (error) {
        console.log('   ❌ Verification failed:', error.message);
      } else {
        console.log('   ✅ Dependencies verified:');
        console.log(stdout);
      }
      
      // 3. Test server start
      console.log('\n3. 🧪 Testing server start...');
      exec('cd server && timeout 5s node index.js', (error, stdout, stderr) => {
        if (error) {
          console.log('   ❌ Server start failed:', error.message);
          if (stderr) {
            console.log('   Error output:', stderr);
          }
        } else {
          console.log('   ✅ Server start successful');
          console.log('   Output:', stdout);
        }
        
        // 4. Restart PM2
        console.log('\n4. 🔄 Restarting PM2...');
        exec('pm2 restart therapease-api', (error, stdout, stderr) => {
          if (error) {
            console.log('   ❌ PM2 restart failed:', error.message);
          } else {
            console.log('   ✅ PM2 restart successful');
            console.log(stdout);
            
            // Wait and test
            setTimeout(() => {
              console.log('\n5. 🧪 Testing server after dependency fix...');
              
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
                    
                    console.log('\n🎯 DEPENDENCY FIX SUMMARY');
                    console.log('=========================');
                    console.log('✅ Missing dependencies installed');
                    console.log('✅ Server start tested');
                    console.log('✅ PM2 restarted');
                    console.log('\n💡 Next steps:');
                    console.log('1. Test: node test-all-endpoints.js');
                    console.log('2. Check if server is now accessible');
                    console.log('3. Check if WebSocket returns 426');
                  });
                });
              });
            }, 5000);
          }
        });
      });
    });
  }
});
