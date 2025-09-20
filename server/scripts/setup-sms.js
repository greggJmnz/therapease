#!/usr/bin/env node

/**
 * SMS Setup Script for TherapEase
 * Helps configure Infobip SMS integration
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupSMS() {
  console.log('🚀 TherapEase SMS Integration Setup\n');
  console.log('This script will help you configure Infobip SMS integration.\n');

  // Check if .env file exists
  const envPath = path.join(__dirname, '../.env');
  const envExists = fs.existsSync(envPath);

  if (!envExists) {
    console.log('❌ .env file not found. Please create one first.');
    console.log('   You can copy from .env.example if available.\n');
    return;
  }

  console.log('📋 Current SMS Configuration:');
  console.log(`   SMS_ENABLED: ${process.env.SMS_ENABLED || 'Not set'}`);
  console.log(`   INFOBIP_API_KEY: ${process.env.INFOBIP_API_KEY ? 'Set' : 'Not set'}`);
  console.log(`   INFOBIP_BASE_URL: ${process.env.INFOBIP_BASE_URL || 'Not set'}`);
  console.log(`   INFOBIP_SENDER_ID: ${process.env.INFOBIP_SENDER_ID || 'Not set'}\n`);

  // Get configuration from user
  const smsEnabled = await question('Enable SMS service? (y/n): ');
  const apiKey = await question('Enter your Infobip API key: ');
  const baseUrl = await question('Enter Infobip base URL (press Enter for default): ');
  const senderId = await question('Enter sender ID (press Enter for "TherapEase"): ');
  const apiBaseUrl = await question('Enter your API base URL (press Enter for http://localhost:3000): ');

  // Prepare configuration
  const config = {
    SMS_ENABLED: smsEnabled.toLowerCase() === 'y' ? 'true' : 'false',
    INFOBIP_API_KEY: apiKey.trim(),
    INFOBIP_BASE_URL: baseUrl.trim() || 'https://api.infobip.com',
    INFOBIP_SENDER_ID: senderId.trim() || 'TherapEase',
    API_BASE_URL: apiBaseUrl.trim() || 'http://localhost:3000'
  };

  // Read current .env file
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Update or add SMS configuration
  Object.entries(config).forEach(([key, value]) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    const newLine = `${key}=${value}`;
    
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, newLine);
    } else {
      envContent += `\n# SMS Configuration\n${newLine}\n`;
    }
  });

  // Write updated .env file
  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ SMS configuration updated successfully!');
  console.log('\n📋 Configuration Summary:');
  Object.entries(config).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`);
  });

  console.log('\n🧪 Next Steps:');
  console.log('   1. Run: npm run test:sms');
  console.log('   2. Test SMS service connection');
  console.log('   3. Configure webhook URL in Infobip dashboard');
  console.log('   4. Test with real phone numbers');

  console.log('\n📚 Documentation:');
  console.log('   - SMS Integration Guide: docs/SMS_INTEGRATION.md');
  console.log('   - Infobip API Docs: https://www.infobip.com/docs/api/channels/sms');

  rl.close();
}

// Run setup
if (require.main === module) {
  setupSMS().catch(console.error);
}

module.exports = setupSMS;
