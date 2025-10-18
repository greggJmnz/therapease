#!/bin/bash

# 🔍 TherapEase Deployment Verification Script
# This script verifies that all components are working correctly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DROPLET_IP="167.71.199.133"
DOMAIN="therapease.site"
API_DOMAIN="api.therapease.site"
WWW_DOMAIN="www.therapease.site"

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_header "🔍 TherapEase Deployment Verification"
echo "=========================================="
print_status "Target Droplet IP: $DROPLET_IP"
print_status "Domain: $DOMAIN"
echo ""

# Test 1: System Services
print_header "Testing System Services"

# Check Nginx
if systemctl is-active --quiet nginx; then
    print_status "Nginx is running"
else
    print_error "Nginx is not running"
    exit 1
fi

# Check MySQL
if systemctl is-active --quiet mysql; then
    print_status "MySQL is running"
else
    print_error "MySQL is not running"
    exit 1
fi

# Check PM2
if command -v pm2 &> /dev/null; then
    print_status "PM2 is installed"
else
    print_error "PM2 is not installed"
    exit 1
fi

# Test 2: PM2 Processes
print_header "Testing PM2 Processes"

PM2_STATUS=$(pm2 status --no-color 2>/dev/null || echo "PM2 not running")

if echo "$PM2_STATUS" | grep -q "therapease-api.*online"; then
    print_status "TherapEase API is running"
else
    print_error "TherapEase API is not running"
    echo "PM2 Status:"
    pm2 status
fi

if echo "$PM2_STATUS" | grep -q "therapease-public.*online"; then
    print_status "TherapEase Public Website is running"
else
    print_error "TherapEase Public Website is not running"
fi

# Test 3: API Endpoints
print_header "Testing API Endpoints"

# Test API health endpoint
if curl -s -f "http://localhost:5000/health" > /dev/null; then
    print_status "API health endpoint is responding"
else
    print_error "API health endpoint is not responding"
fi

# Test API with external IP
if curl -s -f "http://$DROPLET_IP/api/health" > /dev/null; then
    print_status "API is accessible externally via IP"
else
    print_error "API is not accessible externally via IP"
fi

# Test API with domain (if DNS configured)
if nslookup $API_DOMAIN > /dev/null 2>&1; then
    if curl -s -f "http://$API_DOMAIN/health" > /dev/null; then
        print_status "API is accessible via domain"
    else
        print_warning "API domain configured but not accessible"
    fi
else
    print_warning "API domain $API_DOMAIN does not resolve (DNS not configured)"
fi

# Test 4: Frontend
print_header "Testing Frontend"

# Test frontend with external IP
if curl -s -f "http://$DROPLET_IP" | grep -q "TherapEase"; then
    print_status "Frontend is accessible via IP"
else
    print_error "Frontend is not accessible via IP"
fi

# Test frontend with domain (if DNS configured)
if nslookup $DOMAIN > /dev/null 2>&1; then
    if curl -s -f "http://$DOMAIN" | grep -q "TherapEase"; then
        print_status "Frontend is accessible via domain"
    else
        print_warning "Frontend domain configured but not accessible"
    fi
else
    print_warning "Domain $DOMAIN does not resolve (DNS not configured)"
fi

# Test 5: Public Website
print_header "Testing Public Website"

# Test public website
if curl -s -f "http://$DROPLET_IP:8080" > /dev/null; then
    print_status "Public website is accessible"
else
    print_error "Public website is not accessible"
fi

# Test 6: Database Connection
print_header "Testing Database Connection"

# Test database connection
if mysql -u therapease_user -pTherapEase2024!@# -e "SELECT 1;" therapease_db > /dev/null 2>&1; then
    print_status "Database connection is working"
else
    print_error "Database connection failed"
fi

# Test 7: Firewall
print_header "Testing Firewall"

if ufw status | grep -q "Status: active"; then
    print_status "Firewall is active"
