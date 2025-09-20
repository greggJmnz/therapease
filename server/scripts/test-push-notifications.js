#!/usr/bin/env node

/**
 * Test Push Notifications Script for TherapEase
 * Tests the push notification system functionality
 */

require('dotenv').config();
const { sendPushNotification, sendPushToRole } = require('../controllers/notificationController');

const testPushNotifications = async () => {
  console.log('🧪 Testing TherapEase Push Notifications...\n');

  try {
    // Test 1: Send notification to specific user
    console.log('1️⃣ Testing individual user notification...');
    const userResult = await sendPushNotification(1, 'Test Notification', 'This is a test push notification from TherapEase!', {
      url: '/notifications',
      icon: '/favicon.ico',
      tag: 'test-notification',
      requireInteraction: false
    });
    
    if (userResult.success) {
      console.log('✅ Individual notification sent successfully');
    } else {
      console.log('❌ Individual notification failed:', userResult.message);
    }

    // Test 2: Send notification to role
    console.log('\n2️⃣ Testing role-based notification...');
    const roleResult = await sendPushToRole('therapist', 'System Update', 'New features are now available in TherapEase!', {
      url: '/admin/updates',
      icon: '/favicon.ico',
      tag: 'system-update'
    });
    
    if (roleResult.length > 0) {
      console.log(`✅ Role notification sent to ${roleResult.length} therapists`);
    } else {
      console.log('❌ Role notification failed or no therapists found');
    }

    // Test 3: Test different notification types
    console.log('\n3️⃣ Testing different notification types...');
    
    const notificationTypes = [
      {
        title: 'Appointment Reminder',
        message: 'Your therapy session starts in 30 minutes',
        options: { url: '/appointments', tag: 'appointment-reminder' }
      },
      {
        title: 'New Assessment',
        message: 'A new assessment has been scheduled for next week',
        options: { url: '/assessments', tag: 'assessment-update' }
      },
      {
        title: 'Progress Report',
        message: 'Your progress report is ready for review',
        options: { url: '/progress', tag: 'progress-report' }
      }
    ];

    for (const notification of notificationTypes) {
      const result = await sendPushNotification(1, notification.title, notification.message, notification.options);
      if (result.success) {
        console.log(`✅ ${notification.title} sent successfully`);
      } else {
        console.log(`❌ ${notification.title} failed:`, result.message);
      }
    }

    console.log('\n🎉 Push notification testing completed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Check browser for notifications (if user is subscribed)');
    console.log('2. Verify notification actions work correctly');
    console.log('3. Test notification settings in the UI');
    console.log('4. Monitor notification delivery in the database');

  } catch (error) {
    console.error('❌ Push notification test failed:', error.message);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  testPushNotifications();
}

module.exports = testPushNotifications;
