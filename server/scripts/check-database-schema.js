#!/usr/bin/env node
/**
 * Database Schema Checker
 * Verifies that all required columns exist in the database
 * and reports any mismatches between code and schema
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.production') });

const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'therapease',
  port: parseInt(process.env.DB_PORT || '3306'),
};

async function checkColumnExists(connection, tableName, columnName) {
  try {
    const [rows] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = ? 
      AND COLUMN_NAME = ?
    `, [tableName, columnName]);
    return rows.length > 0;
  } catch (error) {
    console.error(`Error checking column ${tableName}.${columnName}:`, error.message);
    return false;
  }
}

async function checkTableExists(connection, tableName) {
  try {
    const [rows] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = ?
    `, [tableName]);
    return rows.length > 0;
  } catch (error) {
    console.error(`Error checking table ${tableName}:`, error.message);
    return false;
  }
}

async function checkDatabaseSchema() {
  let connection;
  
  try {
    console.log('==========================================');
    console.log('  Database Schema Checker');
    console.log('==========================================');
    console.log('');
    
    // Connect to database
    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');
    console.log('');
    
    // Required columns to check
    const requiredColumns = {
      notifications: [
        'id',
        'userId',
        'title',
        'message',
        'type',
        'isRead',
        'priority',  // This is the problematic column
        'relatedId',
        'smsMessageId',
        'smsStatus',
        'smsSentAt',
        'createdAt',
        'updatedAt'
      ],
      users: [
        'id',
        'email',
        'password',
        'firstName',
        'lastName',
        'role',
        'status',
        'createdAt',
        'updatedAt'
      ],
      patients: [
        'id',
        'userId',
        'therapistId',
        'diagnosis',
        'medicalHistory',
        'goals',
        'createdAt',
        'updatedAt'
      ],
      therapists: [
        'id',
        'userId',
        'licenseNumber',
        'specialization',
        'yearsOfExperience',
        'maxPatients',
        'isAcceptingPatients',
        'status',
        'createdAt',
        'updatedAt'
      ],
      appointments: [
        'id',
        'patientId',
        'therapistId',
        'appointmentDate',
        'startTime',
        'endTime',
        'status',
        'createdAt',
        'updatedAt'
      ]
    };
    
    let allGood = true;
    const missingColumns = [];
    
    // Check each table
    for (const [tableName, columns] of Object.entries(requiredColumns)) {
      console.log(`Checking table: ${tableName}...`);
      
      // Check if table exists
      const tableExists = await checkTableExists(connection, tableName);
      if (!tableExists) {
        console.log(`❌ Table ${tableName} does not exist!`);
        allGood = false;
        missingColumns.push({ table: tableName, column: 'TABLE_MISSING' });
        continue;
      }
      
      // Check each column
      for (const columnName of columns) {
        const exists = await checkColumnExists(connection, tableName, columnName);
        if (!exists) {
          console.log(`  ❌ Column ${tableName}.${columnName} is MISSING`);
          allGood = false;
          missingColumns.push({ table: tableName, column: columnName });
        } else {
          console.log(`  ✅ Column ${tableName}.${columnName} exists`);
        }
      }
      console.log('');
    }
    
    // Summary
    console.log('==========================================');
    console.log('  Summary');
    console.log('==========================================');
    console.log('');
    
    if (allGood) {
      console.log('✅ All required columns exist!');
      console.log('   Database schema matches application code.');
    } else {
      console.log('❌ Missing columns detected:');
      missingColumns.forEach(({ table, column }) => {
        if (column === 'TABLE_MISSING') {
          console.log(`   - Table ${table} does not exist`);
        } else {
          console.log(`   - ${table}.${column}`);
        }
      });
      console.log('');
      console.log('💡 Run database migration to add missing columns:');
      console.log('   The migration code in server/config/database.js should add these automatically.');
      console.log('   If not, you may need to run the migration manually.');
    }
    console.log('');
    
  } catch (error) {
    console.error('❌ Database schema check failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the check
checkDatabaseSchema().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

