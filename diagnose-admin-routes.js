#!/usr/bin/env node

/**
 * Diagnostic script for admin routes 404 error
 * This script will help identify why admin routes are returning 404
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

// Test admin routes
async function testAdminRoutes() {
  console.log('🔍 Testing admin routes...');
  
  const adminEndpoints = [
    {
      name: 'GET /api/admin/system-settings',
      method: 'GET',
      url: '/admin/system-settings',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AdGhlcmFwZWFzZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NjEwNTQ0NjcsImV4cCI6MTc2MTE0MDg2N30.80wRmWo5d3dVoa6x0QuI5YOhlQjaJasYRgZ69BxCA-w'
      }
    },
    {
      name: 'GET /api/admin/dashboard',
      method: 'GET',
      url: '/admin/dashboard',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AdGhlcmFwZWFzZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NjEwNTQ0NjcsImV4cCI6MTc2MTE0MDg2N30.80wRmWo5d3dVoa6x0QuI5YOhlQjaJasYRgZ69BxCA-w'
      }
    },
    {
      name: 'GET /api/admin/users',
      method: 'GET',
      url: '/admin/users',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AdGhlcmFwZWFzZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NjEwNTQ0NjcsImV4cCI6MTc2MTE0MDg2N30.80wRmWo5d3dVoa6x0QuI5YOhlQjaJasYRgZ69BxCA-w'
      }
    }
  ];
  
  for (const endpoint of adminEndpoints) {
    try {
      console.log(`\n📡 Testing: ${endpoint.name}`);
      
      const response = await api({
        method: endpoint.method,
        url: endpoint.url,
        headers: {
          'Content-Type': 'application/json',
          ...endpoint.headers
        }
      });
      
      console.log(`✅ ${endpoint.name}:`, response.status, response.data?.success ? 'Success' : 'Failed');
      
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
  console.log('\n🔍 Testing direct server connection for admin routes...');
  
  const directUrls = [
    'http://localhost:5000/api/admin/system-settings',
    'http://localhost:5000/api/admin/dashboard',
    'http://localhost:5000/api/admin/users'
  ];
  
  for (const url of directUrls) {
    try {
      console.log(`\n📡 Testing direct connection: ${url}`);
      const response = await axios.get(url, { 
        timeout: 5000,
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AdGhlcmFwZWFzZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NjEwNTQ0NjcsImV4cCI6MTc2MTE0MDg2N30.80wRmWo5d3dVoa6x0QuI5YOhlQjaJasYRgZ69BxCA-w'
        }
      });
      console.log(`✅ ${url}:`, response.status);
    } catch (error) {
      if (error.response) {
        console.log(`❌ ${url}:`, error.response.status, error.response.data?.error || error.response.data);
      } else {
        console.log(`❌ ${url}:`, error.message);
      }
    }
  }
}

async function testRouteRegistration() {
  console.log('\n🔍 Testing route registration...');
  
  // Test if the server is responding to any admin routes
  const testRoutes = [
    '/api/admin',
    '/api/admin/',
    '/api/admin/system-settings',
    '/api/admin/dashboard'
  ];
  
  for (const route of testRoutes) {
    try {
      console.log(`\n📡 Testing route: ${route}`);
      const response = await axios.get(`${BASE_URL}${route}`, {
        timeout: 5000,
        httpsAgent: new https.Agent({ rejectUnauthorized: false })
      });
      console.log(`✅ ${route}:`, response.status);
    } catch (error) {
      if (error.response) {
        console.log(`❌ ${route}:`, error.response.status, error.response.statusText);
      } else {
        console.log(`❌ ${route}:`, error.message);
      }
    }
  }
}

async function main() {
  console.log('🚀 Starting TherapEase Admin Routes Diagnostic\n');
  console.log('=' .repeat(50));
  
  // Test admin routes
  await testAdminRoutes();
  
  // Test direct server connection
  await testDirectServerConnection();
  
  // Test route registration
  await testRouteRegistration();
  
  console.log('\n' + '='.repeat(50));
  console.log('🏁 Admin routes diagnostic complete!');
  console.log('\n📋 Summary of findings:');
  console.log('1. Check if admin routes are properly registered in server/index.js');
  console.log('2. Check if the server has been restarted after route changes');
  console.log('3. Check PM2 logs for any route registration errors');
  console.log('4. Verify the adminRoutes.js file is properly imported');
  console.log('5. Check if there are any middleware issues blocking admin routes');
  
  console.log('\n🔧 Manual fixes to try:');
  console.log('1. Restart PM2: pm2 restart therapease');
  console.log('2. Check server logs: pm2 logs therapease');
  console.log('3. Verify route registration in server/index.js');
  console.log('4. Test routes manually: curl -H "Authorization: Bearer TOKEN" http://localhost:5000/api/admin/system-settings');
}

// Run the diagnostic
main().catch(console.error);
