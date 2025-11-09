#!/bin/bash

# Script to verify PM2 is loading environment variables correctly

set -e

echo "🔍 Verifying PM2 Environment Variables"
echo "======================================="

# Navigate to project directory
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
echo "📋 Step 1: Checking .env.production file..."
DB_PASSWORD=$(grep "^DB_PASSWORD=" "$SERVER_ENV" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
DB_USER=$(grep "^DB_USER=" "$SERVER_ENV" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
DB_HOST=$(grep "^DB_HOST=" "$SERVER_ENV" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
DB_NAME=$(grep "^DB_NAME=" "$SERVER_ENV" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
NODE_ENV=$(grep "^NODE_ENV=" "$SERVER_ENV" 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs || echo "")

echo "   DB_USER: $DB_USER"
echo "   DB_HOST: $DB_HOST"
echo "   DB_NAME: $DB_NAME"
echo "   DB_PASSWORD: ${DB_PASSWORD:0:10}... (hidden)"
echo "   NODE_ENV: ${NODE_ENV:-not set}"

# Ensure NODE_ENV is set to production
if [ "$NODE_ENV" != "production" ]; then
    echo -e "${YELLOW}⚠️  NODE_ENV is not set to 'production' in .env.production${NC}"
    if grep -q "^NODE_ENV=" "$SERVER_ENV" 2>/dev/null; then
        sed -i "s|^NODE_ENV=.*|NODE_ENV=production|" "$SERVER_ENV"
    else
        echo "NODE_ENV=production" >> "$SERVER_ENV"
    fi
    echo -e "${GREEN}✅ Set NODE_ENV=production${NC}"
fi

echo ""
echo "📋 Step 2: Checking PM2 process..."
if pm2 list | grep -q "therapease-api"; then
    echo -e "${GREEN}✅ PM2 process found${NC}"
else
    echo -e "${RED}❌ PM2 process not found${NC}"
    exit 1
fi

echo ""
echo "📋 Step 3: Stopping and deleting PM2 process..."
pm2 stop therapease-api 2>/dev/null || true
pm2 delete therapease-api 2>/dev/null || true
sleep 2

echo ""
echo "📋 Step 4: Loading environment variables from .env.production..."
# Load all environment variables from .env.production
export $(grep -v '^#' "$SERVER_ENV" | grep -v '^$' | xargs)

# Verify critical variables are loaded
echo "   NODE_ENV: ${NODE_ENV:-not set}"
echo "   DB_USER: ${DB_USER:-not set}"
echo "   DB_HOST: ${DB_HOST:-not set}"
echo "   DB_NAME: ${DB_NAME:-not set}"
echo "   DB_PASSWORD: ${DB_PASSWORD:+set} ${DB_PASSWORD:-not set}"

if [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}❌ DB_PASSWORD not loaded from .env.production!${NC}"
    exit 1
fi

echo ""
echo "📋 Step 5: Starting PM2 with environment variables..."
# Start PM2 with explicit environment variables
cd /home/therapease_user/therapease
pm2 start ecosystem.config.js --only therapease-api --update-env

echo ""
echo "⏳ Waiting 5 seconds for application to start..."
sleep 5

echo ""
echo "📋 Step 6: Checking application logs..."
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
    echo -e "${GREEN}✅ The application is now working correctly.${NC}"
elif pm2 logs therapease-api --lines 50 --nostream 2>/dev/null | grep -q "Database connection error"; then
    echo -e "${RED}❌ Database connection still failing${NC}"
    echo ""
    echo "💡 The issue might be that PM2 is not loading .env.production correctly."
    echo "   Let's try a different approach - using PM2's env_file option..."
    echo ""
    echo "   We need to update ecosystem.config.js to explicitly load .env.production"
else
    echo -e "${YELLOW}⚠️  Check logs manually: pm2 logs therapease-api${NC}"
fi

