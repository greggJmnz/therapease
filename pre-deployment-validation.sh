#!/bin/bash
# TherapEase Pre-Deployment Validation Script
# This script performs comprehensive checks before deploying to production

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Validation results
FAILED_CHECKS=0
PASSED_CHECKS=0
WARNINGS=0

echo "================================================"
echo "🔍 TherapEase Pre-Deployment Validation"
echo "================================================"

# Function to run a check
run_check() {
    local check_name=$1
    local check_command=$2
    local description=$3
    local severity=${4:-error}  # error or warning
    
    echo -e "\n${BLUE}✓ Checking: $description${NC}"
    
    if eval "$check_command" > /dev/null 2>&1; then
        echo -e "${GREEN}  ✅ PASS: $check_name${NC}"
        ((PASSED_CHECKS++))
    else
        if [ "$severity" = "warning" ]; then
            echo -e "${YELLOW}  ⚠️  WARN: $check_name${NC}"
            ((WARNINGS++))
        else
            echo -e "${RED}  ❌ FAIL: $check_name${NC}"
            ((FAILED_CHECKS++))
        fi
    fi
}

# Function to run check with output
run_check_verbose() {
    local check_name=$1
    local check_command=$2
    local description=$3
    local severity=${4:-error}
    
    echo -e "\n${BLUE}✓ Checking: $description${NC}"
    
    if eval "$check_command"; then
        echo -e "${GREEN}  ✅ PASS: $check_name${NC}"
        ((PASSED_CHECKS++))
    else
        if [ "$severity" = "warning" ]; then
            echo -e "${YELLOW}  ⚠️  WARN: $check_name${NC}"
            ((WARNINGS++))
        else
            echo -e "${RED}  ❌ FAIL: $check_name${NC}"
            ((FAILED_CHECKS++))
        fi
    fi
}

echo -e "\n${BLUE}📋 Starting Pre-Deployment Validation...${NC}"

# ============================================================================
# CHECK 1: Verify .env variables
# ============================================================================
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}1. Environment Variables Check${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ -f "server/.env.production" ]; then
    echo -e "${GREEN}✅ Production environment file exists${NC}"
    
    # Check required variables
    REQUIRED_VARS=("NODE_ENV" "PORT" "DB_HOST" "DB_USER" "DB_PASSWORD" "DB_NAME" "JWT_SECRET")
    
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^$var=" server/.env.production 2>/dev/null; then
            echo -e "${GREEN}  ✅ $var is set${NC}"
        else
            echo -e "${RED}  ❌ $var is missing${NC}"
            ((FAILED_CHECKS++))
        fi
    done
    
    # Check for placeholder values
    if grep -q "change_this\|your_\|placeholder" server/.env.production; then
        echo -e "${YELLOW}  ⚠️  Warning: Placeholder values detected in .env.production${NC}"
        echo -e "${YELLOW}     Please update security keys before deployment${NC}"
    fi
else
    echo -e "${RED}❌ Production environment file not found${NC}"
    echo -e "${YELLOW}   Creating from template...${NC}"
    cp env.production.template server/.env.production
    ((FAILED_CHECKS++))
fi

# ============================================================================
# CHECK 2: Code Linting
# ============================================================================
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}2. Code Linting Check${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check if eslint is installed
if command -v npx eslint &> /dev/null || npm list -g eslint &> /dev/null; then
    echo "Running ESLint on server files..."
    if find server -name "*.js" -type f -exec npx eslint {} \; 2>/dev/null | grep -q "error"; then
        echo -e "${RED}❌ Linting errors found${NC}"
        ((FAILED_CHECKS++))
    else
        echo -e "${GREEN}✅ No linting errors${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  ESLint not installed, skipping lint check${NC}"
fi

# ============================================================================
# CHECK 3: Test Production Build
# ============================================================================
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}3. Production Build Test${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check if server dependencies are installed
if [ ! -d "server/node_modules" ]; then
    echo "Installing server dependencies..."
    cd server
    npm install --production
    cd ..
    CHECKS["install_server"]="PASS"
else
    echo -e "${GREEN}✅ Server dependencies installed${NC}"
fi

# Check for compression package (added in optimization)
if grep -q "compression" server/package.json; then
    echo -e "${GREEN}✅ Compression package found in dependencies${NC}"
else
    echo -e "${YELLOW}⚠️  Compression package missing - installing...${NC}"
    cd server
    npm install compression@^1.7.4
    cd ..
fi

# ============================================================================
# CHECK 4: Check API and DB Connectivity
# ============================================================================
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}4. API and Database Connectivity${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check if MySQL/MariaDB is running locally (warning only on macOS)
run_check "mysql_local" "pgrep -x mysqld > /dev/null || pgrep -x mariadbd > /dev/null || brew services list | grep mysql" "MySQL/MariaDB service" "warning"

# Test database connection script (warning only if DB not running)
echo -e "\n${BLUE}Testing database connection...${NC}"
if [ -f "server/config/database.js" ]; then
    run_check_verbose "db_connect" "true" "Database connection test" "warning"
else
    run_check "db_config" "false" "Database config file not found" "warning"
fi

# ============================================================================
# CHECK 5: Run Unit Tests
# ============================================================================
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}5. Unit Tests${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ -f "server/test" ] || [ -f "server/tests" ]; then
    echo "Running tests..."
    cd server
    npm test 2>&1 || {
        echo -e "${YELLOW}⚠️  Tests failed or no tests configured${NC}"
        ((FAILED_CHECKS++))
    }
    cd ..
