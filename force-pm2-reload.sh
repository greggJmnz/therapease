#!/bin/bash

# Script to force PM2 to reload environment variables from .env.production

set -e

echo "🔄 Forcing PM2 to Reload Environment Variables"
echo "================================================"

# Navigate to project directory
cd /home/therapease_user/therapease || {
    echo "❌ Error: Could not navigate to project directory"
    exit 1
}

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SERVER_ENV="server/.env.production"

# Verify .env.production has correct password
echo ""
echo "📋 Step 1: Verifying .env.production..."
if [ ! -f "$SERVER_ENV" ]; then
    echo -e "${RED}❌ $SERVER_ENV not found!${NC}"
    exit 1
fi

DB_PASSWORD=$(grep "^DB_PASSWORD=" "$SERVER_ENV" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
EXPECTED_PASSWORD="TherapEase123!@#"

if [ "$DB_PASSWORD" = "$EXPECTED_PASSWORD" ]; then
    echo -e "${GREEN}✅ DB_PASSWORD in .env.production is correct${NC}"
else
    echo -e "${RED}❌ DB_PASSWORD doesn't match!${NC}"
    echo "   Expected: $EXPECTED_PASSWORD"
    echo "   Found: $DB_PASSWORD"
    echo "   Updating..."
    sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=$EXPECTED_PASSWORD|" "$SERVER_ENV"
    echo -e "${GREEN}✅ Updated DB_PASSWORD${NC}"
fi

# Verify NODE_ENV is set to production
NODE_ENV=$(grep "^NODE_ENV=" "$SERVER_ENV" 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs || echo "")
if [ "$NODE_ENV" != "production" ]; then
    echo -e "${YELLOW}⚠️  NODE_ENV is not set to 'production' in .env.production${NC}"
    echo "   Adding NODE_ENV=production..."
    if grep -q "^NODE_ENV=" "$SERVER_ENV" 2>/dev/null; then
        sed -i "s|^NODE_ENV=.*|NODE_ENV=production|" "$SERVER_ENV"
    else
        echo "NODE_ENV=production" >> "$SERVER_ENV"
    fi
    echo -e "${GREEN}✅ Set NODE_ENV=production${NC}"
fi

# Stop and delete PM2 process
echo ""
echo "📋 Step 2: Stopping PM2 process..."
pm2 stop therapease-api 2>/dev/null || echo "   Process not running"
pm2 delete therapease-api 2>/dev/null || echo "   Process not found"

# Wait a moment
sleep 2

# Verify the .env.production file path
ENV_FILE_PATH=$(realpath "$SERVER_ENV")
echo ""
echo "📋 Step 3: Environment file location:"
echo "   $ENV_FILE_PATH"

# Start PM2 with ecosystem config (which sets NODE_ENV=production)
echo ""
echo "📋 Step 4: Starting PM2 with ecosystem.config.js..."
cd /home/therapease_user/therapease
pm2 start ecosystem.config.js --only therapease-api

# Wait for application to start
echo ""
echo "⏳ Waiting 5 seconds for application to start..."
sleep 5

# Check PM2 status
echo ""
echo "📋 Step 5: PM2 Status:"
pm2 status

# Check logs
echo ""
echo "📋 Step 6: Recent Application Logs:"
echo "-----------------------------------"
pm2 logs therapease-api --lines 30 --nostream

echo ""
echo "================================================"
echo "📊 Summary"
echo "================================================"

# Check if database connection succeeded
if pm2 logs therapease-api --lines 50 --nostream 2>/dev/null | grep -q "Connected to MySQL database successfully"; then
    echo -e "${GREEN}✅ Database connection successful!${NC}"
    echo ""
    echo "✅ The application should now be working correctly."
elif pm2 logs therapease-api --lines 50 --nostream 2>/dev/null | grep -q "Database connection error"; then
    echo -e "${RED}❌ Database connection still failing${NC}"
    echo ""
    echo "💡 Troubleshooting steps:"
    echo "   1. Verify MySQL password: mysql -u therapease_user -p'TherapEase123!@#' -e 'SELECT 1;'"
    echo "   2. Check .env.production file: cat server/.env.production | grep DB_"
    echo "   3. Verify file path: ls -la server/.env.production"
    echo "   4. Check PM2 logs: pm2 logs therapease-api --lines 100"
else
    echo -e "${YELLOW}⚠️  Could not determine database connection status${NC}"
    echo "   Check logs manually: pm2 logs therapease-api"
fi

echo ""
echo "📋 Useful commands:"
echo "   pm2 logs therapease-api --lines 50    # View recent logs"
echo "   pm2 restart therapease-api             # Restart application"
echo "   pm2 status                             # Check PM2 status"