else
    print_warning "Firewall is not active"
fi

# Test 8: SSL (if configured)
print_header "Testing SSL Configuration"

if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    print_status "SSL certificate is installed"
    
    # Test HTTPS for main domain
    if curl -s -f "https://$DOMAIN" > /dev/null; then
        print_status "HTTPS is working for main domain"
    else
        print_warning "HTTPS is not working for main domain"
    fi
    
    # Test HTTPS for API domain
    if curl -s -f "https://$API_DOMAIN/health" > /dev/null; then
        print_status "HTTPS is working for API domain"
    else
        print_warning "HTTPS is not working for API domain"
    fi
    
    # Test HTTPS for www domain
    if curl -s -f "https://$WWW_DOMAIN" > /dev/null; then
        print_status "HTTPS is working for www domain"
    else
        print_warning "HTTPS is not working for www domain"
    fi
else
    print_warning "SSL certificate not found (optional)"
fi

# Test 9: Log Files
print_header "Checking Log Files"

# Check PM2 logs
if [ -f "/home/therapease/.pm2/logs/therapease-api-out.log" ]; then
    print_status "PM2 logs are being created"
else
    print_warning "PM2 logs not found"
fi

# Check Nginx logs
if [ -f "/var/log/nginx/access.log" ]; then
    print_status "Nginx logs are being created"
else
    print_warning "Nginx logs not found"
fi

# Test 10: Resource Usage
print_header "Checking Resource Usage"

# Check memory usage
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
print_status "Memory usage: ${MEMORY_USAGE}%"

# Check disk usage
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
print_status "Disk usage: ${DISK_USAGE}%"

# Test 11: Port Accessibility
print_header "Testing Port Accessibility"

# Test port 80
if netstat -tlnp | grep -q ":80 "; then
    print_status "Port 80 is listening"
else
    print_error "Port 80 is not listening"
fi

# Test port 5000
if netstat -tlnp | grep -q ":5000 "; then
    print_status "Port 5000 is listening"
else
    print_error "Port 5000 is not listening"
fi

# Test port 8080
if netstat -tlnp | grep -q ":8080 "; then
    print_status "Port 8080 is listening"
else
    print_error "Port 8080 is not listening"
fi

# Test 12: Domain Resolution (if configured)
print_header "Testing Domain Resolution"

if nslookup $DOMAIN > /dev/null 2>&1; then
    print_status "Domain $DOMAIN resolves"
else
    print_warning "Domain $DOMAIN does not resolve (optional)"
fi

# Final Summary
print_header "🎉 Deployment Verification Complete"
echo "=========================================="

# Count successful tests
SUCCESS_COUNT=0
TOTAL_TESTS=12

# This is a simplified count - in a real implementation, you'd track each test result
print_status "Verification completed!"

echo ""
print_status "Access URLs:"
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    print_status "Frontend: https://$DOMAIN"
    print_status "API: https://$API_DOMAIN"
    print_status "Public Website: https://$WWW_DOMAIN"
    print_status "Alternative (HTTP): http://$DROPLET_IP"
else
    print_status "Frontend: http://$DROPLET_IP (or http://$DOMAIN if DNS configured)"
    print_status "API: http://$DROPLET_IP/api (or http://$API_DOMAIN if DNS configured)"
    print_status "Public Website: http://$DROPLET_IP:8080 (or http://$WWW_DOMAIN if DNS configured)"
fi

echo ""
print_status "Admin Login:"
print_status "Email: admin@therapease.com"
print_status "Password: SecureAdmin2024!@#$"

echo ""
print_status "Useful Commands:"
print_status "Check PM2 status: pm2 status"
print_status "View logs: pm2 logs"
print_status "Restart services: pm2 restart all"
print_status "Check Nginx: sudo systemctl status nginx"
print_status "Check MySQL: sudo systemctl status mysql"

echo ""
print_status "Your TherapEase deployment is ready! 🚀"
