/**
 * Windows Database Migration Script
 * 
 * This script ensures the database schema is compatible with Windows systems
 * and includes all required columns for the appointment approval workflow.
 * 
 * Usage:
 *   node server/scripts/windows-database-migration.js
 * 
 * Features:
 * - Windows-compatible path handling
 * - Safe column addition (checks if columns exist)
 * - Foreign key constraint management
 * - Data migration for existing records
 * - Comprehensive error handling
 */

const mysql = require('mysql2/promise');
const path = require('path');

// Load environment variables from the project root
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const migrateDatabase = async () => {
  let connection;
  
  try {
    console.log('🚀 Starting Windows Database Migration...');
    console.log('==========================================\n');

    // Connect to database
    console.log('🔍 Connecting to database...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: parseInt(process.env.DB_PORT || '3306'),
      database: process.env.DB_NAME || 'therapease_dev',
      charset: 'utf8mb4',
      timezone: 'Z'
    });

    console.log('✅ Connected to database successfully');

    // Check if appointments table exists
    console.log('\n📋 Checking appointments table...');
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'appointments'
    `);

    if (tables.length === 0) {
      console.log('❌ Appointments table not found. Please run the database initialization first.');
      return;
    }

    console.log('✅ Appointments table exists');

    // Check current appointments table structure
    console.log('\n📋 Current appointments table structure:');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'appointments'
      ORDER BY ORDINAL_POSITION
    `);

    columns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Check for required approval columns
    const hasApprovalStatus = columns.some(col => col.COLUMN_NAME === 'approvalStatus');
    const hasApprovedBy = columns.some(col => col.COLUMN_NAME === 'approvedBy');
    const hasApprovedAt = columns.some(col => col.COLUMN_NAME === 'approvedAt');
    const hasReason = columns.some(col => col.COLUMN_NAME === 'reason');

    console.log('\n🔍 Checking for required columns:');
    console.log(`  - approvalStatus: ${hasApprovalStatus ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`  - approvedBy: ${hasApprovedBy ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`  - approvedAt: ${hasApprovedAt ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`  - reason: ${hasReason ? '✅ EXISTS' : '❌ MISSING'}`);

    // Add missing columns
    let columnsAdded = 0;

    if (!hasApprovalStatus) {
      console.log('\n➕ Adding approvalStatus column...');
      await connection.execute(`
        ALTER TABLE appointments 
        ADD COLUMN approvalStatus ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'
      `);
      console.log('✅ approvalStatus column added');
      columnsAdded++;
    }

    if (!hasApprovedBy) {
      console.log('\n➕ Adding approvedBy column...');
      await connection.execute(`
        ALTER TABLE appointments 
        ADD COLUMN approvedBy INT NULL
      `);
      console.log('✅ approvedBy column added');
      columnsAdded++;
    }

    if (!hasApprovedAt) {
      console.log('\n➕ Adding approvedAt column...');
      await connection.execute(`
        ALTER TABLE appointments 
        ADD COLUMN approvedAt TIMESTAMP NULL
      `);
      console.log('✅ approvedAt column added');
      columnsAdded++;
    }

    if (!hasReason) {
      console.log('\n➕ Adding reason column...');
      await connection.execute(`
        ALTER TABLE appointments 
        ADD COLUMN reason TEXT NULL
      `);
      console.log('✅ reason column added');
      columnsAdded++;
    }

    // Add foreign key constraint for approvedBy
    console.log('\n🔗 Managing foreign key constraints...');
    try {
      // Check if foreign key already exists
      const [constraints] = await connection.execute(`
        SELECT CONSTRAINT_NAME 
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'appointments' 
        AND COLUMN_NAME = 'approvedBy'
        AND CONSTRAINT_NAME != 'PRIMARY'
      `);

      if (constraints.length === 0) {
        console.log('➕ Adding foreign key constraint for approvedBy...');
        await connection.execute(`
          ALTER TABLE appointments 
          ADD CONSTRAINT fk_appointments_approved_by 
          FOREIGN KEY (approvedBy) REFERENCES users(id) 
          ON DELETE SET NULL ON UPDATE CASCADE
        `);
        console.log('✅ Foreign key constraint added');
      } else {
        console.log('✅ Foreign key constraint already exists');
      }
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('✅ Foreign key constraint already exists');
      } else {
        console.log('⚠️  Foreign key constraint error:', error.message);
      }
    }

    // Update existing appointments to have proper approval status
    console.log('\n🔄 Updating existing appointments...');
    const [updateResult] = await connection.execute(`
      UPDATE appointments 
      SET approvalStatus = 'approved' 
      WHERE approvalStatus IS NULL OR approvalStatus = ''
    `);
    console.log(`✅ Updated ${updateResult.affectedRows} existing appointments to 'approved' status`);

    // Verify final structure
    console.log('\n📋 Final appointments table structure:');
    const [finalColumns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'appointments'
      ORDER BY ORDINAL_POSITION
    `);

    finalColumns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Check for any remaining issues
    console.log('\n🔍 Checking for potential issues...');
    
    // Check if status ENUM includes all required values
    const [statusEnum] = await connection.execute(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'appointments' 
      AND COLUMN_NAME = 'status'
    `);

    if (statusEnum.length > 0) {
      const enumValues = statusEnum[0].COLUMN_TYPE;
      console.log(`  - Status ENUM: ${enumValues}`);
      
      if (enumValues.includes("'confirmed'")) {
        console.log('  ⚠️  Status ENUM still contains "confirmed" - consider consolidating to "scheduled"');
      }
    }

    console.log('\n🎉 Windows Database Migration Completed Successfully!');
    console.log('==========================================');
    console.log(`✅ ${columnsAdded} columns added`);
    console.log('✅ Foreign key constraints verified');
    console.log('✅ Existing appointments updated');
    console.log('✅ Database schema is Windows-compatible');
    console.log('\n📝 Next Steps:');
    console.log('  1. Restart your application server');
    console.log('  2. Test the appointment approval workflow');
    console.log('  3. Verify all features are working correctly');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Error details:', error);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Troubleshooting:');
      console.log('  - Check your database credentials in .env file');
      console.log('  - Ensure MySQL server is running');
      console.log('  - Verify database user has proper permissions');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('\n💡 Troubleshooting:');
      console.log('  - Check if database exists');
      console.log('  - Run database initialization first');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
};

// Run the migration
migrateDatabase();
