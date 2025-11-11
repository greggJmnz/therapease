#!/usr/bin/env node

/**
 * Push Notifications Test Script for TherapEase
 * Tests push notification configuration and functionality
 */

const webpush = require('web-push');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

// Load environment variables - check multiple locations
// Check both project root and server directory
const projectRoot = path.join(__dirname, '../..');
const serverDir = path.join(__dirname, '..');

const envPaths = [
  path.join(serverDir, '.env.production'),  // server/.env.production
  path.join(projectRoot, '.env.production'), // root/.env.production
  path.join(serverDir, '.env'),             // server/.env
  path.join(projectRoot, '.env')             // root/.env
];

let envLoaded = false;
let loadedPath = null;

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log(`📁 Loaded ${path.relative(process.cwd(), envPath)} file`);
    envLoaded = true;
    loadedPath = envPath;
    break; // Use first found file
  }
}

if (!envLoaded) {
  console.log('⚠️  No .env or .env.production file found');
  console.log('Checked locations:');
  envPaths.forEach(p => {
    console.log(`  - ${p} ${fs.existsSync(p) ? '✓' : '✗'}`);
  });
}

// Also manually read and parse .env.production if it exists (for better debugging)
// Check all possible locations
const envFilesToCheck = [
  path.join(serverDir, '.env.production'),
  path.join(projectRoot, '.env.production'),
  path.join(serverDir, '.env'),
  path.join(projectRoot, '.env')
];

