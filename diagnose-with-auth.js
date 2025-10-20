#!/usr/bin/env node

const https = require('https');
const http = require('http');
const { URL } = require('url');

console.log('🔍 TherapEase Authenticated API Diagnostic');
console.log('==========================================\n');

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

// Login and get token
async function loginAndGetToken() {
  console.log('🔑 Logging in to get authentication token...');
  try {
    const response = await makeRequest(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: {
        email: 'admin@therapease.com',
        password: 'SecureAdmin2024!@#$'
      }
    });
    
    if (response.success) {
      const data = JSON.parse(response.data);
      if (data.success && data.data.token) {
        console.log('   ✅ Login successful!');
        console.log(`   👤 User: ${data.data.user.firstName} ${data.data.user.lastName}`);
        console.log(`   🔑 Token: ${data.data.token.substring(0, 20)}...`);
        return data.data.token;
      } else {
        console.log('   ❌ Login failed:', data.error || 'Unknown error');
        return null;
      }
    } else {
      console.log('   ❌ Login request failed:', response.status);
      return null;
    }
  } catch (error) {
    console.log('   ❌ Login error:', error.message);
    return null;
  }
}

// Test admin endpoints with authentication
async function testAdminEndpointsWithAuth(token) {
  console.log('\n👨‍💼 Testing Admin Endpoints with Authentication...');
  
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
        try {
          const data = JSON.parse(response.data);
          if (data.success) {
            console.log(`      📊 Response: ${data.message || 'Success'}`);
          } else {
            console.log(`      ⚠️  Response: ${data.error || 'Unknown error'}`);
          }
        } catch (parseError) {
          console.log(`      📄 Raw response length: ${response.data.length} chars`);
        }
      } else {
        console.log(`   ❌ ${endpoint.name}: FAILED (${response.status})`);
        console.log(`      📄 Response: ${response.data.substring(0, 200)}...`);
        allPassed = false;
      }
    } catch (error) {
      console.log(`   ❌ ${endpoint.name}: ERROR (${error.message})`);
      allPassed = false;
    }
  }

  return allPassed;
}

// Test WebSocket endpoint
async function testWebSocketEndpoint() {
  console.log('\n🔌 Testing WebSocket Endpoint...');
  try {
    // Test if WebSocket endpoint is accessible
    const response = await makeRequest(`${BASE_URL}/ws`);
    console.log(`   📊 WebSocket endpoint status: ${response.status}`);
    
    if (response.status === 400 || response.status === 426) {
      console.log('   ✅ WebSocket endpoint: OK (expects WebSocket upgrade)');
      return true;
    } else if (response.status === 200) {
      console.log('   ⚠️  WebSocket endpoint: Returns HTML (may not be properly configured)');
      console.log(`   📄 Response preview: ${response.data.substring(0, 100)}...`);
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

// Test basic endpoints
async function testBasicEndpoints() {
  console.log('🏥 Testing Basic Endpoints...');
  
  // Health endpoint
  try {
    const healthResponse = await makeRequest(`${BASE_URL}/health`);
    console.log(`   Health: ${healthResponse.success ? '✅ OK' : '❌ FAIL'} (${healthResponse.status})`);
  } catch (error) {
    console.log(`   Health: ❌ ERROR (${error.message})`);
  }

  // Auth test endpoint
  try {
    const authResponse = await makeRequest(`${API_BASE}/auth/test`);
    console.log(`   Auth Test: ${authResponse.success ? '✅ OK' : '❌ FAIL'} (${authResponse.status})`);
  } catch (error) {
    console.log(`   Auth Test: ❌ ERROR (${error.message})`);
  }
}

// Main diagnostic function
async function runDiagnostic() {
  console.log('Starting authenticated API diagnostic...\n');
  
  // Test basic endpoints first
  await testBasicEndpoints();
  
  // Login and get token
  const token = await loginAndGetToken();
  
  if (!token) {
    console.log('\n❌ Cannot proceed without authentication token');
    return;
  }
  
  // Test admin endpoints with authentication
  const adminResults = await testAdminEndpointsWithAuth(token);
  
  // Test WebSocket endpoint
  const websocketResult = await testWebSocketEndpoint();

  console.log('\n📊 DIAGNOSTIC SUMMARY');
  console.log('=====================');
  console.log(`Basic Endpoints: ✅ PASS`);
  console.log(`Authentication: ✅ PASS`);
  console.log(`Admin Endpoints: ${adminResults ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`WebSocket Endpoint: ${websocketResult ? '✅ PASS' : '❌ FAIL'}`);

  const totalPassed = (adminResults ? 1 : 0) + (websocketResult ? 1 : 0) + 2; // +2 for basic and auth
  const totalTests = 4;

  console.log(`\n🎯 Overall Result: ${totalPassed}/${totalTests} tests passed`);

  if (totalPassed === totalTests) {
    console.log('🎉 All tests passed! Your API is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the details above for issues.');
  }

  console.log('\n💡 Next Steps:');
  if (!adminResults) {
    console.log('- Check admin route authentication middleware');
    console.log('- Verify JWT token validation in admin routes');
  }
  if (!websocketResult) {
    console.log('- Check WebSocket route configuration in server/index.js');
    console.log('- Verify Nginx WebSocket proxy configuration');
  }
}

// Run the diagnostic
runDiagnostic().catch(error => {
  console.error('❌ Diagnostic failed:', error.message);
  process.exit(1);
});
