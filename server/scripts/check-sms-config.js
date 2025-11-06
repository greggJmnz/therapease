#!/usr/bin/env node

/**
 * SMS Configuration Diagnostic Script
 * Checks SMS service configuration and tests connectivity
 */

const path = require('path');
const fs = require('fs');

// Load environment variables
const envFile = path.join(__dirname, '../.env.production');
if (fs.existsSync(envFile)) {
  require('dotenv').config({ path: envFile });
  console.log(`✅ Loaded environment from: ${envFile}`);
} else {
  console.log(`⚠️  .env.production not found at: ${envFile}`);
  console.log(`   Trying alternative locations...`);
  
  // Try alternative locations
  const altPaths = [
    path.join(__dirname, '../../.env.production'),
    path.join(__dirname, '../.env'),
    path.join(__dirname, '../../.env')
  ];
  
  let loaded = false;
  for (const altPath of altPaths) {
    if (fs.existsSync(altPath)) {
      require('dotenv').config({ path: altPath });
      console.log(`✅ Loaded environment from: ${altPath}`);
      loaded = true;
      break;
    }
  }
  
  if (!loaded) {
    console.error('❌ No environment file found!');
    process.exit(1);
  }
}

// Check SMS configuration
console.log('\n📋 SMS Configuration Check');
console.log('='.repeat(50));

const smsEnabled = process.env.SMS_ENABLED;
const apiToken = process.env.PHILSMS_API_TOKEN;
const baseUrl = process.env.PHILSMS_BASE_URL || 'https://app.philsms.com/api/v3';
const senderId = process.env.PHILSMS_SENDER_ID;

console.log(`SMS_ENABLED: ${smsEnabled || 'NOT SET'}`);
console.log(`PHILSMS_API_TOKEN: ${apiToken ? `${apiToken.substring(0, 10)}...${apiToken.substring(apiToken.length - 4)}` : 'NOT SET'}`);
console.log(`PHILSMS_BASE_URL: ${baseUrl}`);
console.log(`PHILSMS_SENDER_ID: ${senderId || 'NOT SET'}`);

// Validate configuration
console.log('\n🔍 Validation:');
console.log('-'.repeat(50));

let isValid = true;

if (smsEnabled !== 'true') {
  console.log('❌ SMS_ENABLED is not set to "true"');
  console.log('   Fix: Set SMS_ENABLED=true in .env.production');
  isValid = false;
} else {
  console.log('✅ SMS_ENABLED is set to "true"');
}

if (!apiToken || apiToken.trim() === '') {
  console.log('❌ PHILSMS_API_TOKEN is not set');
  console.log('   Fix: Set PHILSMS_API_TOKEN=your_token_here in .env.production');
  isValid = false;
} else {
  console.log('✅ PHILSMS_API_TOKEN is set');
}

if (!baseUrl || baseUrl.trim() === '') {
  console.log('❌ PHILSMS_BASE_URL is not set');
  console.log('   Fix: Set PHILSMS_BASE_URL=https://app.philsms.com/api/v3 in .env.production');
  isValid = false;
} else {
  console.log('✅ PHILSMS_BASE_URL is set');
}

if (!senderId || senderId.trim() === '') {
  console.log('⚠️  PHILSMS_SENDER_ID is not set (optional but recommended)');
  console.log('   Note: Sender ID must be registered and approved at https://app.philsms.com');
} else {
  console.log('✅ PHILSMS_SENDER_ID is set');
}

// Test SMS service if configuration is valid
if (isValid) {
  console.log('\n🧪 Testing SMS Service Connection...');
  console.log('-'.repeat(50));
  
  const SMSService = require('../services/smsService');
  
  // Check if service is enabled
  if (!SMSService.enabled) {
    console.log('❌ SMS Service reports as disabled');
    console.log('   This might be because the server needs to be restarted');
    console.log('   to pick up the new environment variables.');
  } else {
    console.log('✅ SMS Service reports as enabled');
    
    // Test connection
    SMSService.testConnection()
      .then(result => {
        if (result.success) {
          console.log('✅ SMS Service connection test: SUCCESS');
          if (result.balance !== undefined) {
            console.log(`   Account Balance: ${result.balance} ${result.currency || 'PHP'}`);
          }
        } else {
          console.log('❌ SMS Service connection test: FAILED');
          console.log(`   Error: ${result.message || result.error}`);
        }
        process.exit(result.success ? 0 : 1);
      })
      .catch(error => {
        console.log('❌ SMS Service connection test: ERROR');
        console.log(`   Error: ${error.message}`);
        console.log('\n💡 Troubleshooting Tips:');
        console.log('   1. Verify your PHILSMS_API_TOKEN is correct');
        console.log('   2. Check if the API endpoint is correct: ' + baseUrl);
        console.log('   3. Ensure your PhilSMS account is active');
        console.log('   4. Check your internet connection');
        console.log('   5. Restart the server after updating .env.production');
        process.exit(1);
      });
  }
} else {
  console.log('\n❌ Configuration is invalid. Please fix the issues above.');
  console.log('\n💡 After fixing .env.production:');
  console.log('   1. Restart the server: pm2 restart therapease-api');
  console.log('   2. Run this script again to verify');
  process.exit(1);
}

