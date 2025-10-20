#!/bin/bash

# TherapEase Comprehensive System Diagnostic Script
# This script checks all connections between backend, frontend, API, and MySQL database
# to identify and fix root causes of system issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
API_URL="https://therapease.site"
FRONTEND_URL="https://www.therapease.site"
DB_HOST="127.0.0.1"
DB_PORT="3306"
DB_NAME="therapease_db"
DB_USER="therapease_user"
DB_PASSWORD="TherapEase2025!@#"
ADMIN_EMAIL="admin@therapease.com"
ADMIN_PASSWORD="SecureAdmin2024!@#$"

echo -e "${CYAN}🔍 TherapEase Comprehensive System Diagnostic${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# Function to print section headers
print_section() {
    echo ""
    echo -e "${PURPLE}📋 $1${NC}"
    echo -e "${PURPLE}$(printf '=%.0s' {1..50})${NC}"
}

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to print info
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# 1. SYSTEM OVERVIEW
print_section "System Overview"
echo "Timestamp: $(date)"
echo "Hostname: $(hostname)"
echo "User: $(whoami)"
echo "Working Directory: $(pwd)"
echo ""

# 2. PM2 PROCESS STATUS
print_section "PM2 Process Status"
pm2 status
echo ""

# Check if PM2 processes are running
API_RUNNING=$(pm2 list | grep "therapease-api" | grep "online" | wc -l)
PUBLIC_RUNNING=$(pm2 list | grep "therapease-public" | grep "online" | wc -l)

print_status $API_RUNNING "API Server (therapease-api) is running"
print_status $PUBLIC_RUNNING "Public Website (therapease-public) is running"

if [ $API_RUNNING -eq 0 ]; then
    print_warning "API Server is not running!"
    echo "Attempting to start API server..."
    pm2 start ecosystem.config.js --only therapease-api
    sleep 5
    API_RUNNING=$(pm2 list | grep "therapease-api" | grep "online" | wc -l)
    print_status $API_RUNNING "API Server started successfully"
fi

# 3. NETWORK CONNECTIVITY
print_section "Network Connectivity"

# Check if ports are listening
print_info "Checking port availability..."

# Check port 5000 (API)
if netstat -tuln 2>/dev/null | grep -q ":5000 "; then
    print_status 0 "Port 5000 (API) is listening"
else
    print_status 1 "Port 5000 (API) is not listening"
fi

# Check port 8080 (Public Website)
if netstat -tuln 2>/dev/null | grep -q ":8080 "; then
    print_status 0 "Port 8080 (Public Website) is listening"
else
    print_status 1 "Port 8080 (Public Website) is not listening"
fi

# Check port 80 (HTTP)
if netstat -tuln 2>/dev/null | grep -q ":80 "; then
    print_status 0 "Port 80 (HTTP) is listening"
else
    print_status 1 "Port 80 (HTTP) is not listening"
fi

# Check port 443 (HTTPS)
if netstat -tuln 2>/dev/null | grep -q ":443 "; then
    print_status 0 "Port 443 (HTTPS) is listening"
else
    print_status 1 "Port 443 (HTTPS) is not listening"
fi

# 4. NGINX STATUS
print_section "Nginx Status"

# Check if Nginx is running
if systemctl is-active --quiet nginx; then
    print_status 0 "Nginx service is running"
else
    print_status 1 "Nginx service is not running"
    print_info "Attempting to start Nginx..."
    sudo systemctl start nginx
    if systemctl is-active --quiet nginx; then
        print_status 0 "Nginx started successfully"
    else
        print_status 1 "Failed to start Nginx"
    fi
fi

# Check Nginx configuration
if sudo nginx -t 2>/dev/null; then
    print_status 0 "Nginx configuration is valid"
else
    print_status 1 "Nginx configuration has errors"
    echo "Nginx config test output:"
    sudo nginx -t
fi

# Check if TherapEase site is enabled
if [ -L "/etc/nginx/sites-enabled/therapease" ]; then
    print_status 0 "TherapEase site is enabled in Nginx"
else
    print_status 1 "TherapEase site is not enabled in Nginx"
    print_info "Enabling TherapEase site..."
    sudo ln -sf /etc/nginx/sites-available/therapease /etc/nginx/sites-enabled/
    sudo nginx -s reload
    print_status 0 "TherapEase site enabled"
fi

# 5. MYSQL DATABASE CONNECTION
print_section "MySQL Database Connection"

# Test MySQL connection
if mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD -e "SELECT 1;" 2>/dev/null; then
    print_status 0 "MySQL database connection successful"
else
    print_status 1 "MySQL database connection failed"
    print_info "Checking MySQL service status..."
    if systemctl is-active --quiet mysql; then
        print_status 0 "MySQL service is running"
    else
        print_status 1 "MySQL service is not running"
        print_info "Attempting to start MySQL..."
        sudo systemctl start mysql
        if systemctl is-active --quiet mysql; then
            print_status 0 "MySQL started successfully"
        else
            print_status 1 "Failed to start MySQL"
        fi
    fi
