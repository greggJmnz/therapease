#!/bin/bash

# Script to remove quotes from DB_PASSWORD in .env.production

set -e

echo "🔧 Fixing DB_PASSWORD Quotes in .env.production"
echo "================================================"

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

# Backup
BACKUP_FILE="${SERVER_ENV}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$SERVER_ENV" "$BACKUP_FILE"
echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"

echo ""
echo "📋 Current DB_PASSWORD line:"
CURRENT_LINE=$(grep "^DB_PASSWORD=" "$SERVER_ENV" || echo "")
echo "   $CURRENT_LINE"

# Check if password has quotes
if [[ "$CURRENT_LINE" == *'"'* ]] || [[ "$CURRENT_LINE" == *"'"* ]]; then
    echo -e "${YELLOW}⚠️  Password has quotes - removing them...${NC}"
    
    # Extract password value (remove quotes)
    PASSWORD_VALUE=$(echo "$CURRENT_LINE" | cut -d'=' -f2- | sed 's/^["'\'']//' | sed 's/["'\'']$//' | xargs)
    
    # Update without quotes
    sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=$PASSWORD_VALUE|" "$SERVER_ENV"
    
    echo -e "${GREEN}✅ Removed quotes from DB_PASSWORD${NC}"
else
    echo -e "${GREEN}✅ Password doesn't have quotes${NC}"
fi

echo ""
echo "📋 New DB_PASSWORD line:"
NEW_LINE=$(grep "^DB_PASSWORD=" "$SERVER_ENV")
echo "   $NEW_LINE"

# Verify the password value
PASSWORD_VALUE=$(echo "$NEW_LINE" | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)
echo ""
echo "📋 Password value (trimmed):"
echo "   $PASSWORD_VALUE"
echo "   Length: ${#PASSWORD_VALUE} characters"

# Test MySQL connection
echo ""
echo "📝 Testing MySQL connection..."
DB_USER=$(grep "^DB_USER=" "$SERVER_ENV" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
if mysql -h localhost -u "$DB_USER" -p"$PASSWORD_VALUE" -e "SELECT 1;" 2>&1 | grep -q "ERROR"; then
    echo -e "${RED}❌ MySQL connection test failed${NC}"
else
    echo -e "${GREEN}✅ MySQL connection test successful!${NC}"
fi

# Test with Node.js
echo ""
echo "📝 Testing with Node.js..."
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
    echo -e "${GREEN}✅ SUCCESS! Password quotes removed and Node.js connection works!${NC}"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Restart PM2: pm2 restart therapease-api --update-env"
    echo "   2. Check logs: pm2 logs therapease-api --lines 50"
    echo "   3. Look for 'Connected to MySQL database successfully'"
else
    echo ""
    echo -e "${RED}❌ Node.js connection still failing${NC}"
    echo "   The password might need to be updated in MySQL again."
    echo "   Run: cd server && NODE_ENV=production node update-mysql-password.js"
fi

