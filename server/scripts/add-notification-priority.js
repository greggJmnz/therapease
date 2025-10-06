const { getConnection } = require('../config/database');

const addNotificationPriority = async () => {
  let connection;
  try {
    console.log('🔄 Adding priority column to notifications table...');

    connection = await getConnection();

    // Check if priority column exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'notifications'
      AND COLUMN_NAME = 'priority'
    `);

    if (columns.length === 0) {
      await connection.execute(`
        ALTER TABLE notifications
        ADD COLUMN priority ENUM('low', 'medium', 'high') DEFAULT 'medium'
      `);
      console.log('✅ Added priority column to notifications table');
    } else {
      console.log('ℹ️  Priority column already exists');
    }

    // Update existing notifications with default priority
    await connection.execute(`
      UPDATE notifications
      SET priority = 'medium'
      WHERE priority IS NULL
    `);
    console.log('✅ Updated existing notifications with default priority');

  } catch (error) {
    console.error('❌ Error adding notification priority:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const runMigration = async () => {
  try {
    await addNotificationPriority();
    console.log('🎉 Notification priority migration completed successfully!');
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
};

if (require.main === module) {
  runMigration();
}

module.exports = { addNotificationPriority };
