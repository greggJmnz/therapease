#!/bin/bash

# Script to test email configuration

set -e

echo "🧪 Testing Email Configuration"
echo "=============================="

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

# Check email configuration
echo ""
echo "📋 Email Configuration:"
echo "----------------------"

EMAIL_ENABLED=$(grep "^EMAIL_ENABLED=" "$SERVER_ENV" | head -1 | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs || echo "")
EMAIL_HOST=$(grep "^EMAIL_HOST=" "$SERVER_ENV" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs || echo "")
EMAIL_USER=$(grep "^EMAIL_USER=" "$SERVER_ENV" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs || echo "")
EMAIL_USE_API=$(grep "^EMAIL_USE_API=" "$SERVER_ENV" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs || echo "")
EMAIL_FROM=$(grep "^EMAIL_FROM=" "$SERVER_ENV" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs || echo "")

if [ "$EMAIL_ENABLED" = "true" ]; then
    echo -e "${GREEN}✅ EMAIL_ENABLED=true${NC}"
else
    echo -e "${RED}❌ EMAIL_ENABLED is not true${NC}"
fi

if [ "$EMAIL_HOST" = "smtp.sendgrid.net" ]; then
    echo -e "${GREEN}✅ EMAIL_HOST=smtp.sendgrid.net${NC}"
else
    echo -e "${YELLOW}⚠️  EMAIL_HOST=$EMAIL_HOST${NC}"
fi

if [ "$EMAIL_USER" = "apikey" ]; then
    echo -e "${GREEN}✅ EMAIL_USER=apikey${NC}"
else
    echo -e "${YELLOW}⚠️  EMAIL_USER=$EMAIL_USER${NC}"
fi

if [ "$EMAIL_USE_API" = "true" ]; then
    echo -e "${GREEN}✅ EMAIL_USE_API=true (Using SendGrid API)${NC}"
else
    echo -e "${YELLOW}⚠️  EMAIL_USE_API=$EMAIL_USE_API (Using SMTP)${NC}"
fi

if [ -n "$EMAIL_FROM" ]; then
    echo -e "${GREEN}✅ EMAIL_FROM=$EMAIL_FROM${NC}"
else
    echo -e "${RED}❌ EMAIL_FROM is not set${NC}"
fi

# Check if EMAIL_PASSWORD is set
if grep -q "^EMAIL_PASSWORD=" "$SERVER_ENV" 2>/dev/null; then
    EMAIL_PASSWORD=$(grep "^EMAIL_PASSWORD=" "$SERVER_ENV" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs || echo "")
    if [ -n "$EMAIL_PASSWORD" ] && [[ ! "$EMAIL_PASSWORD" == *"your"* ]] && [[ ! "$EMAIL_PASSWORD" == *"password"* ]]; then
        echo -e "${GREEN}✅ EMAIL_PASSWORD is set${NC}"
    else
        echo -e "${RED}❌ EMAIL_PASSWORD is empty or placeholder${NC}"
    fi
else
    echo -e "${RED}❌ EMAIL_PASSWORD is not set${NC}"
fi

# Check for duplicate EMAIL_ENABLED
DUPLICATE_COUNT=$(grep -c "^EMAIL_ENABLED=" "$SERVER_ENV" 2>/dev/null || echo "0")
if [ "$DUPLICATE_COUNT" -gt 1 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Found $DUPLICATE_COUNT EMAIL_ENABLED entries (duplicate)${NC}"
    echo "   This is harmless but can be cleaned up"
fi

echo ""
echo "================================================"
echo "📊 Summary"
echo "================================================"

if [ "$EMAIL_ENABLED" = "true" ] && [ "$EMAIL_USE_API" = "true" ] && [ -n "$EMAIL_PASSWORD" ]; then
    echo -e "${GREEN}✅ Email configuration looks good!${NC}"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Restart the application: pm2 restart therapease-api --update-env"
    echo "   2. Check logs: pm2 logs therapease-api --lines 50"
    echo "   3. Look for 'Email service is properly configured' in the logs"
else
    echo -e "${RED}❌ Email configuration needs attention${NC}"
    echo "   Please check the values above and update as needed"
fi

