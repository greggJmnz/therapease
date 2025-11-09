#!/bin/bash

# Script to fix MySQL password to work with Node.js

set -e

echo "🔧 Fixing MySQL Password for Node.js"
echo "===================================="

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

# Get password from .env.production and trim it
DB_PASSWORD=$(grep "^DB_PASSWORD=" "$SERVER_ENV" | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)
DB_USER=$(grep "^DB_USER=" "$SERVER_ENV" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs || echo "therapease_user")

echo ""
echo "📋 Password from .env.production (trimmed):"
echo "   DB_USER: $DB_USER"
echo "   DB_PASSWORD: $DB_PASSWORD"
echo "   Password length: ${#DB_PASSWORD} characters"

# Update MySQL password using Node.js to ensure exact match
echo ""
echo "📝 Step 1: Updating MySQL password using Node.js..."
echo "   (This ensures the password is set exactly as Node.js will use it)"
echo "   (You will be prompted for MySQL root password)"

cd server
NODE_ENV=production node << 'EOF'
const mysql = require('mysql2/promise');
const path = require('path');
const readline = require('readline');

require('dotenv').config({path: path.join(__dirname, '.env.production')});

const DB_PASSWORD = process.env.DB_PASSWORD.trim();
const DB_USER = process.env.DB_USER || 'therapease_user';

console.log('Password to set:', DB_PASSWORD);
console.log('Password length:', DB_PASSWORD.length);
console.log('User:', DB_USER);

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
      
      // Update password
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
          
          // Test connection with new password
          console.log('');
          console.log('📝 Step 2: Testing connection with new password...');
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
          console.log('✅ MySQL password updated and verified!');
          process.exit(0);
        })
        .catch(err => {
          console.error('❌ Error:', err.message);
          process.exit(1);
        });
    })
    .catch(err => {
      console.error('❌ Failed to connect as root:', err.message);
      process.exit(1);
    });
});
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "================================================"
    echo "📊 Summary"
    echo "================================================"
    echo -e "${GREEN}✅ MySQL password updated successfully!${NC}"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Restart PM2: pm2 restart therapease-api --update-env"
    echo "   2. Check logs: pm2 logs therapease-api --lines 50"
    echo "   3. Look for 'Connected to MySQL database successfully'"
else
    echo ""
    echo "❌ Failed to update password. Please try manually:"
    echo ""
    echo "   sudo mysql -u root -p"
    echo "   ALTER USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';"
    echo "   ALTER USER '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$DB_PASSWORD';"
    echo "   FLUSH PRIVILEGES;"
    echo "   EXIT;"
fi

