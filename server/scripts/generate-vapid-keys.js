#!/usr/bin/env node

/**
 * Generate VAPID Keys for Web Push Notifications
 * 
 * This script generates new VAPID (Voluntary Application Server Identification) keys
 * for web push notifications. The keys are generated in URL-safe base64 format
 * without padding characters (=) as required by the web-push library.
 * 
 * Usage:
 *   node scripts/generate-vapid-keys.js
 * 
 * The script will output the keys in a format that can be directly added to .env.production
 */

const webpush = require('web-push');
const path = require('path');
const fs = require('fs');

console.log('🔐 Generating VAPID keys for Web Push Notifications...\n');

try {
  // Generate VAPID keys
  const vapidKeys = webpush.generateVAPIDKeys();

  // Extract public and private keys (web-push generates them in correct format)
  // They should already be URL-safe base64 without padding
  let publicKey = vapidKeys.publicKey.trim();
  let privateKey = vapidKeys.privateKey.trim();
  
  // Remove any padding characters (=) if present (shouldn't be needed, but just in case)
  // Also remove any whitespace that might have been introduced
  publicKey = publicKey.replace(/\s/g, '').replace(/=/g, '');
  privateKey = privateKey.replace(/\s/g, '').replace(/=/g, '');

  // Verify the keys are valid
  try {
    webpush.setVapidDetails(
      'mailto:admin@therapease.com',
      publicKey,
      privateKey
    );
    console.log('✅ VAPID keys generated successfully!\n');
  } catch (validationError) {
    console.error('❌ Error: Generated keys failed validation:', validationError.message);
    process.exit(1);
  }

  // Display the keys
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📋 Add these to your .env.production file:');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('VAPID_PUBLIC_KEY=' + publicKey);
  console.log('VAPID_PRIVATE_KEY=' + privateKey);
  console.log('VAPID_SUBJECT=mailto:admin@therapease.com\n');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('📝 Complete .env.production entries:');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('# Push Notifications (VAPID Keys)');
  console.log('VAPID_PUBLIC_KEY=' + publicKey);
  console.log('VAPID_PRIVATE_KEY=' + privateKey);
  console.log('VAPID_SUBJECT=mailto:admin@therapease.com\n');

  // Optional: Ask if user wants to update .env.production automatically
  // For now, just output the keys so user can manually add them

  console.log('✅ Keys generated successfully!');
  console.log('⚠️  Remember to:');
  console.log('   1. Add these keys to your .env.production file');
  console.log('   2. Restart your server (pm2 restart therapease-api)');
  console.log('   3. Existing push subscriptions will need to be re-subscribed');
  console.log('      (users will need to allow notifications again)\n');

} catch (error) {
  console.error('❌ Error generating VAPID keys:', error.message);
  console.error('\nMake sure web-push is installed:');
  console.error('  npm install web-push');
  process.exit(1);
}
