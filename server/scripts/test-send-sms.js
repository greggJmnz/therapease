#!/usr/bin/env node

/**
 * Test SMS Sending Script
 * Sends a test SMS message to verify the service is working
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
  process.exit(1);
}

// Get phone number from command line argument
const phoneNumber = process.argv[2];
const testMessage = process.argv[3] || 'Test message from TherapEase SMS service. If you receive this, SMS is working correctly!';

if (!phoneNumber) {
  console.log('❌ Phone number is required');
  console.log('\nUsage:');
  console.log('  node server/scripts/test-send-sms.js <phone_number> [message]');
  console.log('\nExamples:');
  console.log('  node server/scripts/test-send-sms.js 09123456789');
  console.log('  node server/scripts/test-send-sms.js +639123456789');
  console.log('  node server/scripts/test-send-sms.js 09123456789 "Custom test message"');
  process.exit(1);
}

// Test SMS service
async function testSendSMS() {
  try {
    const smsService = require('../services/smsService');
    
    // Reload config
    smsService.loadConfig();
    
    // Check if service is enabled
    if (!smsService.enabled) {
      console.log('❌ SMS Service is disabled');
      console.log('   Check your .env.production file:');
      console.log('   - SMS_ENABLED=true');
      console.log('   - PHILSMS_API_TOKEN=your_token');
      process.exit(1);
    }
    
    // Check account balance first
    console.log('\n💰 Checking account balance...');
    const balance = await smsService.getAccountBalance();
    
    if (balance.success) {
      console.log(`   Balance: ${balance.balance} ${balance.currency || 'PHP'}`);
      
      if (balance.balance === 0 || balance.balance < 0) {
        console.log('\n⚠️  WARNING: Account balance is 0 or negative!');
        console.log('   You need to add credits to your PhilSMS account to send messages.');
        console.log('   Visit: https://app.philsms.com to add credits.');
        console.log('\n   The SMS will still be attempted, but it may fail due to insufficient balance.');
      }
    } else {
      console.log('   ⚠️  Could not check balance:', balance.error);
    }
    
    // Send test SMS
    console.log(`\n📤 Sending test SMS to: ${phoneNumber}`);
    console.log(`   Message: ${testMessage}`);
    console.log('   Please wait...\n');
    
    const result = await smsService.sendSMS(phoneNumber, testMessage);
    
    if (result.success) {
      console.log('✅ SMS sent successfully!');
      console.log(`   Message ID: ${result.messageId || 'N/A'}`);
      console.log(`   Status: ${result.status || 'sent'}`);
      console.log(`   To: ${result.to || phoneNumber}`);
      console.log('\n💡 Check your phone for the test message.');
      console.log('   If you don\'t receive it within a few minutes:');
      console.log('   1. Verify your phone number is correct');
      console.log('   2. Check if your PhilSMS account has credits');
      console.log('   3. Verify the Sender ID is approved (if using one)');
      console.log('   4. Check PhilSMS dashboard for delivery status');
    } else {
      console.log('❌ Failed to send SMS');
      console.log(`   Error: ${result.error || result.message || 'Unknown error'}`);
      
      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }
      
      console.log('\n💡 Troubleshooting:');
      console.log('   1. Verify your PHILSMS_API_TOKEN is correct');
      console.log('   2. Check if your account has credits (balance > 0)');
      console.log('   3. Verify the phone number format is correct');
      console.log('   4. Check if Sender ID is approved (if using one)');
      console.log('   5. Check PhilSMS API documentation for error codes');
      
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error testing SMS:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

// Run test
testSendSMS();

