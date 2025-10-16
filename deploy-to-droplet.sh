#!/bin/bash

# 🚀 TherapEase Droplet Deployment Script
# IP: 167.71.199.133

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

DROPLET_IP="167.71.199.133"

print_header "TherapEase Droplet Deployment"
echo "=================================="
print_status "Target Droplet IP: $DROPLET_IP"
echo ""

print_header "Step 1: Connect to Your Droplet"
echo "Run this command to connect to your droplet:"
echo ""
echo -e "${YELLOW}ssh root@$DROPLET_IP${NC}"
echo ""
print_warning "You'll be prompted for the root password"
echo ""

print_header "Step 2: Once Connected, Run These Commands"
echo ""

cat << 'EOF'
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip software-properties-common

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install MySQL
sudo apt install -y mysql-server

# Install Nginx
sudo apt install -y nginx

# Configure firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Create application user
sudo adduser therapease
sudo usermod -aG sudo therapease

# Switch to therapease user
su - therapease
EOF

echo ""
print_header "Step 3: Clone and Setup Application"
echo ""

cat << EOF
# Clone the repository
cd /home/therapease
git clone https://github.com/your-username/therapease.git
cd therapease

# Install dependencies
cd server && npm install
cd ../client && npm install && npm run build
cd ../public-website && npm install
EOF

echo ""
print_header "Step 4: Configure Environment"
echo ""

cat << 'EOF'
# Create environment file
cd /home/therapease/therapease/server
nano .env.production
EOF

echo ""
print_warning "Add these environment variables to .env.production:"
echo ""

cat << EOF
# Database Configuration
DB_HOST=localhost
DB_USER=therapease_user
DB_PASSWORD=YOUR_STRONG_PASSWORD
DB_NAME=therapease_db
DB_PORT=3306

# Server Configuration
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Security Keys (Generate these)
JWT_SECRET=\$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
ENCRYPTION_KEY=\$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
SESSION_SECRET=\$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# CORS Configuration
CORS_ORIGIN=http://$DROPLET_IP:3000

# SSL Configuration
SSL_ENABLED=false

# Optional Services
EMAIL_ENABLED=false
SMS_ENABLED=false

# Admin Configuration
ADMIN_EMAIL=admin@therapease.com
ADMIN_PASSWORD=SecureAdmin2024!@#$
EOF

echo ""
print_header "Step 5: Setup Database"
echo ""

cat << 'EOF'
# Secure MySQL installation
sudo mysql_secure_installation

# Create database and user
sudo mysql -u root -p
EOF

echo ""
print_warning "Run these SQL commands:"
echo ""

cat << 'EOF'
CREATE DATABASE therapease_db;
CREATE USER 'therapease_user'@'localhost' IDENTIFIED BY 'YOUR_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON therapease_db.* TO 'therapease_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
EOF

echo ""
print_header "Step 6: Configure Nginx"
echo ""

cat << EOF
# Copy Nginx configuration
sudo cp nginx-therapease.conf /etc/nginx/sites-available/therapease

# Enable the site
sudo ln -s /etc/nginx/sites-available/therapease /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx
EOF

echo ""
print_header "Step 7: Start Application"
echo ""

cat << 'EOF'
# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Check status
pm2 status
pm2 logs
EOF

echo ""
print_header "Step 8: Test Your Deployment"
echo ""

cat << EOF
# Test API
curl http://$DROPLET_IP/api/health

# Test frontend
curl http://$DROPLET_IP

# Test public website
curl http://$DROPLET_IP:8080
EOF

echo ""
print_header "Access URLs"
echo "=================================="
print_status "Frontend: http://$DROPLET_IP"
print_status "API: http://$DROPLET_IP/api"
print_status "Public Website: http://$DROPLET_IP:8080"
echo ""
print_status "Admin Login:"
print_status "Email: admin@therapease.com"
print_status "Password: SecureAdmin2024!@#\$"
echo ""
print_warning "Remember to change the default admin password after first login!"
echo ""
print_status "Deployment script complete! 🎉"
