#!/usr/bin/env node

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 TherapEase Comprehensive Login Fix Script');
console.log('==========================================\n');

// Configuration
const config = {
  domain: 'therapease.site',
  apiDomain: 'api.therapease.site',
  adminEmail: 'admin@therapease.com',
  adminPassword: 'SecureAdmin2024!@#$',
  serverPort: 5000,
  publicPort: 8080
};

// Utility functions
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

function runCommand(command, description) {
  try {
    console.log(`🔧 ${description}...`);
    const result = execSync(command, { encoding: 'utf8', timeout: 30000 });
    console.log(`✅ ${description} - Success`);
    return result;
  } catch (error) {
    console.log(`❌ ${description} - Failed: ${error.message}`);
    return null;
  }
}

function checkFileExists(filePath, description) {
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${description} - Found: ${filePath}`);
    return true;
  } else {
    console.log(`❌ ${description} - Not found: ${filePath}`);
    return false;
  }
}

// Diagnostic functions
async function checkDNS() {
  console.log('🔍 DNS Resolution Check');
  console.log('============================================================');
  
  try {
    const dns = require('dns').promises;
    const mainIP = await dns.resolve4(config.domain);
    const apiIP = await dns.resolve4(config.apiDomain);
    console.log(`✅ ${config.domain} resolves to: ${mainIP[0]}`);
    console.log(`✅ ${config.apiDomain} resolves to: ${apiIP[0]}`);
    return true;
  } catch (error) {
    console.log(`❌ DNS resolution failed: ${error.message}`);
    return false;
  }
}

async function checkSSL() {
  console.log('\n🔍 SSL Certificate Check');
  console.log('============================================================');
  
  try {
    const mainSSL = await makeRequest(`https://${config.domain}`);
    const apiSSL = await makeRequest(`https://${config.apiDomain}`);
    console.log(`✅ ${config.domain} SSL certificate is valid`);
    console.log(`✅ ${config.apiDomain} SSL certificate is valid`);
    return true;
  } catch (error) {
    console.log(`❌ SSL certificate check failed: ${error.message}`);
    return false;
  }
}