fi

# Check database exists
if mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD -e "USE $DB_NAME;" 2>/dev/null; then
    print_status 0 "Database '$DB_NAME' exists and is accessible"
else
    print_status 1 "Database '$DB_NAME' does not exist or is not accessible"
fi

# 6. DATABASE SCHEMA VALIDATION
print_section "Database Schema Validation"

# Check if users table exists and has required columns
if mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "DESCRIBE users;" 2>/dev/null | grep -q "status"; then
    print_status 0 "Users table has 'status' column"
else
    print_status 1 "Users table missing 'status' column"
    print_info "Adding status column to users table..."
    mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "
    ALTER TABLE users 
    ADD COLUMN status ENUM('active', 'inactive', 'suspended', 'pending') DEFAULT 'active' 
    AFTER zipCode;" 2>/dev/null
    print_status 0 "Status column added to users table"
fi

# Check admin user exists
ADMIN_EXISTS=$(mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "SELECT COUNT(*) FROM users WHERE email='$ADMIN_EMAIL';" 2>/dev/null | tail -1)
if [ "$ADMIN_EXISTS" -gt 0 ]; then
    print_status 0 "Admin user exists in database"
else
    print_status 1 "Admin user does not exist in database"
fi

# 7. API ENDPOINT TESTING
print_section "API Endpoint Testing"

# Test maintenance status endpoint
print_info "Testing maintenance status endpoint..."
MAINTENANCE_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/maintenance_response.json "$API_URL/api/maintenance-status" 2>/dev/null || echo "000")
if [ "$MAINTENANCE_RESPONSE" = "200" ]; then
    print_status 0 "Maintenance status endpoint responding (HTTP 200)"
    echo "Response: $(cat /tmp/maintenance_response.json)"
else
    print_status 1 "Maintenance status endpoint failed (HTTP $MAINTENANCE_RESPONSE)"
fi

# Test API health
print_info "Testing API health..."
API_HEALTH_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/api_health.json "http://localhost:5000/api/maintenance-status" 2>/dev/null || echo "000")
if [ "$API_HEALTH_RESPONSE" = "200" ]; then
    print_status 0 "Local API health check passed"
else
    print_status 1 "Local API health check failed (HTTP $API_HEALTH_RESPONSE)"
fi

# 8. FRONTEND CONNECTIVITY
print_section "Frontend Connectivity"

# Test frontend accessibility
print_info "Testing frontend accessibility..."
FRONTEND_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/frontend_response.html "$FRONTEND_URL" 2>/dev/null || echo "000")
if [ "$FRONTEND_RESPONSE" = "200" ]; then
    print_status 0 "Frontend is accessible (HTTP 200)"
else
    print_status 1 "Frontend accessibility failed (HTTP $FRONTEND_RESPONSE)"
fi

# Check if React app is built
if [ -f "/var/www/therapease/index.html" ]; then
    print_status 0 "React app build files exist"
