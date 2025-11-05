#!/usr/bin/env node
/**
 * Add Optimization Indexes
 * Creates indexes recommended by query optimization analysis
 */

const path = require('path');
const fs = require('fs');

// Load environment variables
const possibleEnvFiles = [
  path.join(__dirname, '../.env.production'),
  path.join(__dirname, '../../.env.production'),
  path.join(__dirname, '../.env'),
  path.join(__dirname, '../../.env')
];

let envFile = null;
for (const file of possibleEnvFiles) {
  if (fs.existsSync(file)) {
    envFile = file;
    require('dotenv').config({ path: file });
    break;
  }
}

const mysql = require('mysql2/promise');

// Optimization indexes recommended by EXPLAIN analysis
const optimizationIndexes = [
  {
    name: 'idx_users_name_sort',
    table: 'users',
    columns: ['firstName', 'lastName'],
    description: 'Optimize ORDER BY firstName, lastName in patient queries'
  },
  {
    name: 'idx_notifications_user_created',
    table: 'notifications',
    columns: ['userId', 'createdAt'],
    description: 'Optimize ORDER BY createdAt DESC for user notifications'
  }
];

async function addOptimizationIndexes() {
  console.log('🔍 Adding Optimization Indexes');
  console.log('================================\n');

  // Create a separate connection for this script (don't use shared pool)
  const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'therapease',
    port: parseInt(process.env.DB_PORT || '3306')
  };

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to MySQL database successfully\n');

    for (const index of optimizationIndexes) {
      try {
        // Check if index already exists
        const [existing] = await connection.execute(`
          SELECT COUNT(*) as count 
          FROM information_schema.statistics 
          WHERE table_schema = DATABASE() 
          AND table_name = ? 
          AND index_name = ?
        `, [index.table, index.name]);

        if (existing[0]?.count > 0) {
          console.log(`ℹ️  Index already exists: ${index.name}`);
          continue;
        }

        // Create composite index
        const columns = index.columns.join(', ');
        const sql = `CREATE INDEX ${index.name} ON ${index.table}(${columns})`;
        
        await connection.execute(sql);
        console.log(`✅ Created index: ${index.name}`);
        console.log(`   Table: ${index.table}`);
        console.log(`   Columns: ${columns}`);
        console.log(`   Purpose: ${index.description}`);
        console.log('');

      } catch (error) {
        if (error.code === 'ER_DUP_KEYNAME' || error.message.includes('Duplicate key name')) {
          console.log(`ℹ️  Index already exists: ${index.name}`);
        } else {
          console.error(`❌ Error creating index ${index.name}:`, error.message);
        }
      }
    }

    console.log('✅ Optimization indexes check complete!');
    console.log('\n💡 These indexes will improve:');
    console.log('   - Patient list sorting (ORDER BY firstName, lastName)');
    console.log('   - Notification queries (ORDER BY createdAt DESC)');

  } catch (error) {
    console.error('❌ Error adding optimization indexes:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run script
addOptimizationIndexes().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});

