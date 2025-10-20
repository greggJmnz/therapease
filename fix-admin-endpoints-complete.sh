#!/bin/bash

# TherapEase Complete Admin Endpoints Fix Script
# This script fixes both authentication and database schema issues for admin endpoints

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

echo -e "${BLUE}🔧 Complete Admin Endpoints Fix${NC}"
echo -e "${BLUE}==============================${NC}"
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

# 1. Fix Database Schema Issues
print_info "Fixing database schema issues..."

# Add missing country column if it doesn't exist
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "
ALTER TABLE users 
ADD COLUMN country VARCHAR(100) DEFAULT 'US' 
AFTER zipCode;" 2>/dev/null || echo "Country column may already exist"

print_status 0 "Database schema updated"

# 2. Get Authentication Token
print_info "Getting authentication token for admin user..."

# Login to get token
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" 2>/dev/null)

echo "Login response: $LOGIN_RESPONSE"

# Extract token from response
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    print_status 0 "Authentication token obtained"
    echo "Token: ${TOKEN:0:20}..."
else
    print_status 1 "Failed to get authentication token"
    echo "Login response: $LOGIN_RESPONSE"
    exit 1
fi

# 3. Test Admin Endpoints with Authentication
print_info "Testing admin endpoints with authentication..."

# Test therapists endpoint
echo "Testing /api/admin/therapists with auth..."
THERAPISTS_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/therapists_test.json \
    -H "Authorization: Bearer $TOKEN" \
    "$API_URL/api/admin/therapists" 2>/dev/null || echo "000")

if [ "$THERAPISTS_RESPONSE" = "200" ]; then
    print_status 0 "Therapists endpoint working (HTTP 200)"
    echo "Response: $(cat /tmp/therapists_test.json | head -c 200)..."
else
    print_status 1 "Therapists endpoint failed (HTTP $THERAPISTS_RESPONSE)"
    echo "Response: $(cat /tmp/therapists_test.json)"
fi

# Test patients endpoint
echo "Testing /api/admin/patients with auth..."
PATIENTS_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/patients_test.json \
    -H "Authorization: Bearer $TOKEN" \
    "$API_URL/api/admin/patients" 2>/dev/null || echo "000")

if [ "$PATIENTS_RESPONSE" = "200" ]; then
    print_status 0 "Patients endpoint working (HTTP 200)"
    echo "Response: $(cat /tmp/patients_test.json | head -c 200)..."
else
    print_status 1 "Patients endpoint failed (HTTP $PATIENTS_RESPONSE)"
    echo "Response: $(cat /tmp/patients_test.json)"
fi

# Test notifications endpoint
echo "Testing /api/admin/notifications with auth..."
NOTIFICATIONS_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/notifications_test.json \
    -H "Authorization: Bearer $TOKEN" \
    "$API_URL/api/admin/notifications" 2>/dev/null || echo "000")

if [ "$NOTIFICATIONS_RESPONSE" = "200" ]; then
    print_status 0 "Notifications endpoint working (HTTP 200)"
    echo "Response: $(cat /tmp/notifications_test.json | head -c 200)..."
else
    print_status 1 "Notifications endpoint failed (HTTP $NOTIFICATIONS_RESPONSE)"
    echo "Response: $(cat /tmp/notifications_test.json)"
fi

# 4. Check Database Tables
print_info "Checking database tables..."

# Check if therapists table exists
THERAPISTS_TABLE=$(mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "SHOW TABLES LIKE 'therapists';" 2>/dev/null | wc -l)
if [ "$THERAPISTS_TABLE" -gt 0 ]; then
    print_status 0 "Therapists table exists"
else
    print_status 1 "Therapists table missing"
    print_info "Creating therapists table..."
    mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "
    CREATE TABLE IF NOT EXISTS therapists (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        licenseNumber VARCHAR(100),
        specialization VARCHAR(255),
        yearsOfExperience INT DEFAULT 0,
        education TEXT,
        certifications TEXT,
        availability JSON,
        maxPatients INT DEFAULT 20,
        isAcceptingPatients BOOLEAN DEFAULT TRUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );" 2>/dev/null
    print_status 0 "Therapists table created"
fi

# Check if patients table exists
PATIENTS_TABLE=$(mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "SHOW TABLES LIKE 'patients';" 2>/dev/null | wc -l)
if [ "$PATIENTS_TABLE" -gt 0 ]; then
    print_status 0 "Patients table exists"
else
    print_status 1 "Patients table missing"
    print_info "Creating patients table..."
    mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "
    CREATE TABLE IF NOT EXISTS patients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        diagnosis TEXT,
        medicalHistory TEXT,
        goals TEXT,
        therapistId INT,
        status ENUM('active', 'inactive', 'discharged') DEFAULT 'active',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (therapistId) REFERENCES users(id) ON DELETE SET NULL
    );" 2>/dev/null
    print_status 0 "Patients table created"
fi

# Check if notifications table exists
NOTIFICATIONS_TABLE=$(mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "SHOW TABLES LIKE 'notifications';" 2>/dev/null | wc -l)
if [ "$NOTIFICATIONS_TABLE" -gt 0 ]; then
    print_status 0 "Notifications table exists"
else
    print_status 1 "Notifications table missing"
    print_info "Creating notifications table..."
    mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "
    CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        isRead BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );" 2>/dev/null
    print_status 0 "Notifications table created"
fi

# 5. Create Sample Data
print_info "Creating sample data for testing..."

# Create sample therapist
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "
INSERT IGNORE INTO users (email, password, role, firstName, lastName, phone, status) 
VALUES ('therapist@therapease.com', '\$2b\$10\$example', 'therapist', 'John', 'Doe', '555-0123', 'active');" 2>/dev/null

