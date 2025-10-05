#!/usr/bin/env node

/**
 * SMS Integration Test Script for TherapEase
 * Tests Vonage SMS service integration
 */

require('dotenv').config();
const smsService = require('../services/smsService');

async function testSMSService() {
  console.log('🧪 Testing TherapEase SMS Integration...\n');

  // Test 1: Service Connection
  console.log('1️⃣ Testing SMS Service Connection...');
  const connectionTest = await smsService.testConnection();
  
  if (connectionTest.success) {
    console.log('✅ SMS Service Connected Successfully');
    console.log(`   Balance: ${connectionTest.balance} ${connectionTest.currency}`);
  } else {
    console.log('❌ SMS Service Connection Failed');
    console.log(`   Error: ${connectionTest.message}`);
    return;
  }

  // Test 2: Phone Number Formatting
  console.log('\n2️⃣ Testing Phone Number Formatting...');
  const testNumbers = [
    // Philippine mobile numbers
    '09123456789',     // Local format (09XX-XXX-XXXX)
    '+639123456789',   // International format
    '639123456789',    // Without + prefix
    '9123456789',      // Without 0 prefix
    '0912-345-6789',   // With dashes
    '0912 345 6789',   // With spaces
    
    // US numbers
    '1234567890',      // US format
    '+1234567890',     // International format
    '1-234-567-8900',  // Formatted US
    
    // Other formats
    'invalid',         // Invalid
    '+44123456789'     // UK format
  ];

  testNumbers.forEach(number => {
    const formatted = smsService.formatPhoneNumber(number);
    const isValid = formatted !== null;
    const status = isValid ? '✅' : '❌';
    console.log(`   ${status} ${number} → ${formatted || 'INVALID'}`);
  });

  // Test 3: SMS Templates (without sending)
  console.log('\n3️⃣ Testing SMS Templates...');
  
  const appointmentData = {
    type: 'Regular Session',
    appointmentDate: '2024-01-25',
    startTime: '10:00 AM'
  };

  const assessmentData = {
    title: 'Progress Assessment',
    patientName: 'John Doe',
    scheduledDate: '2024-01-26'
  };

  const progressData = {
    area: 'Fine Motor Skills',
    status: 'Significant Improvement'
  };

  console.log('   Appointment Reminder:');
  console.log(`   ${smsService.templates.appointmentReminder('Dr. Smith', appointmentData.type, appointmentData.appointmentDate, appointmentData.startTime)}`);
  
  console.log('\n   Assessment Due:');
  console.log(`   ${smsService.templates.assessmentDue('Dr. Smith', assessmentData.title, assessmentData.patientName, assessmentData.scheduledDate)}`);
  
  console.log('\n   Progress Update:');
  console.log(`   ${smsService.templates.progressUpdate('Dr. Smith', progressData.area, progressData.status)}`);

  // Test 4: Account Balance
  console.log('\n4️⃣ Testing Account Balance...');
  const balance = await smsService.getAccountBalance();
  
  if (balance.success) {
    console.log(`✅ Account Balance: ${balance.balance} ${balance.currency}`);
  } else {
    console.log(`❌ Failed to get balance: ${balance.error}`);
  }

  // Test 5: Configuration Check
  console.log('\n5️⃣ Testing Configuration...');
  console.log(`   SMS Enabled: ${process.env.SMS_ENABLED}`);
  console.log(`   API Key: ${process.env.INFOBIP_API_KEY ? 'Set' : 'Not Set'}`);
  console.log(`   Base URL: ${process.env.INFOBIP_BASE_URL || 'Default'}`);
  console.log(`   Sender ID: ${process.env.INFOBIP_SENDER_ID || 'Default'}`);

  // Test 6: Philippine Phone Number Validation
  console.log('\n6️⃣ Testing Philippine Phone Number Validation...');
  const phTestNumbers = [
    '09123456789',     // Valid local format
    '0912-345-6789',   // Valid with dashes
    '0912 345 6789',   // Valid with spaces
    '+639123456789',   // Valid international
    '639123456789',    // Valid without +
    '9123456789',      // Valid without 0
    '08123456789',     // Invalid (starts with 08)
    '07123456789',     // Invalid (starts with 07)
    '123456789',       // Invalid (too short)
    '091234567890',    // Invalid (too long)
    'invalid'          // Invalid
  ];

  phTestNumbers.forEach(number => {
    const formatted = smsService.formatPhoneNumber(number);
    const isValid = formatted !== null && formatted.startsWith('+639');
    const status = isValid ? '✅' : '❌';
    console.log(`   ${status} ${number} → ${formatted || 'INVALID'}`);
  });

  // Test 7: Optional Live SMS Test
  if (process.env.TEST_PHONE_NUMBER) {
    console.log('\n7️⃣ Testing Live SMS (Optional)...');
    console.log(`   Test Phone: ${process.env.TEST_PHONE_NUMBER}`);
    
    const formattedTestNumber = smsService.formatPhoneNumber(process.env.TEST_PHONE_NUMBER);
    if (formattedTestNumber) {
      console.log(`   Formatted: ${formattedTestNumber}`);
      
      const testMessage = 'Test message from TherapEase SMS integration. This is a test.';
      const smsResult = await smsService.sendSMS(process.env.TEST_PHONE_NUMBER, testMessage);
      
      if (smsResult.success) {
        console.log('✅ Test SMS sent successfully');
        console.log(`   Message ID: ${smsResult.messageId}`);
      } else {
        console.log('❌ Test SMS failed');
        console.log(`   Error: ${smsResult.error}`);
      }
    } else {
      console.log('❌ Invalid phone number format');
    }
  } else {
    console.log('\n7️⃣ Live SMS Test Skipped (No TEST_PHONE_NUMBER set)');
    console.log('   To test live SMS, set TEST_PHONE_NUMBER in your .env file');
    console.log('   Example: TEST_PHONE_NUMBER=09123456789');
  }

  console.log('\n🎉 SMS Integration Test Complete!');
  console.log('\n📋 Next Steps:');
  console.log('   1. Configure your Infobip API key in .env');
  console.log('   2. Set up webhook URL for delivery status');
  console.log('   3. Test with real phone numbers');
  console.log('   4. Monitor SMS usage and costs');
}

// Run the test
if (require.main === module) {
  testSMSService().catch(console.error);
}

module.exports = testSMSService;
