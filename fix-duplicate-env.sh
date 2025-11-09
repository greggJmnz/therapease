#!/bin/bash

# Script to fix duplicate environment variables in .env.production

set -e

echo "🔧 Fixing Duplicate Environment Variables"
echo "========================================"

SERVER_ENV="server/.env.production"

if [ ! -f "$SERVER_ENV" ]; then
    echo "❌ Error: $SERVER_ENV not found!"
    exit 1
fi

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check for duplicate EMAIL_ENABLED
DUPLICATE_COUNT=$(grep -c "^EMAIL_ENABLED=" "$SERVER_ENV" 2>/dev/null || echo "0")

if [ "$DUPLICATE_COUNT" -gt 1 ]; then
    echo -e "${YELLOW}⚠️  Found $DUPLICATE_COUNT EMAIL_ENABLED entries${NC}"
    echo "   Removing duplicates..."
    
    # Keep only the first occurrence
    awk '!seen[$0]++ || !/^EMAIL_ENABLED=/' "$SERVER_ENV" > "${SERVER_ENV}.tmp"
    mv "${SERVER_ENV}.tmp" "$SERVER_ENV"
    
    echo -e "${GREEN}✅ Removed duplicate EMAIL_ENABLED entries${NC}"
else
    echo -e "${GREEN}✅ No duplicate EMAIL_ENABLED entries found${NC}"
fi

# Check for other common duplicates
echo ""
echo "📋 Checking for other duplicates..."

# Check for duplicate CORS_ORIGIN
CORS_COUNT=$(grep -c "^CORS_ORIGIN=" "$SERVER_ENV" 2>/dev/null || echo "0")
if [ "$CORS_COUNT" -gt 1 ]; then
    echo -e "${YELLOW}⚠️  Found $CORS_COUNT CORS_ORIGIN entries${NC}"
    awk '!seen[$0]++ || !/^CORS_ORIGIN=/' "$SERVER_ENV" > "${SERVER_ENV}.tmp"
    mv "${SERVER_ENV}.tmp" "$SERVER_ENV"
    echo -e "${GREEN}✅ Removed duplicate CORS_ORIGIN entries${NC}"
fi

echo ""
echo -e "${GREEN}✅ Cleanup completed!${NC}"

