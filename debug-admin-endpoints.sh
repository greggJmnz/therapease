#!/bin/bash

# TherapEase Debug Admin Endpoints Script
# This script checks PM2 logs and debugs the specific 500 errors

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}🔍 Debug Admin Endpoints${NC}"
echo -e "${CYAN}=======================${NC}"
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

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 1. CHECK PM2 LOGS
print_info "Checking PM2 error logs for specific errors..."
echo ""
echo -e "${PURPLE}Recent API Error Logs:${NC}"
pm2 logs therapease-api --lines 20 --err 2>/dev/null | tail -20 || echo "No recent errors"

echo ""
print_info "Checking PM2 output logs..."
echo -e "${PURPLE}Recent API Output Logs:${NC}"
pm2 logs therapease-api --lines 10 --out 2>/dev/null | tail -10 || echo "No recent output"

# 2. TEST ENDPOINTS WITH DETAILED ERROR CAPTURE
print_info "Testing endpoints with detailed error capture..."

# Get authentication token
LOGIN_RESPONSE=$(curl -s -X POST "https://therapease.site/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}' 2>/dev/null)

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    print_status 0 "Authentication token obtained"
    
    # Test therapists endpoint with verbose output
    print_info "Testing /api/admin/therapists with verbose output..."
    echo "Making request to therapists endpoint..."
    THERAPISTS_RESPONSE=$(curl -v -s -w "\nHTTP_CODE:%{http_code}\nTIME:%{time_total}" \
        -H "Authorization: Bearer $TOKEN" \
        "https://therapease.site/api/admin/therapists" 2>&1)
    
    echo "Response:"
    echo "$THERAPISTS_RESPONSE"
    echo ""
    
    # Test patients endpoint with verbose output
    print_info "Testing /api/admin/patients with verbose output..."
    echo "Making request to patients endpoint..."
    PATIENTS_RESPONSE=$(curl -v -s -w "\nHTTP_CODE:%{http_code}\nTIME:%{time_total}" \
        -H "Authorization: Bearer $TOKEN" \
        "https://therapease.site/api/admin/patients" 2>&1)
    
    echo "Response:"
    echo "$PATIENTS_RESPONSE"
    echo ""
    
else
    print_status 1 "Failed to get authentication token"
fi

# 3. CHECK DATABASE CONNECTIVITY
print_info "Testing database connectivity and queries..."

# Test direct database queries
echo -e "${PURPLE}Testing therapists query directly:${NC}"
mysql -h 127.0.0.1 -P 3306 -u therapease_user -p'TherapEase2025!@#' therapease_db -e "
SELECT 
  u.id,
  u.email,
  u.role,
  u.firstName,
  u.lastName,
  u.phone,
  u.status,
  t.licenseNumber,
  t.specialization
FROM users u
LEFT JOIN therapists t ON u.id = t.userId
WHERE u.role = 'therapist'
LIMIT 5;" 2>/dev/null || echo "Therapists query failed"

echo ""
echo -e "${PURPLE}Testing patients query directly:${NC}"
mysql -h 127.0.0.1 -P 3306 -u therapease_user -p'TherapEase2025!@#' therapease_db -e "
SELECT 
  u.id,
  u.email,
  u.role,
  u.firstName,
  u.lastName,
  u.phone,
  u.status,
  p.id as patientId,
  p.diagnosis
FROM users u
LEFT JOIN patients p ON u.id = p.userId
WHERE u.role = 'patient'
LIMIT 5;" 2>/dev/null || echo "Patients query failed"

# 4. CHECK FOR MISSING TABLES OR COLUMNS
print_info "Checking for missing tables or columns..."

echo -e "${PURPLE}Checking patient_therapist_assignments table:${NC}"
mysql -h 127.0.0.1 -P 3306 -u therapease_user -p'TherapEase2025!@#' therapease_db -e "
SHOW TABLES LIKE 'patient_therapist_assignments';" 2>/dev/null || echo "Table check failed"

echo -e "${PURPLE}Checking therapists table columns:${NC}"
mysql -h 127.0.0.1 -P 3306 -u therapease_user -p'TherapEase2025!@#' therapease_db -e "
DESCRIBE therapists;" 2>/dev/null || echo "Column check failed"

echo -e "${PURPLE}Checking patients table columns:${NC}"
mysql -h 127.0.0.1 -P 3306 -u therapease_user -p'TherapEase2025!@#' therapease_db -e "
DESCRIBE patients;" 2>/dev/null || echo "Column check failed"

# 5. CHECK CURRENT ADMIN CONTROLLER
print_info "Checking current adminController.js for issues..."

echo -e "${PURPLE}Checking getTherapists method:${NC}"
grep -A 20 "const getTherapists" server/controllers/adminController.js | head -25

echo ""
echo -e "${PURPLE}Checking getPatients method:${NC}"
grep -A 20 "const getPatients" server/controllers/adminController.js | head -25

# 6. CREATE SIMPLIFIED TEST ENDPOINTS
print_info "Creating simplified test endpoints..."

# Create a test script to isolate the issue
cat > test-admin-endpoints.js << 'EOF'
const { getAll } = require('./server/config/database');

async function testTherapists() {
  try {
    console.log('Testing therapists query...');
    const sql = `
      SELECT 
        u.id,
        u.email,
        u.role,
        u.firstName,
        u.lastName,
        u.phone,
        u.status,
        t.licenseNumber,
        t.specialization
      FROM users u
      LEFT JOIN therapists t ON u.id = t.userId
      WHERE u.role = 'therapist'
      ORDER BY u.createdAt DESC
    `;
    
    const therapists = await getAll(sql);
    console.log('Therapists query successful:', therapists.length, 'results');
    return therapists;
  } catch (error) {
    console.error('Therapists query error:', error);
    throw error;
  }
}

async function testPatients() {
  try {
    console.log('Testing patients query...');
    const sql = `
      SELECT 
        u.id,
        u.email,
        u.role,
        u.firstName,
        u.lastName,
        u.phone,
        u.status,
        p.id as patientId,
        p.diagnosis
      FROM users u
      LEFT JOIN patients p ON u.id = p.userId
      WHERE u.role = 'patient'
      ORDER BY u.createdAt DESC
    `;
    
    const patients = await getAll(sql);
    console.log('Patients query successful:', patients.length, 'results');
    return patients;
  } catch (error) {
    console.error('Patients query error:', error);
    throw error;
  }
}

async function runTests() {
  try {
    await testTherapists();
    await testPatients();
    console.log('All tests passed!');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

runTests();
EOF

print_info "Running isolated database tests..."
node test-admin-endpoints.js

# Cleanup
rm -f test-admin-endpoints.js

echo ""
echo -e "${GREEN}🔍 Debug Complete!${NC}"
echo -e "${BLUE}Check the output above for specific error details.${NC}"
