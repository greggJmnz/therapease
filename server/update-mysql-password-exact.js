#!/usr/bin/env node

/**
 * Script to update MySQL password using the exact value Node.js reads from .env.production
 * This ensures the exact same encoding is used
 * Run: cd server && NODE_ENV=production node update-mysql-password-exact.js
 */

const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

// Load environment variables the same way the application does
require('dotenv').config({path: path.join(__dirname, '.env.production')});

const DB_PASSWORD = process.env.DB_PASSWORD.trim();
const DB_USER = process.env.DB_USER || 'therapease_user';
const DB_NAME = process.env.DB_NAME || 'therapease_db';

console.log('🔧 Updating MySQL Password Using Exact Node.js Value');
console.log('=====================================================');
console.log('');
console.log('📋 Configuration:');
console.log('   DB_USER:', DB_USER);
console.log('   DB_PASSWORD:', DB_PASSWORD.substring(0, 10) + '... (' + DB_PASSWORD.length + ' chars)');
console.log('   Password bytes (hex):', Buffer.from(DB_PASSWORD).toString('hex'));
console.log('   Password bytes (decimal):', Array.from(Buffer.from(DB_PASSWORD)).join(','));
console.log('');

// Connect using sudo mysql (no password needed)
// We'll use a child process to run sudo mysql
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Create SQL commands
const sqlCommands = `
ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD.replace(/'/g, "''")}';
ALTER USER '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASSWORD.replace(/'/g, "''")}';
FLUSH PRIVILEGES;
`;

console.log('📝 Step 1: Updating MySQL password using sudo...');
console.log('   (Using the exact password value Node.js reads)');

// Write SQL to temp file
const sqlFile = '/tmp/update_mysql_password_exact.sql';
fs.writeFileSync(sqlFile, sqlCommands);

// Execute using sudo mysql
execPromise(`sudo mysql < ${sqlFile}`)
  .then(() => {
    console.log('✅ MySQL password updated!');
    fs.unlinkSync(sqlFile);
    
    // Wait a moment for privileges to take effect
    return new Promise(resolve => setTimeout(resolve, 1000));
  })
  .then(() => {
    // Test connection with the exact password Node.js will use
    console.log('');
    console.log('📝 Step 2: Testing connection with exact Node.js password...');
    const testConfig = {
      host: 'localhost',
      user: DB_USER,
      password: DB_PASSWORD, // Use the exact value Node.js reads
      database: DB_NAME,
      port: 3306
    };
    
    return mysql.createConnection(testConfig);
  })
  .then(conn => {
    console.log('✅ Connection test successful!');
    return conn.query('SELECT 1 as test');
  })
  .then(([rows]) => {
    console.log('✅ Query test successful:', rows);
    console.log('');
    console.log('✅ SUCCESS! MySQL password updated and verified!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('   1. Restart PM2: pm2 restart therapease-api --update-env');
    console.log('   2. Check logs: pm2 logs therapease-api --lines 50');
    console.log('   3. Look for "Connected to MySQL database successfully"');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    if (err.code) {
      console.error('   Error code:', err.code);
    }
    if (err.errno) {
      console.error('   Error number:', err.errno);
    }
    if (fs.existsSync(sqlFile)) {
      console.log('');
      console.log('💡 SQL file saved at:', sqlFile);
      console.log('   You can run it manually: sudo mysql <', sqlFile);
    }
    process.exit(1);
  });