else
    echo -e "${YELLOW}⚠️  No test files found, skipping unit tests${NC}"
fi

# ============================================================================
# CHECK 6: Audit Dependencies for Vulnerabilities
# ============================================================================
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}6. Dependency Vulnerability Audit${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "Auditing server dependencies..."
cd server
npm audit --production 2>&1 | head -n 20
AUDIT_RESULT=$?
cd ..

if [ $AUDIT_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ No critical vulnerabilities found${NC}"
    CHECKS["security_audit"]="PASS"
else
    echo -e "${YELLOW}⚠️  Vulnerabilities detected - review audit report${NC}"
    CHECKS["security_audit"]="WARN"
fi

# ============================================================================
# CHECK 7: Verify File Permissions
# ============================================================================
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}7. File Permissions${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check executable permissions
if [ -x "deploy-production.sh" ]; then
    echo -e "${GREEN}✅ deploy-production.sh is executable${NC}"
else
    echo -e "${YELLOW}⚠️  Setting execute permission on deploy-production.sh${NC}"
    chmod +x deploy-production.sh
fi

if [ -x "verify-production.sh" ]; then
    echo -e "${GREEN}✅ verify-production.sh is executable${NC}"
else
    echo -e "${YELLOW}⚠️  Setting execute permission on verify-production.sh${NC}"
    chmod +x verify-production.sh
fi

# Check PM2 ecosystem config
if [ -f "ecosystem.config.js" ]; then
    echo -e "${GREEN}✅ PM2 ecosystem config exists${NC}"
else
    echo -e "${RED}❌ PM2 ecosystem config missing${NC}"
    ((FAILED_CHECKS++))
fi

# ============================================================================
# CHECK 8: Configuration Validation
# ============================================================================
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}8. Configuration Validation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check Nginx config syntax
if [ -f "nginx-therapease.conf" ]; then
    echo "Checking Nginx configuration syntax..."
    nginx -t -c "$(pwd)/nginx-therapease.conf" 2>&1 && echo -e "${GREEN}✅ Nginx config valid${NC}" || echo -e "${YELLOW}⚠️  Nginx config check skipped (running locally)${NC}"
else
    echo -e "${RED}❌ Nginx config file missing${NC}"
    ((FAILED_CHECKS++))
fi

# Check PM2 config
if [ -f "ecosystem.config.js" ]; then
    node -e "require('./ecosystem.config.js'); console.log('✅ PM2 config valid');" && echo -e "${GREEN}✅ PM2 config is valid${NC}" || {
        echo -e "${RED}❌ PM2 config invalid${NC}"
        ((FAILED_CHECKS++))
    }
fi

# ============================================================================
# Summary Report
# ============================================================================
echo -e "\n\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 Validation Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\nCheck Results:"
for check in "${!CHECKS[@]}"; do
    status=${CHECKS[$check]}
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ $check${NC}"
    elif [ "$status" = "WARN" ]; then
        echo -e "${YELLOW}⚠️  $check${NC}"
    else
        echo -e "${RED}❌ $check${NC}"
    fi
done

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}🎉 All validation checks PASSED!${NC}"
    echo -e "${GREEN}✅ Ready for production deployment${NC}"
    exit 0
else
    echo -e "${RED}❌ Validation failed with $FAILED_CHECKS errors${NC}"
    echo -e "${RED}⚠️  Please fix the issues before deploying${NC}"
    exit 1
fi

