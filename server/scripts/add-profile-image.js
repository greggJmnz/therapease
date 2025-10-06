const { getConnection } = require('../config/database');

const addProfileImage = async () => {
  let connection;
  try {
    console.log('🔄 Adding profileImage column to users table...');
    connection = await getConnection();

    // Check if profileImage column already exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'profileImage'
    `);

    if (columns.length === 0) {
      await connection.execute(`
        ALTER TABLE users
        ADD COLUMN profileImage VARCHAR(500) NULL
      `);
      console.log('✅ Added profileImage column to users table');
    } else {
      console.log('ℹ️  profileImage column already exists');
    }

    console.log('🎉 Profile image migration completed successfully!');
  } catch (error) {
    console.error('❌ Error adding profile image column:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

if (require.main === module) {
  addProfileImage()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { addProfileImage };
