#!/usr/bin/env node

/**
 * TherapEase 500 Error Diagnostic Script
 * This script helps diagnose the root cause of 500 Internal Server Errors
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE_URL = process.env.API_URL || 'https://therapease.site';
const TEST_ENDPOINTS = [
  '/api/health',
  '/api/test-db',
  '/api/auth/test',
  '/api/maintenance-status',
  '/api/admin/dashboard',
  '/api/admin/users',
  '/api/admin/patients',
  '/api/admin/therapists',
  '/api/admin/notifications'
];

// Test credentials
const TEST_CREDENTIALS = {
  email: 'admin@therapease.com',
  password: 'SecureAdmin2024!@#$'
};

class ErrorDiagnostic {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      apiBaseUrl: API_BASE_URL,
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        errors: []
      }
    };
  }

  async runDiagnostic() {
    console.log('🔍 Starting TherapEase 500 Error Diagnostic...\n');
    
    // Test 1: Basic connectivity
    await this.testBasicConnectivity();
    
    // Test 2: Authentication
    const token = await this.testAuthentication();
    
    // Test 3: Protected endpoints
    if (token) {
      await this.testProtectedEndpoints(token);
    }
    
    // Test 4: Database connectivity
    await this.testDatabaseConnectivity();
    
    // Test 5: Error analysis
    await this.analyzeErrors();
    
    // Generate report
    this.generateReport();
  }

  async testBasicConnectivity() {
    console.log('📡 Testing basic connectivity...');
    
    for (const endpoint of ['/api/health', '/api/test-db', '/api/auth/test']) {
      try {
        const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
          timeout: 10000,
          validateStatus: () => true // Don't throw on any status
        });
        
        this.recordTest(endpoint, response.status, response.data, null);
        
        if (response.status === 200) {
          console.log(`  ✅ ${endpoint}: ${response.status} - ${response.data.message || 'OK'}`);
        } else {
          console.log(`  ❌ ${endpoint}: ${response.status} - ${response.data.error || response.data.message || 'Error'}`);
        }
      } catch (error) {
        this.recordTest(endpoint, 0, null, error.message);
        console.log(`  ❌ ${endpoint}: Connection failed - ${error.message}`);
      }
    }
  }

  async testAuthentication() {
    console.log('\n🔐 Testing authentication...');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, TEST_CREDENTIALS, {
        timeout: 10000,
        validateStatus: () => true
      });
      
      this.recordTest('/api/auth/login', response.status, response.data, null);
      
      if (response.status === 200 && response.data.success) {
        console.log(`  ✅ Login successful: ${response.data.data.user.email}`);
        return response.data.data.token;
      } else {
        console.log(`  ❌ Login failed: ${response.data.error || response.data.message || 'Unknown error'}`);
        return null;
      }
    } catch (error) {
      this.recordTest('/api/auth/login', 0, null, error.message);
      console.log(`  ❌ Login error: ${error.message}`);
      return null;
    }
  }

  async testProtectedEndpoints(token) {
    console.log('\n🔒 Testing protected endpoints...');
    
    const headers = { Authorization: `Bearer ${token}` };
    
    for (const endpoint of ['/api/admin/dashboard', '/api/admin/users', '/api/admin/patients', '/api/admin/therapists', '/api/admin/notifications']) {
      try {
        const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
          headers,
          timeout: 10000,
          validateStatus: () => true
        });
        
        this.recordTest(endpoint, response.status, response.data, null);
        
        if (response.status === 200) {
          console.log(`  ✅ ${endpoint}: ${response.status} - OK`);
        } else {
          console.log(`  ❌ ${endpoint}: ${response.status} - ${response.data.error || response.data.message || 'Error'}`);
        }
      } catch (error) {
        this.recordTest(endpoint, 0, null, error.message);
        console.log(`  ❌ ${endpoint}: ${error.message}`);
      }
    }
  }

  async testDatabaseConnectivity() {
    console.log('\n🗄️ Testing database connectivity...');
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/test-db`, {
        timeout: 10000,
        validateStatus: () => true
      });
      
      this.recordTest('/api/test-db', response.status, response.data, null);
      
      if (response.status === 200) {
        console.log(`  ✅ Database connection: ${response.data.message}`);
      } else {
        console.log(`  ❌ Database error: ${response.data.error || response.data.message || 'Unknown error'}`);
      }
    } catch (error) {
      this.recordTest('/api/test-db', 0, null, error.message);
      console.log(`  ❌ Database test failed: ${error.message}`);
    }
  }

  async analyzeErrors() {
    console.log('\n🔍 Analyzing error patterns...');
    
    const failedTests = this.results.tests.filter(test => test.status !== 200);
    
    if (failedTests.length === 0) {
      console.log('  ✅ No errors found in API tests');
      return;
    }

    // Group errors by type
    const errorGroups = {};
    
    failedTests.forEach(test => {
      const errorType = this.categorizeError(test);
      if (!errorGroups[errorType]) {
        errorGroups[errorType] = [];
      }
      errorGroups[errorType].push(test);
    });

    // Analyze each error type
    Object.entries(errorGroups).forEach(([errorType, tests]) => {
      console.log(`\n  📊 ${errorType} (${tests.length} occurrences):`);
      
      tests.forEach(test => {
        console.log(`    - ${test.endpoint}: ${test.status} - ${test.error || test.data?.error || 'Unknown'}`);
      });
      
      // Provide specific recommendations
      this.provideRecommendations(errorType, tests);
    });
  }

  categorizeError(test) {
    if (test.status === 0) {
      return 'Connection Error';
    } else if (test.status === 404) {
      return 'Route Not Found';
    } else if (test.status === 401) {
      return 'Authentication Error';
    } else if (test.status === 403) {
      return 'Authorization Error';
    } else if (test.status === 500) {
      return 'Internal Server Error';
    } else if (test.status >= 400) {
      return 'Client Error';
    } else {
      return 'Unknown Error';
    }
  }

  provideRecommendations(errorType, tests) {
    switch (errorType) {
      case 'Connection Error':
        console.log('    💡 Check if the API server is running and accessible');
        console.log('    💡 Verify network connectivity and firewall settings');
        break;
        
      case 'Route Not Found':
        console.log('    💡 Verify the API route exists in the backend');
        console.log('    💡 Check if the frontend is calling the correct endpoint');
        break;
        
      case 'Authentication Error':
        console.log('    💡 Check if the login credentials are correct');
        console.log('    💡 Verify the JWT token is valid and not expired');
        break;
        
      case 'Internal Server Error':
        console.log('    💡 Check server logs for detailed error information');
        console.log('    💡 Verify database connection and query syntax');
        console.log('    💡 Check for missing environment variables');
        break;
        
      case 'Authorization Error':
        console.log('    💡 Check if the user has the required permissions');
        console.log('    💡 Verify the role-based access control is working');
        break;
    }
  }

  recordTest(endpoint, status, data, error) {
    const test = {
      endpoint,
      status,
      data,
      error,
      timestamp: new Date().toISOString()
    };
    
    this.results.tests.push(test);
    this.results.summary.total++;
    
    if (status === 200) {
      this.results.summary.passed++;
    } else {
      this.results.summary.failed++;
      if (error) {
        this.results.summary.errors.push(error);
      }
    }
  }

  generateReport() {
    console.log('\n📋 Diagnostic Report Summary:');
    console.log(`  Total Tests: ${this.results.summary.total}`);
    console.log(`  Passed: ${this.results.summary.passed}`);
    console.log(`  Failed: ${this.results.summary.failed}`);
    
    if (this.results.summary.errors.length > 0) {
      console.log(`  Unique Errors: ${[...new Set(this.results.summary.errors)].length}`);
    }
    
    // Save detailed report
    const reportPath = path.join(__dirname, 'diagnostic-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
    // Generate recommendations
    this.generateRecommendations();
  }

  generateRecommendations() {
    console.log('\n🎯 Recommended Actions:');
    
    const failedTests = this.results.tests.filter(test => test.status !== 200);
    
    if (failedTests.length === 0) {
      console.log('  ✅ All tests passed! No issues found.');
      return;
    }

    // Check for common patterns
    const hasConnectionErrors = failedTests.some(test => test.status === 0);
    const has500Errors = failedTests.some(test => test.status === 500);
    const has404Errors = failedTests.some(test => test.status === 404);
    
    if (hasConnectionErrors) {
      console.log('  1. 🔧 Fix connection issues:');
      console.log('     - Check if PM2 processes are running: pm2 status');
      console.log('     - Check server logs: pm2 logs therapease-api');
      console.log('     - Restart API server: pm2 restart therapease-api');
    }
    
    if (has500Errors) {
      console.log('  2. 🔧 Fix 500 Internal Server Errors:');
      console.log('     - Check database connection and queries');
      console.log('     - Verify all required environment variables are set');
      console.log('     - Check for missing database columns or tables');
      console.log('     - Review server logs for specific error details');
    }
    
    if (has404Errors) {
      console.log('  3. 🔧 Fix 404 Route Not Found:');
      console.log('     - Verify API routes are properly registered');
      console.log('     - Check if frontend is calling correct endpoints');
      console.log('     - Ensure Nginx is properly proxying requests');
    }
    
    console.log('\n📚 Next Steps:');
    console.log('  1. Run the diagnostic script on the Droplet');
    console.log('  2. Check PM2 logs for detailed error information');
    console.log('  3. Verify database schema and data integrity');
    console.log('  4. Test individual endpoints manually with curl');
  }
}

// Run the diagnostic
if (require.main === module) {
  const diagnostic = new ErrorDiagnostic();
  diagnostic.runDiagnostic().catch(console.error);
}

module.exports = ErrorDiagnostic;
