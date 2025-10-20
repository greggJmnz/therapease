#!/bin/bash

# TherapEase Complete Database Schema Fix Script
# This script ensures all required tables and columns exist for admin endpoints

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
DB_HOST="127.0.0.1"
DB_PORT="3306"
DB_NAME="therapease_db"
DB_USER="therapease_user"
DB_PASSWORD="TherapEase2025!@#"

echo -e "${BLUE}🔧 Complete Database Schema Fix${NC}"
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

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 1. CHECK DATABASE CONNECTION
print_info "Checking database connection..."
if mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD -e "SELECT 1;" 2>/dev/null; then
    print_status 0 "Database connection successful"
else
    print_status 1 "Database connection failed"
    exit 1
fi

# 2. CREATE MISSING TABLES
print_info "Creating missing tables..."

# Create patient_therapist_assignments table if it doesn't exist
print_info "Creating patient_therapist_assignments table..."
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "
CREATE TABLE IF NOT EXISTS patient_therapist_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patientId INT NOT NULL,
    therapistId INT NOT NULL,
    assignmentType ENUM('primary', 'secondary', 'consultation') DEFAULT 'primary',
    assignedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('active', 'inactive', 'completed') DEFAULT 'active',
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (therapistId) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_assignment (patientId, therapistId, assignmentType)
);" 2>/dev/null
print_status 0 "patient_therapist_assignments table created/verified"

# Create appointments table if it doesn't exist
print_info "Creating appointments table..."
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "
CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patientId INT NOT NULL,
    therapistId INT NOT NULL,
    appointmentDate DATETIME NOT NULL,
    duration INT DEFAULT 60,
    status ENUM('scheduled', 'completed', 'cancelled', 'no_show') DEFAULT 'scheduled',
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (therapistId) REFERENCES users(id) ON DELETE CASCADE
);" 2>/dev/null
print_status 0 "appointments table created/verified"

# 3. ADD MISSING COLUMNS TO EXISTING TABLES
print_info "Adding missing columns to existing tables..."

# Add missing columns to users table
print_info "Updating users table..."
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'US' AFTER zipCode,
ADD COLUMN IF NOT EXISTS status ENUM('active', 'inactive', 'suspended', 'pending') DEFAULT 'active' AFTER country,
ADD COLUMN IF NOT EXISTS twoFactorEnabled TINYINT(1) DEFAULT 0 AFTER status,
ADD COLUMN IF NOT EXISTS twoFactorMethod ENUM('email', 'sms', 'push') DEFAULT 'email' AFTER twoFactorEnabled,
ADD COLUMN IF NOT EXISTS twoFactorEnabledAt TIMESTAMP NULL AFTER twoFactorMethod,
ADD COLUMN IF NOT EXISTS emailVerified TINYINT(1) DEFAULT 0 AFTER twoFactorEnabledAt,
ADD COLUMN IF NOT EXISTS emailVerifiedAt TIMESTAMP NULL AFTER emailVerified;" 2>/dev/null
print_status 0 "Users table updated"

# Add missing columns to therapists table
print_info "Updating therapists table..."
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "
ALTER TABLE therapists 
ADD COLUMN IF NOT EXISTS maxPatients INT DEFAULT 20 AFTER availability,
ADD COLUMN IF NOT EXISTS isAcceptingPatients BOOLEAN DEFAULT TRUE AFTER maxPatients;" 2>/dev/null
print_status 0 "Therapists table updated"

# Add missing columns to patients table
print_info "Updating patients table..."
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS status ENUM('active', 'inactive', 'discharged') DEFAULT 'active' AFTER goals,
ADD COLUMN IF NOT EXISTS therapistId INT AFTER status,
ADD FOREIGN KEY IF NOT EXISTS fk_patients_therapist (therapistId) REFERENCES users(id) ON DELETE SET NULL;" 2>/dev/null
print_status 0 "Patients table updated"

# Add missing columns to notifications table
print_info "Updating notifications table..."
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium' AFTER type,
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general' AFTER priority;" 2>/dev/null
print_status 0 "Notifications table updated"

# 4. CREATE SAMPLE DATA
print_info "Creating sample data for testing..."

# Create sample therapist if not exists
print_info "Creating sample therapist..."
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "
INSERT IGNORE INTO users (email, password, role, firstName, lastName, phone, status, country) 
VALUES ('therapist@therapease.com', '\$2b\$10\$example', 'therapist', 'John', 'Doe', '555-0123', 'active', 'US');" 2>/dev/null

# Get therapist ID
THERAPIST_ID=$(mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "SELECT id FROM users WHERE email='therapist@therapease.com';" 2>/dev/null | tail -1)

