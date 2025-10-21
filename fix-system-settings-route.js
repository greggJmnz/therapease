#!/usr/bin/env node

/**
 * Quick fix script for system-settings route 404 error
 * This script will test and fix the system-settings route specifically
 */

const axios = require('axios');
const https = require('https');

// Configuration
const BASE_URL = 'https://www.therapease.site';
const API_BASE = `${BASE_URL}/api`;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
});

async function testSystemSettingsRoute() {
  console.log('🔍 Testing system-settings route specifically...');
  
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AdGhlcmFwZWFzZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NjEwNTQ0NjcsImV4cCI6MTc2MTE0MDg2N30.80wRmWo5d3dVoa6x0QuI5YOhlQjaJasYRgZ69BxCA-w';
  
  try {
    console.log('📡 Testing GET /api/admin/system-settings...');
    
    const response = await api.get('/admin/system-settings', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ System-settings route is working!');
    console.log('Status:', response.status);
    console.log('Response:', response.data);
    
  } catch (error) {
    if (error.response) {
      console.log('❌ System-settings route error:');
      console.log('Status:', error.response.status);
      console.log('Error:', error.response.data);
      
      if (error.response.status === 404) {
        console.log('\n🔧 Route not found. Possible causes:');
        console.log('1. Server not restarted after route changes');
        console.log('2. systemSettingsController not properly imported');
        console.log('3. Route registration issue in adminRoutes.js');
        console.log('4. Module loading error');
      }
    } else {
      console.log('❌ Network error:', error.message);
    }
  }
}

async function testAlternativeRoutes() {
  console.log('\n🔍 Testing alternative routes...');
  
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AdGhlcmFwZWFzZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NjEwNTQ0NjcsImV4cCI6MTc2MTE0MDg2N30.80wRmWo5d3dVoa6x0QuI5YOhlQjaJasYRgZ69BxCA-w';
  
  const alternativeRoutes = [
    '/admin/system-settings/',
    '/admin/settings',
    '/admin/settings/',
    '/admin/system-settings?test=1'
  ];
  
  for (const route of alternativeRoutes) {
    try {
      console.log(`\n📡 Testing: ${route}`);
      const response = await api.get(route, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log(`✅ ${route}: ${response.status}`);
    } catch (error) {
      if (error.response) {
        console.log(`❌ ${route}: ${error.response.status} - ${error.response.data?.error || error.response.data}`);
      } else {
        console.log(`❌ ${route}: ${error.message}`);
      }
    }
  }
}

async function main() {
  console.log('🚀 TherapEase System-Settings Route Fix\n');
  console.log('=' .repeat(50));
  
  await testSystemSettingsRoute();
  await testAlternativeRoutes();
  
  console.log('\n' + '='.repeat(50));
  console.log('🏁 System-settings route test complete!');
  console.log('\n📋 If the route is still 404, try these fixes:');
  console.log('1. Restart PM2: pm2 restart therapease');
  console.log('2. Check server logs: pm2 logs therapease');
  console.log('3. Verify systemSettingsController exists: ls -la server/controllers/systemSettingsController.js');
  console.log('4. Check route registration: grep -n "system-settings" server/routes/adminRoutes.js');
  console.log('5. Test with curl: curl -H "Authorization: Bearer TOKEN" http://localhost:5000/api/admin/system-settings');
}

main().catch(console.error);
