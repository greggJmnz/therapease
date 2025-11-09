#!/bin/bash

# Script to update MySQL password using sudo (no root password needed)

set -e

echo "🔧 Updating MySQL Password Using sudo"
echo "======================================"

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

# Get password from .env.production
DB_PASSWORD=$(grep "^DB_PASSWORD=" "$SERVER_ENV" | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)
DB_USER=$(grep "^DB_USER=" "$SERVER_ENV" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs || echo "therapease_user")
DB_NAME=$(grep "^DB_NAME=" "$SERVER_ENV" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs || echo "therapease_db")

echo ""
echo "📋 Configuration:"
echo "   DB_USER: $DB_USER"
echo "   DB_PASSWORD: $DB_PASSWORD"
echo "   DB_NAME: $DB_NAME"
echo "   Password length: ${#DB_PASSWORD} characters"

# Update MySQL password using sudo (no password needed)
echo ""
echo "📝 Step 1: Updating MySQL password using sudo..."
SQL_FILE="/tmp/update_mysql_password_sudo.sql"
cat > "$SQL_FILE" << EOF
ALTER USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
ALTER USER '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$DB_PASSWORD';
FLUSH PRIVILEGES;
EOF

if sudo mysql < "$SQL_FILE" 2>/dev/null; then
    echo -e "${GREEN}✅ MySQL password updated!${NC}"
    rm -f "$SQL_FILE"
else
    echo -e "${RED}❌ Failed to update password${NC}"
    echo "   SQL file: $SQL_FILE"
    echo "   Please check the SQL file and run manually:"
    echo "   sudo mysql < $SQL_FILE"
    exit 1
fi

# Test connection
echo ""
echo "📝 Step 2: Testing connection..."
if mysql -h localhost -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" 2>&1 | grep -q "ERROR"; then
    echo -e "${RED}❌ Connection test failed${NC}"
else
    echo -e "${GREEN}✅ Connection test successful!${NC}"
fi

# Test with Node.js
echo ""
echo "📝 Step 3: Testing with Node.js..."
cd server
NODE_ENV=production node -e "
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({path: path.join(__dirname, '.env.production')});

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'therapease_user',
  password: process.env.DB_PASSWORD.trim(),
  database: process.env.DB_NAME || 'therapease_db',
  port: parseInt(process.env.DB_PORT || '3306')
};

console.log('Password from dotenv:', dbConfig.password.substring(0, 10) + '... (' + dbConfig.password.length + ' chars)');

mysql.createConnection(dbConfig)
  .then(conn => {
    console.log('✅ Node.js MySQL connection successful!');
    conn.end();
    process.exit(0);
  })
  .catch(err => {
    console.log('❌ Node.js MySQL connection failed:', err.message);
    console.log('Error code:', err.code);
    process.exit(1);
  });
" 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "================================================"
    echo "📊 Summary"
    echo "================================================"
    echo -e "${GREEN}✅ SUCCESS! MySQL password updated and Node.js connection works!${NC}"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Restart PM2: pm2 restart therapease-api --update-env"
    echo "   2. Check logs: pm2 logs therapease-api --lines 50"
    echo "   3. Look for 'Connected to MySQL database successfully'"
else
    echo ""
    echo -e "${RED}❌ Node.js connection still failing${NC}"
    echo "   The password might need special handling."
    echo "   Let's try updating it using Node.js directly..."
    echo ""
    echo "   Run: cd server && NODE_ENV=production node update-mysql-password.js"
    echo "   (But use sudo mysql instead of root password)"
fi

