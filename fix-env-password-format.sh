#!/bin/bash

# Script to ensure DB_PASSWORD is properly formatted in .env.production

set -e

echo "🔧 Fixing DB_PASSWORD Format in .env.production"
echo "==============================================="

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

# Correct password
DB_PASSWORD="TherapEase2025!@#"

echo ""
echo "📋 Current DB_PASSWORD in .env.production:"
CURRENT_LINE=$(grep "^DB_PASSWORD=" "$SERVER_ENV" || echo "")
echo "   $CURRENT_LINE"

# Update with properly quoted password (no quotes needed in .env files, but ensure it's on one line)
echo ""
echo "📝 Updating DB_PASSWORD..."
sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=$DB_PASSWORD|" "$SERVER_ENV"

# Verify
NEW_LINE=$(grep "^DB_PASSWORD=" "$SERVER_ENV")
echo "   New: $NEW_LINE"

# Verify the password value
EXTRACTED_PASSWORD=$(echo "$NEW_LINE" | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)
if [ "$EXTRACTED_PASSWORD" = "$DB_PASSWORD" ]; then
    echo -e "${GREEN}✅ Password format is correct${NC}"
else
    echo -e "${RED}❌ Password doesn't match!${NC}"
    echo "   Expected: $DB_PASSWORD"
    echo "   Found: $EXTRACTED_PASSWORD"
    exit 1
fi

# Test MySQL connection
echo ""
echo "📝 Testing MySQL connection with password..."
if mysql -h localhost -u therapease_user -p"$DB_PASSWORD" -e "SELECT 1;" 2>&1 | grep -q "ERROR"; then
    echo -e "${RED}❌ MySQL connection test failed${NC}"
    exit 1
else
    echo -e "${GREEN}✅ MySQL connection test successful${NC}"
fi

# Restart PM2
echo ""
echo "📝 Restarting PM2..."
pm2 stop therapease-api 2>/dev/null || true
pm2 delete therapease-api 2>/dev/null || true
sleep 2

cd /home/therapease_user/therapease
pm2 start ecosystem.config.js --only therapease-api --update-env

echo ""
echo "⏳ Waiting 5 seconds..."
sleep 5

echo ""
echo "📝 Checking logs..."
pm2 logs therapease-api --lines 30 --nostream

echo ""
echo "================================================"
echo "📊 Summary"
echo "================================================"

if pm2 logs therapease-api --lines 50 --nostream 2>/dev/null | grep -q "Connected to MySQL database successfully"; then
    echo -e "${GREEN}✅ SUCCESS! Database connection is working!${NC}"
elif pm2 logs therapease-api --lines 50 --nostream 2>/dev/null | grep -q "Database connection error"; then
    echo -e "${RED}❌ Still failing. Let's check what the application is actually reading...${NC}"
    echo ""
    echo "💡 Debug steps:"
    echo "   1. Check if .env.production is being read:"
    echo "      node -e \"require('dotenv').config({path: 'server/.env.production'}); console.log('DB_PASSWORD:', process.env.DB_PASSWORD);\""
    echo "   2. Check PM2 environment:"
    echo "      pm2 describe therapease-api | grep -A 20 'env'"
    echo "   3. Check application logs:"
    echo "      pm2 logs therapease-api --lines 100"
else
    echo -e "${YELLOW}⚠️  Check logs manually${NC}"
fi

