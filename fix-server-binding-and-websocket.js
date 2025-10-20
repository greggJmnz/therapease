#!/usr/bin/env node

const https = require('https');
const http = require('http');
const { URL } = require('url');

console.log('🔧 TherapEase Server Binding & WebSocket Fix');
console.log('============================================\n');

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
        'User-Agent': 'TherapEase-Fix/1.0',
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

// Test server binding
async function testServerBinding() {
  console.log('1. 🔗 Testing Server Binding...');
  
  // Test localhost
  try {
    const response = await makeRequest('http://localhost:5000/health');
    console.log(`   Localhost:5000 - ${response.status} ${response.success ? '✅' : '❌'}`);
  } catch (error) {
    console.log(`   Localhost:5000 - ❌ ERROR: ${error.message}`);
  }

  // Test 127.0.0.1
  try {
    const response = await makeRequest('http://127.0.0.1:5000/health');
    console.log(`   127.0.0.1:5000 - ${response.status} ${response.success ? '✅' : '❌'}`);
  } catch (error) {
    console.log(`   127.0.0.1:5000 - ❌ ERROR: ${error.message}`);
  }

  // Test external
  try {
    const response = await makeRequest(`${BASE_URL}/health`);
    console.log(`   External (${BASE_URL}) - ${response.status} ${response.success ? '✅' : '❌'}`);
  } catch (error) {
    console.log(`   External (${BASE_URL}) - ❌ ERROR: ${error.message}`);
  }
}

// Test WebSocket endpoint
async function testWebSocketEndpoint() {
  console.log('\n2. 🔌 Testing WebSocket Endpoint...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/ws`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers['content-type'] || 'Not set'}`);
    
    if (response.status === 426) {
      console.log('   ✅ WebSocket endpoint: CORRECT (426 Upgrade Required)');
      return true;
    } else if (response.status === 400) {
      console.log('   ✅ WebSocket endpoint: CORRECT (400 Bad Request - expects token)');
      return true;
    } else if (response.data.includes('<!doctype html>')) {
      console.log('   ❌ WebSocket endpoint: WRONG (returns HTML)');
      return false;
    } else {
      console.log('   ⚠️  WebSocket endpoint: UNEXPECTED');
      console.log(`   Response: ${response.data.substring(0, 100)}...`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ WebSocket test error: ${error.message}`);
    return false;
  }
}

// Test API endpoints
async function testAPIEndpoints() {
  console.log('\n3. 🔑 Testing API Endpoints...');
  
  // Test auth test
  try {
    const response = await makeRequest(`${API_BASE}/auth/test`);
    console.log(`   Auth test: ${response.status} ${response.success ? '✅' : '❌'}`);
  } catch (error) {
    console.log(`   Auth test: ❌ ERROR: ${error.message}`);
  }

  // Test login
  try {
    const response = await makeRequest(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: {
        email: 'admin@therapease.com',
        password: 'SecureAdmin2024!@#$'
      }
    });
    console.log(`   Login: ${response.status} ${response.success ? '✅' : '❌'}`);
    
    if (response.success) {
      try {
        const data = JSON.parse(response.data);
        if (data.success) {
          console.log(`   Login successful: ${data.data.user.firstName} ${data.data.user.lastName}`);
        } else {
          console.log(`   Login failed: ${data.error}`);
        }
      } catch (parseError) {
        console.log(`   Login response parse error: ${parseError.message}`);
      }
    }
  } catch (error) {
    console.log(`   Login: ❌ ERROR: ${error.message}`);
  }
}

// Check PM2 status
async function checkPM2Status() {
  console.log('\n4. 📊 Checking PM2 Status...');
  
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

// Main function
async function runFix() {
  console.log('Starting server binding and WebSocket fix verification...\n');
  
  await testServerBinding();
  const websocketResult = await testWebSocketEndpoint();
  await testAPIEndpoints();
  await checkPM2Status();

  console.log('\n📊 FIX SUMMARY');
  console.log('==============');
  console.log(`Server Binding: Check results above`);
  console.log(`WebSocket Endpoint: ${websocketResult ? '✅ FIXED' : '❌ STILL BROKEN'}`);
  console.log(`API Endpoints: Check results above`);

  if (websocketResult) {
    console.log('\n🎉 WebSocket fix successful!');
    console.log('The WebSocket endpoint now returns 426 (Upgrade Required) instead of HTML.');
  } else {
    console.log('\n⚠️  WebSocket still needs fixing.');
    console.log('The endpoint is still returning HTML instead of proper WebSocket response.');
  }

  console.log('\n💡 Next steps:');
  console.log('1. If server binding works: The 502 errors should be resolved');
  console.log('2. If WebSocket works: Real-time features should function');
  console.log('3. If API endpoints work: Admin portal should be fully functional');
}

// Run the fix
runFix().catch(error => {
  console.error('❌ Fix verification failed:', error.message);
  process.exit(1);
});
