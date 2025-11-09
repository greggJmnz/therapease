#!/bin/bash

# Script to verify and fix environment configurations

set -e

echo "🔍 Verifying Environment Configurations"
echo "========================================"

# Navigate to project directory
cd /home/therapease_user/therapease || {
    echo "❌ Error: Could not navigate to project directory"
    exit 1
}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a variable exists and is not empty
check_var() {
    local file=$1
    local var=$2
    local required=${3:-true}
    
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ File not found: $file${NC}"
        return 1
    fi
    
    if grep -q "^${var}=" "$file" 2>/dev/null; then
        local value=$(grep "^${var}=" "$file" | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)
        if [ -z "$value" ] && [ "$required" = "true" ]; then
            echo -e "${YELLOW}⚠️  $var is set but empty${NC}"
            return 1
        elif [ -n "$value" ]; then
            echo -e "${GREEN}✅ $var is set${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠️  $var is set but empty (optional)${NC}"
            return 0
        fi
    else
        if [ "$required" = "true" ]; then
            echo -e "${RED}❌ $var is missing${NC}"
            return 1
        else
            echo -e "${YELLOW}⚠️  $var is missing (optional)${NC}"
            return 0
        fi
    fi
}

# Check server .env.production
echo ""
echo "📋 Checking server/.env.production..."
echo "-----------------------------------"

SERVER_ENV="server/.env.production"
if [ ! -f "$SERVER_ENV" ]; then
    echo -e "${RED}❌ Server .env.production file not found!${NC}"
    echo "   Creating template..."
    cat > "$SERVER_ENV" << 'EOF'
# Database Configuration
DB_HOST=localhost
DB_USER=therapease_user
DB_PASSWORD=your_password_here
DB_NAME=therapease_db
DB_PORT=3306

# Server Configuration
NODE_ENV=production
PORT=5000
HTTPS_PORT=5443

# Security Configuration
JWT_SECRET=your-jwt-secret-here
ENCRYPTION_KEY=your-encryption-key-here
SESSION_SECRET=your-session-secret-here

# Admin Configuration
ADMIN_EMAIL=admin@therapease.com
ADMIN_PASSWORD=SecureAdmin2024!@#$

# SSL Configuration
SSL_ENABLED=true
SSL_KEY_PATH=./server/certs/server.key
SSL_CERT_PATH=./server/certs/server.crt

# CORS Configuration
CORS_ORIGIN=https://therapease.site,https://www.therapease.site,https://api.therapease.site

# Email Configuration
EMAIL_ENABLED=false
EMAIL_HOST=
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=noreply@therapease.com

# SMS Configuration
SMS_ENABLED=false
PHILSMS_API_TOKEN=
PHILSMS_BASE_URL=https://app.philsms.com/api/v3
PHILSMS_SENDER_ID=TherapEase

# Push Notifications
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@therapease.com

# OpenAI Configuration
OPENAI_API_KEY=

# API Base URL
API_BASE_URL=https://api.therapease.site
EOF
    echo -e "${YELLOW}⚠️  Created template file. Please update with your actual values!${NC}"
    exit 1
fi

# Required server variables
REQUIRED_SERVER_VARS=(
    "DB_HOST"
    "DB_USER"
    "DB_PASSWORD"
    "DB_NAME"
    "DB_PORT"
    "NODE_ENV"
    "PORT"
    "JWT_SECRET"
    "CORS_ORIGIN"
)

# Optional server variables
OPTIONAL_SERVER_VARS=(
    "ENCRYPTION_KEY"
    "SESSION_SECRET"
    "ADMIN_EMAIL"
    "ADMIN_PASSWORD"
    "SSL_ENABLED"
    "EMAIL_ENABLED"
    "SMS_ENABLED"
    "VAPID_PUBLIC_KEY"
    "OPENAI_API_KEY"
    "API_BASE_URL"
)

SERVER_ERRORS=0

echo ""
echo "Required variables:"
for var in "${REQUIRED_SERVER_VARS[@]}"; do
    if ! check_var "$SERVER_ENV" "$var" true; then
        SERVER_ERRORS=$((SERVER_ERRORS + 1))
    fi
done

echo ""
echo "Optional variables:"
for var in "${OPTIONAL_SERVER_VARS[@]}"; do
    check_var "$SERVER_ENV" "$var" false
