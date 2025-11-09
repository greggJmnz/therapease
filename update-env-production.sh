#!/bin/bash

# Script to update server/.env.production with correct configurations

set -e

echo "🔧 Updating server/.env.production Configuration"
echo "================================================"

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
NC='\033[0m'

# Backup the file
BACKUP_FILE="${SERVER_ENV}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$SERVER_ENV" "$BACKUP_FILE"
echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"

# Update CORS_ORIGIN
echo ""
echo "📋 Updating CORS_ORIGIN..."
if grep -q "^CORS_ORIGIN=" "$SERVER_ENV" 2>/dev/null; then
    sed -i "s|^CORS_ORIGIN=.*|CORS_ORIGIN=https://therapease.site,https://www.therapease.site,https://api.therapease.site|" "$SERVER_ENV"
    echo -e "${GREEN}✅ Updated CORS_ORIGIN${NC}"
else
    echo "CORS_ORIGIN=https://therapease.site,https://www.therapease.site,https://api.therapease.site" >> "$SERVER_ENV"
    echo -e "${GREEN}✅ Added CORS_ORIGIN${NC}"
fi

# Update Email Configuration (SendGrid)
echo ""
echo "📋 Updating Email Configuration (SendGrid)..."

# Email enabled
if grep -q "^EMAIL_ENABLED=" "$SERVER_ENV" 2>/dev/null; then
    sed -i "s|^EMAIL_ENABLED=.*|EMAIL_ENABLED=true|" "$SERVER_ENV"
else
    echo "EMAIL_ENABLED=true" >> "$SERVER_ENV"
fi

# Email host
if grep -q "^EMAIL_HOST=" "$SERVER_ENV" 2>/dev/null; then
    sed -i "s|^EMAIL_HOST=.*|EMAIL_HOST=smtp.sendgrid.net|" "$SERVER_ENV"
else
    echo "EMAIL_HOST=smtp.sendgrid.net" >> "$SERVER_ENV"
fi

# Email port
if grep -q "^EMAIL_PORT=" "$SERVER_ENV" 2>/dev/null; then
    sed -i "s|^EMAIL_PORT=.*|EMAIL_PORT=587|" "$SERVER_ENV"
else
    echo "EMAIL_PORT=587" >> "$SERVER_ENV"
fi

# Email secure
if grep -q "^EMAIL_SECURE=" "$SERVER_ENV" 2>/dev/null; then
    sed -i "s|^EMAIL_SECURE=.*|EMAIL_SECURE=false|" "$SERVER_ENV"
else
    echo "EMAIL_SECURE=false" >> "$SERVER_ENV"
fi

# Email require TLS
if grep -q "^EMAIL_REQUIRE_TLS=" "$SERVER_ENV" 2>/dev/null; then
    sed -i "s|^EMAIL_REQUIRE_TLS=.*|EMAIL_REQUIRE_TLS=true|" "$SERVER_ENV"
else
    echo "EMAIL_REQUIRE_TLS=true" >> "$SERVER_ENV"
fi

# Email user (apikey for SendGrid)
if grep -q "^EMAIL_USER=" "$SERVER_ENV" 2>/dev/null; then
    sed -i "s|^EMAIL_USER=.*|EMAIL_USER=apikey|" "$SERVER_ENV"
else
    echo "EMAIL_USER=apikey" >> "$SERVER_ENV"
fi

