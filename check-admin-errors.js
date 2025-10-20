#!/usr/bin/env node

const https = require('https');
const { URL } = require('url');

console.log('🔍 Admin 500 Error Checker');
console.log('==========================\n');

// Configuration
const API_BASE = 'https://therapease.site/api';

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = https;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Admin-Error-Checker/1.0',
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

async function checkAdminErrors() {
  console.log('1. 🔑 Logging in to get admin token...');
  
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
        console.log('   ✅ Login successful');
      } else {
        console.log('   ❌ Login failed:', data.error);
        return;
      }
    } else {
      console.log('   ❌ Login request failed:', loginResponse.status);
      return;
    }
  } catch (error) {
    console.log('   ❌ Login error:', error.message);
    return;
  }
  
  console.log('\n2. 🔍 Testing admin endpoints...');
  
  const endpoints = [
    { name: 'Users', path: '/admin/users' },
    { name: 'Therapists', path: '/admin/therapists' },
    { name: 'Patients', path: '/admin/patients' },
    { name: 'Profile', path: '/admin/profile' }
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\n   Testing ${endpoint.name}...`);
      const response = await makeRequest(`${API_BASE}${endpoint.path}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log(`   Status: ${response.status}`);
      
      if (response.success) {
        console.log(`   ✅ ${endpoint.name}: OK`);
        try {
          const data = JSON.parse(response.data);
          if (data.success) {
            console.log(`   Response: ${data.message || 'Success'}`);
          } else {
            console.log(`   Error: ${data.error || 'Unknown error'}`);
          }
        } catch (parseError) {
          console.log(`   Raw response length: ${response.data.length} chars`);
        }
      } else {
        console.log(`   ❌ ${endpoint.name}: FAILED`);
        console.log(`   Response: ${response.data.substring(0, 500)}...`);
        
        // Try to parse error details
        try {
          const errorData = JSON.parse(response.data);
          console.log(`   Error details:`, errorData);
        } catch (parseError) {
          console.log(`   Raw error response`);
        }
      }
    } catch (error) {
      console.log(`   ❌ ${endpoint.name}: ERROR - ${error.message}`);
    }
  }
  
  console.log('\n3. 📊 Summary...');
  console.log('Check the results above to identify which endpoints are failing');
  console.log('and what specific errors they are returning.');
}

// Run the check
checkAdminErrors().catch(error => {
  console.error('❌ Admin error check failed:', error.message);
  process.exit(1);
});
