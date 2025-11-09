#!/bin/bash

# Script to fix password in .env.production - # character might be interpreted as comment

set -e

echo "🔧 Fixing Password in .env.production"
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

# Backup
BACKUP_FILE="${SERVER_ENV}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$SERVER_ENV" "$BACKUP_FILE"
echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"

echo ""
echo "📋 Current DB_PASSWORD line:"
CURRENT_LINE=$(grep "^DB_PASSWORD=" "$SERVER_ENV" || echo "")
echo "   $CURRENT_LINE"

# The password should be TherapEase2025!@# (17 chars)
# But Node.js is only reading 16 chars (ending with @)
# This suggests the # is being interpreted as a comment

# Update password - quote it to prevent # from being interpreted as comment
PASSWORD_VALUE="TherapEase2025!@#"
echo ""
echo "📝 Updating password to: $PASSWORD_VALUE"
echo "   (Quoting to prevent # from being interpreted as comment)"

# Update with quotes around the password
sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=\"$PASSWORD_VALUE\"|" "$SERVER_ENV"

echo ""
echo "📋 New DB_PASSWORD line:"
NEW_LINE=$(grep "^DB_PASSWORD=" "$SERVER_ENV")
echo "   $NEW_LINE"

# Test what Node.js reads
echo ""
echo "📝 Testing what Node.js reads..."
cd server
NODE_ENV=production node -e "
const path = require('path');
require('dotenv').config({path: path.join(__dirname, '.env.production')});
const password = process.env.DB_PASSWORD || '';
console.log('Password from dotenv:', password);
console.log('Password length:', password.length);
console.log('Password bytes (hex):', Buffer.from(password).toString('hex'));
console.log('Password ends with:', password.substring(password.length - 3));
" 2>&1

echo ""
echo "================================================"
echo "📊 Summary"
echo "================================================"
echo -e "${GREEN}✅ Password updated with quotes to prevent # from being interpreted as comment${NC}"
echo ""
echo "📋 Next steps:"
echo "   1. Update MySQL password again: cd server && NODE_ENV=production node update-mysql-password-exact.js"
echo "   2. Restart PM2: pm2 restart therapease-api --update-env"
echo "   3. Check logs: pm2 logs therapease-api --lines 50"

