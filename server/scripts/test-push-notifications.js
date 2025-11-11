#!/usr/bin/env node

/**
 * Push Notifications Test Script for TherapEase
 * Tests push notification configuration and functionality
 */

const webpush = require('web-push');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

// Load environment variables - check both .env and .env.production
const envPath = path.join(__dirname, '../../.env');
const envProductionPath = path.join(__dirname, '../../.env.production');

if (fs.existsSync(envProductionPath)) {
  require('dotenv').config({ path: envProductionPath });
  console.log('📁 Loaded .env.production file');
} else if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
  console.log('📁 Loaded .env file');
} else {
  console.log('⚠️  No .env or .env.production file found');
}

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n${colors.cyan}${msg}${colors.reset}\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`),
};

// Database connection
const getDbConnection = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'therapease_db',
  });
  return connection;
};

// Test 1: Check VAPID keys configuration
const testVAPIDKeys = () => {
  log.section('1. Testing VAPID Keys Configuration');
  
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@therapease.com';

  if (!publicKey || !privateKey) {
    log.error('VAPID keys are not configured');
    log.info('Please set the following in your .env or .env.production file:');
    log.info('VAPID_PUBLIC_KEY=your_public_key');
    log.info('VAPID_PRIVATE_KEY=your_private_key');
    log.info('VAPID_SUBJECT=mailto:admin@therapease.com');
    
    // Check which env file exists
    if (fs.existsSync(envProductionPath)) {
      log.info(`\nChecking: ${envProductionPath}`);
    } else if (fs.existsSync(envPath)) {
      log.info(`\nChecking: ${envPath}`);
    }
    
    return false;
  }

  log.success('VAPID_PUBLIC_KEY is set');
  log.info(`Public Key: ${publicKey.substring(0, 20)}...`);
  
  log.success('VAPID_PRIVATE_KEY is set');
  log.info(`Private Key: ${privateKey.substring(0, 20)}...`);
  
  log.success(`VAPID_SUBJECT is set: ${subject}`);

  // Try to configure webpush
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    log.success('WebPush configured successfully');
    return true;
  } catch (error) {
    log.error(`Failed to configure WebPush: ${error.message}`);
    return false;
  }
};

// Test 2: Check database connection and push_subscriptions table
const testDatabase = async () => {
  log.section('2. Testing Database Configuration');
  
  try {
    const connection = await getDbConnection();
    log.success('Database connection successful');

    // Check if push_subscriptions table exists
    const [tables] = await connection.execute(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'push_subscriptions'",
      [process.env.DB_NAME || 'therapease_db']
    );

    if (tables.length === 0) {
      log.error('push_subscriptions table does not exist');
      log.info('Please run database migrations to create the table');
      await connection.end();
      return false;
    }

    log.success('push_subscriptions table exists');

    // Get subscription count
    const [countResult] = await connection.execute(
      'SELECT COUNT(*) as count FROM push_subscriptions'
    );
    const subscriptionCount = countResult[0].count;
    log.info(`Total push subscriptions: ${subscriptionCount}`);

    // Get subscriptions by user
    const [subscriptions] = await connection.execute(
      `SELECT 
        ps.id, 
        ps.userId, 
        u.email, 
        u.firstName, 
        u.lastName,
        u.role,
        ps.createdAt,
        ps.updatedAt
      FROM push_subscriptions ps
      LEFT JOIN users u ON ps.userId = u.id
      ORDER BY ps.createdAt DESC
      LIMIT 10`
    );

    if (subscriptions.length > 0) {
      log.success(`Found ${subscriptions.length} active subscription(s):`);
      subscriptions.forEach((sub, index) => {
        log.info(`  ${index + 1}. User: ${sub.email || 'Unknown'} (${sub.role || 'N/A'}) - Created: ${sub.createdAt}`);
      });
    } else {
      log.warning('No push subscriptions found in database');
      log.info('Users need to enable push notifications in their browser');
    }

    await connection.end();
    return true;
  } catch (error) {
    log.error(`Database test failed: ${error.message}`);
    return false;
  }
};

// Test 3: Test sending a push notification
const testSendNotification = async (userId = null) => {
  log.section('3. Testing Push Notification Sending');
  
  try {
    const connection = await getDbConnection();

    // Get a subscription to test with
    let query = 'SELECT * FROM push_subscriptions';
    let params = [];

    if (userId) {
      query += ' WHERE userId = ?';
      params = [userId];
    }

    query += ' LIMIT 1';

    const [subscriptions] = await connection.execute(query, params);

    if (subscriptions.length === 0) {
      log.warning('No push subscriptions found to test with');
      log.info('To test notifications:');
      log.info('1. Log in to the application');
      log.info('2. Allow push notification permission when prompted');
      log.info('3. Run this script again');
      await connection.end();
      return false;
    }

    const subscription = subscriptions[0];
    log.info(`Testing with subscription for user ID: ${subscription.userId}`);

    // Get user info
    const [users] = await connection.execute(
      'SELECT email, firstName, lastName FROM users WHERE id = ?',
      [subscription.userId]
    );
    const user = users[0] || { email: 'Unknown', firstName: '', lastName: '' };
    log.info(`User: ${user.email}`);

    // Prepare push subscription object
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth
      }
    };

    // Prepare notification payload
    const payload = JSON.stringify({
      title: 'TherapEase - Test Notification',
      body: 'This is a test notification from the push notification test script. If you see this, push notifications are working correctly!',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'test-notification',
      requireInteraction: false,
      data: {
        url: '/notifications',
        timestamp: Date.now(),
        test: true
      }
    });

    log.info('Sending test notification...');
    
    try {
      await webpush.sendNotification(pushSubscription, payload);
      log.success('Test notification sent successfully!');
      log.info('Check the user\'s browser - they should see a notification');
      await connection.end();
      return true;
    } catch (error) {
      log.error(`Failed to send notification: ${error.message}`);
      
      if (error.statusCode === 410) {
        log.warning('Subscription is no longer valid (410 Gone)');
        log.info('The user may have unsubscribed or the subscription expired');
        log.info('Consider removing this subscription from the database');
      } else if (error.statusCode === 404) {
        log.warning('Subscription endpoint not found (404 Not Found)');
        log.info('The subscription may be invalid or expired');
      } else if (error.statusCode === 413) {
        log.warning('Payload too large (413 Payload Too Large)');
        log.info('The notification payload exceeds the maximum size');
      }
      
      await connection.end();
      return false;
    }
  } catch (error) {
    log.error(`Test send failed: ${error.message}`);
    return false;
  }
};

// Test 4: Check client environment variables
const testClientConfig = () => {
  log.section('4. Testing Client Configuration');
  
  const clientPublicKey = process.env.VITE_VAPID_PUBLIC_KEY || process.env.REACT_APP_VAPID_PUBLIC_KEY;
  const serverPublicKey = process.env.VAPID_PUBLIC_KEY;

  if (!clientPublicKey) {
    log.warning('Client VAPID public key not found');
    log.info('Set VITE_VAPID_PUBLIC_KEY in client/.env file');
  } else {
    log.success('Client VAPID public key is set');
  }

  if (serverPublicKey && clientPublicKey) {
    if (serverPublicKey === clientPublicKey) {
      log.success('Client and server VAPID keys match');
    } else {
      log.error('Client and server VAPID keys do NOT match!');
      log.warning('This will cause push notification subscription to fail');
    }
  }

  return true;
};

// Main test function
const runTests = async () => {
  console.log(`\n${colors.cyan}╔══════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║   TherapEase Push Notifications Test Script            ║${colors.reset}`);
  console.log(`${colors.cyan}╚══════════════════════════════════════════════════════════╝${colors.reset}\n`);

  const results = {
    vapidKeys: false,
    database: false,
    clientConfig: false,
    sendTest: false,
  };

  // Run tests
  results.vapidKeys = testVAPIDKeys();
  results.clientConfig = testClientConfig();
  
  if (results.vapidKeys) {
    results.database = await testDatabase();
    
    if (results.database) {
      // Ask if user wants to send a test notification
      const args = process.argv.slice(2);
      const userIdArg = args.find(arg => arg.startsWith('--user='));
      const userId = userIdArg ? parseInt(userIdArg.split('=')[1]) : null;
      
      if (args.includes('--send-test') || args.includes('-t')) {
        results.sendTest = await testSendNotification(userId);
      } else {
        log.info('\nTo send a test notification, run:');
        log.info('  node test-push-notifications.js --send-test');
        log.info('  node test-push-notifications.js --send-test --user=123');
      }
    }
  }

  // Summary
  log.section('Test Summary');
  
  console.log('Configuration Tests:');
  console.log(`  VAPID Keys:        ${results.vapidKeys ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Client Config:     ${results.clientConfig ? '✅ PASS' : '⚠️  WARN'}`);
  console.log(`  Database:          ${results.database ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Send Test:         ${results.sendTest ? '✅ PASS' : results.sendTest === false && results.database ? '⏭️  SKIPPED' : '❌ FAIL'}`);

  const allPassed = results.vapidKeys && results.database;
  
  if (allPassed) {
    log.success('\n✅ Push notifications are properly configured!');
    if (!results.sendTest) {
      log.info('Run with --send-test to verify notification delivery');
    }
  } else {
    log.error('\n❌ Some tests failed. Please fix the issues above.');
    process.exit(1);
  }

  console.log('');
};

// Run if called directly
if (require.main === module) {
  runTests().catch(error => {
    log.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = { runTests, testVAPIDKeys, testDatabase, testSendNotification };

