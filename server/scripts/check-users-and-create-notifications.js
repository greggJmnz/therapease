#!/usr/bin/env node

/**
 * Check Users and Create Notifications Script
 * First checks what users exist, then creates notifications for them
 */

require('dotenv').config();
const { runQuery, getRow, getAll } = require('../config/database');

const checkUsersAndCreateNotifications = async () => {
  console.log('🔍 Checking users and creating notifications...\n');

  try {
    // First, check what users exist
    console.log('1️⃣ Checking existing users...');
    const users = await getAll('SELECT id, email, role, firstName, lastName FROM users ORDER BY id');
    
    console.log(`📊 Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`   ID: ${user.id} | ${user.email} | ${user.role} | ${user.firstName} ${user.lastName}`);
    });

    if (users.length === 0) {
      console.log('❌ No users found. Please run the seeding script first.');
      return;
    }

    // Create notifications for existing users
    console.log('\n2️⃣ Creating notifications for existing users...');
    
    const notifications = [
      {
        userId: users[0].id, // First user
        title: 'Welcome to TherapEase',
        message: 'Welcome to the TherapEase system! You can now start using all the features.',
        type: 'system',
        isRead: false
      },
      {
        userId: users[0].id,
        title: 'System Update',
        message: 'A new version of TherapEase is available with enhanced features.',
        type: 'system',
        isRead: true
      }
    ];

    // Add more notifications if we have more users
    if (users.length > 1) {
      notifications.push({
        userId: users[1].id,
        title: 'New Patient Assignment',
        message: 'You have been assigned a new patient. Please review their profile.',
        type: 'patient',
        isRead: false
      });
    }

    if (users.length > 2) {
      notifications.push({
        userId: users[2].id,
        title: 'Assessment Reminder',
        message: 'You have an assessment due next week. Please schedule it.',
        type: 'assessment',
        isRead: false
      });
    }

    // Add patient notifications
    const patientUsers = users.filter(user => user.role === 'patient');
    if (patientUsers.length > 0) {
      notifications.push({
        userId: patientUsers[0].id,
        title: 'Appointment Reminder',
        message: 'Your therapy session is scheduled for tomorrow at 9:00 AM.',
        type: 'appointment',
        isRead: false
      });
    }

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

    console.log(`\n📊 Created ${createdNotifications.length} notifications`);

    // Verify notifications were created
    console.log('\n3️⃣ Verifying notifications...');
    
    const [countResult] = await getAll('SELECT COUNT(*) as total FROM notifications');
    console.log(`✅ Total notifications in database: ${countResult.total}`);

    const [unreadResult] = await getAll('SELECT COUNT(*) as unread FROM notifications WHERE isRead = 0');
    console.log(`✅ Unread notifications: ${unreadResult.unread}`);

    // Show notifications by user
    console.log('\n4️⃣ Notifications by user:');
    for (const user of users) {
      const userNotifications = await getAll(`
        SELECT id, title, message, type, isRead, createdAt
        FROM notifications 
        WHERE userId = ? 
        ORDER BY createdAt DESC
      `, [user.id]);
      
      console.log(`📱 ${user.firstName} ${user.lastName} (${user.role}): ${userNotifications.length} notifications`);
      userNotifications.forEach(notif => {
        console.log(`   - ${notif.title} (${notif.type}) - ${notif.isRead ? 'Read' : 'Unread'}`);
      });
    }

    console.log('\n🎉 Notification creation completed!');
    console.log('\n🔍 Next Steps:');
    console.log('1. Start the server: npm run dev');
    console.log('2. Start the client: cd ../client && npm start');
    console.log('3. Login with test accounts');
    console.log('4. Check notification pages for real data');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  checkUsersAndCreateNotifications();
}

module.exports = checkUsersAndCreateNotifications;