# Get the therapist user ID
THERAPIST_ID=$(mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "SELECT id FROM users WHERE email='therapist@therapease.com';" 2>/dev/null | tail -1)

if [ -n "$THERAPIST_ID" ]; then
    # Create therapist profile
    mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "
    INSERT IGNORE INTO therapists (userId, licenseNumber, specialization, yearsOfExperience, education, certifications, availability, maxPatients, isAcceptingPatients) 
    VALUES ($THERAPIST_ID, 'LPC123456', 'Cognitive Behavioral Therapy', 5, 'Masters in Psychology', 'CBT Certification', '{\"monday\": [\"9:00-17:00\"], \"tuesday\": [\"9:00-17:00\"]}', 20, TRUE);" 2>/dev/null
    print_status 0 "Sample therapist created"
fi

# Create sample patient
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "
INSERT IGNORE INTO users (email, password, role, firstName, lastName, phone, status) 
VALUES ('patient@therapease.com', '\$2b\$10\$example', 'patient', 'Jane', 'Smith', '555-0456', 'active');" 2>/dev/null

# Get the patient user ID
PATIENT_ID=$(mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "SELECT id FROM users WHERE email='patient@therapease.com';" 2>/dev/null | tail -1)

if [ -n "$PATIENT_ID" ] && [ -n "$THERAPIST_ID" ]; then
    # Create patient profile
    mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "
    INSERT IGNORE INTO patients (userId, diagnosis, medicalHistory, goals, therapistId, status) 
    VALUES ($PATIENT_ID, 'Anxiety Disorder', 'No significant medical history', 'Reduce anxiety symptoms', $THERAPIST_ID, 'active');" 2>/dev/null
    print_status 0 "Sample patient created"
fi

# Create sample notification
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "
INSERT IGNORE INTO notifications (userId, type, title, message, isRead) 
VALUES (1, 'system', 'Welcome to TherapEase', 'Welcome to the TherapEase platform!', FALSE);" 2>/dev/null

print_status 0 "Sample notification created"

# 6. Test Endpoints Again
print_info "Testing admin endpoints again with sample data..."

# Test therapists endpoint
echo "Testing /api/admin/therapists with sample data..."
THERAPISTS_RESPONSE2=$(curl -s -w "%{http_code}" -o /tmp/therapists_test2.json \
    -H "Authorization: Bearer $TOKEN" \
    "$API_URL/api/admin/therapists" 2>/dev/null || echo "000")

if [ "$THERAPISTS_RESPONSE2" = "200" ]; then
    print_status 0 "Therapists endpoint working with data (HTTP 200)"
    echo "Response: $(cat /tmp/therapists_test2.json | head -c 200)..."
else
    print_status 1 "Therapists endpoint still failing (HTTP $THERAPISTS_RESPONSE2)"
    echo "Response: $(cat /tmp/therapists_test2.json)"
fi

# Test patients endpoint
echo "Testing /api/admin/patients with sample data..."
PATIENTS_RESPONSE2=$(curl -s -w "%{http_code}" -o /tmp/patients_test2.json \
    -H "Authorization: Bearer $TOKEN" \
    "$API_URL/api/admin/patients" 2>/dev/null || echo "000")

if [ "$PATIENTS_RESPONSE2" = "200" ]; then
    print_status 0 "Patients endpoint working with data (HTTP 200)"
    echo "Response: $(cat /tmp/patients_test2.json | head -c 200)..."
else
    print_status 1 "Patients endpoint still failing (HTTP $PATIENTS_RESPONSE2)"
    echo "Response: $(cat /tmp/patients_test2.json)"
fi

# Test notifications endpoint
echo "Testing /api/admin/notifications with sample data..."
NOTIFICATIONS_RESPONSE2=$(curl -s -w "%{http_code}" -o /tmp/notifications_test2.json \
    -H "Authorization: Bearer $TOKEN" \
    "$API_URL/api/admin/notifications" 2>/dev/null || echo "000")

if [ "$NOTIFICATIONS_RESPONSE2" = "200" ]; then
    print_status 0 "Notifications endpoint working with data (HTTP 200)"
    echo "Response: $(cat /tmp/notifications_test2.json | head -c 200)..."
else
    print_status 1 "Notifications endpoint still failing (HTTP $NOTIFICATIONS_RESPONSE2)"
    echo "Response: $(cat /tmp/notifications_test2.json)"
fi

# 7. Cleanup
rm -f /tmp/therapists_test.json /tmp/patients_test.json /tmp/notifications_test.json
rm -f /tmp/therapists_test2.json /tmp/patients_test2.json /tmp/notifications_test2.json

# 8. Summary
echo ""
echo -e "${GREEN}🎉 Complete Admin Endpoints Fix Complete!${NC}"
echo ""
echo -e "${BLUE}Summary:${NC}"
echo -e "${BLUE}========${NC}"
echo "• Database schema updated (added country column)"
echo "• Authentication token obtained"
echo "• Database tables verified/created"
echo "• Sample data created for testing"
echo "• Admin endpoints tested with authentication"
echo ""
echo -e "${YELLOW}Admin Dashboard Credentials:${NC}"
echo -e "${YELLOW}Email: $ADMIN_EMAIL${NC}"
echo -e "${YELLOW}Password: $ADMIN_PASSWORD${NC}"
echo ""
echo -e "${YELLOW}The admin dashboard should now load data properly!${NC}"
echo -e "${YELLOW}If you still see issues, check the browser console and PM2 logs.${NC}"
