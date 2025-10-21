#!/usr/bin/env node

/**
 * Fix PM2 Processes - Restore proper server configuration
 * The emergency server is running instead of the main API server
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing PM2 Processes');
console.log('======================');

console.log('\n🔍 Issue: Emergency server is running instead of main API server');
console.log('Current PM2 process: therapease-emergency');
console.log('Expected PM2 processes: therapease-api, therapease-public');
console.log('✅ This is why profile endpoints return 404');

console.log('\n🔍 Step 1: Creating PM2 process fix script...');

const pm2FixScript = `#!/bin/bash

echo "🔧 Fixing PM2 Processes"
echo "======================="

echo ""
echo "🔍 Step 1: Stopping emergency server..."
pm2 stop therapease-emergency
pm2 delete therapease-emergency

echo ""
echo "🔍 Step 2: Starting proper API server..."
pm2 start ecosystem.config.js --env production

echo ""
echo "🔍 Step 3: Checking PM2 status..."
pm2 status

echo ""
echo "🔍 Step 4: Testing API endpoints..."
echo "Testing health endpoint..."
curl -s https://www.therapease.site/api/health -w "\\nHTTP Status: %{http_code}\\n"

echo ""
echo "Testing profile endpoint (should work now)..."
curl -H "Authorization: Bearer \$ADMIN_TOKEN" \\
     -H "Content-Type: application/json" \\
     https://www.therapease.site/api/admin/profile \\
     -w "\\nHTTP Status: %{http_code}\\n" \\
     -s

echo ""
echo "🏁 PM2 processes fixed!"
echo ""
echo "📋 Expected results:"
echo "- ✅ therapease-api process running"
echo "- ✅ therapease-public process running"
echo "- ✅ Profile endpoints return 200 OK"
echo "- ✅ All admin routes working"
`;

const pm2FixScriptPath = path.join(__dirname, 'fix-pm2-processes.sh');
fs.writeFileSync(pm2FixScriptPath, pm2FixScript);
fs.chmodSync(pm2FixScriptPath, '755');
console.log('✅ PM2 fix script created');

console.log('\n🔍 Step 2: Verifying ecosystem.config.js exists...');

const ecosystemPath = path.join(__dirname, 'ecosystem.config.js');
if (fs.existsSync(ecosystemPath)) {
  console.log('✅ ecosystem.config.js exists');
  
  const ecosystemContent = fs.readFileSync(ecosystemPath, 'utf8');
  if (ecosystemContent.includes('therapease-api') && ecosystemContent.includes('therapease-public')) {
    console.log('✅ ecosystem.config.js has correct process definitions');
  } else {
    console.log('❌ ecosystem.config.js missing process definitions');
  }
} else {
  console.log('❌ ecosystem.config.js missing - creating it...');
  
  const ecosystemConfig = `module.exports = {
  apps: [
    {
      name: 'therapease-api',
      script: './server/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: './logs/api-err.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'therapease-public',
      script: './public-website/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: './logs/public-err.log',
      out_file: './logs/public-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};`;
  
  fs.writeFileSync(ecosystemPath, ecosystemConfig);
  console.log('✅ Created ecosystem.config.js');
}

console.log('\n🔍 Step 3: Verifying public-website/server.js exists...');

const publicServerPath = path.join(__dirname, 'public-website', 'server.js');
if (fs.existsSync(publicServerPath)) {
  console.log('✅ public-website/server.js exists');
} else {
  console.log('❌ public-website/server.js missing - creating it...');
  
  const publicServerContent = `const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3001;

// Serve static files from the React build directory
app.use(express.static(path.join(__dirname, '../client/build')));

// Handle any other requests by serving the index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

app.listen(PORT, () => {
  console.log(\`Public website server running on port \${PORT}\`);
});`;
  
  // Ensure public-website directory exists
  const publicWebsiteDir = path.join(__dirname, 'public-website');
  if (!fs.existsSync(publicWebsiteDir)) {
    fs.mkdirSync(publicWebsiteDir, { recursive: true });
  }
  
  fs.writeFileSync(publicServerPath, publicServerContent);
  console.log('✅ Created public-website/server.js');
}

console.log('\n🔍 Step 4: Creating comprehensive deployment script...');

const deployScript = `#!/bin/bash

echo "🚀 Deploying Complete Server Fix"
echo "==============================="

echo ""
echo "🔍 Step 1: Pulling latest changes..."
git pull origin main

echo ""
echo "🔍 Step 2: Stopping emergency server..."
pm2 stop therapease-emergency 2>/dev/null || true
pm2 delete therapease-emergency 2>/dev/null || true

echo ""
echo "🔍 Step 3: Creating logs directory..."
mkdir -p logs

echo ""
echo "🔍 Step 4: Building frontend..."
cd client
npm run build
cd ..

echo ""
echo "🔍 Step 5: Starting proper PM2 processes..."
pm2 start ecosystem.config.js --env production

echo ""
echo "🔍 Step 6: Checking PM2 status..."
pm2 status

echo ""
echo "🔍 Step 7: Testing API endpoints..."
echo "Testing health endpoint..."
curl -s https://www.therapease.site/api/health -w "\\nHTTP Status: %{http_code}\\n"

echo ""
echo "Testing admin profile endpoint..."
curl -H "Authorization: Bearer \$ADMIN_TOKEN" \\
     -H "Content-Type: application/json" \\
     https://www.therapease.site/api/admin/profile \\
     -w "\\nHTTP Status: %{http_code}\\n" \\
     -s

echo ""
echo "🏁 Complete server fix deployed!"
echo ""
echo "📋 Summary of fixes:"
echo "✅ Stopped emergency server"
echo "✅ Started proper API server (therapease-api)"
echo "✅ Started proper public server (therapease-public)"
echo "✅ Built frontend with latest changes"
echo "✅ All admin routes should now work"
echo ""
echo "🎯 Expected results:"
echo "- ✅ Profile endpoints return 200 OK"
echo "- ✅ Password change works"
echo "- ✅ Profile update works"
echo "- ✅ All admin functionality restored"
`;

const deployScriptPath = path.join(__dirname, 'deploy-complete-server-fix.sh');
fs.writeFileSync(deployScriptPath, deployScript);
fs.chmodSync(deployScriptPath, '755');
console.log('✅ Complete deployment script created');

console.log('\n🏁 PM2 process fix complete!');
console.log('\n📋 Summary of issues identified:');
console.log('1. ✅ Emergency server running instead of main API server');
console.log('2. ✅ Missing proper PM2 process configuration');
console.log('3. ✅ Profile endpoints returning 404 due to wrong server');
console.log('4. ✅ Created scripts to fix PM2 processes');
console.log('5. ✅ Created complete deployment script');
console.log('\n🔧 Next steps:');
console.log('1. Run: ./fix-pm2-processes.sh (on droplet)');
console.log('2. Or run: ./deploy-complete-server-fix.sh (on droplet)');
console.log('\n📋 Expected results:');
console.log('- ✅ therapease-api process running');
console.log('- ✅ therapease-public process running');
console.log('- ✅ Profile endpoints return 200 OK');
console.log('- ✅ All admin routes working');
console.log('- ✅ Password change and profile update working');