if [ -n "$THERAPIST_ID" ]; then
    # Create therapist profile
    mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "
    INSERT IGNORE INTO therapists (userId, licenseNumber, specialization, yearsOfExperience, education, certifications, availability, maxPatients, isAcceptingPatients) 
    VALUES ($THERAPIST_ID, 'LPC123456', 'Cognitive Behavioral Therapy', 5, 'Masters in Psychology', 'CBT Certification', '{\"monday\": [\"9:00-17:00\"], \"tuesday\": [\"9:00-17:00\"]}', 20, TRUE);" 2>/dev/null
    print_status 0 "Sample therapist created"
fi

# Create sample patient if not exists
print_info "Creating sample patient..."
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "
INSERT IGNORE INTO users (email, password, role, firstName, lastName, phone, status, country) 
VALUES ('patient@therapease.com', '\$2b\$10\$example', 'patient', 'Jane', 'Smith', '555-0456', 'active', 'US');" 2>/dev/null

# Get patient ID
PATIENT_ID=$(mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "SELECT id FROM users WHERE email='patient@therapease.com';" 2>/dev/null | tail -1)

if [ -n "$PATIENT_ID" ] && [ -n "$THERAPIST_ID" ]; then
    # Create patient profile
    mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "
    INSERT IGNORE INTO patients (userId, diagnosis, medicalHistory, goals, therapistId, status) 
    VALUES ($PATIENT_ID, 'Anxiety Disorder', 'No significant medical history', 'Reduce anxiety symptoms', $THERAPIST_ID, 'active');" 2>/dev/null
    print_status 0 "Sample patient created"
    
    # Create patient-therapist assignment
    mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "
    INSERT IGNORE INTO patient_therapist_assignments (patientId, therapistId, assignmentType, status) 
    VALUES ($PATIENT_ID, $THERAPIST_ID, 'primary', 'active');" 2>/dev/null
    print_status 0 "Patient-therapist assignment created"
fi

# Create sample notification
print_info "Creating sample notification..."
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "
INSERT IGNORE INTO notifications (userId, type, title, message, priority, category, isRead) 
VALUES (1, 'system', 'Welcome to TherapEase', 'Welcome to the TherapEase platform!', 'medium', 'general', FALSE);" 2>/dev/null
print_status 0 "Sample notification created"

# 5. VERIFY SCHEMA
print_info "Verifying database schema..."

echo -e "${PURPLE}Users table structure:${NC}"
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "DESCRIBE users;" 2>/dev/null

echo ""
echo -e "${PURPLE}Therapists table structure:${NC}"
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "DESCRIBE therapists;" 2>/dev/null

echo ""
echo -e "${PURPLE}Patients table structure:${NC}"
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "DESCRIBE patients;" 2>/dev/null

echo ""
echo -e "${PURPLE}Notifications table structure:${NC}"
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "DESCRIBE notifications;" 2>/dev/null

echo ""
echo -e "${PURPLE}Patient_therapist_assignments table structure:${NC}"
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "DESCRIBE patient_therapist_assignments;" 2>/dev/null

# 6. TEST QUERIES
print_info "Testing admin queries..."

echo -e "${PURPLE}Testing therapists query:${NC}"
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "
SELECT 
  u.id,
  u.email,
  u.role,
  u.firstName,
  u.lastName,
  u.phone,
  u.status,
  t.licenseNumber,
  t.specialization,
  t.maxPatients,
  t.isAcceptingPatients
FROM users u
LEFT JOIN therapists t ON u.id = t.userId
WHERE u.role = 'therapist'
ORDER BY u.createdAt DESC;" 2>/dev/null

echo ""
echo -e "${PURPLE}Testing patients query:${NC}"
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "
SELECT 
  u.id,
  u.email,
  u.role,
  u.firstName,
  u.lastName,
  u.phone,
  u.status,
  p.id as patientId,
  p.diagnosis,
  p.therapistId
FROM users u
LEFT JOIN patients p ON u.id = p.userId
WHERE u.role = 'patient'
ORDER BY u.createdAt DESC;" 2>/dev/null

echo ""
echo -e "${PURPLE}Testing notifications query:${NC}"
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "
SELECT 
  n.id,
  n.userId,
  n.type,
  n.title,
  n.message,
  n.priority,
  n.category,
  n.isRead,
  n.createdAt,
  u.firstName,
  u.lastName
FROM notifications n
LEFT JOIN users u ON n.userId = u.id
ORDER BY n.createdAt DESC
LIMIT 10;" 2>/dev/null

echo ""
echo -e "${GREEN}🎉 Database Schema Fix Complete!${NC}"
echo -e "${BLUE}All required tables and columns have been created/updated.${NC}"
echo -e "${BLUE}Sample data has been added for testing.${NC}"
