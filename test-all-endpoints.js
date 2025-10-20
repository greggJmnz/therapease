#!/usr/bin/env node

const https = require('https');
const http = require('http');
const { URL } = require('url');

console.log('🧪 TherapEase Comprehensive Endpoint Test');
console.log('========================================\n');

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
        'User-Agent': 'TherapEase-Test/1.0',
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

// Test server binding (both IPv4 and IPv6)
async function testServerBinding() {
  console.log('1. 🔗 Testing Server Binding...');
  
  // Test IPv4 localhost
  try {
    const response = await makeRequest('http://127.0.0.1:5000/health');
    console.log(`   IPv4 (127.0.0.1:5000): ${response.status} ${response.success ? '✅' : '❌'}`);
  } catch (error) {
    console.log(`   IPv4 (127.0.0.1:5000): ❌ ERROR - ${error.message}`);
  }

  // Test IPv6 localhost
  try {
    const response = await makeRequest('http://[::1]:5000/health');
    console.log(`   IPv6 ([::1]:5000): ${response.status} ${response.success ? '✅' : '❌'}`);
  } catch (error) {
    console.log(`   IPv6 ([::1]:5000): ❌ ERROR - ${error.message}`);
  }

  // Test external
  try {
    const response = await makeRequest(`${BASE_URL}/health`);
    console.log(`   External (${BASE_URL}): ${response.status} ${response.success ? '✅' : '❌'}`);
  } catch (error) {
    console.log(`   External (${BASE_URL}): ❌ ERROR - ${error.message}`);
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
      console.log(`   Response preview: ${response.data.substring(0, 100)}...`);
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
    if (response.success) {
      try {
        const data = JSON.parse(response.data);
        console.log(`   Response: ${data.message || 'Success'}`);
      } catch (parseError) {
        console.log(`   Parse error: ${parseError.message}`);
      }
    }
  } catch (error) {
    console.log(`   Auth test: ❌ ERROR - ${error.message}`);
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
    } else {
      console.log(`   Login response: ${response.data.substring(0, 200)}...`);
    }
  } catch (error) {
    console.log(`   Login: ❌ ERROR - ${error.message}`);
  }
}

// Test admin endpoints with authentication
async function testAdminEndpoints() {
  console.log('\n4. 👨‍💼 Testing Admin Endpoints...');
  
  // First, login to get token
  let token;
  try {
    const loginResponse = await makeRequest(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: {
        email: 'admin@therapease.com',
        password: 'SecureAdmin2024!@#$'
      }
    });
    
    if (loginResponse.success) {
      const data = JSON.parse(loginResponse.data);
      if (data.success && data.data.token) {
        token = data.data.token;
        console.log('   ✅ Login successful, got token');
      } else {
        console.log('   ❌ Login failed:', data.error);
        return false;
      }
    } else {
      console.log('   ❌ Login request failed:', loginResponse.status);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Login error:', error.message);
    return false;
  }
  
  // Test admin endpoints
  const endpoints = [
    { name: 'Users', path: '/admin/users' },
    { name: 'Therapists', path: '/admin/therapists' },
    { name: 'Patients', path: '/admin/patients' },
    { name: 'Profile', path: '/admin/profile' }
  ];

  let allPassed = true;

  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(`${API_BASE}${endpoint.path}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
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

// Main function
async function runTest() {
  console.log('Starting comprehensive endpoint testing...\n');
  
  await testServerBinding();
  const websocketResult = await testWebSocketEndpoint();
  await testAPIEndpoints();
  const adminResult = await testAdminEndpoints();

  console.log('\n📊 COMPREHENSIVE TEST SUMMARY');
  console.log('==============================');
  console.log(`Server Binding: Check results above`);
  console.log(`WebSocket Endpoint: ${websocketResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`API Endpoints: Check results above`);
  console.log(`Admin Endpoints: ${adminResult ? '✅ PASS' : '❌ FAIL'}`);

  const totalPassed = (websocketResult ? 1 : 0) + (adminResult ? 1 : 0);
  const totalTests = 2;

  console.log(`\n🎯 Overall Result: ${totalPassed}/${totalTests} critical tests passed`);

  if (totalPassed === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('Your TherapEase application is fully functional!');
    console.log('🌐 Visit: https://therapease.site');
    console.log('👤 Login: admin@therapease.com / SecureAdmin2024!@#$');
  } else {
    console.log('\n⚠️  Some tests failed:');
    if (!websocketResult) {
      console.log('- WebSocket endpoint needs fixing');
    }
    if (!adminResult) {
      console.log('- Admin endpoints need fixing');
    }
  }
}

// Run the test
runTest().catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});
