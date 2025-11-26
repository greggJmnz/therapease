#!/usr/bin/env node

/**
 * VAPID Key Generation Script for TherapEase
 * Generates VAPID keys for push notifications
 */

const webpush = require('web-push');

const generateVapidKeys = () => {
  try {
    console.log('🔑 Generating VAPID keys for push notifications...\n');
    
    const vapidKeys = webpush.generateVAPIDKeys();
    
    console.log('✅ VAPID keys generated successfully!\n');
    console.log('📋 Add these to your .env file:\n');
    console.log('VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
    console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);
    console.log('VAPID_SUBJECT=mailto:admin@therapease.com\n');
    
    console.log('📱 Add this to your client .env file:\n');
    console.log('REACT_APP_VAPID_PUBLIC_KEY=' + vapidKeys.publicKey + '\n');
    
    console.log('🔧 Next steps:');
    console.log('1. Add the VAPID keys to your .env files');
    console.log('2. Restart your server and client');
    console.log('3. Test push notifications in the browser');
    
    return vapidKeys;
    
  } catch (error) {
    console.error('❌ Failed to generate VAPID keys:', error.message);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  generateVapidKeys();
}

module.exports = generateVapidKeys;
