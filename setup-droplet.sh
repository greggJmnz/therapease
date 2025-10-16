#!/bin/bash

# 🚀 TherapEase Droplet Setup Script
# This script helps set up your DigitalOcean Droplet for TherapEase deployment

set -e  # Exit on any error

echo "🚀 Starting TherapEase Droplet Setup..."
echo "=================================="

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

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root. Please run as a regular user with sudo privileges."
   exit 1
fi

# Check if sudo is available
if ! command -v sudo &> /dev/null; then
    print_error "sudo is not available. Please install sudo first."
    exit 1
fi

print_header "Step 1: System Update and Package Installation"
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

print_status "Installing essential packages..."
sudo apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

print_header "Step 2: Node.js Installation"
print_status "Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

print_status "Installing PM2 globally..."
sudo npm install -g pm2

print_header "Step 3: MySQL Installation"
print_status "Installing MySQL Server..."
sudo apt install -y mysql-server

print_warning "MySQL secure installation will start now. Please follow the prompts:"
print_warning "- Set root password: YES (choose a strong password)"
print_warning "- Remove anonymous users: YES"
print_warning "- Disallow root login remotely: YES"
print_warning "- Remove test database: YES"
print_warning "- Reload privilege tables: YES"
sudo mysql_secure_installation

print_header "Step 4: Nginx Installation"
print_status "Installing Nginx..."
sudo apt install -y nginx

print_status "Starting and enabling Nginx..."
sudo systemctl start nginx
sudo systemctl enable nginx

print_header "Step 5: Firewall Configuration"
print_status "Configuring UFW firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

print_status "Firewall status:"
sudo ufw status

print_header "Step 6: Create Application Directory"
print_status "Creating application directory..."
mkdir -p /home/$USER/therapease
cd /home/$USER/therapease

print_header "Step 7: Generate Environment Variables"
print_status "Generating secure environment variables..."

# Generate secure keys
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Create environment file template
cat > .env.production.template << EOF
# Database Configuration
DB_HOST=localhost
DB_USER=therapease_user
DB_PASSWORD=CHANGE_THIS_PASSWORD
DB_NAME=therapease_db
DB_PORT=3306

# Server Configuration
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Security Keys (Generated)
JWT_SECRET=$JWT_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY
SESSION_SECRET=$SESSION_SECRET

# CORS Configuration
CORS_ORIGIN=http://$(curl -s ifconfig.me):3000

# SSL Configuration
SSL_ENABLED=false

# Optional Services
EMAIL_ENABLED=false
SMS_ENABLED=false
OPENAI_API_KEY=your_openai_key_if_needed

# VAPID Keys for Push Notifications (Generate these separately)
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:admin@therapease.com

# Admin Configuration
ADMIN_EMAIL=admin@therapease.com
ADMIN_PASSWORD=SecureAdmin2024!@#$
EOF

print_status "Environment template created at: /home/$USER/therapease/.env.production.template"

print_header "Step 8: Create PM2 Ecosystem Configuration"
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'therapease-api',
      script: './server/index.js',
      cwd: '/home/therapease/therapease',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      env_file: './server/.env.production',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_file: './logs/api-combined.log',
      time: true
    },
    {
      name: 'therapease-public',
      script: './public-website/server.js',
      cwd: '/home/therapease/therapease',
      env: {
        NODE_ENV: 'production',
        PORT: 8080
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      error_file: './logs/public-error.log',
      out_file: './logs/public-out.log',
      log_file: './logs/public-combined.log',
      time: true
    }
  ]
};
EOF

print_status "PM2 ecosystem configuration created"

print_header "Step 9: Create Logs Directory"
mkdir -p logs
print_status "Logs directory created"

print_header "Step 10: Configure PM2 Startup"
print_status "Setting up PM2 to start on boot..."
pm2 startup
print_warning "Please run the command shown above to enable PM2 startup"

print_header "Setup Complete! 🎉"
echo "=================================="
print_status "Basic server setup is complete!"
echo ""
print_warning "Next steps:"
echo "1. Clone your TherapEase repository:"
echo "   git clone https://github.com/your-username/therapease.git"
echo ""
echo "2. Set up MySQL database:"
echo "   sudo mysql -u root -p"
echo "   CREATE DATABASE therapease_db;"
echo "   CREATE USER 'therapease_user'@'localhost' IDENTIFIED BY 'YOUR_PASSWORD';"
echo "   GRANT ALL PRIVILEGES ON therapease_db.* TO 'therapease_user'@'localhost';"
echo "   FLUSH PRIVILEGES;"
echo "   EXIT;"
echo ""
echo "3. Copy and edit environment file:"
echo "   cp .env.production.template server/.env.production"
echo "   nano server/.env.production"
echo ""
echo "4. Install application dependencies:"
echo "   cd therapease"
echo "   cd server && npm install"
echo "   cd ../client && npm install && npm run build"
echo "   cd ../public-website && npm install"
echo ""
echo "5. Start the application:"
echo "   pm2 start ecosystem.config.js"
echo "   pm2 save"
echo ""
echo "6. Configure Nginx (see DROPLET_DEPLOYMENT_GUIDE.md)"
echo ""
print_status "Your droplet IP is: $(curl -s ifconfig.me)"
print_status "Environment template saved to: /home/$USER/therapease/.env.production.template"
print_status "PM2 ecosystem config saved to: /home/$USER/therapease/ecosystem.config.js"
echo ""
print_status "For detailed instructions, see: DROPLET_DEPLOYMENT_GUIDE.md"
