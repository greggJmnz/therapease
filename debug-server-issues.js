#!/usr/bin/env node

const https = require('https');
const http = require('http');
const { URL } = require('url');

console.log('🔍 TherapEase Server Debug & Fix');
console.log('================================\n');

// Configuration
const BASE_URL = 'https://therapease.site';
const API_BASE = `${BASE_URL}/api`;

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TherapEase-Debug/1.0',
        ...options.headers
      },
      rejectUnauthorized: false
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data,
          success: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Test basic connectivity
async function testBasicConnectivity() {
  console.log('1. 🌐 Testing Basic Connectivity...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/health`);
    console.log(`   Health endpoint: ${response.status} ${response.success ? '✅' : '❌'}`);
    if (response.data) {
      console.log(`   Response: ${response.data.substring(0, 100)}...`);
    }
  } catch (error) {
    console.log(`   Health endpoint: ❌ ERROR - ${error.message}`);
  }

  try {
    const response = await makeRequest(`${API_BASE}/auth/test`);
    console.log(`   Auth test: ${response.status} ${response.success ? '✅' : '❌'}`);
  } catch (error) {
    console.log(`   Auth test: ❌ ERROR - ${error.message}`);
  }
}

// Test login endpoint specifically
async function testLoginEndpoint() {
  console.log('\n2. 🔑 Testing Login Endpoint...');
  
  try {
    const response = await makeRequest(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: {
        email: 'admin@therapease.com',
        password: 'SecureAdmin2024!@#$'
      }
    });
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Success: ${response.success ? '✅' : '❌'}`);
    
    if (response.data) {
      console.log(`   Response length: ${response.data.length} chars`);
      try {
        const data = JSON.parse(response.data);
        console.log(`   JSON parsed: ${data.success ? '✅' : '❌'}`);
        if (data.error) {
          console.log(`   Error: ${data.error}`);
        }
        if (data.message) {
          console.log(`   Message: ${data.message}`);
        }
      } catch (parseError) {
        console.log(`   JSON parse error: ${parseError.message}`);
        console.log(`   Raw response: ${response.data.substring(0, 200)}...`);
      }
    }
    
    return response;
  } catch (error) {
    console.log(`   ❌ Login error: ${error.message}`);
    return null;
  }
}

// Test WebSocket endpoint
async function testWebSocketEndpoint() {
  console.log('\n3. 🔌 Testing WebSocket Endpoint...');
  
  try {
    // Test regular HTTP request
    const response = await makeRequest(`${BASE_URL}/ws`);
    console.log(`   HTTP Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers['content-type'] || 'Not set'}`);
    
    if (response.data.includes('<!doctype html>')) {
      console.log('   ❌ Returns HTML (catch-all route issue)');
    } else if (response.status === 426) {
      console.log('   ✅ Returns 426 Upgrade Required (correct)');
    } else if (response.status === 400) {
      console.log('   ✅ Returns 400 Bad Request (expects token)');
    } else {
      console.log('   ⚠️  Unexpected response');
    }
    
    console.log(`   Response preview: ${response.data.substring(0, 100)}...`);
    
  } catch (error) {
    console.log(`   ❌ WebSocket test error: ${error.message}`);
  }
}

// Test local server directly
async function testLocalServer() {
  console.log('\n4. 🏠 Testing Local Server (localhost:5000)...');
  
  try {
    const response = await makeRequest('http://localhost:5000/health');
    console.log(`   Local health: ${response.status} ${response.success ? '✅' : '❌'}`);
  } catch (error) {
    console.log(`   Local health: ❌ ERROR - ${error.message}`);
  }

  try {
    const response = await makeRequest('http://localhost:5000/api/auth/test');
    console.log(`   Local auth test: ${response.status} ${response.success ? '✅' : '❌'}`);
  } catch (error) {
    console.log(`   Local auth test: ❌ ERROR - ${error.message}`);
  }

  try {
    const response = await makeRequest('http://localhost:5000/ws');
    console.log(`   Local WebSocket: ${response.status}`);
    if (response.data.includes('<!doctype html>')) {
      console.log('   ❌ Local WebSocket returns HTML');
    } else {
      console.log('   ✅ Local WebSocket working correctly');
    }
  } catch (error) {
    console.log(`   Local WebSocket: ❌ ERROR - ${error.message}`);
  }
}

// Check PM2 status
async function checkPM2Status() {
  console.log('\n5. 📊 Checking PM2 Status...');
  
  const { exec } = require('child_process');
  
  return new Promise((resolve) => {
    exec('pm2 status', (error, stdout, stderr) => {
      if (error) {
        console.log(`   ❌ PM2 status error: ${error.message}`);
      } else {
        console.log('   PM2 Status:');
        console.log(stdout);
      }
      resolve();
    });
  });
}

// Check recent logs
async function checkRecentLogs() {
  console.log('\n6. 📋 Checking Recent Logs...');
  
  const { exec } = require('child_process');
  
  return new Promise((resolve) => {
    exec('pm2 logs therapease-api --lines 10 --nostream', (error, stdout, stderr) => {
      if (error) {
        console.log(`   ❌ Logs error: ${error.message}`);
      } else {
        console.log('   Recent logs:');
        console.log(stdout);
      }
      resolve();
    });
  });
}

// Main function
async function runDebug() {
  console.log('Starting comprehensive server debug...\n');
  
  await testBasicConnectivity();
  await testLoginEndpoint();
  await testWebSocketEndpoint();
  await testLocalServer();
  await checkPM2Status();
  await checkRecentLogs();

  console.log('\n🎯 DEBUG SUMMARY');
  console.log('================');
  console.log('Check the results above to identify issues:');
  console.log('- 502 errors usually indicate server crash or Nginx proxy issues');
  console.log('- WebSocket HTML responses indicate catch-all route problems');
  console.log('- Check PM2 logs for specific error messages');
  console.log('\n💡 Next steps:');
  console.log('1. If 502 error: Check PM2 logs and restart if needed');
  console.log('2. If WebSocket HTML: Fix catch-all route in server/index.js');
  console.log('3. If local server works but external doesn\'t: Check Nginx config');
}

// Run the debug
runDebug().catch(error => {
  console.error('❌ Debug failed:', error.message);
  process.exit(1);
});
