const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const addStatusColumn = async () => {
  let connection;
  
  try {
    console.log('🔧 Adding status column to home_exercises table...\n');
    
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'therapease_db'
    });

    console.log('✅ Connected to database successfully\n');

    // Check if status column already exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'home_exercises' 
      AND COLUMN_NAME = 'status'
    `);
    
    if (columns.length > 0) {
      console.log('✅ Status column already exists');
      return;
    }

    // Add status column
    await connection.execute(`
      ALTER TABLE home_exercises 
      ADD COLUMN status ENUM('assigned', 'in_progress', 'completed', 'overdue') DEFAULT 'assigned' 
      AFTER dueDate
    `);
    
    console.log('✅ Status column added successfully');
    
    // Update existing records to have 'assigned' status
    await connection.execute(`
      UPDATE home_exercises 
      SET status = 'assigned' 
      WHERE status IS NULL
    `);
    
    console.log('✅ Existing records updated with default status');
    
  } catch (error) {
    console.error('❌ Error adding status column:', error.message);
    console.error(error.stack);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Run the script
if (require.main === module) {
  addStatusColumn();
}

module.exports = { addStatusColumn };
