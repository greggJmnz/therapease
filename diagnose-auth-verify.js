#!/usr/bin/env node

/**
 * Diagnostic script for /api/auth/verify endpoint
 * This script will help identify why the endpoint is returning 404
 */

const axios = require('axios');
const https = require('https');

// Configuration
const BASE_URL = 'https://www.therapease.site';
const API_BASE = `${BASE_URL}/api`;

// Create axios instance with proper SSL handling
const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  httpsAgent: new https.Agent({
    rejectUnauthorized: false // For self-signed certificates during testing
  })
});

// Test functions
async function testServerHealth() {
  console.log('🔍 Testing server health...');
  try {
    const response = await axios.get(`${BASE_URL}/health`, {
      timeout: 5000,
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });
    console.log('✅ Server health check:', response.status, response.data);
    return true;
  } catch (error) {
    console.log('❌ Server health check failed:', error.message);
    return false;
  }
}

async function testAuthVerifyEndpoint() {
  console.log('\n🔍 Testing /api/auth/verify endpoint...');
  
  const testCases = [
    {
      name: 'GET /api/auth/verify (no token)',
      method: 'GET',
      url: '/auth/verify',
      headers: {}
    },
    {
      name: 'GET /api/auth/verify with timestamp',
      method: 'GET', 
      url: '/auth/verify?_t=' + Date.now(),
      headers: {}
    },
    {
      name: 'POST /api/auth/verify (no token)',
      method: 'POST',
      url: '/auth/verify',
      data: {},
      headers: {}
    },
    {
      name: 'GET /api/auth/verify with Authorization header',
      method: 'GET',
      url: '/auth/verify',
      headers: {
        'Authorization': 'Bearer test-token'
      }
    }
  ];

  for (const testCase of testCases) {
    try {
      console.log(`\n📡 Testing: ${testCase.name}`);
      
      const config = {
        method: testCase.method,
        url: testCase.url,
        headers: {
          'Content-Type': 'application/json',
          ...testCase.headers
        }
      };
      
      if (testCase.data) {
        config.data = testCase.data;
      }
      
      const response = await api(config);
      console.log(`✅ ${testCase.name}:`, response.status, response.data);
      
    } catch (error) {
      if (error.response) {
        console.log(`❌ ${testCase.name}:`, error.response.status, error.response.data);
      } else {
        console.log(`❌ ${testCase.name}:`, error.message);
      }
    }
  }
}

async function testOtherAuthEndpoints() {
  console.log('\n🔍 Testing other auth endpoints...');
  
  const endpoints = [
    { name: 'POST /api/auth/login', method: 'POST', url: '/auth/login', data: { email: 'test@test.com', password: 'test' } },
    { name: 'POST /api/auth/register', method: 'POST', url: '/auth/register', data: { email: 'test@test.com', password: 'test', firstName: 'Test', lastName: 'User', role: 'patient' } }
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n📡 Testing: ${endpoint.name}`);
      const response = await api({
        method: endpoint.method,
        url: endpoint.url,
        data: endpoint.data,
        headers: { 'Content-Type': 'application/json' }
      });
      console.log(`✅ ${endpoint.name}:`, response.status);
    } catch (error) {
      if (error.response) {
        console.log(`❌ ${endpoint.name}:`, error.response.status, error.response.data?.error || error.response.data);
      } else {
        console.log(`❌ ${endpoint.name}:`, error.message);
      }
    }
  }
}

async function testDirectServerConnection() {
  console.log('\n🔍 Testing direct server connection...');
  
  const directUrls = [
    'http://localhost:5000/api/auth/verify',
    'http://localhost:5000/health',
    'http://localhost:5000/api/auth/login'
  ];
  
  for (const url of directUrls) {
    try {
      console.log(`\n📡 Testing direct connection: ${url}`);
      const response = await axios.get(url, { timeout: 5000 });
      console.log(`✅ ${url}:`, response.status);
    } catch (error) {
      console.log(`❌ ${url}:`, error.message);
    }
  }
}

async function checkNginxConfiguration() {
  console.log('\n🔍 Checking nginx configuration...');
  
  const nginxTests = [
    { name: 'Main domain', url: 'https://www.therapease.site' },
    { name: 'API subdomain', url: 'https://api.therapease.site' },
    { name: 'API path on main domain', url: 'https://www.therapease.site/api' }
  ];
  
  for (const test of nginxTests) {
    try {
      console.log(`\n📡 Testing: ${test.name} (${test.url})`);
      const response = await axios.get(test.url, { 
        timeout: 5000,
        httpsAgent: new https.Agent({ rejectUnauthorized: false })
      });
      console.log(`✅ ${test.name}:`, response.status);
    } catch (error) {
      if (error.response) {
        console.log(`❌ ${test.name}:`, error.response.status, error.response.statusText);
      } else {
        console.log(`❌ ${test.name}:`, error.message);
      }
    }
  }
}

async function main() {
  console.log('🚀 Starting TherapEase Auth Verify Diagnostic\n');
  console.log('=' .repeat(50));
  
  // Test server health first
  const serverHealthy = await testServerHealth();
  
  if (!serverHealthy) {
    console.log('\n⚠️  Server appears to be down. Please check:');
    console.log('1. Is the Node.js server running on port 5000?');
    console.log('2. Is nginx running and properly configured?');
    console.log('3. Are there any firewall issues?');
    return;
  }
  
  // Test the auth verify endpoint
  await testAuthVerifyEndpoint();
  
  // Test other auth endpoints for comparison
  await testOtherAuthEndpoints();
  
  // Test direct server connection (if possible)
  await testDirectServerConnection();
  
  // Test nginx configuration
  await checkNginxConfiguration();
  
  console.log('\n' + '='.repeat(50));
  console.log('🏁 Diagnostic complete!');
  console.log('\n📋 Summary of findings:');
  console.log('1. Check if the server is running: pm2 status');
  console.log('2. Check nginx status: sudo systemctl status nginx');
  console.log('3. Check nginx configuration: sudo nginx -t');
  console.log('4. Check server logs: pm2 logs therapease');
  console.log('5. Check nginx logs: sudo tail -f /var/log/nginx/error.log');
}

// Run the diagnostic
main().catch(console.error);
