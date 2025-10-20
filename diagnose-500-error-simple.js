#!/usr/bin/env node

const https = require('https');
const http = require('http');
const { URL } = require('url');

console.log('🔍 TherapEase 500 Error Diagnostic (Simple Version)');
console.log('==================================================\n');

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
        'User-Agent': 'TherapEase-Diagnostic/1.0',
        ...options.headers
      },
      rejectUnauthorized: false // For self-signed certificates
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

// Test functions
async function testHealthEndpoint() {
  console.log('1. 🏥 Testing Health Endpoint...');
  try {
    const response = await makeRequest(`${BASE_URL}/health`);
    if (response.success) {
      console.log('   ✅ Health endpoint: OK');
      console.log(`   📊 Status: ${response.status}`);
      return true;
    } else {
      console.log('   ❌ Health endpoint: FAILED');
      console.log(`   📊 Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Health endpoint: ERROR');
    console.log(`   📊 Error: ${error.message}`);
    return false;
  }
}

async function testAuthEndpoint() {
  console.log('\n2. 🔐 Testing Auth Endpoint...');
  try {
    const response = await makeRequest(`${API_BASE}/auth/test`);
    if (response.success) {
      console.log('   ✅ Auth endpoint: OK');
      console.log(`   📊 Status: ${response.status}`);
      return true;
    } else {
      console.log('   ❌ Auth endpoint: FAILED');
      console.log(`   📊 Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Auth endpoint: ERROR');
    console.log(`   📊 Error: ${error.message}`);
    return false;
  }
}

async function testLoginEndpoint() {
  console.log('\n3. 🔑 Testing Login Endpoint...');
  try {
    const response = await makeRequest(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: {
        email: 'admin@therapease.com',
        password: 'SecureAdmin2024!@#$'
      }
    });
    
    if (response.success) {
      console.log('   ✅ Login endpoint: OK');
      console.log(`   📊 Status: ${response.status}`);
      try {
        const data = JSON.parse(response.data);
        if (data.success) {
          console.log('   🎉 Login successful!');
          console.log(`   👤 User: ${data.data.user.firstName} ${data.data.user.lastName}`);
          console.log(`   🔑 Token: ${data.data.token.substring(0, 20)}...`);
        } else {
          console.log('   ⚠️  Login failed:', data.error || 'Unknown error');
        }
      } catch (parseError) {
        console.log('   ⚠️  Response parsing failed:', parseError.message);
      }
      return true;
    } else {
      console.log('   ❌ Login endpoint: FAILED');
      console.log(`   📊 Status: ${response.status}`);
      console.log(`   📄 Response: ${response.data.substring(0, 200)}...`);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Login endpoint: ERROR');
    console.log(`   📊 Error: ${error.message}`);
    return false;
  }
}

async function testAdminEndpoints() {
  console.log('\n4. 👨‍💼 Testing Admin Endpoints...');
  
  const endpoints = [
    { name: 'Users', path: '/admin/users' },
    { name: 'Therapists', path: '/admin/therapists' },
    { name: 'Patients', path: '/admin/patients' },
    { name: 'Profile', path: '/admin/profile' }
  ];

  let allPassed = true;

  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(`${API_BASE}${endpoint.path}`);
      if (response.success) {
        console.log(`   ✅ ${endpoint.name}: OK (${response.status})`);
      } else {
        console.log(`   ❌ ${endpoint.name}: FAILED (${response.status})`);
        allPassed = false;
      }
    } catch (error) {
      console.log(`   ❌ ${endpoint.name}: ERROR (${error.message})`);
      allPassed = false;
    }
  }

  return allPassed;
}

async function testWebSocketEndpoint() {
  console.log('\n5. 🔌 Testing WebSocket Endpoint...');
  try {
    // Test if WebSocket endpoint is accessible
    const response = await makeRequest(`${BASE_URL}/ws`);
    console.log(`   📊 WebSocket endpoint status: ${response.status}`);
    
    if (response.status === 400 || response.status === 426) {
      console.log('   ✅ WebSocket endpoint: OK (expects WebSocket upgrade)');
      return true;
    } else if (response.status === 200) {
      console.log('   ⚠️  WebSocket endpoint: Returns HTML (may not be properly configured)');
      return false;
    } else {
      console.log('   ❌ WebSocket endpoint: Unexpected response');
      return false;
    }
  } catch (error) {
    console.log('   ❌ WebSocket endpoint: ERROR');
    console.log(`   📊 Error: ${error.message}`);
    return false;
  }
}

// Main diagnostic function
async function runDiagnostic() {
  console.log('Starting comprehensive API diagnostic...\n');
  
  const results = {
    health: await testHealthEndpoint(),
    auth: await testAuthEndpoint(),
    login: await testLoginEndpoint(),
    admin: await testAdminEndpoints(),
    websocket: await testWebSocketEndpoint()
  };

  console.log('\n📊 DIAGNOSTIC SUMMARY');
  console.log('=====================');
  console.log(`Health Endpoint: ${results.health ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Auth Endpoint: ${results.auth ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Login Endpoint: ${results.login ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Admin Endpoints: ${results.admin ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`WebSocket Endpoint: ${results.websocket ? '✅ PASS' : '❌ FAIL'}`);

  const totalPassed = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;

  console.log(`\n🎯 Overall Result: ${totalPassed}/${totalTests} tests passed`);

  if (totalPassed === totalTests) {
    console.log('🎉 All tests passed! Your API is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the details above for issues.');
  }

  console.log('\n💡 Next Steps:');
  if (!results.health) {
    console.log('- Check if the server is running and accessible');
  }
  if (!results.auth || !results.login) {
    console.log('- Verify authentication routes and database connection');
  }
  if (!results.admin) {
    console.log('- Check admin routes and database schema');
  }
  if (!results.websocket) {
    console.log('- Verify WebSocket configuration and Nginx proxy settings');
  }
}

// Run the diagnostic
runDiagnostic().catch(error => {
  console.error('❌ Diagnostic failed:', error.message);
  process.exit(1);
});
