#!/bin/bash
# 🚀 TherapEase Migration Script: Vercel + DigitalOcean → Contabo
# This script helps automate the migration process

set -e  # Exit on error

echo "🚀 Starting TherapEase Migration to Contabo..."
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
CONTABO_IP="62.72.47.195"
DOMAIN="therapease.site"
API_DOMAIN="api.therapease.site"
APP_USER="therapease_user"
APP_DIR="/home/${APP_USER}/therapease"

echo -e "${BLUE}📋 Migration Configuration:${NC}"
echo "  Contabo IP: $CONTABO_IP"
echo "  Domain: $DOMAIN"
echo "  API Domain: $API_DOMAIN"
echo "  App User: $APP_USER"
echo "  App Directory: $APP_DIR"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}⚠️  This script should be run as root or with sudo${NC}"
    echo "   Some commands require sudo privileges"
    echo ""
fi

# Step 1: System Update
echo -e "\n${BLUE}📦 Step 1: Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y
echo -e "${GREEN}✅ System updated${NC}"

# Step 2: Install Essential Packages
echo -e "\n${BLUE}📦 Step 2: Installing essential packages...${NC}"
sudo apt install -y curl wget git unzip software-properties-common \
    apt-transport-https ca-certificates gnupg lsb-release \
    build-essential python3 python3-pip
echo -e "${GREEN}✅ Essential packages installed${NC}"

# Step 3: Install Node.js
echo -e "\n${BLUE}📦 Step 3: Installing Node.js 18.x...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
    echo -e "${GREEN}✅ Node.js installed: $(node --version)${NC}"
else
    echo -e "${YELLOW}⚠️  Node.js already installed: $(node --version)${NC}"
fi

# Step 4: Install PM2
echo -e "\n${BLUE}📦 Step 4: Installing PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
    echo -e "${GREEN}✅ PM2 installed: $(pm2 --version)${NC}"
else
    echo -e "${YELLOW}⚠️  PM2 already installed: $(pm2 --version)${NC}"
fi

# Step 5: Install Nginx
echo -e "\n${BLUE}📦 Step 5: Installing Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
    echo -e "${GREEN}✅ Nginx installed and started${NC}"
else
    echo -e "${YELLOW}⚠️  Nginx already installed${NC}"
fi

# Step 6: Install Certbot
echo -e "\n${BLUE}📦 Step 6: Installing Certbot...${NC}"
if ! command -v certbot &> /dev/null; then
    sudo apt install -y certbot python3-certbot-nginx
    echo -e "${GREEN}✅ Certbot installed${NC}"
else
    echo -e "${YELLOW}⚠️  Certbot already installed${NC}"
fi

# Step 7: Setup Firewall
echo -e "\n${BLUE}🔒 Step 7: Configuring firewall...${NC}"
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
echo "y" | sudo ufw enable
echo -e "${GREEN}✅ Firewall configured${NC}"

# Step 8: Create Application User
echo -e "\n${BLUE}👤 Step 8: Creating application user...${NC}"
if ! id "$APP_USER" &>/dev/null; then
    sudo adduser --disabled-password --gecos "" $APP_USER
    sudo usermod -aG sudo $APP_USER
    echo -e "${GREEN}✅ User '$APP_USER' created${NC}"
else
    echo -e "${YELLOW}⚠️  User '$APP_USER' already exists${NC}"
fi

# Step 9: Clone Repository
echo -e "\n${BLUE}📥 Step 9: Cloning repository...${NC}"
if [ ! -d "$APP_DIR" ]; then
    sudo -u $APP_USER mkdir -p $(dirname $APP_DIR)
    sudo -u $APP_USER git clone https://github.com/greggJmnz/therapease.git $APP_DIR
    echo -e "${GREEN}✅ Repository cloned${NC}"
else
    echo -e "${YELLOW}⚠️  Repository already exists, updating...${NC}"
    cd $APP_DIR
    sudo -u $APP_USER git pull origin main
    echo -e "${GREEN}✅ Repository updated${NC}"
fi

# Step 10: Install Dependencies
echo -e "\n${BLUE}📦 Step 10: Installing dependencies...${NC}"
cd $APP_DIR