for (const envFilePath of envFilesToCheck) {
  if (fs.existsSync(envFilePath) && (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY)) {
    try {
      const envContent = fs.readFileSync(envFilePath, 'utf8');
      const lines = envContent.split('\n');
      let foundVAPID = false;
      lines.forEach(line => {
        if (line.trim().startsWith('VAPID_')) {
          foundVAPID = true;
          const [key, ...valueParts] = line.split('=');
          const value = valueParts.join('=').trim();
          // Set in process.env if not already set (dotenv might have missed it)
          if (key.trim() === 'VAPID_PUBLIC_KEY' && !process.env.VAPID_PUBLIC_KEY) {
            process.env.VAPID_PUBLIC_KEY = value.replace(/^["']|["']$/g, '').replace(/>$/, '').trim(); // Remove quotes and trailing >
          } else if (key.trim() === 'VAPID_PRIVATE_KEY' && !process.env.VAPID_PRIVATE_KEY) {
            process.env.VAPID_PRIVATE_KEY = value.replace(/^["']|["']$/g, '').trim(); // Remove quotes
          } else if (key.trim() === 'VAPID_SUBJECT' && !process.env.VAPID_SUBJECT) {
            process.env.VAPID_SUBJECT = value.replace(/^["']|["']$/g, '').trim(); // Remove quotes
          }
        }
      });
      if (foundVAPID) {
        console.log(`📋 Manually parsed VAPID keys from ${path.relative(process.cwd(), envFilePath)}`);
        break; // Found keys, no need to check other files
      }
    } catch (error) {
      console.log(`⚠️  Could not manually parse ${envFilePath}: ${error.message}`);
    }
  }
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
  
  // Try to read directly from .env.production if not in process.env
  let publicKey = process.env.VAPID_PUBLIC_KEY;
  let privateKey = process.env.VAPID_PRIVATE_KEY;
  let subject = process.env.VAPID_SUBJECT || 'mailto:admin@therapease.com';

  // If keys not found, try reading directly from all possible env files
  if (!publicKey || !privateKey) {
    for (const envFilePath of envFilesToCheck) {
      if (fs.existsSync(envFilePath)) {
        try {
          const envContent = fs.readFileSync(envFilePath, 'utf8');
          const lines = envContent.split('\n');
          
          lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('VAPID_PUBLIC_KEY=') && !publicKey) {
              publicKey = trimmed.split('=').slice(1).join('=').trim();
              // Remove quotes and trailing characters like >
              publicKey = publicKey.replace(/^["']|["']$/g, '').replace(/>$/, '').trim();
            } else if (trimmed.startsWith('VAPID_PRIVATE_KEY=') && !privateKey) {
              privateKey = trimmed.split('=').slice(1).join('=').trim();
              privateKey = privateKey.replace(/^["']|["']$/g, '').trim();
            } else if (trimmed.startsWith('VAPID_SUBJECT=') && !subject) {
              subject = trimmed.split('=').slice(1).join('=').trim();
              subject = subject.replace(/^["']|["']$/g, '').trim();
            }
          });
          
          if (publicKey && privateKey) {
            log.info(`Read VAPID keys directly from ${path.relative(process.cwd(), envFilePath)}`);
            break; // Found both keys, no need to check other files
          }
        } catch (error) {
          log.warning(`Could not read ${envFilePath}: ${error.message}`);
        }
      }
    }
  }

  if (!publicKey || !privateKey) {
    log.error('VAPID keys are not configured');
    log.info('Please set the following in your .env or .env.production file:');
    log.info('VAPID_PUBLIC_KEY=your_public_key');
    log.info('VAPID_PRIVATE_KEY=your_private_key');
    log.info('VAPID_SUBJECT=mailto:admin@therapease.com');
    
    // Check which env files exist
    log.info('\nChecking all possible locations:');
    for (const envFilePath of envFilesToCheck) {
      const exists = fs.existsSync(envFilePath);
      log.info(`  ${exists ? '✓' : '✗'} ${envFilePath}`);
      if (exists) {
        try {
          const content = fs.readFileSync(envFilePath, 'utf8');
          const hasPublic = content.includes('VAPID_PUBLIC_KEY');
          const hasPrivate = content.includes('VAPID_PRIVATE_KEY');
          if (hasPublic || hasPrivate) {
            log.info(`    - VAPID_PUBLIC_KEY: ${hasPublic ? 'found' : 'missing'}`);
            log.info(`    - VAPID_PRIVATE_KEY: ${hasPrivate ? 'found' : 'missing'}`);
          }
        } catch (e) {
          log.error(`    - Could not read: ${e.message}`);
        }
      }
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
        log.info('Run with --cleanup to remove invalid subscriptions from the database');
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
  
  // Check client .env.production file
  const clientEnvPath = path.join(__dirname, '../../client/.env.production');
  const clientEnvPath2 = path.join(__dirname, '../../client/.env');
  
  let clientPublicKey = process.env.VITE_VAPID_PUBLIC_KEY || process.env.REACT_APP_VAPID_PUBLIC_KEY;
  
  // Try to read from client .env.production file directly
  if (!clientPublicKey && fs.existsSync(clientEnvPath)) {
    try {
      const clientEnvContent = fs.readFileSync(clientEnvPath, 'utf8');
      const match = clientEnvContent.match(/VITE_VAPID_PUBLIC_KEY=(.+)/);
      if (match) {
        clientPublicKey = match[1].trim();
        log.info('Found client VAPID key in client/.env.production');
      }
    } catch (error) {
      // Ignore read errors
    }
  }
  
  // Try to read from client .env file
  if (!clientPublicKey && fs.existsSync(clientEnvPath2)) {
    try {
      const clientEnvContent = fs.readFileSync(clientEnvPath2, 'utf8');
      const match = clientEnvContent.match(/VITE_VAPID_PUBLIC_KEY=(.+)/);
      if (match) {
        clientPublicKey = match[1].trim();
        log.info('Found client VAPID key in client/.env');
      }
    } catch (error) {
      // Ignore read errors
    }
  }
  
  const serverPublicKey = process.env.VAPID_PUBLIC_KEY;

  if (!clientPublicKey) {
    log.warning('Client VAPID public key not found');
    log.info('Set VITE_VAPID_PUBLIC_KEY in client/.env or client/.env.production file');
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

// Test 5: Clean up invalid/expired subscriptions
const cleanupInvalidSubscriptions = async () => {
  log.section('5. Cleaning Up Invalid Subscriptions');
  
  try {
    const connection = await getDbConnection();
    
    // Get all subscriptions
    const [subscriptions] = await connection.execute(
      'SELECT * FROM push_subscriptions'
    );

    if (subscriptions.length === 0) {
      log.info('No subscriptions to check');
      await connection.end();
      return { checked: 0, removed: 0 };
    }

    log.info(`Checking ${subscriptions.length} subscription(s) for validity...`);
    
    let checked = 0;
    let removed = 0;
    const invalidIds = [];

    for (const subscription of subscriptions) {
      checked++;
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth
        }
      };

      // Validate subscription format first
      if (!subscription.endpoint || !subscription.p256dh || !subscription.auth) {
        invalidIds.push(subscription.id);
        log.warning(`Subscription ${subscription.id} (user ${subscription.userId}) has missing data (endpoint, p256dh, or auth)`);
        continue;
      }

      // Try to send a minimal test notification to check if subscription is valid
      // We use a very short TTL so it expires immediately and doesn't actually notify the user
      try {
        const testPayload = JSON.stringify({
          title: 'Validation',
          body: 'Check'
        });
        
        // Send with TTL of 0 seconds - this validates the subscription without delivering
        await webpush.sendNotification(pushSubscription, testPayload, {
          TTL: 0,
          urgency: 'very-low'
        });
        
        // If we get here without error, subscription is valid
        // (TTL=0 means it won't be delivered, but validates the endpoint)
      } catch (error) {
        // Check for specific error codes that indicate invalid subscription
        if (error.statusCode === 410) {
          // 410 Gone - subscription expired or user unsubscribed
          invalidIds.push(subscription.id);
          log.warning(`Subscription ${subscription.id} (user ${subscription.userId}) is expired (410 Gone)`);
        } else if (error.statusCode === 404) {
          // 404 Not Found - endpoint doesn't exist
          invalidIds.push(subscription.id);
          log.warning(`Subscription ${subscription.id} (user ${subscription.userId}) endpoint not found (404)`);
        } else if (error.statusCode === 400) {
          // 400 Bad Request - usually means invalid keys or malformed subscription
          // Check if it's a key format issue
          const errorBody = error.body || '';
          if (errorBody.includes('Invalid') || errorBody.includes('malformed') || errorBody.includes('key')) {
            invalidIds.push(subscription.id);
            log.warning(`Subscription ${subscription.id} (user ${subscription.userId}) has invalid keys/format (400 Bad Request)`);
          } else {
            // Might be temporary, but log it
            log.warning(`Subscription ${subscription.id} (user ${subscription.userId}) returned 400 - ${error.message || 'Bad Request'}`);
            // If all subscriptions return 400, it might be a VAPID key issue
            // But we'll still mark it for removal if it's clearly invalid
            invalidIds.push(subscription.id);
            log.info('  Marking for removal - 400 errors typically indicate invalid subscription data');
          }
        } else {
          // Other errors (network, etc.) - log but don't remove
          log.info(`Subscription ${subscription.id} (user ${subscription.userId}) error: ${error.statusCode || 'Unknown'} - ${error.message || 'Network/Other error'}`);
        }
      }
    }

    // Remove invalid subscriptions
    if (invalidIds.length > 0) {
      const placeholders = invalidIds.map(() => '?').join(',');
      await connection.execute(
        `DELETE FROM push_subscriptions WHERE id IN (${placeholders})`,
        invalidIds
      );
      removed = invalidIds.length;
      log.success(`Removed ${removed} invalid subscription(s)`);
    } else {
      log.success('All subscriptions are valid');
    }

    await connection.end();
    return { checked, removed };
  } catch (error) {
    log.error(`Cleanup failed: ${error.message}`);
    return { checked: 0, removed: 0 };
  }
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
    cleanup: false,
  };

  // Run tests
  results.vapidKeys = testVAPIDKeys();
  results.clientConfig = testClientConfig();
  
  if (results.vapidKeys) {
    results.database = await testDatabase();
    
    if (results.database) {
      // Check for cleanup flag
      const args = process.argv.slice(2);
      
      if (args.includes('--cleanup') || args.includes('-c')) {
        const cleanupResult = await cleanupInvalidSubscriptions();
        results.cleanup = cleanupResult.removed > 0 || cleanupResult.checked === 0;
      }
      
      // Ask if user wants to send a test notification
      const userIdArg = args.find(arg => arg.startsWith('--user='));
      const userId = userIdArg ? parseInt(userIdArg.split('=')[1]) : null;
      
      if (args.includes('--send-test') || args.includes('-t')) {
        results.sendTest = await testSendNotification(userId);
      } else {
        log.info('\nAvailable options:');
        log.info('  --send-test, -t     Send a test notification');
        log.info('  --user=ID           Send test to specific user ID');
        log.info('  --cleanup, -c       Remove invalid/expired subscriptions');
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
  if (results.cleanup !== false) {
    console.log(`  Cleanup:           ${results.cleanup ? '✅ COMPLETED' : '⏭️  SKIPPED'}`);
  }

  const allPassed = results.vapidKeys && results.database;
  
  if (allPassed) {
    log.success('\n✅ Push notifications are properly configured!');
    if (!results.sendTest && !results.cleanup) {
      log.info('Run with --send-test to verify notification delivery');
      log.info('Run with --cleanup to remove invalid/expired subscriptions');
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

