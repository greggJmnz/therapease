#!/usr/bin/env node

const https = require('https');
const http = require('http');
const { URL } = require('url');

console.log('🔧 TherapEase WebSocket Fix & Test');
console.log('==================================\n');

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

// Test WebSocket endpoint with proper headers
async function testWebSocketEndpoint() {
  console.log('🔌 Testing WebSocket Endpoint...');
  
  try {
    // Test with WebSocket upgrade headers
    const response = await makeRequest(`${BASE_URL}/ws`, {
      headers: {
        'Connection': 'Upgrade',
        'Upgrade': 'websocket',
        'Sec-WebSocket-Key': 'test',
        'Sec-WebSocket-Version': '13'
      }
    });
    
    console.log(`   📊 Status: ${response.status}`);
    console.log(`   📄 Headers:`, Object.keys(response.headers).join(', '));
    
    if (response.status === 426) {
      console.log('   ✅ WebSocket endpoint: OK (Upgrade Required - correct response)');
      return true;
    } else if (response.status === 400) {
      console.log('   ✅ WebSocket endpoint: OK (Bad Request - expects token)');
      return true;
    } else if (response.status === 200) {
      console.log('   ⚠️  WebSocket endpoint: Returns HTML (catch-all route issue)');
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

// Test admin endpoints with proper authentication
async function testAdminEndpoints() {
  console.log('\n👨‍💼 Testing Admin Endpoints with Authentication...');
  
  // First, login to get token
  console.log('   🔑 Logging in...');
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
        console.log('   ✅ Login successful!');
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
        try {
          const data = JSON.parse(response.data);
          if (data.success) {
            console.log(`      📊 Message: ${data.message || 'Success'}`);
          } else {
            console.log(`      ⚠️  Error: ${data.error || 'Unknown error'}`);
          }
        } catch (parseError) {
          console.log(`      📄 Raw response length: ${response.data.length} chars`);
        }
      } else {
        console.log(`   ❌ ${endpoint.name}: FAILED (${response.status})`);
        if (response.status === 401) {
          console.log(`      🔐 Authentication issue - check token or middleware`);
        }
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

// Main function
async function runTest() {
  console.log('Starting WebSocket fix verification...\n');
  
  const websocketResult = await testWebSocketEndpoint();
  const adminResult = await testAdminEndpoints();

  console.log('\n📊 TEST SUMMARY');
  console.log('================');
  console.log(`WebSocket Endpoint: ${websocketResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Admin Endpoints: ${adminResult ? '✅ PASS' : '❌ FAIL'}`);

  if (websocketResult && adminResult) {
    console.log('\n🎉 All tests passed! Both WebSocket and Admin endpoints are working.');
  } else {
    console.log('\n⚠️  Some issues remain:');
    if (!websocketResult) {
      console.log('- WebSocket endpoint needs catch-all route fix');
    }
    if (!adminResult) {
      console.log('- Admin endpoints need authentication fix');
    }
  }
}

// Run the test
runTest().catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});