# Server dependencies
echo "  Installing server dependencies..."
cd server
sudo -u $APP_USER npm ci --production
cd ..

# Client dependencies
echo "  Installing client dependencies..."
cd client
sudo -u $APP_USER npm ci
cd ..

echo -e "${GREEN}✅ Dependencies installed${NC}"

# Step 11: Build Client
echo -e "\n${BLUE}🏗️  Step 11: Building client...${NC}"
cd client
export VITE_API_URL="https://${API_DOMAIN}/api"
sudo -u $APP_USER npm run build
cd ..
echo -e "${GREEN}✅ Client built successfully${NC}"

# Step 12: Create Logs Directory
echo -e "\n${BLUE}📁 Step 12: Creating logs directory...${NC}"
sudo -u $APP_USER mkdir -p $APP_DIR/logs
echo -e "${GREEN}✅ Logs directory created${NC}"

# Step 13: Setup Nginx
echo -e "\n${BLUE}🌐 Step 13: Configuring Nginx...${NC}"
if [ -f "$APP_DIR/nginx-contabo.conf" ]; then
    sudo cp $APP_DIR/nginx-contabo.conf /etc/nginx/sites-available/therapease
    echo -e "${GREEN}✅ Nginx configuration copied${NC}"
else
    echo -e "${RED}❌ nginx-contabo.conf not found in repository${NC}"
    echo "   Please copy the nginx configuration manually"
fi

# Add rate limiting to nginx.conf if not present
if ! grep -q "limit_req_zone.*zone=api" /etc/nginx/nginx.conf; then
    echo -e "${BLUE}   Adding rate limiting to nginx.conf...${NC}"
    sudo sed -i '/http {/a\    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;\n    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;' /etc/nginx/nginx.conf
    echo -e "${GREEN}✅ Rate limiting added${NC}"
fi

# Enable site
sudo ln -sf /etc/nginx/sites-available/therapease /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
if sudo nginx -t; then
    sudo systemctl reload nginx
    echo -e "${GREEN}✅ Nginx configured and reloaded${NC}"
else
    echo -e "${RED}❌ Nginx configuration test failed${NC}"
    echo "   Please check the configuration manually"
fi

# Step 14: Fix Permissions
echo -e "\n${BLUE}🔐 Step 14: Fixing file permissions...${NC}"
sudo chown -R $APP_USER:$APP_USER $APP_DIR
sudo chmod -R 755 $APP_DIR/client/dist
echo -e "${GREEN}✅ Permissions fixed${NC}"

# Step 15: Start PM2 Services
echo -e "\n${BLUE}🚀 Step 15: Starting PM2 services...${NC}"
cd $APP_DIR

# Check if PM2 services are already running
if pm2 list | grep -q "therapease-api"; then
    echo -e "${YELLOW}⚠️  PM2 services already running, restarting...${NC}"
    sudo -u $APP_USER pm2 restart ecosystem.config.js
else
    sudo -u $APP_USER pm2 start ecosystem.config.js
    sudo -u $APP_USER pm2 save
fi

echo -e "${GREEN}✅ PM2 services started${NC}"

# Step 16: Setup PM2 Startup
echo -e "\n${BLUE}⚙️  Step 16: Setting up PM2 startup...${NC}"
sudo -u $APP_USER pm2 startup
echo -e "${YELLOW}⚠️  Please run the command shown above as root${NC}"

# Summary
echo -e "\n${GREEN}✅ Migration script completed!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "  1. Create .env.production file in server directory"
echo "  2. Migrate database from DigitalOcean"
echo "  3. Update DNS records to point to $CONTABO_IP"
echo "  4. Run SSL setup: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN -d $API_DOMAIN"
echo "  5. Test the application"
echo ""
echo -e "${BLUE}📝 Useful Commands:${NC}"
echo "  - Check PM2 status: pm2 status"
echo "  - View PM2 logs: pm2 logs"
echo "  - Restart services: pm2 restart all"
echo "  - Check Nginx: sudo systemctl status nginx"
echo "  - Test API: curl http://localhost:5000/api/health"
echo ""

