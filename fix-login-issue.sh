#!/bin/bash

# TherapEase Login Issue Fix Script
# This script fixes the specific login issue by updating the admin password hash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_HOST="127.0.0.1"
DB_PORT="3306"
DB_NAME="therapease_db"
DB_USER="therapease_user"
DB_PASSWORD="TherapEase2025!@#"
ADMIN_EMAIL="admin@therapease.com"
ADMIN_PASSWORD="SecureAdmin2024!@#$"
API_URL="https://therapease.site"

echo -e "${BLUE}🔧 TherapEase Login Issue Fix${NC}"
echo -e "${BLUE}============================${NC}"
echo ""

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Function to print info
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# 1. Check if Node.js and bcrypt are available
print_info "Checking Node.js and bcrypt availability..."
if command -v node >/dev/null 2>&1; then
    print_status 0 "Node.js is available"
else
    print_status 1 "Node.js is not available"
    exit 1
fi

# Check if bcrypt is installed
if node -e "require('bcrypt')" 2>/dev/null; then
    print_status 0 "bcrypt module is available"
else
    print_status 1 "bcrypt module is not available"
    print_info "Installing bcrypt..."
    npm install bcrypt
    print_status 0 "bcrypt installed"
fi

# 2. Test database connection
print_info "Testing database connection..."
if mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD -e "SELECT 1;" 2>/dev/null; then
    print_status 0 "Database connection successful"
else
    print_status 1 "Database connection failed"
    exit 1
fi

# 3. Check if admin user exists
print_info "Checking admin user..."
ADMIN_EXISTS=$(mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "SELECT COUNT(*) FROM users WHERE email='$ADMIN_EMAIL';" 2>/dev/null | tail -1)
if [ "$ADMIN_EXISTS" -gt 0 ]; then
    print_status 0 "Admin user exists"
else
    print_status 1 "Admin user does not exist"
    exit 1
fi

# 4. Generate new password hash
print_info "Generating new password hash for admin user..."
NEW_HASH=$(node -e "
const bcrypt = require('bcrypt');
const password = '$ADMIN_PASSWORD';
const saltRounds = 10;
bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
        console.error('Error generating hash:', err);
        process.exit(1);
    }
    console.log(hash);
});
" 2>/dev/null)

if [ -n "$NEW_HASH" ]; then
    print_status 0 "Password hash generated successfully"
    print_info "Hash length: ${#NEW_HASH} characters"
else
    print_status 1 "Failed to generate password hash"
    exit 1
fi

# 5. Update admin password in database
print_info "Updating admin password in database..."
if mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "UPDATE users SET password='$NEW_HASH' WHERE email='$ADMIN_EMAIL';" 2>/dev/null; then
    print_status 0 "Admin password updated in database"
else
    print_status 1 "Failed to update admin password in database"
    exit 1
fi

# 6. Verify the update
print_info "Verifying password update..."
UPDATED_HASH=$(mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "SELECT password FROM users WHERE email='$ADMIN_EMAIL';" 2>/dev/null | tail -1)
if [ "$UPDATED_HASH" = "$NEW_HASH" ]; then
    print_status 0 "Password hash verification successful"
else
    print_status 1 "Password hash verification failed"
    exit 1
fi

# 7. Test login
print_info "Testing admin login..."
LOGIN_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/login_test.json -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" 2>/dev/null || echo "000")

if [ "$LOGIN_RESPONSE" = "200" ]; then
    print_status 0 "Admin login test successful"
    echo "Login response: $(cat /tmp/login_test.json)"
else
    print_status 1 "Admin login test failed (HTTP $LOGIN_RESPONSE)"
    echo "Login response: $(cat /tmp/login_test.json)"
    
    # Additional debugging
    print_info "Checking API server status..."
    pm2 status therapease-api
    
    print_info "Checking recent API logs..."
    pm2 logs therapease-api --lines 5 --err
fi

# 8. Cleanup
rm -f /tmp/login_test.json

echo ""
echo -e "${GREEN}🎉 Login Issue Fix Complete!${NC}"
echo -e "${BLUE}Admin credentials:${NC}"
echo -e "${BLUE}Email: $ADMIN_EMAIL${NC}"
echo -e "${BLUE}Password: $ADMIN_PASSWORD${NC}"
echo ""
echo -e "${YELLOW}You can now test the login at: $API_URL/auth/login${NC}"
