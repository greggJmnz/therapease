#!/bin/bash

# 🗄️ TherapEase Database Setup Script
# This script helps set up the MySQL database for TherapEase

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_header "TherapEase Database Setup"
echo "=================================="

# Check if MySQL is running
if ! systemctl is-active --quiet mysql; then
    print_error "MySQL is not running. Please start MySQL first:"
    echo "sudo systemctl start mysql"
    exit 1
fi

print_status "MySQL is running ✓"

# Get database credentials
echo ""
print_warning "Please provide the following information:"
echo ""

read -p "MySQL root password: " -s MYSQL_ROOT_PASSWORD
echo ""

read -p "Database name (default: therapease_db): " DB_NAME
DB_NAME=${DB_NAME:-therapease_db}

read -p "Database user (default: therapease_user): " DB_USER
DB_USER=${DB_USER:-therapease_user}

read -p "Database password: " -s DB_PASSWORD
echo ""

print_header "Creating Database and User"

# Create SQL commands
SQL_COMMANDS="
CREATE DATABASE IF NOT EXISTS \`$DB_NAME\`;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
SHOW DATABASES;
SELECT User, Host FROM mysql.user WHERE User = '$DB_USER';
"

print_status "Executing database setup commands..."

# Execute SQL commands
echo "$SQL_COMMANDS" | mysql -u root -p"$MYSQL_ROOT_PASSWORD"

if [ $? -eq 0 ]; then
    print_status "Database and user created successfully! ✓"
else
    print_error "Failed to create database and user"
    exit 1
fi

print_header "Testing Database Connection"

# Test connection
mysql -u "$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME; SELECT 'Connection successful!' as status;"

if [ $? -eq 0 ]; then
    print_status "Database connection test successful! ✓"
else
    print_error "Database connection test failed"
    exit 1
fi

print_header "Creating Environment File"

# Create environment file with database credentials
cat > database.env << EOF
# Database Configuration
DB_HOST=localhost
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
DB_PORT=3306
EOF

print_status "Database credentials saved to: database.env"
print_warning "Please add these credentials to your .env.production file"

print_header "Database Setup Complete! 🎉"
echo "=================================="
print_status "Database: $DB_NAME"
print_status "User: $DB_USER"
print_status "Host: localhost"
print_status "Port: 3306"
echo ""
print_warning "Next steps:"
echo "1. Copy database credentials to your .env.production file:"
echo "   cat database.env >> server/.env.production"
echo ""
echo "2. Run database migrations/initialization:"
echo "   cd server"
echo "   npm run setup:production"
echo ""
echo "3. Test the application:"
echo "   pm2 start ecosystem.config.js"
echo "   pm2 logs"
echo ""
print_status "Database setup complete!"