# Email password (SendGrid API key)
# Prompt for API key if not already set
if grep -q "^EMAIL_PASSWORD=" "$SERVER_ENV" 2>/dev/null; then
    CURRENT_PASSWORD=$(grep "^EMAIL_PASSWORD=" "$SERVER_ENV" | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)
    if [ -z "$CURRENT_PASSWORD" ] || [[ "$CURRENT_PASSWORD" == *"your"* ]] || [[ "$CURRENT_PASSWORD" == *"password"* ]]; then
        echo -e "${YELLOW}⚠️  EMAIL_PASSWORD is empty or placeholder${NC}"
        read -p "   Enter SendGrid API Key (or press Enter to skip): " -s SENDGRID_API_KEY
        echo ""
        if [ -n "$SENDGRID_API_KEY" ]; then
            sed -i "s|^EMAIL_PASSWORD=.*|EMAIL_PASSWORD=$SENDGRID_API_KEY|" "$SERVER_ENV"
            echo -e "${GREEN}✅ Updated EMAIL_PASSWORD${NC}"
        else
            echo -e "${YELLOW}⚠️  Skipped EMAIL_PASSWORD update${NC}"
        fi
    else
        echo -e "${GREEN}✅ EMAIL_PASSWORD already set${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  EMAIL_PASSWORD not found${NC}"
    read -p "   Enter SendGrid API Key (or press Enter to skip): " -s SENDGRID_API_KEY
    echo ""
    if [ -n "$SENDGRID_API_KEY" ]; then
        echo "EMAIL_PASSWORD=$SENDGRID_API_KEY" >> "$SERVER_ENV"
        echo -e "${GREEN}✅ Added EMAIL_PASSWORD${NC}"
    else
        echo "EMAIL_PASSWORD=" >> "$SERVER_ENV"
        echo -e "${YELLOW}⚠️  Added empty EMAIL_PASSWORD (update manually)${NC}"
    fi
fi

# Email from
if grep -q "^EMAIL_FROM=" "$SERVER_ENV" 2>/dev/null; then
    sed -i "s|^EMAIL_FROM=.*|EMAIL_FROM=therapease16@gmail.com|" "$SERVER_ENV"
else
    echo "EMAIL_FROM=therapease16@gmail.com" >> "$SERVER_ENV"
fi

# Email use API (for SendGrid API instead of SMTP)
if grep -q "^EMAIL_USE_API=" "$SERVER_ENV" 2>/dev/null; then
    sed -i "s|^EMAIL_USE_API=.*|EMAIL_USE_API=true|" "$SERVER_ENV"
else
    echo "EMAIL_USE_API=true" >> "$SERVER_ENV"
fi

# Also update EMAIL_PASS if it exists (some configs use EMAIL_PASS instead of EMAIL_PASSWORD)
# Only update if EMAIL_PASSWORD was set above
if grep -q "^EMAIL_PASS=" "$SERVER_ENV" 2>/dev/null && [ -n "$SENDGRID_API_KEY" ]; then
    sed -i "s|^EMAIL_PASS=.*|EMAIL_PASS=$SENDGRID_API_KEY|" "$SERVER_ENV"
fi

echo -e "${GREEN}✅ Email configuration updated${NC}"

# Check SMS Configuration
echo ""
echo "📋 Checking SMS Configuration..."
if grep -q "^SMS_ENABLED=" "$SERVER_ENV" 2>/dev/null; then
    SMS_ENABLED=$(grep "^SMS_ENABLED=" "$SERVER_ENV" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
    if [ "$SMS_ENABLED" != "true" ]; then
        echo -e "${YELLOW}⚠️  SMS_ENABLED is set to: $SMS_ENABLED${NC}"
        echo "   SMS service is currently disabled"
    else
        echo -e "${GREEN}✅ SMS_ENABLED is true${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  SMS_ENABLED not found (optional)${NC}"
fi

# Verify changes
echo ""
echo "================================================"
echo "📊 Configuration Summary"
echo "================================================"

echo ""
echo "CORS Configuration:"
grep "^CORS_ORIGIN=" "$SERVER_ENV" || echo "  (not found)"

echo ""
echo "Email Configuration:"
grep "^EMAIL_" "$SERVER_ENV" | sed 's/EMAIL_PASSWORD=.*/EMAIL_PASSWORD=***HIDDEN***/' || echo "  (not found)"

echo ""
echo "SMS Configuration:"
grep "^SMS_" "$SERVER_ENV" | sed 's/PHILSMS_API_TOKEN=.*/PHILSMS_API_TOKEN=***HIDDEN***/' || echo "  (not found)"

echo ""
echo -e "${GREEN}✅ Configuration update completed!${NC}"
echo ""
echo "📋 Next steps:"
echo "   1. Review the changes above"
echo "   2. Restart the application: pm2 restart therapease-api --update-env"
echo "   3. Test email service: Check server logs for email connection status"
echo ""
echo "💡 To restore backup: cp $BACKUP_FILE $SERVER_ENV"

