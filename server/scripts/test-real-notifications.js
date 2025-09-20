#!/usr/bin/env node

/**
 * Test Real Notifications Script for TherapEase
 * Creates and sends real notifications to test the system
 */

require('dotenv').config();
const { createNotification, sendPushNotification, sendPushToRole } = require('../controllers/notificationController');

const testRealNotifications = async () => {
  console.log('🧪 Testing Real Notifications System...\n');

  try {
    // Test 1: Create database notifications
    console.log('1️⃣ Creating database notifications...');
    
    const notifications = [
      {
        userId: 1, // Admin user
        title: 'System Test Notification',
        message: 'This is a test notification from the TherapEase system to verify functionality.',
        type: 'system'
      },
      {
        userId: 2, // First therapist
        title: 'Appointment Reminder',
        message: 'You have a therapy session with Alexandra Santos tomorrow at 9:00 AM.',
        type: 'appointment',
        relatedId: 1
      },
      {
        userId: 3, // Second therapist
        title: 'Assessment Due',
        message: 'Progress assessment for Marcus Dela Cruz is due next week.',
        type: 'assessment',
        relatedId: 2
      },
      {
        userId: 7, // First patient
        title: 'New Therapy Note',
        message: 'Dr. Aleli Ong has added a new note from your recent session.',
        type: 'note',
        relatedId: 3
      },
      {
        userId: 8, // Second patient
        title: 'Progress Update',
        message: 'Great progress! You\'ve achieved 2 new milestones this month.',
        type: 'progress',
        relatedId: 4
      }
    ];

    const createdNotifications = [];
    for (const notification of notifications) {
      const notificationId = await createNotification(
        notification.userId,
        notification.title,
        notification.message,
        notification.type,
        { relatedId: notification.relatedId }
      );
      
      if (notificationId) {
        createdNotifications.push(notificationId);
        console.log(`✅ Created notification for user ${notification.userId}: ${notification.title}`);
      } else {
        console.log(`❌ Failed to create notification for user ${notification.userId}`);
      }
    }

    console.log(`\n📊 Created ${createdNotifications.length} notifications in database`);

    // Test 2: Send push notifications (if users are subscribed)
    console.log('\n2️⃣ Testing push notifications...');
    
    const pushNotifications = [
      {
        userId: 1,
        title: 'Push Test - Admin',
        message: 'This is a test push notification for the admin user.',
        options: {
          url: '/admin/notifications',
          tag: 'admin-test'
        }
      },
      {
        userId: 2,
        title: 'Push Test - Therapist',
        message: 'This is a test push notification for the therapist user.',
        options: {
          url: '/therapist/notifications',
          tag: 'therapist-test'
        }
      },
      {
        userId: 7,
        title: 'Push Test - Patient',
        message: 'This is a test push notification for the patient user.',
        options: {
          url: '/patient/notifications',
          tag: 'patient-test'
        }
      }
    ];

    for (const pushNotification of pushNotifications) {
      const result = await sendPushNotification(
        pushNotification.userId,
        pushNotification.title,
        pushNotification.message,
        pushNotification.options
      );
      
      if (result.success) {
        console.log(`✅ Push notification sent to user ${pushNotification.userId}`);
      } else {
        console.log(`⚠️ Push notification failed for user ${pushNotification.userId}: ${result.message}`);
      }
    }

    // Test 3: Send role-based notifications
    console.log('\n3️⃣ Testing role-based notifications...');
    
    const roleNotifications = [
      {
        role: 'therapist',
        title: 'Therapist Update',
        message: 'New features are now available for therapists in TherapEase.',
        options: {
          url: '/therapist/dashboard',
          tag: 'therapist-update'
        }
      },
      {
        role: 'patient',
        title: 'Patient Update',
        message: 'Your therapy progress has been updated. Check your dashboard.',
        options: {
          url: '/patient/dashboard',
          tag: 'patient-update'
        }
      }
    ];

    for (const roleNotification of roleNotifications) {
      const results = await sendPushToRole(
        roleNotification.role,
        roleNotification.title,
        roleNotification.message,
        roleNotification.options
      );
      
      console.log(`✅ Role notification sent to ${roleNotification.role} role: ${results.length} users notified`);
    }

    // Test 4: Create appointment reminder
    console.log('\n4️⃣ Testing appointment reminder...');
    
    const appointmentReminderId = await createNotification(
      2, // Therapist
      'Appointment Reminder',
      'You have an appointment with Alexandra Santos in 30 minutes.',
      'appointment',
      { relatedId: 1 }
    );
    
    if (appointmentReminderId) {
      console.log('✅ Appointment reminder created successfully');
    } else {
      console.log('❌ Failed to create appointment reminder');
    }

    // Test 5: Create assessment due notification
    console.log('\n5️⃣ Testing assessment due notification...');
    
    const assessmentDueId = await createNotification(
      2, // Therapist
      'Assessment Due',
      'Progress assessment for Marcus Dela Cruz is due next week.',
      'assessment',
      { relatedId: 2 }
    );
    
    if (assessmentDueId) {
      console.log('✅ Assessment due notification created successfully');
    } else {
      console.log('❌ Failed to create assessment due notification');
    }

    console.log('\n🎉 Real notification testing completed!');
    console.log('\n📋 Summary:');
    console.log(`   • ${createdNotifications.length} database notifications created`);
    console.log(`   • ${pushNotifications.length} push notifications attempted`);
    console.log(`   • ${roleNotifications.length} role-based notifications sent`);
    console.log('   • Appointment and assessment notifications created');
    
    console.log('\n🔍 Next Steps:');
    console.log('1. Check the database for created notifications');
    console.log('2. Test the notification UI components');
    console.log('3. Verify push notifications appear in browser');
    console.log('4. Test notification actions (mark as read, delete)');
    console.log('5. Verify real-time updates via WebSocket');

  } catch (error) {
    console.error('❌ Real notification test failed:', error.message);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  testRealNotifications();
}

module.exports = testRealNotifications;
