#!/bin/bash

# 🚀 TherapEase Automated Deployment Script
# This script automates the entire deployment process on a DigitalOcean Droplet

set -e  # Exit on any error

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
DB_PASSWORD="TherapEase2024!@#"
ADMIN_EMAIL="admin@therapease.com"
ADMIN_PASSWORD="SecureAdmin2024!@#$"
ENABLE_SSL="true"

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
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root. Please run: sudo $0"
   exit 1
fi

print_header "🚀 TherapEase Automated Deployment"
echo "=================================="
print_status "Target Droplet IP: $DROPLET_IP"
print_status "Domain: $DOMAIN"
echo ""

print_header "Step 1: System Update and Package Installation"
print_status "Updating system packages..."
apt update && apt upgrade -y

print_status "Installing essential packages..."
apt install -y curl wget git unzip software-properties-common \
    apt-transport-https ca-certificates gnupg lsb-release \
    build-essential python3 python3-pip

print_header "Step 2: Node.js Installation"
print_status "Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

print_status "Installing PM2 globally..."
npm install -g pm2

print_header "Step 3: MySQL Installation"
print_status "Installing MySQL Server..."
apt install -y mysql-server
systemctl start mysql
systemctl enable mysql

print_status "Configuring MySQL database..."
mysql -e "CREATE DATABASE therapease_db;"
mysql -e "CREATE USER 'therapease_user'@'localhost' IDENTIFIED BY '$DB_PASSWORD';"
mysql -e "GRANT ALL PRIVILEGES ON therapease_db.* TO 'therapease_user'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

print_header "Step 4: Nginx Installation"
print_status "Installing Nginx..."
apt install -y nginx
systemctl start nginx
systemctl enable nginx

print_header "Step 5: Firewall Configuration"
print_status "Configuring UFW firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 5000
ufw allow 8080
ufw --force enable

print_header "Step 6: Create Application User"
print_status "Creating therapease user..."
adduser --disabled-password --gecos "" therapease
usermod -aG sudo therapease

print_header "Step 7: Setup Application Directory"
print_status "Setting up application directory..."
mkdir -p /home/therapease/therapease
chown -R therapease:therapease /home/therapease

print_header "Step 8: Generate Environment Variables"
print_status "Generating secure environment variables..."

# Generate secure keys
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Create environment file
cat > /home/therapease/.env.production << EOF
# Database Configuration
DB_HOST=localhost
DB_USER=therapease_user
DB_PASSWORD=$DB_PASSWORD
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
CORS_ORIGIN=https://$DOMAIN

# SSL Configuration
SSL_ENABLED=false

# Optional Services
EMAIL_ENABLED=false
SMS_ENABLED=false
OPENAI_API_KEY=your_openai_key_if_needed

# VAPID Keys for Push Notifications
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:$ADMIN_EMAIL

# Admin Configuration
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD

# API Base URL
API_BASE_URL=https://api.$DOMAIN

# Client Configuration
REACT_APP_API_URL=https://api.$DOMAIN
REACT_APP_VAPID_PUBLIC_KEY=your_vapid_public_key
EOF

chown therapease:therapease /home/therapease/.env.production

print_header "Step 9: Create PM2 Ecosystem Configuration"
cat > /home/therapease/ecosystem.config.js << 'EOF'
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
      time: true,
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
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
      time: true,
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
EOF

chown therapease:therapease /home/therapease/ecosystem.config.js

print_header "Step 10: Create Nginx Configuration"
cat > /etc/nginx/sites-available/therapease << EOF
# API Server (Port 5000)
server {
    listen 80;
    server_name $API_DOMAIN;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # API routes
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:5000/health;
        access_log off;
    }
}

# Frontend (Static Files)
server {
    listen 80 default_server;
    server_name $DOMAIN $WWW_DOMAIN;

    root /home/therapease/therapease/client/build;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;

    # Main application
    location / {
        try_files \$uri \$uri/ /index.html;
        
        # Cache control for HTML files
        location ~* \.html\$ {
            expires 1h;
            add_header Cache-Control "public, no-cache";
        }
    }

    # Static assets with long-term caching
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        
        # Handle CORS for static assets
        add_header Access-Control-Allow-Origin "*";
    }

    # API proxy for frontend
    location /api/ {
        proxy_pass http://localhost:5000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}

# Public Website (Port 8080)
server {
    listen 8080;
    server_name $WWW_DOMAIN;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

print_status "Enabling Nginx site..."
ln -sf /etc/nginx/sites-available/therapease /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

print_status "Testing Nginx configuration..."
nginx -t

print_status "Restarting Nginx..."
systemctl restart nginx

print_header "Step 11: SSL Certificate Setup (Optional)"
if [ "$ENABLE_SSL" = "true" ]; then
    print_status "Installing Certbot for SSL certificates..."
    apt install -y certbot python3-certbot-nginx
    
    print_status "Obtaining SSL certificate for $DOMAIN, $WWW_DOMAIN, and $API_DOMAIN..."
    certbot --nginx -d $DOMAIN -d $WWW_DOMAIN -d $API_DOMAIN --non-interactive --agree-tos --email $ADMIN_EMAIL
    
    print_status "Setting up auto-renewal..."
    echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
    
    print_status "SSL certificates configured successfully!"
else
    print_warning "SSL certificate setup skipped. You can enable it later with:"
    print_warning "sudo certbot --nginx -d $DOMAIN -d $WWW_DOMAIN -d $API_DOMAIN"
fi

print_header "Step 12: Create Update Script"
cat > /home/therapease/update-therapease.sh << 'EOF'
#!/bin/bash
cd /home/therapease/therapease
git pull origin main
cd server && npm install
cd ../client && npm install && npm run build
cd ../public-website && npm install
pm2 restart all
echo "TherapEase updated successfully!"
EOF

chmod +x /home/therapease/update-therapease.sh
chown therapease:therapease /home/therapease/update-therapease.sh

print_header "Setup Complete! 🎉"
echo "=================================="
print_status "Server setup is complete!"
echo ""
print_warning "Next steps:"
echo "1. Switch to therapease user: su - therapease"
echo "2. Clone your repository: git clone https://github.com/your-username/therapease.git"
echo "3. Install dependencies:"
echo "   cd therapease"
echo "   cd server && npm install"
echo "   cd ../client && npm install && npm run build"
echo "   cd ../public-website && npm install"
echo ""
echo "4. Copy environment file:"
echo "   cp /home/therapease/.env.production server/.env.production"
echo ""
echo "5. Start the application:"
echo "   pm2 start ecosystem.config.js"
echo "   pm2 save"
echo ""
print_status "Your droplet IP is: $DROPLET_IP"
print_status "Environment file saved to: /home/therapease/.env.production"
print_status "PM2 ecosystem config saved to: /home/therapease/ecosystem.config.js"
print_status "Update script saved to: /home/therapease/update-therapease.sh"
echo ""
print_status "Access URLs:"
if [ "$ENABLE_SSL" = "true" ]; then
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
print_status "Email: $ADMIN_EMAIL"
print_status "Password: $ADMIN_PASSWORD"
