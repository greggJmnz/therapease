#!/usr/bin/env node

/**
 * TherapEase Login Issue Diagnostic Script
 * 
 * This script performs comprehensive diagnostics to identify login failures
 * by checking all components of the authentication system.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  domains: {
    main: 'therapease.site',
    api: 'api.therapease.site'
  },
  endpoints: {
    login: '/api/auth/login',
    health: '/api/health',
    maintenance: '/api/maintenance-status'
  },
  testCredentials: {
    email: 'admin@therapease.com',
    password: 'SecureAdmin2024!@#$'
  }
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`🔍 ${title}`, 'bright');
  log(`${'='.repeat(60)}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TherapEase-Diagnostic-Script/1.0',
        ...options.headers
      },
      timeout: 10000
    };

    const req = client.request(url, requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData,
            rawData: data
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
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

// 1. Check DNS Resolution
async function checkDNSResolution() {
  logSection('DNS Resolution Check');
  
  const domains = [CONFIG.domains.main, CONFIG.domains.api];
  
  for (const domain of domains) {
    try {
      const { lookup } = require('dns').promises;
      const addresses = await lookup(domain);
      logSuccess(`${domain} resolves to: ${addresses.address}`);
    } catch (error) {
      logError(`${domain} DNS resolution failed: ${error.message}`);
    }
  }
}

// 2. Check SSL Certificates
async function checkSSLCertificates() {
  logSection('SSL Certificate Check');
  
  const domains = [CONFIG.domains.main, CONFIG.domains.api];
  
  for (const domain of domains) {
    try {
      const url = `https://${domain}`;
      const response = await makeRequest(url);
      
      if (response.status === 200 || response.status === 301 || response.status === 302) {
        logSuccess(`${domain} SSL certificate is valid`);
      } else {
        logWarning(`${domain} SSL certificate issue (Status: ${response.status})`);
      }
    } catch (error) {
      logError(`${domain} SSL certificate check failed: ${error.message}`);
    }
  }
}

// 3. Check Server Connectivity
async function checkServerConnectivity() {
  logSection('Server Connectivity Check');
  
  const endpoints = [
    { name: 'Main Site', url: `https://${CONFIG.domains.main}` },
    { name: 'API Server', url: `https://${CONFIG.domains.api}` },
    { name: 'Main Site API', url: `https://${CONFIG.domains.main}/api/health` },
    { name: 'API Server Health', url: `https://${CONFIG.domains.api}/health` }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(endpoint.url);
      logSuccess(`${endpoint.name}: ${response.status} - ${endpoint.url}`);
      
      if (response.data) {
        logInfo(`Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
      }
    } catch (error) {
      logError(`${endpoint.name}: ${error.message} - ${endpoint.url}`);
    }
  }
}

// 4. Check API Route Structure
async function checkAPIRoutes() {
  logSection('API Route Structure Check');
  
  const routes = [
    { name: 'Login Route (Main)', url: `https://${CONFIG.domains.main}${CONFIG.endpoints.login}` },
    { name: 'Login Route (API)', url: `https://${CONFIG.domains.api}/auth/login` },
    { name: 'Health Check', url: `https://${CONFIG.domains.main}/api/health` },
    { name: 'Maintenance Status', url: `https://${CONFIG.domains.main}/api/maintenance-status` }
  ];
  
  for (const route of routes) {
    try {
      const response = await makeRequest(route.url, { method: 'POST', body: CONFIG.testCredentials });
      logSuccess(`${route.name}: ${response.status} - ${route.url}`);
      
      if (response.data) {
        logInfo(`Response: ${JSON.stringify(response.data).substring(0, 200)}...`);
      }
    } catch (error) {
      logError(`${route.name}: ${error.message} - ${route.url}`);
    }
  }
}

// 5. Test Login Endpoints
async function testLoginEndpoints() {
  logSection('Login Endpoint Testing');
  
  const loginEndpoints = [
    { name: 'Main Site Login', url: `https://${CONFIG.domains.main}/api/auth/login` },
    { name: 'API Server Login', url: `https://${CONFIG.domains.api}/auth/login` },
    { name: 'Main Site Login (No API)', url: `https://${CONFIG.domains.main}/auth/login` }
  ];
  
  for (const endpoint of loginEndpoints) {
    try {
      logInfo(`Testing: ${endpoint.name}`);
      const response = await makeRequest(endpoint.url, {
        method: 'POST',
        body: CONFIG.testCredentials
      });
      
      logSuccess(`${endpoint.name}: ${response.status}`);
      
      if (response.data) {
        if (response.data.success) {
          logSuccess(`Login successful! Token: ${response.data.data?.token?.substring(0, 20)}...`);
        } else {
          logWarning(`Login failed: ${response.data.message || response.data.error}`);
        }
      } else {
        logWarning(`No response data received`);
      }
    } catch (error) {
      logError(`${endpoint.name}: ${error.message}`);
    }
  }
}

// 6. Check Environment Configuration
function checkEnvironmentConfiguration() {
  logSection('Environment Configuration Check');
  
  const envFiles = [
    '/home/therapease/.env',
    '/home/therapease/therapease/server/.env.production',
    '/home/therapease/therapease/.env'
  ];
  
  for (const envFile of envFiles) {
    try {
      if (fs.existsSync(envFile)) {
        logSuccess(`Environment file exists: ${envFile}`);
        
        const content = fs.readFileSync(envFile, 'utf8');
        const lines = content.split('\n');
        
        // Check for key environment variables
        const keyVars = ['NODE_ENV', 'REACT_APP_API_URL', 'API_BASE_URL', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'];
        
        for (const varName of keyVars) {
          const line = lines.find(l => l.startsWith(`${varName}=`));
          if (line) {
            const value = line.split('=')[1];
            if (varName === 'ADMIN_PASSWORD') {
              logInfo(`${varName}: ${value.substring(0, 5)}...`);
            } else {
              logInfo(`${varName}: ${value}`);
            }
          } else {
            logWarning(`${varName} not found in ${envFile}`);
          }
        }
      } else {
        logWarning(`Environment file not found: ${envFile}`);
      }
    } catch (error) {
      logError(`Error reading ${envFile}: ${error.message}`);
    }
  }
}

// 7. Check PM2 Process Status
function checkPM2Status() {
  logSection('PM2 Process Status Check');
  
  try {
    const { execSync } = require('child_process');
    const pm2Status = execSync('pm2 status', { encoding: 'utf8' });
    logInfo('PM2 Status:');
    console.log(pm2Status);
    
    // Check if processes are running
    if (pm2Status.includes('online')) {
      logSuccess('PM2 processes are running');
    } else {
      logError('PM2 processes are not running properly');
    }
  } catch (error) {
    logError(`PM2 status check failed: ${error.message}`);
  }
}

// 8. Check Nginx Configuration
function checkNginxConfiguration() {
  logSection('Nginx Configuration Check');
  
  try {
    const { execSync } = require('child_process');
    
    // Check if nginx is running
    const nginxStatus = execSync('systemctl is-active nginx', { encoding: 'utf8' }).trim();
    if (nginxStatus === 'active') {
      logSuccess('Nginx is running');
    } else {
      logError(`Nginx is not running: ${nginxStatus}`);
    }
    
    // Check nginx configuration
    const nginxTest = execSync('nginx -t', { encoding: 'utf8' });
    logSuccess('Nginx configuration is valid');
    
  } catch (error) {
    logError(`Nginx check failed: ${error.message}`);
  }
}

// 9. Check Frontend Build
function checkFrontendBuild() {
  logSection('Frontend Build Check');
  
  const buildPaths = [
    '/home/therapease/therapease/client/build',
    '/home/therapease/therapease/server/public'
  ];
  
  for (const buildPath of buildPaths) {
    try {
      if (fs.existsSync(buildPath)) {
        logSuccess(`Build directory exists: ${buildPath}`);
        
        // Check for main JS file
        const jsFiles = fs.readdirSync(buildPath, { recursive: true })
          .filter(file => file.toString().endsWith('.js'));
        
        if (jsFiles.length > 0) {
          logSuccess(`Found ${jsFiles.length} JavaScript files`);
          
          // Check if the main JS file contains the correct API calls
          const mainJsFile = jsFiles.find(file => file.toString().includes('main.'));
          if (mainJsFile) {
            const fullPath = path.join(buildPath, mainJsFile.toString());
            const content = fs.readFileSync(fullPath, 'utf8');
            
            if (content.includes('/auth/login')) {
              logSuccess('Frontend build contains correct API endpoints');
            } else {
              logWarning('Frontend build may not contain correct API endpoints');
            }
          }
        } else {
          logWarning('No JavaScript files found in build');
        }
      } else {
        logError(`Build directory not found: ${buildPath}`);
      }
    } catch (error) {
      logError(`Error checking build directory ${buildPath}: ${error.message}`);
    }
  }
}

// 10. Generate Summary Report
function generateSummaryReport() {
  logSection('Summary Report');
  
  logInfo('🔍 Login Issue Diagnostic Complete');
  logInfo('');
  logInfo('Common Issues and Solutions:');
  logInfo('');
  logInfo('1. Double /api prefix: Check if frontend is calling /api/api/auth/login');
  logInfo('2. Wrong domain: Check if frontend is calling api.therapease.site instead of therapease.site');
  logInfo('3. Environment variables: Ensure REACT_APP_API_URL is set correctly');
  logInfo('4. Build issues: Rebuild frontend with correct environment variables');
  logInfo('5. Nginx proxy: Check if nginx is properly forwarding requests');
  logInfo('6. PM2 processes: Ensure all services are running');
  logInfo('');
  logInfo('Next Steps:');
  logInfo('1. Fix any issues identified above');
  logInfo('2. Rebuild frontend: cd client && npm run build');
  logInfo('3. Copy build: cp -r build/* ../server/public/');
  logInfo('4. Restart services: pm2 restart all');
  logInfo('5. Test login again');
}

// Main execution
async function runDiagnostics() {
  log('🚀 TherapEase Login Issue Diagnostic Script', 'bright');
  log('==========================================', 'cyan');
  
  try {
    await checkDNSResolution();
    await checkSSLCertificates();
    await checkServerConnectivity();
    await checkAPIRoutes();
    await testLoginEndpoints();
    checkEnvironmentConfiguration();
    checkPM2Status();
    checkNginxConfiguration();
    checkFrontendBuild();
    generateSummaryReport();
    
    log('\n🎯 Diagnostic complete!', 'green');
  } catch (error) {
    logError(`Diagnostic failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the diagnostics
if (require.main === module) {
  runDiagnostics();
}

module.exports = {
  runDiagnostics,
  checkDNSResolution,
  checkSSLCertificates,
  checkServerConnectivity,
  checkAPIRoutes,
  testLoginEndpoints,
  checkEnvironmentConfiguration,
  checkPM2Status,
  checkNginxConfiguration,
  checkFrontendBuild,
  generateSummaryReport
};
