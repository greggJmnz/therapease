#!/bin/bash

# Final fix: Update MySQL password using Node.js to ensure exact encoding match

set -e

echo "🔧 Final Fix: Updating MySQL Password Using Node.js"
echo "==================================================="

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

# Verify password has no quotes
echo "📋 Step 1: Verifying password format..."
DB_PASSWORD_LINE=$(grep "^DB_PASSWORD=" "$SERVER_ENV")
if [[ "$DB_PASSWORD_LINE" == *'"'* ]] || [[ "$DB_PASSWORD_LINE" == *"'"* ]]; then
    echo -e "${YELLOW}⚠️  Password still has quotes - removing them...${NC}"
    PASSWORD_VALUE=$(echo "$DB_PASSWORD_LINE" | cut -d'=' -f2- | sed 's/^["'\'']//' | sed 's/["'\'']$//' | xargs)
    sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=$PASSWORD_VALUE|" "$SERVER_ENV"
    echo -e "${GREEN}✅ Removed quotes${NC}"
else
    echo -e "${GREEN}✅ Password has no quotes${NC}"
fi

echo ""
echo "📋 Step 2: Updating MySQL password using Node.js..."
echo "   (This ensures the exact same encoding is used)"
echo "   (You will be prompted for MySQL root password)"
echo ""

cd server
NODE_ENV=production node update-mysql-password.js

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
    echo -e "${RED}❌ Failed to update password${NC}"
    echo "   Please check the error messages above"
fi

