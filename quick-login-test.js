#!/usr/bin/env node

/**
 * Quick Login Test Script
 * Tests the most common login issues
 */

const https = require('https');

const testCredentials = {
  email: 'admin@therapease.com',
  password: 'SecureAdmin2024!@#$'
};

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: 10000
    };

    const req = https.request(url, requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            data: jsonData,
            rawData: data
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: null,
            rawData: data
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testLoginEndpoints() {
  console.log('🔍 Testing Login Endpoints...\n');
  
  const endpoints = [
    {
      name: 'Main Site API Login',
      url: 'https://therapease.site/api/auth/login',
      expected: 'Should work - correct route'
    },
    {
      name: 'API Server Login',
      url: 'https://api.therapease.site/auth/login',
      expected: 'Should work - direct API server'
    },
    {
      name: 'Main Site Login (No API)',
      url: 'https://therapease.site/auth/login',
      expected: 'Should fail - missing /api prefix'
    },
    {
      name: 'Double API Prefix',
      url: 'https://therapease.site/api/api/auth/login',
      expected: 'Should fail - double /api prefix'
    }
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing: ${endpoint.name}`);
      console.log(`URL: ${endpoint.url}`);
      console.log(`Expected: ${endpoint.expected}`);
      
      const response = await makeRequest(endpoint.url, {
        method: 'POST',
        body: testCredentials
      });
      
      console.log(`Status: ${response.status}`);
      
      if (response.data) {
        if (response.data.success) {
          console.log('✅ LOGIN SUCCESSFUL!');
          console.log(`Token: ${response.data.data?.token?.substring(0, 20)}...`);
        } else {
          console.log(`❌ Login failed: ${response.data.message || response.data.error}`);
        }
      } else {
        console.log(`❌ No response data: ${response.rawData}`);
      }
      
      console.log('---\n');
      
    } catch (error) {
      console.log(`❌ Request failed: ${error.message}`);
      console.log('---\n');
    }
  }
}

async function testHealthEndpoints() {
  console.log('🏥 Testing Health Endpoints...\n');
  
  const healthEndpoints = [
    'https://therapease.site/api/health',
    'https://therapease.site/api/maintenance-status',
    'https://api.therapease.site/health'
  ];
  
  for (const url of healthEndpoints) {
    try {
      console.log(`Testing: ${url}`);
      const response = await makeRequest(url);
      console.log(`Status: ${response.status}`);
      console.log(`Response: ${JSON.stringify(response.data)}`);
      console.log('---\n');
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
      console.log('---\n');
    }
  }
}

async function main() {
  console.log('🚀 Quick Login Test Script');
  console.log('==========================\n');
  
  await testHealthEndpoints();
  await testLoginEndpoints();
  
  console.log('🎯 Test Complete!');
  console.log('\nIf login is still failing, run the full diagnostic:');
  console.log('node diagnose-login-issue.js');
}

main().catch(console.error);
