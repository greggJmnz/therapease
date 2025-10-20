#!/bin/bash

# Fix Admin Controller Database Imports
# This script fixes the database import issues in adminController.js

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Fixing Admin Controller Database Imports${NC}"
echo -e "${BLUE}===========================================${NC}"
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

# Check if adminController.js exists
if [ ! -f "server/controllers/adminController.js" ]; then
    print_status 1 "adminController.js not found"
    exit 1
fi

print_info "Backing up current adminController.js..."
cp server/controllers/adminController.js server/controllers/adminController.js.backup.$(date +%Y%m%d_%H%M%S)
print_status 0 "Backup created"

print_info "Fixing database imports in adminController.js..."

# Fix the database import line
sed -i "s/const { runQuery, getRow, getAll, getConnection } = require('..\/config\/database');/const { getAll, getOne, runQuery } = require('..\/config\/database');/" server/controllers/adminController.js

print_status 0 "Database imports fixed"

print_info "Checking if the fix was applied..."
if grep -q "const { getAll, getOne, runQuery }" server/controllers/adminController.js; then
    print_status 0 "Database imports correctly updated"
else
    print_status 1 "Database imports not updated correctly"
    exit 1
fi

print_info "Restarting API server..."
pm2 restart therapease-api
sleep 3

print_info "Testing admin endpoints..."

# Get authentication token
LOGIN_RESPONSE=$(curl -s -X POST "https://therapease.site/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}' 2>/dev/null)

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    print_status 0 "Authentication token obtained"
    
    # Test therapists endpoint
    print_info "Testing /api/admin/therapists..."
    THERAPISTS_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/therapists_test.json \
        -H "Authorization: Bearer $TOKEN" \
        "https://therapease.site/api/admin/therapists" 2>/dev/null || echo "000")
    
    if [ "$THERAPISTS_RESPONSE" = "200" ]; then
        print_status 0 "Therapists endpoint working (HTTP 200)"
        echo "Response: $(cat /tmp/therapists_test.json | head -c 200)..."
    else
        print_status 1 "Therapists endpoint failed (HTTP $THERAPISTS_RESPONSE)"
        echo "Response: $(cat /tmp/therapists_test.json)"
    fi
    
    # Test patients endpoint
    print_info "Testing /api/admin/patients..."
    PATIENTS_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/patients_test.json \
        -H "Authorization: Bearer $TOKEN" \
        "https://therapease.site/api/admin/patients" 2>/dev/null || echo "000")
    
    if [ "$PATIENTS_RESPONSE" = "200" ]; then
        print_status 0 "Patients endpoint working (HTTP 200)"
        echo "Response: $(cat /tmp/patients_test.json | head -c 200)..."
    else
        print_status 1 "Patients endpoint failed (HTTP $PATIENTS_RESPONSE)"
        echo "Response: $(cat /tmp/patients_test.json)"
    fi
    
    # Cleanup
    rm -f /tmp/therapists_test.json /tmp/patients_test.json
    
else
    print_status 1 "Failed to get authentication token"
fi

echo ""
echo -e "${GREEN}🎉 Admin Controller Import Fix Complete!${NC}"
echo -e "${BLUE}The admin endpoints should now work properly.${NC}"
