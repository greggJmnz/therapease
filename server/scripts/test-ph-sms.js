#!/usr/bin/env node

/**
 * Philippine SMS Testing Script for TherapEase
 * Tests Vonage SMS service with Philippine phone numbers
 */

require('dotenv').config();
const smsService = require('../services/smsService');
const { validatePhilippineNumber, testPhilippineNumbers, getValidPhilippineFormats } = require('../utils/phoneValidation');

async function testPhilippineSMS() {
  console.log('🇵🇭 Testing TherapEase SMS Integration with Philippine Numbers...\n');

  // Test 1: Philippine Phone Number Validation
  console.log('1️⃣ Testing Philippine Phone Number Validation...');
  const testResults = testPhilippineNumbers();
  
  testResults.forEach(result => {
    const status = result.valid ? '✅' : '❌';
    const carrier = result.carrier ? ` (${result.carrier})` : '';
    console.log(`   ${status} ${result.input} → ${result.formatted || 'INVALID'}${carrier}`);
    if (result.error) {
      console.log(`      Error: ${result.error}`);
    }
  });

  // Test 2: Valid Philippine Formats
  console.log('\n2️⃣ Valid Philippine Mobile Number Formats:');
  const validFormats = getValidPhilippineFormats();
  validFormats.forEach(format => {
    console.log(`   • ${format}`);
  });

  // Test 3: Philippine Carrier Detection
  console.log('\n3️⃣ Testing Philippine Carrier Detection...');
  const carrierTestNumbers = [
    '09171234567', // Globe
    '09181234567', // Globe
    '09201234567', // Smart
    '09211234567', // Smart
    '08951234567', // DITO
    '08961234567', // DITO
    '09111234567'  // Unknown
  ];

  carrierTestNumbers.forEach(number => {
    const validation = validatePhilippineNumber(number);
    if (validation.valid) {
      console.log(`   ${number} → ${validation.carrier}`);
    }
  });

  // Test 4: SMS Service Connection
  console.log('\n4️⃣ Testing SMS Service Connection...');
  const connectionTest = await smsService.testConnection();
  
  if (connectionTest.success) {
    console.log('✅ SMS Service Connected Successfully');
    console.log(`   Balance: ${connectionTest.balance} ${connectionTest.currency}`);
  } else {
    console.log('❌ SMS Service Connection Failed');
    console.log(`   Error: ${connectionTest.message}`);
    return;
  }

  // Test 5: Philippine SMS Templates
  console.log('\n5️⃣ Testing Philippine SMS Templates...');
  
  const appointmentData = {
    type: 'Regular Session',
    appointmentDate: '2024-01-25',
    startTime: '10:00 AM'
  };

  const assessmentData = {
    title: 'Progress Assessment',
    patientName: 'Juan Dela Cruz',
    scheduledDate: '2024-01-26'
  };

  const progressData = {
    area: 'Fine Motor Skills',
    status: 'Significant Improvement'
  };

  console.log('   Appointment Reminder:');
  console.log(`   ${smsService.templates.appointmentReminder('Dr. Maria Santos', appointmentData.type, appointmentData.appointmentDate, appointmentData.startTime)}`);
  
  console.log('\n   Assessment Due:');
  console.log(`   ${smsService.templates.assessmentDue('Dr. Maria Santos', assessmentData.title, assessmentData.patientName, assessmentData.scheduledDate)}`);
  
  console.log('\n   Progress Update:');
  console.log(`   ${smsService.templates.progressUpdate('Dr. Maria Santos', progressData.area, progressData.status)}`);

  // Test 6: Configuration Check
  console.log('\n6️⃣ Testing Configuration...');
  console.log(`   SMS Enabled: ${process.env.SMS_ENABLED}`);
  console.log(`   API Key: ${process.env.INFOBIP_API_KEY ? 'Set' : 'Not Set'}`);
  console.log(`   Base URL: ${process.env.INFOBIP_BASE_URL || 'Default'}`);
  console.log(`   Sender ID: ${process.env.INFOBIP_SENDER_ID || 'Default'}`);

  // Test 7: Live SMS Test with Philippine Number
  if (process.env.TEST_PHONE_NUMBER) {
    console.log('\n7️⃣ Testing Live SMS with Philippine Number...');
    console.log(`   Test Phone: ${process.env.TEST_PHONE_NUMBER}`);
    
    const validation = validatePhilippineNumber(process.env.TEST_PHONE_NUMBER);
    if (validation.valid) {
      console.log(`   Formatted: ${validation.formatted}`);
      console.log(`   Carrier: ${validation.carrier}`);
      
      const testMessage = 'Test message from TherapEase SMS integration. This is a test for Philippine numbers.';
      const smsResult = await smsService.sendSMS(process.env.TEST_PHONE_NUMBER, testMessage);
      
      if (smsResult.success) {
        console.log('✅ Test SMS sent successfully');
        console.log(`   Message ID: ${smsResult.messageId}`);
        console.log(`   Status: ${smsResult.status?.groupName || 'Unknown'}`);
      } else {
        console.log('❌ Test SMS failed');
        console.log(`   Error: ${smsResult.error}`);
      }
    } else {
      console.log('❌ Invalid Philippine phone number format');
      console.log(`   Error: ${validation.error}`);
      if (validation.suggestions) {
        console.log('   Suggestions:');
        validation.suggestions.forEach(suggestion => {
          console.log(`     • ${suggestion}`);
        });
      }
    }
  } else {
    console.log('\n7️⃣ Live SMS Test Skipped (No TEST_PHONE_NUMBER set)');
    console.log('   To test live SMS, set TEST_PHONE_NUMBER in your .env file');
    console.log('   Example: TEST_PHONE_NUMBER=09123456789');
    console.log('   Or: TEST_PHONE_NUMBER=+639123456789');
  }

  // Test 8: Error Handling
  console.log('\n8️⃣ Testing Error Handling...');
  const errorTestNumbers = [
    '08123456789',     // Invalid prefix (08)
    '07123456789',     // Invalid prefix (07)
    '123456789',       // Too short
    '091234567890',    // Too long
    'invalid',         // Invalid
    '0912345678'       // Wrong length
  ];

  errorTestNumbers.forEach(number => {
    const validation = validatePhilippineNumber(number);
    const status = validation.valid ? '✅' : '❌';
    console.log(`   ${status} ${number} → ${validation.valid ? validation.formatted : 'INVALID'}`);
    if (!validation.valid) {
      console.log(`      Error: ${validation.error}`);
    }
  });

  console.log('\n🎉 Philippine SMS Integration Test Complete!');
  console.log('\n📋 Next Steps:');
  console.log('   1. Configure your Infobip API key in .env');
  console.log('   2. Set TEST_PHONE_NUMBER=09123456789 for testing');
  console.log('   3. Set up webhook URL for delivery status');
  console.log('   4. Test with real Philippine phone numbers');
  console.log('   5. Monitor SMS usage and costs');

  console.log('\n📱 Philippine Mobile Number Formats:');
  console.log('   • 09XX-XXX-XXXX (Local format)');
  console.log('   • +639XX-XXX-XXXX (International format)');
  console.log('   • 639XX-XXX-XXXX (Without + prefix)');
  console.log('   • 9XX-XXX-XXXX (Without 0 prefix)');

  console.log('\n📞 Supported Carriers:');
  console.log('   • Globe/TM');
  console.log('   • Smart/TNT');
  console.log('   • DITO');
}

// Run the test
if (require.main === module) {
  testPhilippineSMS().catch(console.error);
}

module.exports = testPhilippineSMS;