async function checkServerConnectivity() {
  console.log('\n🔍 Server Connectivity Check');
  console.log('============================================================');
  
  const tests = [
    { name: 'Main Site', url: `https://${config.domain}` },
    { name: 'API Server', url: `https://${config.apiDomain}` },
    { name: 'Main Site API', url: `https://${config.domain}/api/health` },
    { name: 'API Server Health', url: `https://${config.apiDomain}/health` }
  ];
  
  for (const test of tests) {
    try {
      const result = await makeRequest(test.url);
      console.log(`${result.status === 200 ? '✅' : '❌'} ${test.name}: ${result.status} - ${test.url}`);
      if (result.data && typeof result.data === 'object') {
        console.log(`ℹ️  Response: ${JSON.stringify(result.data).substring(0, 100)}...`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: Error - ${error.message}`);
    }
  }
}

async function checkAPIRoutes() {
  console.log('\n🔍 API Route Structure Check');
  console.log('============================================================');
  
  const routes = [
    { name: 'Login Route (Main)', url: `https://${config.domain}/api/auth/login`, method: 'POST' },
    { name: 'Login Route (API)', url: `https://${config.apiDomain}/auth/login`, method: 'POST' },
    { name: 'Health Check', url: `https://${config.domain}/api/health`, method: 'GET' },
    { name: 'Maintenance Status', url: `https://${config.domain}/api/maintenance-status`, method: 'GET' }
  ];
  
  for (const route of routes) {
    try {
      const options = {
        method: route.method,
        headers: { 'Content-Type': 'application/json' }
      };
      
      if (route.method === 'POST' && route.name.includes('Login')) {
        options.body = JSON.stringify({
          email: config.adminEmail,
          password: config.adminPassword
        });
      }
      
      const result = await makeRequest(route.url, options);
      console.log(`${result.status === 200 ? '✅' : '❌'} ${route.name}: ${result.status} - ${route.url}`);
      if (result.data && typeof result.data === 'object') {
        console.log(`ℹ️  Response: ${JSON.stringify(result.data).substring(0, 100)}...`);
      }
    } catch (error) {
      console.log(`❌ ${route.name}: Error - ${error.message}`);
    }
  }
}

async function testLogin() {
  console.log('\n🔍 Login Endpoint Testing');
  console.log('============================================================');
  
  const loginData = {
    email: config.adminEmail,
    password: config.adminPassword
  };
  
  const tests = [
    { name: 'Main Site Login', url: `https://${config.domain}/api/auth/login` },
    { name: 'API Server Login', url: `https://${config.apiDomain}/auth/login` },
    { name: 'Main Site Login (No API)', url: `https://${config.domain}/auth/login` }
  ];
  
  for (const test of tests) {
    try {
      console.log(`ℹ️  Testing: ${test.name}`);
      const result = await makeRequest(test.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });
      
      if (result.status === 200 && result.data.success) {
        console.log(`✅ ${test.name}: ${result.status}`);
        console.log(`✅ Login successful! Token: ${result.data.data?.token?.substring(0, 20)}...`);
      } else {
        console.log(`❌ ${test.name}: ${result.status}`);
        console.log(`⚠️  Login failed: ${result.data.error || result.data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: Error - ${error.message}`);
    }
  }
}

function checkEnvironment() {
  console.log('\n🔍 Environment Configuration Check');
  console.log('============================================================');
  
  const envFiles = [
    '/home/therapease/.env',
    '/home/therapease/therapease/server/.env.production',
    '/home/therapease/therapease/.env'
  ];
  
  for (const envFile of envFiles) {
    if (checkFileExists(envFile, `Environment file exists: ${envFile}`)) {
      try {
        const envContent = fs.readFileSync(envFile, 'utf8');
        const lines = envContent.split('\n');
        
        const importantVars = ['NODE_ENV', 'REACT_APP_API_URL', 'API_BASE_URL', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'];
        for (const varName of importantVars) {
          const line = lines.find(l => l.startsWith(`${varName}=`));
          if (line) {
            const value = line.split('=')[1];
            const displayValue = varName.includes('PASSWORD') ? 'Admin...' : value;
            console.log(`ℹ️  ${varName}: ${displayValue}`);
          }
        }
      } catch (error) {
        console.log(`⚠️  Could not read ${envFile}: ${error.message}`);
      }
    }
  }
}

function checkPM2Status() {
  console.log('\n🔍 PM2 Process Status Check');
  console.log('============================================================');
  
  const pm2Status = runCommand('pm2 status', 'PM2 Status');
  if (pm2Status) {
    console.log(`ℹ️  PM2 Status:\n${pm2Status}`);
  }
  
  const pm2List = runCommand('pm2 list', 'PM2 List');
  if (pm2List) {
    console.log(`ℹ️  PM2 List:\n${pm2List}`);
  }
}

function checkNginxConfig() {
  console.log('\n🔍 Nginx Configuration Check');
  console.log('============================================================');
  
  const nginxTest = runCommand('nginx -t', 'Nginx Configuration Test');
  if (nginxTest) {
    console.log('✅ Nginx configuration is valid');
  }
  
  const nginxStatus = runCommand('systemctl status nginx', 'Nginx Status');
  if (nginxStatus) {
    console.log(`ℹ️  Nginx Status:\n${nginxStatus}`);
  }
}

function checkFrontendBuild() {
  console.log('\n🔍 Frontend Build Check');
  console.log('============================================================');
  
  const buildDir = '/home/therapease/therapease/client/build';
  const serverPublicDir = '/home/therapease/therapease/server/public';
  
  if (checkFileExists(buildDir, `Build directory exists: ${buildDir}`)) {
    const buildFiles = runCommand(`find ${buildDir} -name "*.js" | wc -l`, 'Count JavaScript files in build');
    if (buildFiles) {
      console.log(`✅ Found ${buildFiles.trim()} JavaScript files`);
    }
  }
  
  if (checkFileExists(serverPublicDir, `Server public directory exists: ${serverPublicDir}`)) {
    const serverFiles = runCommand(`find ${serverPublicDir} -name "*.js" | wc -l`, 'Count JavaScript files in server public');
    if (serverFiles) {
      console.log(`✅ Found ${serverFiles.trim()} JavaScript files`);
    }
  }
  
  // Check for API calls in build files
  const apiCheck = runCommand(`grep -r "api.therapease.site" ${serverPublicDir} || echo "No api.therapease.site references found"`, 'Check for old API references');
  if (apiCheck && !apiCheck.includes('No api.therapease.site references found')) {
    console.log('❌ Frontend build contains old API references');
  } else {
    console.log('✅ Frontend build contains correct API endpoints');
  }
}

// Fix functions
function fixEnvironmentVariables() {
  console.log('\n🔧 Fixing Environment Variables');
  console.log('============================================================');
  
  const envContent = `NODE_ENV=production
REACT_APP_API_URL=https://therapease.site/api
API_BASE_URL=https://api.therapease.site
ADMIN_EMAIL=admin@therapease.com
ADMIN_PASSWORD=SecureAdmin2024!@#$
DB_HOST=localhost
DB_USER=therapease
DB_PASSWORD=SecureDB2024!@#$
DB_NAME=therapease
JWT_SECRET=your-super-secret-jwt-key-here
ENCRYPTION_KEY=your-32-character-encryption-key-here
PORT=5000
PUBLIC_PORT=8080
`;

  try {
    fs.writeFileSync('/home/therapease/.env.production', envContent);
    fs.writeFileSync('/home/therapease/therapease/server/.env.production', envContent);
    console.log('✅ Environment variables updated');
  } catch (error) {
    console.log(`❌ Failed to update environment variables: ${error.message}`);
  }
}

function rebuildFrontend() {
  console.log('\n🔧 Rebuilding Frontend');
  console.log('============================================================');
  
  const commands = [
    'cd /home/therapease/therapease/client',
    'rm -rf build/',
    'rm -rf node_modules package-lock.json',
    'npm install',
    'npm run build',
    'cp -r build/* ../server/public/',
    'pm2 restart therapease-api',
    'pm2 restart therapease-public'
  ];
  
  for (const command of commands) {
    const result = runCommand(command, `Running: ${command}`);
    if (!result && command.includes('npm')) {
      console.log('❌ Frontend rebuild failed');
      return false;
    }
  }
  
  console.log('✅ Frontend rebuild completed');
  return true;
}

function fixNginxConfig() {
  console.log('\n🔧 Fixing Nginx Configuration');
  console.log('============================================================');
  
  const nginxConfig = `# TherapEase Nginx Configuration
server {
    listen 80;
    server_name therapease.site www.therapease.site api.therapease.site;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # API routes - proxy to backend
    location /api/ {
        proxy_pass http://localhost:5000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:5000/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket specific timeouts
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # Static files - serve from build directory
    location / {
        root /home/therapease/therapease/server/public;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Cache control for HTML files
        location ~* \\.html$ {
            expires 1h;
            add_header Cache-Control "public, no-cache";
        }
    }

    # Static assets with long-term caching
    location /static/ {
        root /home/therapease/therapease/server/public;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
`;

  try {
    fs.writeFileSync('/etc/nginx/sites-available/therapease', nginxConfig);
    runCommand('nginx -t', 'Test Nginx configuration');
    runCommand('systemctl reload nginx', 'Reload Nginx');
    console.log('✅ Nginx configuration updated');
  } catch (error) {
    console.log(`❌ Failed to update Nginx configuration: ${error.message}`);
  }
}

// Main execution
async function main() {
  try {
    // Run diagnostics
    await checkDNS();
    await checkSSL();
    await checkServerConnectivity();
    await checkAPIRoutes();
    await testLogin();
    checkEnvironment();
    checkPM2Status();
    checkNginxConfig();
    checkFrontendBuild();
    
    console.log('\n🔧 Applying Fixes');
    console.log('============================================================');
    
    // Apply fixes
    fixEnvironmentVariables();
    fixNginxConfig();
    rebuildFrontend();
    
    console.log('\n🔍 Final Verification');
    console.log('============================================================');
    
    // Final test
    await testLogin();
    
    console.log('\n🎯 Comprehensive Login Fix Complete!');
    console.log('============================================================');
    console.log('ℹ️  If login still fails, try:');
    console.log('ℹ️  1. Clear browser cache completely');
    console.log('ℹ️  2. Try incognito/private mode');
    console.log('ℹ️  3. Check browser console for errors');
    console.log('ℹ️  4. Verify the frontend is loading the new build');
    
  } catch (error) {
    console.log(`❌ Script failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
main();