done

# Check client .env.production
echo ""
echo "📋 Checking client/.env.production..."
echo "-----------------------------------"

CLIENT_ENV="client/.env.production"
if [ ! -f "$CLIENT_ENV" ]; then
    echo -e "${YELLOW}⚠️  Client .env.production file not found!${NC}"
    echo "   Creating template..."
    cat > "$CLIENT_ENV" << 'EOF'
# API Configuration
VITE_API_URL=https://api.therapease.site/api

# Push Notifications
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key-here
EOF
    echo -e "${YELLOW}⚠️  Created template file. Please update with your actual values!${NC}"
fi

# Required client variables
REQUIRED_CLIENT_VARS=(
    "VITE_API_URL"
)

# Optional client variables
OPTIONAL_CLIENT_VARS=(
    "VITE_VAPID_PUBLIC_KEY"
)

CLIENT_ERRORS=0

echo ""
echo "Required variables:"
for var in "${REQUIRED_CLIENT_VARS[@]}"; do
    if ! check_var "$CLIENT_ENV" "$var" true; then
        CLIENT_ERRORS=$((CLIENT_ERRORS + 1))
    fi
done

echo ""
echo "Optional variables:"
for var in "${OPTIONAL_CLIENT_VARS[@]}"; do
    check_var "$CLIENT_ENV" "$var" false
done

# Verify specific values
echo ""
echo "🔍 Verifying specific configuration values..."
echo "--------------------------------------------"

# Check CORS_ORIGIN includes required domains
if grep -q "^CORS_ORIGIN=" "$SERVER_ENV" 2>/dev/null; then
    CORS_ORIGIN=$(grep "^CORS_ORIGIN=" "$SERVER_ENV" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    if [[ "$CORS_ORIGIN" == *"therapease.site"* ]]; then
        echo -e "${GREEN}✅ CORS_ORIGIN includes therapease.site${NC}"
    else
        echo -e "${YELLOW}⚠️  CORS_ORIGIN might be missing therapease.site domains${NC}"
        echo "   Current value: $CORS_ORIGIN"
    fi
fi

# Check VITE_API_URL is correct
if grep -q "^VITE_API_URL=" "$CLIENT_ENV" 2>/dev/null; then
    VITE_API_URL=$(grep "^VITE_API_URL=" "$CLIENT_ENV" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    if [[ "$VITE_API_URL" == *"api.therapease.site"* ]]; then
        echo -e "${GREEN}✅ VITE_API_URL points to api.therapease.site${NC}"
    else
        echo -e "${YELLOW}⚠️  VITE_API_URL might be incorrect${NC}"
        echo "   Current value: $VITE_API_URL"
        echo "   Expected: https://api.therapease.site/api"
    fi
fi

# Check DB_PASSWORD is not placeholder
if grep -q "^DB_PASSWORD=" "$SERVER_ENV" 2>/dev/null; then
    DB_PASSWORD=$(grep "^DB_PASSWORD=" "$SERVER_ENV" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    if [[ "$DB_PASSWORD" == *"your_password"* ]] || [[ "$DB_PASSWORD" == *"password"* ]] || [ -z "$DB_PASSWORD" ]; then
        echo -e "${RED}❌ DB_PASSWORD appears to be a placeholder or empty${NC}"
        SERVER_ERRORS=$((SERVER_ERRORS + 1))
    else
        echo -e "${GREEN}✅ DB_PASSWORD is set (not a placeholder)${NC}"
    fi
fi

# Summary
echo ""
echo "========================================"
echo "📊 Summary"
echo "========================================"

if [ $SERVER_ERRORS -eq 0 ] && [ $CLIENT_ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All required environment variables are configured!${NC}"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Verify database connection: ./fix-mysql-password.sh"
    echo "   2. Restart the application: pm2 restart therapease-api"
    echo "   3. Rebuild client if needed: cd client && npm run build"
    exit 0
else
    echo -e "${RED}❌ Found $SERVER_ERRORS server errors and $CLIENT_ERRORS client errors${NC}"
    echo ""
    echo "💡 To fix:"
    echo "   1. Edit server/.env.production and set missing/incorrect values"
    echo "   2. Edit client/.env.production and set missing/incorrect values"
    echo "   3. Run this script again to verify"
    exit 1
fi