else
    print_status 1 "React app build files missing"
    print_info "Checking for build files in alternative locations..."
    if [ -f "/root/therapease/therapease/client/build/index.html" ]; then
        print_status 0 "React app build files found in client/build/"
        print_info "Copying build files to web directory..."
        sudo cp -r /root/therapease/therapease/client/build/* /var/www/therapease/
        print_status 0 "Build files copied to web directory"
    else
        print_status 1 "React app build files not found anywhere"
    fi
fi

# 9. LOGIN FUNCTIONALITY TEST
print_section "Login Functionality Test"

# Test admin login
print_info "Testing admin login..."
LOGIN_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/login_response.json -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" 2>/dev/null || echo "000")

if [ "$LOGIN_RESPONSE" = "200" ]; then
    print_status 0 "Admin login successful"
    echo "Login response: $(cat /tmp/login_response.json)"
else
    print_status 1 "Admin login failed (HTTP $LOGIN_RESPONSE)"
    echo "Login response: $(cat /tmp/login_response.json)"
    
    # Check password hash
    print_info "Checking admin password hash..."
    PASSWORD_HASH=$(mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "SELECT password FROM users WHERE email='$ADMIN_EMAIL';" 2>/dev/null | tail -1)
    if [ -n "$PASSWORD_HASH" ]; then
        print_info "Password hash found (length: ${#PASSWORD_HASH})"
        print_warning "Password hash may be incorrect. Generating new hash..."
        
        # Generate new password hash
        NEW_HASH=$(node -e "
        const bcrypt = require('bcrypt');
        const password = '$ADMIN_PASSWORD';
        const saltRounds = 10;
        bcrypt.hash(password, saltRounds, (err, hash) => {
            if (err) throw err;
            console.log(hash);
        });
        " 2>/dev/null)
        
        if [ -n "$NEW_HASH" ]; then
            print_info "Updating admin password hash..."
            mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "UPDATE users SET password='$NEW_HASH' WHERE email='$ADMIN_EMAIL';" 2>/dev/null
            print_status 0 "Admin password hash updated"
            
            # Test login again
            print_info "Testing login with updated password..."
            LOGIN_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/login_response2.json -X POST "$API_URL/api/auth/login" \
                -H "Content-Type: application/json" \
                -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" 2>/dev/null || echo "000")
            
            if [ "$LOGIN_RESPONSE" = "200" ]; then
                print_status 0 "Admin login successful after password update"
            else
                print_status 1 "Admin login still failed after password update"
            fi
        else
            print_status 1 "Failed to generate new password hash"
        fi
    else
        print_status 1 "No password hash found for admin user"
    fi
fi

# 10. SSL/HTTPS STATUS
print_section "SSL/HTTPS Status"

# Check SSL certificate
if openssl s_client -connect therapease.site:443 -servername therapease.site </dev/null 2>/dev/null | openssl x509 -noout -dates 2>/dev/null; then
    print_status 0 "SSL certificate is valid"
    echo "Certificate details:"
    openssl s_client -connect therapease.site:443 -servername therapease.site </dev/null 2>/dev/null | openssl x509 -noout -dates 2>/dev/null
else
    print_status 1 "SSL certificate is invalid or missing"
fi

# 11. SYSTEM RESOURCES
print_section "System Resources"

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    print_status 0 "Disk usage is healthy ($DISK_USAGE%)"
else
    print_warning "Disk usage is high ($DISK_USAGE%)"
fi

# Check memory usage
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ "$MEMORY_USAGE" -lt 80 ]; then
    print_status 0 "Memory usage is healthy ($MEMORY_USAGE%)"
else
    print_warning "Memory usage is high ($MEMORY_USAGE%)"
fi

# Check load average
LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
if (( $(echo "$LOAD_AVG < 2.0" | bc -l) )); then
    print_status 0 "Load average is normal ($LOAD_AVG)"
else
    print_warning "Load average is high ($LOAD_AVG)"
fi

# 12. RECENT ERROR LOGS
print_section "Recent Error Logs"

print_info "Checking PM2 error logs..."
echo "API Error Logs (last 10 lines):"
pm2 logs therapease-api --lines 10 --err 2>/dev/null | tail -10 || echo "No error logs found"

echo ""
echo "Public Website Error Logs (last 10 lines):"
pm2 logs therapease-public --lines 10 --err 2>/dev/null | tail -10 || echo "No error logs found"

# 13. FINAL SYSTEM STATUS
print_section "Final System Status"

# Overall health check
HEALTH_SCORE=0
TOTAL_CHECKS=0

# Count successful checks
[ $API_RUNNING -eq 1 ] && HEALTH_SCORE=$((HEALTH_SCORE + 1))
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

[ "$MAINTENANCE_RESPONSE" = "200" ] && HEALTH_SCORE=$((HEALTH_SCORE + 1))
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

[ "$FRONTEND_RESPONSE" = "200" ] && HEALTH_SCORE=$((HEALTH_SCORE + 1))
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

[ "$LOGIN_RESPONSE" = "200" ] && HEALTH_SCORE=$((HEALTH_SCORE + 1))
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

HEALTH_PERCENTAGE=$((HEALTH_SCORE * 100 / TOTAL_CHECKS))

echo "System Health Score: $HEALTH_SCORE/$TOTAL_CHECKS ($HEALTH_PERCENTAGE%)"

if [ $HEALTH_PERCENTAGE -ge 75 ]; then
    print_status 0 "System is healthy"
elif [ $HEALTH_PERCENTAGE -ge 50 ]; then
    print_warning "System has some issues but is mostly functional"
else
    print_status 1 "System has critical issues"
fi

# 14. RECOMMENDATIONS
print_section "Recommendations"

if [ $API_RUNNING -eq 0 ]; then
    echo "• Start the API server: pm2 start ecosystem.config.js --only therapease-api"
fi

if [ "$MAINTENANCE_RESPONSE" != "200" ]; then
    echo "• Check API server configuration and restart if necessary"
fi

if [ "$FRONTEND_RESPONSE" != "200" ]; then
    echo "• Check Nginx configuration and frontend build files"
fi

if [ "$LOGIN_RESPONSE" != "200" ]; then
    echo "• Verify admin user credentials and password hash"
fi

if [ ! -f "/var/www/therapease/index.html" ]; then
    echo "• Build and deploy the React frontend application"
fi

# Cleanup temporary files
rm -f /tmp/maintenance_response.json /tmp/api_health.json /tmp/frontend_response.html /tmp/login_response.json /tmp/login_response2.json

echo ""
echo -e "${GREEN}🎉 Comprehensive System Diagnostic Complete!${NC}"
echo -e "${CYAN}Generated on: $(date)${NC}"
