#!/usr/bin/env node

/**
 * Script to update MySQL password using Node.js to ensure exact encoding match
 * Run: cd server && NODE_ENV=production node update-mysql-password.js
 */

const mysql = require('mysql2/promise');
const path = require('path');
const readline = require('readline');

// Load environment variables
require('dotenv').config({path: path.join(__dirname, '.env.production')});

const DB_PASSWORD = process.env.DB_PASSWORD.trim();
const DB_USER = process.env.DB_USER || 'therapease_user';
const DB_NAME = process.env.DB_NAME || 'therapease_db';

console.log('🔧 Updating MySQL Password Using Node.js');
console.log('=========================================');
console.log('');
console.log('📋 Configuration:');
console.log('   DB_USER:', DB_USER);
console.log('   DB_PASSWORD:', DB_PASSWORD.substring(0, 10) + '... (' + DB_PASSWORD.length + ' chars)');
console.log('   Password bytes:', Buffer.from(DB_PASSWORD).toString('hex'));
console.log('');

// Prompt for root password
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter MySQL root password: ', (rootPassword) => {
  rl.close();
  
  const rootConfig = {
    host: 'localhost',
    user: 'root',
    password: rootPassword,
    port: 3306
  };
  
  mysql.createConnection(rootConfig)
    .then(conn => {
      console.log('✅ Connected to MySQL as root');
      
      // Update password using parameterized query for password
      return conn.query(`ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY ?`, [DB_PASSWORD])
        .then(() => {
          console.log('✅ Updated password for localhost');
          return conn.query(`ALTER USER '${DB_USER}'@'127.0.0.1' IDENTIFIED BY ?`, [DB_PASSWORD]);
        })
        .then(() => {
          console.log('✅ Updated password for 127.0.0.1');
          return conn.query('FLUSH PRIVILEGES');
        })
        .then(() => {
          console.log('✅ Flushed privileges');
          conn.end();
          
          // Wait a moment for privileges to take effect
          return new Promise(resolve => setTimeout(resolve, 1000));
        })
        .then(() => {
          // Test connection with new password
          console.log('');
          console.log('📝 Testing connection with new password...');
          const testConfig = {
            host: 'localhost',
            user: DB_USER,
            password: DB_PASSWORD,
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
          console.error('   Error code:', err.code);
          console.error('   Error number:', err.errno);
          process.exit(1);
        });
    })
    .catch(err => {
      console.error('❌ Failed to connect as root:', err.message);
      process.exit(1);
    });
});

