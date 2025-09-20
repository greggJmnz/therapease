#!/usr/bin/env node

/**
 * Test Database Notifications Script for TherapEase
 * Creates real notifications in the database without push notifications
 */

require('dotenv').config();
const { runQuery, getRow, getAll } = require('../config/database');

const testDatabaseNotifications = async () => {
  console.log('🧪 Testing Database Notifications...\n');

  try {
    // Test 1: Create notifications directly in database
    console.log('1️⃣ Creating notifications in database...');
    
    const notifications = [
      {
        userId: 1, // Admin user
        title: 'System Test Notification',
        message: 'This is a test notification from the TherapEase system to verify functionality.',
        type: 'system',
        isRead: false
      },
      {
        userId: 2, // First therapist
        title: 'Appointment Reminder',
        message: 'You have a therapy session with Alexandra Santos tomorrow at 9:00 AM.',
        type: 'appointment',
        isRead: false,
        relatedId: 1
      },
      {
        userId: 3, // Second therapist
        title: 'Assessment Due',
        message: 'Progress assessment for Marcus Dela Cruz is due next week.',
        type: 'assessment',
        isRead: false,
        relatedId: 2
      },
      {
        userId: 7, // First patient
        title: 'New Therapy Note',
        message: 'Dr. Aleli Ong has added a new note from your recent session.',
        type: 'note',
        isRead: false,
        relatedId: 3
      },
      {
        userId: 8, // Second patient
        title: 'Progress Update',
        message: 'Great progress! You\'ve achieved 2 new milestones this month.',
        type: 'progress',
        isRead: false,
        relatedId: 4
      },
      {
        userId: 2, // Therapist
        title: 'Patient Milestone',
        message: 'Alexandra Santos has achieved her fine motor skills goal.',
        type: 'achievement',
        isRead: true,
        relatedId: 5
      },
      {
        userId: 7, // Patient
        title: 'Home Exercise Reminder',
        message: 'Don\'t forget to complete your daily home exercises today.',
        type: 'reminder',
        isRead: true,
        relatedId: 6
      },
      {
        userId: 1, // Admin
        title: 'System Maintenance',
        message: 'Scheduled maintenance tonight from 10 PM to 2 AM.',
        type: 'system',
        isRead: true
      }
    ];

    const createdNotifications = [];
    for (const notification of notifications) {
      try {
        const result = await runQuery(`
          INSERT INTO notifications (userId, title, message, type, isRead, createdAt)
          VALUES (?, ?, ?, ?, ?, NOW())
        `, [
          notification.userId,
          notification.title,
          notification.message,
          notification.type,
          notification.isRead ? 1 : 0
        ]);
        
        createdNotifications.push(result.insertId);
        console.log(`✅ Created notification for user ${notification.userId}: ${notification.title}`);
      } catch (error) {
        console.log(`❌ Failed to create notification for user ${notification.userId}: ${error.message}`);
      }
    }

    console.log(`\n📊 Created ${createdNotifications.length} notifications in database`);

    // Test 2: Verify notifications were created
    console.log('\n2️⃣ Verifying notifications...');
    
    const [countResult] = await getAll('SELECT COUNT(*) as total FROM notifications');
    console.log(`✅ Total notifications in database: ${countResult.total}`);

    const [unreadResult] = await getAll('SELECT COUNT(*) as unread FROM notifications WHERE isRead = 0');
    console.log(`✅ Unread notifications: ${unreadResult.unread}`);

    // Test 3: Get notifications for each user
    console.log('\n3️⃣ Testing notification retrieval...');
    
    const users = [1, 2, 3, 7, 8];
    for (const userId of users) {
      const userNotifications = await getAll(`
        SELECT id, title, message, type, isRead, createdAt
        FROM notifications 
        WHERE userId = ? 
        ORDER BY createdAt DESC
        LIMIT 5
      `, [userId]);
      
      console.log(`📱 User ${userId} has ${userNotifications.length} notifications`);
      userNotifications.forEach(notif => {
        console.log(`   - ${notif.title} (${notif.type}) - ${notif.isRead ? 'Read' : 'Unread'}`);
      });
    }

    // Test 4: Test notification statistics
    console.log('\n4️⃣ Testing notification statistics...');
    
    const stats = await getAll(`
      SELECT 
        type,
        COUNT(*) as count,
        SUM(CASE WHEN isRead = 0 THEN 1 ELSE 0 END) as unread
      FROM notifications 
      GROUP BY type
    `);
    
    console.log('📊 Notification statistics by type:');
    stats.forEach(stat => {
      console.log(`   ${stat.type}: ${stat.count} total, ${stat.unread} unread`);
    });

    // Test 5: Test notification actions
    console.log('\n5️⃣ Testing notification actions...');
    
    // Mark first notification as read
    if (createdNotifications.length > 0) {
      await runQuery(
        'UPDATE notifications SET isRead = 1 WHERE id = ?',
        [createdNotifications[0]]
      );
      console.log('✅ Marked first notification as read');
    }

    // Delete last notification
    if (createdNotifications.length > 1) {
      await runQuery(
        'DELETE FROM notifications WHERE id = ?',
        [createdNotifications[createdNotifications.length - 1]]
      );
      console.log('✅ Deleted last notification');
    }

    console.log('\n🎉 Database notification testing completed!');
    console.log('\n📋 Summary:');
    console.log(`   • ${createdNotifications.length} notifications created`);
    console.log(`   • Notifications verified in database`);
    console.log(`   • User notification retrieval tested`);
    console.log(`   • Statistics calculated`);
    console.log(`   • Notification actions tested`);
    
    console.log('\n🔍 Next Steps:');
    console.log('1. Start the server: npm run dev');
    console.log('2. Start the client: cd ../client && npm start');
    console.log('3. Login with test accounts');
    console.log('4. Check notification pages for real data');
    console.log('5. Test notification actions (mark as read, delete)');

  } catch (error) {
    console.error('❌ Database notification test failed:', error.message);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  testDatabaseNotifications();
}

module.exports = testDatabaseNotifications;
