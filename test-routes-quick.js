#!/usr/bin/env node

const axios = require('axios');

async function testRoutes() {
  console.log('🧪 Testing critical routes...');
  
  const baseURL = 'http://localhost:5000';
  
  const routes = [
    { name: 'Health Check', url: '/health', method: 'GET' },
    { name: 'Maintenance Status', url: '/api/maintenance-status', method: 'GET' },
    { name: 'Auth Login', url: '/api/auth/login', method: 'POST', data: { email: 'admin@therapease.com', password: 'SecureAdmin2024!@#$' } },
    { name: 'Auth Verify', url: '/api/auth/verify', method: 'GET' }
  ];
  
  for (const route of routes) {
    try {
      console.log(`\n📡 Testing: ${route.name}`);
      
      const config = {
        method: route.method,
        url: `${baseURL}${route.url}`,
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      };
      
      if (route.data) {
        config.data = route.data;
      }
      
      const response = await axios(config);
      console.log(`✅ ${route.name}: ${response.status} - ${JSON.stringify(response.data).substring(0, 100)}...`);
      
    } catch (error) {
      if (error.response) {
        console.log(`❌ ${route.name}: ${error.response.status} - ${error.response.data?.error || error.response.data}`);
      } else {
        console.log(`❌ ${route.name}: ${error.message}`);
      }
    }
  }
}

testRoutes().catch(console.error);
