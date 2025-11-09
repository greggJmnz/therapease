#!/usr/bin/env node

/**
 * Debug script to check what database configuration the application is reading
 */

const path = require('path');
const fs = require('fs');

// Load environment variables the same way the application does
const envFile = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, 'server/.env.production')
  : path.join(__dirname, '.env');

console.log('🔍 Debugging Database Configuration');
console.log('====================================');
console.log('');
console.log('📋 Environment File Path:');
console.log('   Looking for:', envFile);
console.log('   Exists:', fs.existsSync(envFile) ? '✅ YES' : '❌ NO');

if (fs.existsSync(envFile)) {
  console.log('   Full path:', path.resolve(envFile));
  console.log('');
  
  // Load dotenv
  require('dotenv').config({ path: envFile });
  
  console.log('📋 Environment Variables Loaded:');
  console.log('   NODE_ENV:', process.env.NODE_ENV || '(not set)');
  console.log('   DB_HOST:', process.env.DB_HOST || '(not set)');
  console.log('   DB_USER:', process.env.DB_USER || '(not set)');
  console.log('   DB_NAME:', process.env.DB_NAME || '(not set)');
  console.log('   DB_PORT:', process.env.DB_PORT || '(not set)');
  console.log('   DB_PASSWORD:', process.env.DB_PASSWORD ? `${process.env.DB_PASSWORD.substring(0, 10)}... (${process.env.DB_PASSWORD.length} chars)` : '(not set)');
  console.log('');
  
  // Check raw file content
  console.log('📋 Raw File Content (DB_PASSWORD line):');
  const fileContent = fs.readFileSync(envFile, 'utf8');
  const dbPasswordLine = fileContent.split('\n').find(line => line.startsWith('DB_PASSWORD='));
  if (dbPasswordLine) {
    console.log('   ', dbPasswordLine);
  } else {
    console.log('   ❌ DB_PASSWORD line not found in file');
  }
  console.log('');
  
  // Test MySQL connection
  console.log('📋 Testing MySQL Connection:');
  const mysql = require('mysql2/promise');
  
  const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'therapease',
    port: parseInt(process.env.DB_PORT || '3306')
  };
  
  console.log('   Config:', {
    host: dbConfig.host,
    user: dbConfig.user,
    database: dbConfig.database,
    port: dbConfig.port,
    password: dbConfig.password ? `${dbConfig.password.substring(0, 10)}... (${dbConfig.password.length} chars)` : '(empty)'
  });
  
  mysql.createConnection(dbConfig)
    .then(connection => {
      console.log('   ✅ Connection successful!');
      return connection.query('SELECT 1 as test');
    })
    .then(([rows]) => {
      console.log('   ✅ Query successful:', rows);
      process.exit(0);
    })
    .catch(error => {
      console.log('   ❌ Connection failed:', error.message);
      console.log('   Error code:', error.code);
      console.log('   Error number:', error.errno);
      process.exit(1);
    });
} else {
  console.log('');
  console.log('❌ Environment file not found!');
  console.log('');
  console.log('💡 Check:');
  console.log('   1. File exists at:', envFile);
  console.log('   2. NODE_ENV is set correctly');
  console.log('   3. File path is correct');
  process.exit(1);
}

