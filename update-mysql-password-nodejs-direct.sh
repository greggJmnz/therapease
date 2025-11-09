#!/bin/bash

# Script to update MySQL password using Node.js to ensure exact encoding match

set -e

echo "🔧 Updating MySQL Password Using Node.js"
echo "========================================="

cd /home/therapease_user/therapease || {
    echo "❌ Error: Could not navigate to project directory"
    exit 1
}

SERVER_ENV="server/.env.production"

if [ ! -f "$SERVER_ENV" ]; then
    echo "❌ Error: $SERVER_ENV not found!"
    exit 1
fi

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "📝 This script will update MySQL password using Node.js"
echo "   to ensure the exact same encoding is used."
echo ""
read -p "Enter MySQL root password: " -s ROOT_PASSWORD
echo ""

cd server
NODE_ENV=production node << EOF
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

require('dotenv').config({path: path.join(__dirname, '.env.production')});

const DB_PASSWORD = process.env.DB_PASSWORD.trim();
const DB_USER = process.env.DB_USER || 'therapease_user';
const ROOT_PASSWORD = process.argv[1] || '$ROOT_PASSWORD';

console.log('📋 Configuration:');
console.log('   DB_USER:', DB_USER);
console.log('   DB_PASSWORD:', DB_PASSWORD.substring(0, 10) + '... (' + DB_PASSWORD.length + ' chars)');
console.log('   Password bytes:', Buffer.from(DB_PASSWORD).toString('hex'));
console.log('');

// Connect as root
const rootConfig = {
  host: 'localhost',
  user: 'root',
  password: ROOT_PASSWORD,
  port: 3306
};

mysql.createConnection(rootConfig)
  .then(conn => {
    console.log('✅ Connected to MySQL as root');
    
    // Update password - use parameterized query for password to ensure exact encoding
    // Note: MySQL doesn't allow username as parameter, so we use string interpolation for user
    return conn.query(\`ALTER USER '\${DB_USER}'@'localhost' IDENTIFIED BY ?\`, [DB_PASSWORD])
      .then(() => {
        console.log('✅ Updated password for localhost');
        return conn.query(\`ALTER USER '\${DB_USER}'@'127.0.0.1' IDENTIFIED BY ?\`, [DB_PASSWORD]);
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
          database: process.env.DB_NAME || 'therapease_db',
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
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "================================================"
    echo "📊 Summary"
    echo "================================================"
    echo -e "${GREEN}✅ MySQL password updated successfully using Node.js!${NC}"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Restart PM2: pm2 restart therapease-api --update-env"
    echo "   2. Check logs: pm2 logs therapease-api --lines 50"
    echo "   3. Look for 'Connected to MySQL database successfully'"
else
    echo ""
    echo -e "${RED}❌ Failed to update password${NC}"
    echo "   Please check the error messages above"
fi

